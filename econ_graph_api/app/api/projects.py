import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Optional, Set
from datetime import datetime
from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.project import Project
from app.models.composite import Composite
from app.models.edge import Edge
from app.models.user import User
from app.models.project_collaborator import ProjectCollaborator
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectOut,
    ProjectExposedRootsResponse,
    ProjectExposedRoot,
    CompositeExposedRoot,
    ProjectCollaboratorOut,
    CollaboratorAdd,
)
from app.models.node import Node
from app.api.nodes import _collect_composite_roots, _extract_composite_root_info
from app.api.insights_trigger import schedule_project_insights
from app.schemas.composite import CompositeGraphData
from pydantic import ValidationError
from sqlalchemy import text, select, or_
from app.services import composite_root_cache, scenario_cache

logger = logging.getLogger(__name__)
import re

COMPUTE_SIGNATURE_RE = re.compile(r"def\s+compute\s*\(([^)]*)\)\s*:")

router = APIRouter(prefix="/projects", tags=["projects"])


def _normalize_identifier(value: Optional[str]) -> str:
    if not value:
        return ""
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower())


def _build_candidate_keys(
    raw_internal_id: Optional[str], slug_key: Optional[str]
) -> list[str]:
    candidates: list[str] = []
    for candidate in (raw_internal_id, slug_key):
        if not candidate:
            continue
        if candidate not in candidates:
            candidates.append(candidate)
        normalized = _normalize_identifier(candidate)
        if normalized and normalized not in candidates:
            candidates.append(normalized)
    return candidates


def _match_project_node(
    entry: dict,
    nodes_by_id: Dict[str, Node],
    nodes_by_slug: Dict[str, Node],
    nodes_by_slug_norm: Dict[str, Node],
    nodes_by_composite_id: Dict[str, List[Node]],
) -> tuple[Optional[Node], list[str], Optional[str], Optional[str]]:
    raw_internal_id = entry.get("raw_internal_id") or entry.get("id")
    slug_key = entry.get("slug") or entry.get("label") or raw_internal_id
    candidate_keys = _build_candidate_keys(raw_internal_id, slug_key)

    for candidate in candidate_keys:
        if not candidate:
            continue
        match = nodes_by_id.get(candidate) or nodes_by_slug.get(candidate)
        if not match:
            match = nodes_by_slug_norm.get(candidate)
        if match:
            return match, candidate_keys, raw_internal_id, slug_key

    composite_id = entry.get("composite_id")
    if composite_id:
        potential_nodes = nodes_by_composite_id.get(composite_id, [])
        if slug_key:
            for node in potential_nodes:
                if node.slug == slug_key:
                    return node, candidate_keys, raw_internal_id, slug_key
        if potential_nodes:
            return potential_nodes[0], candidate_keys, raw_internal_id, slug_key

    return None, candidate_keys, raw_internal_id, slug_key


def _is_overridable_project_node(node: Node) -> bool:
    if getattr(node, "provider_enabled", False):
        return True
    code = node.computation_definition or ""
    if not code.strip():
        return True
    return _has_zero_parameter_compute(node)


def _has_zero_parameter_compute(node: Node) -> bool:
    code = node.computation_definition or ""
    match = COMPUTE_SIGNATURE_RE.search(code)
    if not match:
        return False
    params = [param.strip() for param in match.group(1).split(",") if param.strip()]
    return len(params) == 0


def _load_composite_graph(
    db: Session,
    composite_id: str,
    cache: Dict[str, Optional[CompositeGraphData]],
) -> Optional[CompositeGraphData]:
    if composite_id in cache:
        return cache[composite_id]
    comp = (
        db.query(Composite)
        .filter(Composite.id == composite_id)
        .first()
    )
    if not comp:
        cache[composite_id] = None
        return None
    try:
        graph = CompositeGraphData.model_validate(comp.graph_data or {})
        cache[composite_id] = graph
        return graph
    except ValidationError:
        cache[composite_id] = None
        return None


