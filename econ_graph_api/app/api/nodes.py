from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app.core.db import get_db
from app.models.node import Node
from app.models.edge import Edge
from app.schemas.node import NodeCreate, NodeUpdate, NodeOut
from app.models.composite import Composite
from app.schemas.composite import CompositeGraphData
from pydantic import ValidationError
from app.repositories import node_repo
from app.repositories.edge_repo import EdgeRepository
from app.api.insights_trigger import schedule_project_insights
import re

router = APIRouter(prefix="/nodes", tags=["nodes"])


def node_to_out(n: Node, composite_root_ids: list[str] | None = None) -> NodeOut:
    """Convert a Node model to NodeOut schema."""
    return NodeOut(**node_to_dict(n, composite_root_ids))


def extract_compute_params(code: str) -> list[str]:
    """Extract parameter identifiers from a def compute(...) signature.
    Enforce no *args/**kwargs and only simple identifiers.
    """
    if not code:
        return []
    m = re.search(r"def\s+compute\s*\(([^)]*)\)\s*:", code)
    if not m:
        return []
    params_raw = m.group(1).strip()
    if not params_raw:
        return []
    # Disallow * or ** only for project nodes; composite nodes will bypass this
    params = [p.strip() for p in params_raw.split(',') if p.strip()]
    ident_re = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
    for p in params:
        if not ident_re.match(p):
            raise HTTPException(status_code=422, detail=f"Invalid identifier in compute() params: '{p}'")
    return params


def _has_zero_param_compute(code: str | None) -> bool:
    if not code:
        return False
    match = re.search(r"def\s+compute\s*\(([^)]*)\)\s*:", code)
    if not match:
        return False
    params_raw = match.group(1).strip()
    if not params_raw:
        return True
    params = [part.strip() for part in params_raw.split(',') if part.strip()]
    return len(params) == 0


def _is_overridable_root_node(node: NodeCreate) -> bool:
    if getattr(node, "provider_enabled", False):
        return True
    code = getattr(node, "computation_definition", None) or ""
    if not code.strip():
        return True
    return _has_zero_param_compute(code)


def _extract_composite_root_info(graph: CompositeGraphData) -> list[dict]:
    nodes = graph.nodes or []
    incoming: dict[str, int] = {node.id: 0 for node in nodes}
    for edge in graph.edges or []:
        incoming[edge.target] = incoming.get(edge.target, 0) + 1
    roots: list[dict] = []
    for node in nodes:
        if incoming.get(node.id, 0) == 0:
            raw_internal_id = getattr(node, "raw_internal_id", None) or node.id
            current_value = getattr(node, "current_value", None)
            if current_value is None:
                current_value = getattr(node, "value_manual", None)
            if current_value is None:
                current_value = getattr(node, "value_computed", None)
            roots.append(
                {
                    "id": node.id,
                    "raw_internal_id": raw_internal_id,
                    "slug": getattr(node, "slug", None),
                    "label": getattr(node, "label", None),
                    "unit": getattr(node, "unit", None),
                    "provider_type": getattr(node, "provider_type", None),
                    "provider_url": getattr(node, "provider_url", None),
                    "composite_id": getattr(node, "composite_id", None),
                    "overridable": _is_overridable_root_node(node),
                    "current_value": current_value,
                }
            )
    return roots


def _collect_composite_roots(db: Session, nodes: list[Node]) -> dict[str, dict]:
    composite_ids = {n.composite_id for n in nodes if n.composite_id}
    if not composite_ids:
        return {}
    composites = (
        db.query(Composite)
        .filter(Composite.id.in_(list(composite_ids)))
        .all()
    )
    roots_map: dict[str, dict] = {}
    for comp in composites:
        try:
            graph = CompositeGraphData.model_validate(comp.graph_data or {})
            root_info = _extract_composite_root_info(graph)
            roots_map[comp.id] = {
                "ids": [root.get("slug") or root["id"] for root in root_info],
                "details": root_info,
            }
        except ValidationError:
            roots_map[comp.id] = {"ids": [], "details": []}
    return roots_map


def sync_edges_for_node(db: Session, project: str | None, node_id: str, params: list[str]) -> None:
    """Synchronize dependency edges for target node based on compute params.

    Deletes incoming dependency edges not present in params and creates any
    missing ones for the given project scope.
    """
    target_project = project or 'default'
    existing = EdgeRepository.get_by_node(db, node_id, project_id=target_project)
    existing_incoming = [e for e in existing if e.target == node_id]

    slug_to_id: dict[str, str] = {}
    for slug in params:
        slug_norm = slug.strip()
        source_q = (
            db.query(Node)
            .filter(Node.project_id == target_project)
            .filter(Node.slug == slug_norm)
        )
        source_node = source_q.first()
        if not source_node:
            raise HTTPException(status_code=422, detail=f"Dépendance inconnue: slug '{slug_norm}' introuvable dans le projet")
        if source_node.id == node_id:
            raise HTTPException(status_code=422, detail=f"Le nœud '{slug_norm}' ne peut pas dépendre de lui-même")
        slug_to_id[slug_norm] = source_node.id

    keep_sources = set(slug_to_id.values())

    # Delete edges not in params
    for e in existing_incoming:
        if e.source not in keep_sources:
            EdgeRepository.delete(db, e.id)

    # Create missing edges
    for slug, src_id in slug_to_id.items():
        if not any(e.source == src_id and e.target == node_id for e in existing_incoming):
            eid = f"{src_id}->{node_id}"
            try:
                EdgeRepository.create(
                    db,
                    type('E', (), {
                        'id': eid,
                        'source': src_id,
                        'target': node_id,
                        'label': None,
                        'edge_type': 'dependency',
                        'rule_id': None,
                        'project_id': target_project,
                    })(),
                    project_id=target_project,
                )
            except Exception:
                # ignore duplicates or FK issues silently
                pass
    return None