def _flatten_composite_root_entry(
    db: Session,
    entry: dict,
    cache: Dict[str, Optional[CompositeGraphData]],
    project_id: Optional[str],
    composite_node_instance_id: str,
    nodes_by_id: Dict[str, Node],
    nodes_by_slug: Dict[str, Node],
    nodes_by_slug_norm: Dict[str, Node],
    nodes_by_composite_id: Dict[str, List[Node]],
    visited: Optional[Set[str]] = None,
    root_composite_instance_id: Optional[str] = None,
    cache_composite_instance_id: Optional[str] = None,
    composite_instance_path: Optional[List[str]] = None,
) -> List[dict]:
    visited = visited or set()
    if root_composite_instance_id is None:
        root_composite_instance_id = composite_node_instance_id
    if cache_composite_instance_id is None:
        cache_composite_instance_id = composite_node_instance_id
    base_path = (
        list(composite_instance_path)
        if composite_instance_path
        else [composite_node_instance_id]
    )
    composite_id = entry.get("composite_id")
    match_node, candidate_keys, raw_internal_id, slug_key = _match_project_node(
        entry,
        nodes_by_id,
        nodes_by_slug,
        nodes_by_slug_norm,
        nodes_by_composite_id,
    )
    if composite_id:
        if composite_id in visited:
            return []
        visited.add(composite_id)
        flattened: List[dict] = []
        graph = _load_composite_graph(db, composite_id, cache)
        if graph:
            nested_roots = _extract_composite_root_info(graph)
            nested_instance_id = match_node.id if match_node else None

            # If no project node matches, search for a node with this composite_id
            if not nested_instance_id:
                potential_nodes = nodes_by_composite_id.get(composite_id, [])
                if potential_nodes:
                    nested_instance_id = potential_nodes[0].id
                    logger.info(
                        "[exposed-roots] resolved nested composite entry=%s via composite_id to node=%s",
                        entry.get("slug") or entry.get("id"),
                        nested_instance_id,
                    )

            if nested_instance_id:
                logger.info(
                    "[exposed-roots] resolved nested composite entry=%s to node=%s, base_path=%s",
                    entry.get("slug") or entry.get("id"),
                    nested_instance_id,
                    base_path,
                )

            resolved_root_instance_id = nested_instance_id or root_composite_instance_id
            resolved_cache_instance_id = nested_instance_id or cache_composite_instance_id

            # Build child_path: always append nested_instance_id if it exists and differs from last
            child_path = base_path
            if nested_instance_id and (not base_path or base_path[-1] != nested_instance_id):
                child_path = base_path + [nested_instance_id]
                logger.info(
                    "[exposed-roots] child_path updated to %s for nested composite %s",
                    child_path,
                    composite_id,
                )
            elif not nested_instance_id:
                logger.warning(
                    "[exposed-roots] no instance found for nested composite=%s, keeping base_path=%s",
                    composite_id,
                    base_path,
                )

            for nested in nested_roots:
                flattened.extend(
                    _flatten_composite_root_entry(
                        db,
                        nested,
                        cache,
                        project_id,
                        composite_node_instance_id,
                        nodes_by_id,
                        nodes_by_slug,
                        nodes_by_slug_norm,
                        nodes_by_composite_id,
                        visited,
                        resolved_root_instance_id,
                        resolved_cache_instance_id,
                        composite_instance_path=child_path,
                    )
                )
        visited.discard(composite_id)
        return flattened
    if not entry.get("overridable"):
        return []
    logger.info(
        "[exposed-roots] flatten entry composite=%s entry=%s base_path=%s",
        composite_node_instance_id,
        entry,
        base_path,
    )
    logger.info(
        "[exposed-roots] composite=%s slug=%s internal_id=%s candidate_keys=%s",
        composite_node_instance_id,
        slug_key,
        raw_internal_id,
        candidate_keys,
    )
    enriched = dict(entry)
    enriched["raw_internal_id"] = raw_internal_id or slug_key
    cache_owner = (
        base_path[-1]
        if base_path
        else cache_composite_instance_id
        or composite_node_instance_id
    )
    logger.info(
        "[exposed-roots] cache_owner determined: base_path=%s => cache_owner=%s",
        base_path,
        cache_owner,
    )
    enriched["__cache_node_instance_id"] = cache_owner
    enriched["__composite_instance_path"] = base_path
    if match_node:
        enriched["linked_node_instance_id"] = match_node.id
        enriched["current_value"] = match_node.value_computed
    else:
        logger.info(
            "[exposed-roots] no linked node for composite root %s (composite=%s)",
            slug_key,
            composite_node_instance_id,
        )
    cache_keys: list[str] = []
    if raw_internal_id:
        cache_keys.append(raw_internal_id)
    if slug_key and slug_key not in cache_keys:
        cache_keys.append(slug_key)
    cached_value = None
    if cache_keys:
        logger.info(
            "[exposed-roots] composite=%s available real keys=%s trying=%s",
            cache_owner,
            composite_root_cache.list_real_keys(
                project_id, cache_owner
            ),
            cache_keys,
        )
    for cache_key in cache_keys:
        cached_value = composite_root_cache.get_real_value(
            project_id,
            cache_owner,
            cache_key,
        )
        if cached_value is not None:
            enriched["current_value"] = cached_value
            break
        if cache_owner:
            override_node_id = (
                f"composite::{cache_owner}::{cache_key}"
            )
            cached_value = scenario_cache.get_real_value(
                project_id, override_node_id
            )
            if cached_value is not None:
                enriched["current_value"] = cached_value
                break
            logger.info(
                "[exposed-roots] no cached value for virtual node %s (fallback id=%s)",
                override_node_id,
                cache_key,
            )
    if enriched.get("current_value") is None:
        logger.info(
            "[exposed-roots] unresolved current_value for composite root %s (composite=%s)",
            slug_key,
            composite_node_instance_id,
        )
    return [enriched]


@router.get("", response_model=List[ProjectOut])
def list_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Note: Can't use .distinct() with JSON columns in PostgreSQL
    # So we fetch all and deduplicate manually
    projects_query = db.query(Project).options(joinedload(Project.collaborators)).outerjoin(ProjectCollaborator).filter(
        or_(
            Project.user_id == current_user.id,
            ProjectCollaborator.user_id == current_user.id
        )
    ).order_by(Project.updated_at.desc()).all()
    
    # Deduplicate by project ID
    seen_ids = set()
    projects = []
    for p in projects_query:
        if p.id not in seen_ids:
            seen_ids.add(p.id)
            projects.append(p)
    
    # Enrich with user_role
    enriched = []
    for p in projects:
        # Determine user role
        if p.user_id == current_user.id:
            user_role = "owner"
        else:
            collab = db.query(ProjectCollaborator).filter(
                ProjectCollaborator.project_id == p.id,
                ProjectCollaborator.user_id == current_user.id
            ).first()
            user_role = collab.role if collab else None
        
        owner_data = None
        if p.owner:
            owner_data = {
                "id": p.owner.id,
                "username": p.owner.username,
                "email": p.owner.email
            }

        collaborator_count = len(p.collaborators or [])

        # Convert to dict and add user_role
        project_dict = {
            "id": p.id,
            "name": p.name,
            "status": getattr(p, 'status', 'completed'),  # Default for old projects
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "public_view_token": p.public_view_token,
            "user_id": p.user_id,
            "user_role": user_role,
            "collaborator_count": collaborator_count,
            "wizard_state": getattr(p, 'wizard_state', None),
            "generation_prompt": p.generation_prompt,
            "description": p.description,
            "owner": owner_data
        }
        enriched.append(project_dict)
    
    return enriched


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None,
):
    if db.query(Project).filter(Project.id == payload.id).first():
        raise HTTPException(status_code=409, detail="Project id already exists")
    p = Project(
        id=payload.id, 
        name=payload.name, 
        user_id=current_user.id,
        status=payload.status,
        wizard_state=payload.wizard_state,
        created_at=datetime.utcnow(), 
        updated_at=datetime.utcnow(),
        generation_prompt=payload.generation_prompt,
        description=payload.description
    )
    db.add(p)
    db.flush()
    schedule_project_insights(db, p.id, current_user.id, background_tasks)
    
    # Return with user_role
    return {
        "id": p.id,
        "name": p.name,
        "status": p.status,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
        "public_view_token": p.public_view_token,
        "user_id": p.user_id,
        "user_role": "owner",
        "collaborator_count": 0,
        "wizard_state": p.wizard_state,
        "generation_prompt": p.generation_prompt,
        "description": p.description
    }