def node_to_dict(n: Node, composite_root_data: dict | None = None) -> dict:
    unit_val = n.unit.value if hasattr(n.unit, 'value') else n.unit if n.unit else None
    status_val = n.status.value if hasattr(n.status, 'value') else n.status
    composite_root_ids = composite_root_data.get("ids") if composite_root_data else None
    composite_roots = composite_root_data.get("details") if composite_root_data else None
    return {
        'id': n.id,
        'slug': n.slug,
        'raw_internal_id': getattr(n, 'raw_internal_id', None) or n.id,
        'label': n.label,
        'unit': unit_val,
        'status': status_val,
        'confidence': n.confidence,
        'notes': n.notes,
        'pos_x': n.pos_x,
        'pos_y': n.pos_y,
        'value_computed': n.value_computed,
        'computation_definition': n.computation_definition,
        'last_computed_at': n.last_computed_at,
        'computation_error': n.computation_error,
        'project_id': n.project_id,
        'composite_id': n.composite_id,
        'composite_root_ids': composite_root_ids,
        'composite_roots': composite_roots,
        # Provider fields (optional)
        'provider_enabled': n.provider_enabled,
        'provider_type': n.provider_type,
        'provider_url': n.provider_url,
        'provider_json_path': n.provider_json_path,
        'provider_timeout': n.provider_timeout,
        'provider_cache_ttl': n.provider_cache_ttl,
        'provider_last_fetched_at': n.provider_last_fetched_at,
        'provider_last_error': n.provider_last_error,
    }


@router.get("", response_model=List[NodeOut])
def list_nodes(project: str | None = Query(default=None), db: Session = Depends(get_db)):
    """List all nodes."""
    try:
        q = db.query(Node)
        if project:
            q = q.filter(Node.project_id == project)
        nodes = q.all()
        composite_roots = _collect_composite_roots(db, nodes)
        out = []
        for n in nodes:
            if n is None:
                continue
            pr = (
                (n.plausible_min, n.plausible_max)
                if (n.plausible_min is not None and n.plausible_max is not None)
                else None
            )
            data = node_to_dict(n, composite_roots.get(n.composite_id))
            data['plausible_range'] = pr
            data['in_range'] = node_repo.in_range(n)
            out.append(data)
        return out
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"list_nodes failed: {type(e).__name__}: {e}")


@router.get("/{node_id}", response_model=NodeOut)
def get_node(node_id: str, project: str | None = Query(default=None), db: Session = Depends(get_db)):
    """Get a single node by ID."""
    q = db.query(Node).filter(Node.id == node_id)
    if project:
        q = q.filter(Node.project_id == project)
    n = q.first()
    if not n:
        raise HTTPException(status_code=404, detail="Node not found")
    roots = _collect_composite_roots(db, [n]) if n.composite_id else {}
    return node_to_out(n, roots.get(n.composite_id))


@router.post("", response_model=NodeOut, status_code=201)
def create_node(
    payload: NodeCreate,
    project: str | None = Query(default=None),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """Create a new node."""
    target_project = project or getattr(payload, 'project_id', None) or 'default'
    slug = (payload.slug or '').strip()
    if not slug:
        raise HTTPException(status_code=422, detail="Slug is required")
    payload.slug = slug

    exists_q = (
        db.query(Node)
        .filter(Node.project_id == target_project)
        .filter(Node.slug == slug)
    )
    if exists_q.first():
        raise HTTPException(status_code=409, detail=f"Slug '{slug}' already exists in this project")

    if getattr(payload, 'composite_id', None):
        composite = db.query(Composite).filter(Composite.id == payload.composite_id).first()
        if not composite:
            raise HTTPException(status_code=404, detail="Composite not found")
        if getattr(payload, 'computation_definition', None):
            raise HTTPException(status_code=422, detail="Composite nodes cannot have a computation_definition")
        if getattr(payload, 'provider_enabled', None):
            raise HTTPException(status_code=422, detail="Composite nodes cannot have providers")
    else:
        # Enforce explicit compute params only for classic nodes
        if getattr(payload, 'computation_definition', None):
            _ = extract_compute_params(payload.computation_definition or '')

    n = node_repo.create(db, payload, project_id=target_project)
    ir = node_repo.in_range(n)

    if ir is False:
        raise HTTPException(status_code=422, detail="value_computed outside plausible_range")
    # Sync edges based on compute params
    if getattr(payload, 'computation_definition', None):
        params = extract_compute_params(payload.computation_definition or '')
        if params:
            sync_edges_for_node(db, target_project, n.id, params)
    roots = _collect_composite_roots(db, [n]) if n.composite_id else {}
    schedule_project_insights(db, target_project, None, background_tasks)
    return node_to_dict(n, roots.get(n.composite_id))


@router.patch("/{node_id}", response_model=NodeOut)
def update_node(
    node_id: str,
    payload: NodeUpdate,
    project: str | None = Query(default=None),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """Update an existing node."""
    q = db.query(Node).filter(Node.id == node_id)
    if project:
        q = q.filter(Node.project_id == project)
    n = q.first()
    if not n:
        raise HTTPException(status_code=404, detail="Node not found")

    update_data = payload.model_dump(exclude_unset=True)
    if 'composite_id' in update_data and update_data['composite_id'] != n.composite_id:
        raise HTTPException(status_code=422, detail="Composite association cannot be changed")
    if 'slug' in update_data:
        new_slug = (update_data['slug'] or '').strip()
        if not new_slug:
            raise HTTPException(status_code=422, detail="Slug cannot be empty")
        conflict = (
            db.query(Node)
            .filter(Node.project_id == n.project_id)
            .filter(Node.slug == new_slug)
            .filter(Node.id != n.id)
            .first()
        )
        if conflict:
            raise HTTPException(status_code=409, detail=f"Slug '{new_slug}' already exists in this project")
    if getattr(payload, 'computation_definition', None):
        if n.composite_id:
            raise HTTPException(status_code=422, detail="Composite nodes cannot define computation logic")
        _ = extract_compute_params(payload.computation_definition or '')
    if n.composite_id and (
        getattr(payload, 'provider_enabled', None) is not None
        or getattr(payload, 'provider_url', None)
        or getattr(payload, 'provider_json_path', None)
    ):
        raise HTTPException(status_code=422, detail="Composite nodes cannot configure providers")

    n = node_repo.update(db, n, payload)
    ir = node_repo.in_range(n)

    if ir is False:
        raise HTTPException(status_code=422, detail="value_computed outside plausible_range")
    # Sync edges
    # If computation_definition is in payload (even if None/empty), we must sync edges
    if 'computation_definition' in payload.model_dump(exclude_unset=True):
        comp_def = getattr(payload, 'computation_definition', '') or ''
        params = extract_compute_params(comp_def)
        # Always sync, passing empty params if no computation (clears edges)
        sync_edges_for_node(db, project or n.project_id, n.id, params)
    roots = _collect_composite_roots(db, [n]) if n.composite_id else {}
    schedule_project_insights(db, n.project_id, None, background_tasks)
    return node_to_dict(n, roots.get(n.composite_id))


@router.delete("/{node_id}", status_code=204)
def delete_node(
    node_id: str,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """Delete a node."""
    n = db.query(Node).get(node_id)
    if not n:
        raise HTTPException(status_code=404, detail="Node not found")

    db.delete(n)
    db.flush()
    schedule_project_insights(db, n.project_id, None, background_tasks)
    return


@router.get("/{node_id}/dependencies", response_model=list[str])
def get_node_dependencies(node_id: str, project: str | None = Query(default=None), db: Session = Depends(get_db)):
    """Return IDs of upstream dependency nodes (sources -> node_id)."""
    q = db.query(Edge).filter(Edge.target == node_id)
    if project:
        q = q.filter(Edge.project_id == project)
    deps = q.all()
    return [e.source for e in deps]


@router.get("/{node_id}/dependents", response_model=list[str])
def get_node_dependents(node_id: str, project: str | None = Query(default=None), db: Session = Depends(get_db)):
    """Return IDs of downstream dependent nodes (node_id -> targets)."""
    q = db.query(Edge).filter(Edge.source == node_id)
    if project:
        q = q.filter(Edge.project_id == project)
    outs = q.all()
    return [e.target for e in outs]


@router.get("/{node_id}/ancestors", response_model=list[str])
def get_node_ancestors(node_id: str, project: str | None = Query(default=None), db: Session = Depends(get_db)):
    """Return IDs of all upstream ancestors (transitive dependencies)."""
    # Build incoming map for quick traversal
    q = db.query(Edge)
    if project:
        q = q.filter(Edge.project_id == project)
    edges = q.all()
    in_map: dict[str, list[str]] = {}
    for e in edges:
        in_map.setdefault(e.target, []).append(e.source)

    visited: set[str] = set()
    stack = list(in_map.get(node_id, []) or [])
    while stack:
        cur = stack.pop()
        if cur in visited:
            continue
        visited.add(cur)
        for p in in_map.get(cur, []) or []:
            if p not in visited:
                stack.append(p)
    return list(visited)