def _get_project_with_access(db: Session, project_id: str, user: User, required_role: str = "viewer") -> Project:
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Owner always has access
    if p.user_id == user.id:
        return p
    
    # Check collaborator
    collab = db.query(ProjectCollaborator).filter(
        ProjectCollaborator.project_id == project_id,
        ProjectCollaborator.user_id == user.id
    ).first()
    
    if not collab:
        raise HTTPException(status_code=403, detail="Not authorized to access this project")
        
    if required_role == "editor" and collab.role != "editor":
        raise HTTPException(status_code=403, detail="Editor access required")
        
    return p


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = _get_project_with_access(db, project_id, current_user, required_role="viewer")
    
    # Determine user role
    user_role = "viewer"
    if p.user_id == current_user.id:
        user_role = "owner"
    else:
        collab = db.query(ProjectCollaborator).filter(
            ProjectCollaborator.project_id == p.id,
            ProjectCollaborator.user_id == current_user.id
        ).first()
        if collab:
            user_role = collab.role

    owner_data = None
    if p.owner:
       owner_data = {
          "id": p.owner.id, 
          "username": p.owner.username, 
          "email": p.owner.email
       }

    collaborator_count = db.query(ProjectCollaborator).filter(
        ProjectCollaborator.project_id == p.id
    ).count()

    return {
        "id": p.id,
        "name": p.name,
        "status": p.status,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
        "public_view_token": p.public_view_token,
        "user_id": p.user_id,
        "user_role": user_role,
        "collaborator_count": collaborator_count,
        "wizard_state": p.wizard_state,
        "generation_prompt": p.generation_prompt,
        "description": p.description,
        "owner": owner_data
    }


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: str,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None,
):
    p = _get_project_with_access(db, project_id, current_user, required_role="editor")
    
    data = payload.model_dump(exclude_unset=True)
    if 'name' in data and data['name']:
        p.name = data['name']
    if 'status' in data and data['status']:
        p.status = data['status']
    if 'wizard_state' in data:
        p.wizard_state = data['wizard_state']
    if 'description' in data:
        p.description = data['description']
    p.updated_at = datetime.utcnow()
    db.flush()
    schedule_project_insights(db, p.id, current_user.id, background_tasks)
    
    # Determine user role
    if p.user_id == current_user.id:
        user_role = "owner"
    else:
        collab = db.query(ProjectCollaborator).filter(
            ProjectCollaborator.project_id == p.id,
            ProjectCollaborator.user_id == current_user.id
        ).first()
        user_role = collab.role if collab else None
    
    collaborator_count = db.query(ProjectCollaborator).filter(
        ProjectCollaborator.project_id == p.id
    ).count()

    return {
        "id": p.id,
        "name": p.name,
        "status": p.status,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
        "public_view_token": p.public_view_token,
        "user_id": p.user_id,
        "user_role": user_role,
        "collaborator_count": collaborator_count,
        "wizard_state": p.wizard_state,
        "generation_prompt": p.generation_prompt,
        "description": p.description
    }


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if p.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can delete it")

    # Deleting a project should cascade delete nodes/edges via FK constraints
    # Explicitly delete conversation to avoid "null value in column project_id" error
    # if SQLAlchemy tries to nullify relationships before deletion.
    db.execute(
        text("DELETE FROM project_conversation WHERE project_id = :pid"),
        {"pid": project_id}
    )
    
    db.delete(p)
    db.flush()
    return


@router.post("/{project_id}/share", response_model=ProjectOut)
def share_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if p.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can manage public link")
    
    import secrets
    if not p.public_view_token:
        p.public_view_token = secrets.token_urlsafe(32)
        db.flush()
    
    collaborator_count = db.query(ProjectCollaborator).filter(
        ProjectCollaborator.project_id == p.id
    ).count()

    return {
        "id": p.id,
        "name": p.name,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
        "public_view_token": p.public_view_token,
        "user_id": p.user_id,
        "user_role": "owner",
        "collaborator_count": collaborator_count
    }


@router.delete("/{project_id}/share", response_model=ProjectOut)
def revoke_project_share(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if p.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can manage public link")
    
    p.public_view_token = None
    db.flush()
    
    collaborator_count = db.query(ProjectCollaborator).filter(
        ProjectCollaborator.project_id == p.id
    ).count()

    return {
        "id": p.id,
        "name": p.name,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
        "public_view_token": p.public_view_token,
        "user_id": p.user_id,
        "user_role": "owner",
        "collaborator_count": collaborator_count
    }


@router.get("/{project_id}/collaborators", response_model=List[ProjectCollaboratorOut])
def list_collaborators(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check access (viewer is enough to see collaborators?)
    # Usually yes, or maybe only owner/editor? Let's say viewer.
    p = _get_project_with_access(db, project_id, current_user, required_role="viewer")
    
    collabs = db.query(ProjectCollaborator).filter(ProjectCollaborator.project_id == project_id).all()
    results = []
    for c in collabs:
        u = db.query(User).filter(User.id == c.user_id).first()
        if u:
            results.append({
                "user_id": u.id,
                "username": u.username,
                "email": u.email,
                "role": c.role
            })
    return results


@router.post("/{project_id}/collaborators", response_model=ProjectCollaboratorOut)
def add_collaborator(project_id: str, payload: CollaboratorAdd, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if p.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can manage collaborators")
        
    target_user = db.query(User).filter(
        or_(User.email == payload.email_or_username, User.username == payload.email_or_username)
    ).first()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if target_user.id == p.user_id:
        raise HTTPException(status_code=400, detail="Cannot add owner as collaborator")
        
    collab = db.query(ProjectCollaborator).filter(
        ProjectCollaborator.project_id == project_id,
        ProjectCollaborator.user_id == target_user.id
    ).first()
    
    if collab:
        collab.role = payload.role
    else:
        collab = ProjectCollaborator(project_id=project_id, user_id=target_user.id, role=payload.role)
        db.add(collab)
        
    db.flush()
    
    return {
        "user_id": target_user.id,
        "username": target_user.username,
        "email": target_user.email,
        "role": collab.role
    }


@router.delete("/{project_id}/collaborators/{user_id}", status_code=204)
def remove_collaborator(project_id: str, user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if p.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can manage collaborators")
        
    collab = db.query(ProjectCollaborator).filter(
        ProjectCollaborator.project_id == project_id,
        ProjectCollaborator.user_id == user_id
    ).first()
    
    if collab:
        db.delete(collab)
        db.flush()
    return


@router.get("/{project_id}/exposed-roots", response_model=ProjectExposedRootsResponse)
def get_project_exposed_roots(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Viewer access is enough
    project = _get_project_with_access(db, project_id, current_user, required_role="viewer")

    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    if not nodes:
        return ProjectExposedRootsResponse(project_roots=[], composite_roots=[])

    edges = db.query(Edge).filter(Edge.project_id == project_id).all()
    incoming_counts = {node.id: 0 for node in nodes}
    for edge in edges:
        incoming_counts[edge.target] = incoming_counts.get(edge.target, 0) + 1

    nodes_by_id = {node.id: node for node in nodes}
    nodes_by_slug = {node.slug: node for node in nodes if node.slug}
    nodes_by_slug_norm = {
        _normalize_identifier(node.slug): node
        for node in nodes
        if node.slug
    }
    nodes_by_slug_norm.update(
        {_normalize_identifier(node.id): node for node in nodes}
    )

    nodes_by_composite_id: Dict[str, List[Node]] = {}
    for node in nodes:
        if node.composite_id:
            nodes_by_composite_id.setdefault(node.composite_id, []).append(node)

    project_roots: List[ProjectExposedRoot] = []
    for node in nodes:
        if (
            incoming_counts.get(node.id, 0) == 0
            and not node.composite_id
            and _is_overridable_project_node(node)
        ):
            project_roots.append(
                ProjectExposedRoot(
                    instance_id=node.id,
                    label=node.label,
                    unit=node.unit,
                )
            )

    composite_nodes = [node for node in nodes if node.composite_id]
    composite_roots_data = _collect_composite_roots(db, composite_nodes)

    composite_roots: List[CompositeExposedRoot] = []
    composite_graph_cache: Dict[str, Optional[CompositeGraphData]] = {}
    seen_pairs: Set[tuple[str, str]] = set()
    for node in composite_nodes:
        root_details = composite_roots_data.get(node.composite_id, {}).get("details", [])
        flattened: List[dict] = []
        for root in root_details:
            flattened.extend(
                _flatten_composite_root_entry(
                    db,
                    root,
                    composite_graph_cache,
                    project_id,
                    node.id,
                    nodes_by_id,
                    nodes_by_slug,
                    nodes_by_slug_norm,
                    nodes_by_composite_id,
                    root_composite_instance_id=node.id,
                    cache_composite_instance_id=node.id,
                    composite_instance_path=[node.id],
                )
            )
        for root in flattened:
            raw_identifier = root.get("raw_internal_id") or root.get("id")
            display_identifier = root.get("slug") or root.get("label") or raw_identifier
            if not raw_identifier and not display_identifier:
                continue
            cache_owner = root.pop("__cache_node_instance_id", None)
            path = root.pop("__composite_instance_path", None)
            if not path:
                fallback_owner = cache_owner or node.id
                path = [fallback_owner] if fallback_owner else [node.id]
            pair_key = (node.id, raw_identifier or display_identifier)
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)
            composite_roots.append(
                CompositeExposedRoot(
                    composite_node_instance_id=node.id,
                    composite_id=node.composite_id or "",
                    internal_id=display_identifier or "",
                    raw_internal_id=raw_identifier or display_identifier or "",
                    linked_node_instance_id=root.get("linked_node_instance_id"),
                    label=root.get("label"),
                    unit=root.get("unit"),
                    current_value=root.get("current_value"),
                    composite_instance_path=path,
                )
            )

    return ProjectExposedRootsResponse(
        project_roots=project_roots,
        composite_roots=composite_roots,
    )


def make_short_id(label: str) -> str:
    base = label.lower()
    base = (
        base
        .strip()
        .encode('ascii', 'ignore')
        .decode('ascii')
    )
    base = re.sub(r"[^a-z0-9_]+", "_", base)
    base = re.sub(r"_+", "_", base).strip("_")
    if not re.match(r"^[a-z_][a-z0-9_]*$", base or ""):
        base = f"n"
    return base[:16] or "n"


@router.post("/{project_id}/refactor-ids", response_model=dict)
def refactor_project_ids(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Refactor node IDs within a project to short, valid identifiers.
    - Generates unique short IDs per node within the project
    - Updates edges source/target
    - Updates computation_definition: replaces parameter names and identifiers via word-boundary matching
    - Rebuilds foreign keys with ON UPDATE CASCADE, ON DELETE CASCADE
    """
    # Editor access required
    _get_project_with_access(db, project_id, current_user, required_role="editor")

    # Load all nodes in project
    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    if not nodes:
        return {"updated": 0, "mapping": {}, "message": "No nodes in project"}

    # Build global set of existing IDs to avoid collisions
    all_ids = set([r[0] for r in db.execute(select(Node.id)).all()])

    mapping = {}
    used = set(all_ids)
    for n in nodes:
        base = make_short_id(n.label or n.id)
        candidate = base
        i = 1
        while candidate in used:
            candidate = f"{base}_{i}"
            i += 1
        mapping[n.id] = candidate
        used.add(candidate)

    # No changes needed
    if all(k == v for k, v in mapping.items()):
        return {"updated": 0, "mapping": {}, "message": "IDs already short/unique"}

    # Drop edge FK constraints to allow updates
    db.execute(text("ALTER TABLE edge DROP CONSTRAINT IF EXISTS edge_source_fkey"))
    db.execute(text("ALTER TABLE edge DROP CONSTRAINT IF EXISTS edge_target_fkey"))

    # Update edges first (source/target)
    for old, new in mapping.items():
        if old == new:
            continue
        db.execute(text("UPDATE edge SET source = :new WHERE source = :old"), {"new": new, "old": old})
        db.execute(text("UPDATE edge SET target = :new WHERE target = :old"), {"new": new, "old": old})

    # Update nodes.id
    # To avoid unique conflicts, process in a stable order where new IDs do not clash with existing ones.
    # Use temporary IDs when necessary.
    temp_map = {}
    for old, new in mapping.items():
        if old == new:
            continue
        temp = f"__tmp__{new}__"
        temp_map[old] = temp
        db.execute(text("UPDATE node SET id = :temp WHERE id = :old"), {"temp": temp, "old": old})
    for old, new in mapping.items():
        if old == new:
            continue
        temp = temp_map[old]
        db.execute(text("UPDATE node SET id = :new WHERE id = :temp"), {"new": new, "temp": temp})

    # Update computation_definition: replace identifiers (word boundary) for all nodes in this project
    ident_pairs = sorted(mapping.items(), key=lambda kv: -len(kv[0]))  # longest first to avoid partials
    for n in db.query(Node).filter(Node.project_id == project_id).all():
        code = n.computation_definition or ""
        if not code:
            continue
        for old, new in ident_pairs:
            if old == new:
                continue
            # Replace in signature and body via word boundary
            code = re.sub(rf"\b{re.escape(old)}\b", new, code)
        n.computation_definition = code

    # Recreate FKs with ON UPDATE CASCADE to ease future refactors
    db.execute(text("ALTER TABLE edge ADD CONSTRAINT edge_source_fkey FOREIGN KEY (source) REFERENCES node(id) ON UPDATE CASCADE ON DELETE CASCADE"))
    db.execute(text("ALTER TABLE edge ADD CONSTRAINT edge_target_fkey FOREIGN KEY (target) REFERENCES node(id) ON UPDATE CASCADE ON DELETE CASCADE"))

    db.flush()
    return {"updated": len(nodes), "mapping": mapping}


def _rewrite_compute_signature(code: str, params: list[str]) -> str:
    """Rewrite def compute(...) signature to use explicit params.

    If no signature is present, wrap the existing body with a new def compute(...):
    """
    if not code:
        return code
    sig_re = re.compile(r"(def\s+compute\s*\()([^)]*)(\)\s*:)", re.MULTILINE)
    new_params = ", ".join(params)
    m = sig_re.search(code)
    if m:
        # Replace existing signature
        return sig_re.sub(rf"\\1{new_params}\\3", code, count=1)
    else:
        # No def line found: wrap as a function, preserving body
        body = code.strip("\n")
        # Ensure body is indented
        indented = "\n".join([("    " + line if line.strip() else line) for line in body.splitlines()])
        return f"def compute({new_params}):\n{indented}\n"


def _replace_kwargs_usages(code: str, params: list[str]) -> str:
    """Replace kwargs access patterns with direct param names."""
    if not code:
        return code
    for p in params:
        # kwargs.get('p') or kwargs.get("p")
        code = re.sub(rf"kwargs\s*\.\s*get\(\s*['\"]{re.escape(p)}['\"]\s*\)", p, code)
        # kwargs['p'] or kwargs["p"]
        code = re.sub(rf"kwargs\s*\[\s*['\"]{re.escape(p)}['\"]\s*\]", p, code)
    return code


def _sanitize_backref_artifacts(code: str) -> str:
    """Remove stray backreference artifacts like \1 ... \3 from prior bad rewrites."""
    if not code:
        return code
    # Remove literal \1 and \3 tokens
    code = code.replace("\\1", "").replace("\\3", "")
    # Also drop any empty lines created
    lines = code.splitlines()
    cleaned = []
    for ln in lines:
        if not ln.strip():
            cleaned.append(ln)
            continue
        cleaned.append(ln)
    return "\n".join(cleaned)


@router.post("/{project_id}/normalize-compute", response_model=dict)
def normalize_compute(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None,
):
    """Normalize compute definitions to explicit param signatures and remove kwargs usages.

    For each node in the project with a computation definition:
    - Derive parameter list from incoming dependency edges (sorted by source)
    - Rewrite the compute signature to def compute(p1, p2, ...):
    - Replace kwargs.get('p') or kwargs['p'] with direct param 'p'
    - Save and optionally resync edges (they already reflect params used to build signature)
    """
    # Editor access required
    _get_project_with_access(db, project_id, current_user, required_role="editor")

    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    if not nodes:
        return {"updated": 0}

    total_updated = 0
    for n in nodes:
        if not n.computation_definition:
            continue
        # Incoming edges define desired params
        incoming = (
            db.query(Edge)
            .filter(Edge.project_id == project_id, Edge.target == n.id)
            .all()
        )
        params = sorted({e.source for e in incoming})
        # Rewrite code
        new_code = _rewrite_compute_signature(n.computation_definition, params)
        new_code = _replace_kwargs_usages(new_code, params)
        new_code = _sanitize_backref_artifacts(new_code)
        if new_code != n.computation_definition:
            n.computation_definition = new_code
            total_updated += 1
        # Ensure edges match params (delete extras, add missing)
        existing_incoming = incoming
        keep = set(params)
        for e in existing_incoming:
            if e.source not in keep:
                db.execute(text("DELETE FROM edge WHERE id=:id"), {"id": e.id})
        for src in params:
            if not any(e.source == src and e.target == n.id for e in existing_incoming):
                eid = f"{src}->{n.id}"
                db.add(Edge(id=eid, source=src, target=n.id, label=None, edge_type='dependency', rule_id=None, project_id=project_id))

    db.flush()
    schedule_project_insights(db, project_id, current_user.id, background_tasks)
    return {"updated": total_updated}


def _extract_params_from_compute(code: str) -> list[str]:
    if not code:
        return []
    m = re.search(r"def\s+compute\s*\(([^)]*)\)\s*:", code)
    if not m:
        return []
    params_raw = m.group(1).strip()
    if not params_raw:
        return []
    # simple split on commas
    return [p.strip() for p in params_raw.split(',') if p.strip()]


@router.post("/{project_id}/rebuild-edges", response_model=dict)
def rebuild_edges(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None,
):
    """Rebuild dependency edges for all nodes from their compute() param lists."""
    # Editor access required
    _get_project_with_access(db, project_id, current_user, required_role="editor")

    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    created = 0
    deleted = 0
    for n in nodes:
        params = _extract_params_from_compute(n.computation_definition or "")
        if not params:
            continue
        existing = db.query(Edge).filter(Edge.project_id == project_id, Edge.target == n.id).all()
        keep = set(params)

        # Delete edges not in params
        for e in list(existing):
            if e.source not in keep:
                db.delete(e)
                deleted += 1
                existing.remove(e)

        # Deduplicate: keep only one edge per source
        seen = set()
        for e in list(existing):
            key = (e.source, e.target)
            if key in seen:
                db.delete(e)
                deleted += 1
                existing.remove(e)
            else:
                seen.add(key)

        # Create missing edges for required params
        existing_sources = {e.source for e in existing}
        for src in params:
            if src not in existing_sources:
                eid = f"{src}->{n.id}"
                if not db.query(Edge).filter(Edge.id == eid).first():
                    db.add(Edge(id=eid, source=src, target=n.id, label=None, edge_type='dependency', rule_id=None, project_id=project_id))
                    created += 1
    db.flush()
    schedule_project_insights(db, project_id, current_user.id, background_tasks)
    return {"edges_created": created, "edges_deleted": deleted}
def _normalize_identifier(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower())
