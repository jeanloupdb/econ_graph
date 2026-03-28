import re
import uuid
from datetime import datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models import Node, Scenario, Edge
from app.models.scenario import ScenarioNodeOverride
from app.services.computation import compute_all_nodes
from app.services.dependency_tracker import invalidate_dependency_graph
from app.services import scenario_cache

logger = get_logger(__name__)


def execute_tool(tool_name: str, args: dict, db: Session, project_id: str, nodes_map: dict) -> dict:
    """Execute a tool and return the result."""
    logger.info("Executing tool", tool=tool_name, args=args, project_id=project_id)
    try:
        result = _dispatch_tool(tool_name, args, db, project_id, nodes_map)
        logger.info("Tool result", tool=tool_name, success=result.get("success", True))
        return result
    except Exception as e:
        logger.error("Tool execution failed", tool=tool_name, error=str(e), project_id=project_id)
        return {"success": False, "error": f"Erreur lors de l'exécution de {tool_name}: {str(e)}"}


def _dispatch_tool(tool_name: str, args: dict, db: Session, project_id: str, nodes_map: dict) -> dict:
    """Dispatch to the right tool function."""
    if tool_name == "update_node_formula":
        return _update_node_formula(db, project_id, nodes_map, args)
    elif tool_name == "convert_to_parameter":
        return _convert_to_parameter(db, project_id, nodes_map, args)
    elif tool_name == "delete_edge":
        return _delete_edge(db, project_id, nodes_map, args)
    elif tool_name == "get_node_details":
        return _get_node_details(db, project_id, nodes_map, args)
    elif tool_name == "detect_cycles":
        return _detect_cycles(db, project_id, nodes_map)
    elif tool_name == "create_node":
        return _create_node(db, project_id, nodes_map, args)
    elif tool_name == "update_node_fields":
        return _update_node_fields(db, project_id, nodes_map, args)
    elif tool_name == "delete_node":
        return _delete_node(db, project_id, nodes_map, args)
    elif tool_name == "create_scenario":
        return _create_scenario(db, project_id, args)
    elif tool_name == "update_scenario":
        return _update_scenario(db, project_id, args)
    elif tool_name == "delete_scenario":
        return _delete_scenario(db, project_id, args)
    elif tool_name == "set_scenario_override":
        return _set_scenario_override(db, project_id, nodes_map, args)
    elif tool_name == "delete_scenario_override":
        return _delete_scenario_override(db, project_id, nodes_map, args)
    elif tool_name == "recompute_project":
        return _recompute_project(db, project_id, args)
    elif tool_name == "list_computation_errors":
        return _list_computation_errors(db, project_id)
    elif tool_name == "create_sensitivity_analysis":
        return _create_sensitivity_analysis(db, project_id, nodes_map, args)
    elif tool_name == "search_nodes":
        return _search_nodes(db, project_id, args)
    elif tool_name == "list_parameters":
        return _list_parameters(db, project_id)
    elif tool_name == "list_nodes":
        return _list_nodes(db, project_id, args)
    elif tool_name == "list_edges":
        return _list_edges(db, project_id, args)
    elif tool_name == "list_scenarios":
        return _list_scenarios(db, project_id)
    elif tool_name == "list_overrides":
        return _list_overrides(db, project_id, args)
    elif tool_name == "list_providers":
        return _list_providers(db, project_id)
    elif tool_name == "get_project_summary":
        return _get_project_summary(db, project_id)
    elif tool_name == "regenerate_dashboard":
        return _regenerate_dashboard(db, project_id)
    else:
        return {"error": f"Unknown tool: {tool_name}"}


def _update_node_formula(db: Session, project_id: str, nodes_map: dict, args: dict) -> dict:
    """Update a node's formula."""
    slug = args.get("node_slug")
    new_inputs = args.get("new_inputs", [])
    new_formula = args.get("new_formula", "0")

    node = nodes_map.get(slug)
    if not node:
        return {"success": False, "error": f"Nœud '{slug}' non trouvé"}

    # Generate new computation_definition
    args_str = ", ".join(new_inputs) if new_inputs else ""
    new_definition = f"def compute({args_str}):\n    return {new_formula}"

    # Update node
    node.computation_definition = new_definition
    node.status = "implied"  # It's now a computed node

    # Update edges: delete old incoming edges, create new ones
    db.query(Edge).filter(
        Edge.project_id == project_id,
        Edge.target == node.id,
        Edge.edge_type == "dependency"
    ).delete()

    # Create new edges
    for input_slug in new_inputs:
        source_node = nodes_map.get(input_slug)
        if source_node:
            edge = Edge(
                id=str(uuid.uuid4()),
                project_id=project_id,
                source=source_node.id,
                target=node.id,
                edge_type="dependency"
            )
            db.add(edge)

    db.flush()
    invalidate_dependency_graph(project_id)
    compute_all_nodes(db, project_id=project_id)

    return {
        "success": True,
        "message": f"Formule de '{node.label}' mise à jour avec inputs {new_inputs}",
        "node_id": node.id,
        "node_label": node.label,
        "node_slug": node.slug,
        "status": "modifie",
        "target": {"kind": "node-field", "id": node.id, "field": "formula"},
    }


def _convert_to_parameter(db: Session, project_id: str, nodes_map: dict, args: dict) -> dict:
    """Convert a computed node to a parameter."""
    slug = args.get("node_slug")
    fixed_value = args.get("fixed_value", 0)

    node = nodes_map.get(slug)
    if not node:
        return {"success": False, "error": f"Nœud '{slug}' non trouvé"}

    # Update node to be a parameter
    node.computation_definition = f"def compute():\n    return {fixed_value}"
    node.status = "imposed"
    node.value_computed = fixed_value

    # Delete all incoming edges (this node no longer depends on anything)
    db.query(Edge).filter(
        Edge.project_id == project_id,
        Edge.target == node.id,
        Edge.edge_type == "dependency"
    ).delete()

    db.flush()
    invalidate_dependency_graph(project_id)
    compute_all_nodes(db, project_id=project_id)

    return {
        "success": True,
        "message": f"'{node.label}' converti en paramètre avec valeur {fixed_value}",
        "node_id": node.id,
        "node_label": node.label,
        "node_slug": node.slug,
        "status": "modifie",
        "target": {"kind": "node-field", "id": node.id, "field": "value"},
    }


def _delete_edge(db: Session, project_id: str, nodes_map: dict, args: dict) -> dict:
    """Delete an edge between two nodes."""
    source_slug = args.get("source_slug")
    target_slug = args.get("target_slug")

    source_node = nodes_map.get(source_slug)
    target_node = nodes_map.get(target_slug)

    if not source_node:
        return {"success": False, "error": f"Nœud source '{source_slug}' non trouvé"}
    if not target_node:
        return {"success": False, "error": f"Nœud cible '{target_slug}' non trouvé"}

    # Delete the edge
    deleted = db.query(Edge).filter(
        Edge.project_id == project_id,
        Edge.source == source_node.id,
        Edge.target == target_node.id,
        Edge.edge_type == "dependency"
    ).delete()

    if deleted == 0:
        return {"success": False, "error": f"Aucune dépendance trouvée de '{source_slug}' vers '{target_slug}'"}

    # Also need to update the target node's computation_definition to remove the input
    if target_node.computation_definition:
        # Extract current inputs from def compute(a, b, c):
        match = re.search(r"def\s+compute\s*\(([^)]*)\)\s*:", target_node.computation_definition)
        if match:
            current_inputs = [p.strip() for p in match.group(1).split(",") if p.strip()]
            if source_slug in current_inputs:
                current_inputs.remove(source_slug)
                # Rebuild the definition
                args_str = ", ".join(current_inputs)
                # Keep the return part
                return_match = re.search(r"return\s+(.+)", target_node.computation_definition)
                if return_match:
                    formula = return_match.group(1).strip()
                    target_node.computation_definition = f"def compute({args_str}):\n    return {formula}"

    db.flush()
    invalidate_dependency_graph(project_id)
    compute_all_nodes(db, project_id=project_id)

    return {
        "success": True,
        "message": f"Dépendance supprimée: '{target_slug}' ne dépend plus de '{source_slug}'",
        "source_id": source_node.id,
        "target_id": target_node.id,
        "source_label": source_node.label,
        "target_label": target_node.label,
        "status": "supprime",
    }


def _slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "_", value.strip().lower())
    cleaned = re.sub(r"_+", "_", cleaned).strip("_")
    return cleaned or "node"


def _build_compute_definition(formula: str, inputs: list[str]) -> str:
    args_str = ", ".join(inputs) if inputs else ""
    return f"def compute({args_str}):\n    return {formula}"


def _extract_compute_formula(code: str) -> str:
    if not code:
        return "0"
    match = re.search(r"return\s+(.+)", code)
    return match.group(1).strip() if match else "0"


def _replace_compute_signature(code: str, params: list[str]) -> str:
    if not code:
        return _build_compute_definition("0", params)
    sig_re = re.compile(r"(def\s+compute\s*\()([^)]*)(\)\s*:)", re.MULTILINE)
    new_params = ", ".join(params)
    m = sig_re.search(code)
    if m:
        return sig_re.sub(rf"\\1{new_params}\\3", code, count=1)
    body = code.strip("\n")
    indented = "\n".join([("    " + line if line.strip() else line) for line in body.splitlines()])
    return f"def compute({new_params}):\n{indented}\n"


def _create_node(db: Session, project_id: str, nodes_map: dict, args: dict) -> dict:
    label = args.get("label")
    if not label:
        return {"success": False, "error": "Label requis"}
    node_type = args.get("node_type")
    if node_type not in {"parameter", "computed"}:
        return {"success": False, "error": "node_type doit être 'parameter' ou 'computed'"}

    slug = args.get("slug") or _slugify(label)
    base_slug = slug
    counter = 2
    while slug in nodes_map:
        slug = f"{base_slug}_{counter}"
        counter += 1

    unit = args.get("unit")
    notes = args.get("notes")
    default_value = args.get("default_value")
    formula = args.get("formula")
    inputs = args.get("inputs") or []

    if node_type == "computed":
        if not formula:
            return {"success": False, "error": "formula requis pour un nœud calculé"}
        missing_inputs = [s for s in inputs if s not in nodes_map]
        if missing_inputs:
            return {"success": False, "error": f"Inputs introuvables: {', '.join(missing_inputs)}"}
        computation_definition = _build_compute_definition(formula, inputs)
        status = "implied"
    else:
        if default_value is None:
            default_value = 0
        computation_definition = _build_compute_definition(str(default_value), [])
        status = "imposed"

    node = Node(
        id=str(uuid.uuid4()),
        slug=slug,
        project_id=project_id,
        label=label,
        unit=unit,
        status=status,
        computation_definition=computation_definition,
        value_computed=default_value if node_type == "parameter" else None,
        notes=notes,
        confidence=1.0,
    )
    db.add(node)
    db.flush()
    nodes_map[slug] = node

    if node_type == "computed" and inputs:
        for input_slug in inputs:
            source_node = nodes_map.get(input_slug)
            if not source_node:
                continue
            edge = Edge(
                id=str(uuid.uuid4()),
                project_id=project_id,
                source=source_node.id,
                target=node.id,
                edge_type="dependency",
            )
            db.add(edge)

    db.flush()
    invalidate_dependency_graph(project_id)
    return {
        "success": True,
        "message": f"Nœud créé: {label}",
        "node_id": node.id,
        "node_slug": node.slug,
        "status": "cree",
    }


def _update_node_fields(db: Session, project_id: str, nodes_map: dict, args: dict) -> dict:
    slug = args.get("node_slug")
    node = nodes_map.get(slug)
    if not node:
        return {"success": False, "error": f"Nœud '{slug}' non trouvé"}

    label = args.get("label")
    unit = args.get("unit")
    notes = args.get("notes")
    status = args.get("status")
    value = args.get("value")
    formula = args.get("formula")
    inputs = args.get("inputs")

    if label is not None:
        node.label = label
    if unit is not None:
        node.unit = unit
    if notes is not None:
        node.notes = notes
    if status is not None:
        node.status = status

    if value is not None:
        node.value_computed = value
        if (status == "imposed" or node.status == "imposed") and formula is None and inputs is None:
            node.computation_definition = _build_compute_definition(str(value), [])

    if formula is not None or inputs is not None:
        if inputs is None:
            incoming = db.query(Edge).filter(
                Edge.project_id == project_id,
                Edge.target == node.id,
                Edge.edge_type == "dependency",
            ).all()
            inputs = []
            for e in incoming:
                for n in nodes_map.values():
                    if n.id == e.source:
                        inputs.append(n.slug)
                        break
        if formula is None:
            formula = _extract_compute_formula(node.computation_definition or "")
        node.computation_definition = _build_compute_definition(formula, inputs)
        node.status = "implied"

        db.query(Edge).filter(
            Edge.project_id == project_id,
            Edge.target == node.id,
            Edge.edge_type == "dependency",
        ).delete()

        for input_slug in inputs:
            source_node = nodes_map.get(input_slug)
            if not source_node:
                continue
            edge = Edge(
                id=str(uuid.uuid4()),
                project_id=project_id,
                source=source_node.id,
                target=node.id,
                edge_type="dependency",
            )
            db.add(edge)

    db.flush()
    invalidate_dependency_graph(project_id)
    return {
        "success": True,
        "message": f"Nœud '{node.label}' mis à jour",
        "node_id": node.id,
        "node_slug": node.slug,
        "status": "modifie",
        "target": {"kind": "node", "id": node.id},
    }


def _delete_node(db: Session, project_id: str, nodes_map: dict, args: dict) -> dict:
    slug = args.get("node_slug")
    node = nodes_map.get(slug)
    if not node:
        return {"success": False, "error": f"Nœud '{slug}' non trouvé"}

    db.query(Edge).filter(
        Edge.project_id == project_id,
        (Edge.source == node.id) | (Edge.target == node.id)
    ).delete()
    db.query(ScenarioNodeOverride).filter(
        ScenarioNodeOverride.node_id == node.id
    ).delete()
    db.delete(node)
    nodes_map.pop(slug, None)
    db.flush()
    invalidate_dependency_graph(project_id)
    return {
        "success": True,
        "message": f"Nœud supprimé: {slug}",
        "status": "supprime",
    }


def _create_scenario(db: Session, project_id: str, args: dict) -> dict:
    name = args.get("name")
    if not name:
        return {"success": False, "error": "name requis"}
    # Prevent duplicates: if a scenario with the same name exists, return it
    existing = db.query(Scenario).filter(
        Scenario.project_id == project_id,
        Scenario.name == name,
    ).first()
    if existing:
        return {
            "success": True,
            "message": f"Scénario '{name}' existe déjà, utilisation de l'existant.",
            "scenario_id": existing.id,
            "status": "cree",
        }
    color = args.get("color")
    scenario = Scenario(
        id=str(uuid.uuid4()),
        project_id=project_id,
        name=name,
        color=color,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(scenario)
    db.flush()
    return {
        "success": True,
        "message": f"Scénario créé: {name}. IMPORTANT: utilise scenario_id={scenario.id} pour les overrides.",
        "scenario_id": scenario.id,
        "status": "cree",
    }


def _update_scenario(db: Session, project_id: str, args: dict) -> dict:
    scenario_id = args.get("scenario_id")
    if not scenario_id:
        return {"success": False, "error": "scenario_id requis"}
    scenario = db.query(Scenario).filter(
        Scenario.id == scenario_id, Scenario.project_id == project_id
    ).first()
    if not scenario:
        return {"success": False, "error": "Scénario introuvable"}
    if args.get("name") is not None:
        scenario.name = args.get("name")
    if args.get("color") is not None:
        scenario.color = args.get("color")
    scenario.updated_at = datetime.utcnow()
    db.flush()
    return {"success": True, "message": f"Scénario mis à jour: {scenario.name}", "status": "modifie"}


def _delete_scenario(db: Session, project_id: str, args: dict) -> dict:
    scenario_id = args.get("scenario_id")
    if not scenario_id:
        return {"success": False, "error": "scenario_id requis"}
    scenario = db.query(Scenario).filter(
        Scenario.id == scenario_id, Scenario.project_id == project_id
    ).first()
    if not scenario:
        return {"success": False, "error": "Scénario introuvable"}
    db.delete(scenario)
    db.flush()
    return {"success": True, "message": "Scénario supprimé", "status": "supprime"}


def _set_scenario_override(db: Session, project_id: str, nodes_map: dict, args: dict) -> dict:
    scenario_id = args.get("scenario_id")
    node_slug = args.get("node_slug")
    mode = args.get("mode")
    if not scenario_id or not node_slug or not mode:
        return {"success": False, "error": "scenario_id, node_slug et mode requis"}
    node = nodes_map.get(node_slug)
    if not node:
        # Fallback: try to look up by UUID in case the AI used the node's internal id
        node = next((n for n in nodes_map.values() if n.id == node_slug), None)
    if not node:
        return {"success": False, "error": f"Nœud '{node_slug}' non trouvé. Utilisez le node_slug (ex: 'prix_unitaire'), pas l'UUID."}
    scenario = db.query(Scenario).filter(
        Scenario.id == scenario_id, Scenario.project_id == project_id
    ).first()
    if not scenario:
        return {"success": False, "error": "Scénario introuvable"}

    override = db.query(ScenarioNodeOverride).filter(
        ScenarioNodeOverride.scenario_id == scenario_id,
        ScenarioNodeOverride.node_id == node.id,
    ).first()
    if not override:
        override = ScenarioNodeOverride(
            id=str(uuid.uuid4()),
            scenario_id=scenario_id,
            node_id=node.id,
        )
        db.add(override)

    override.mode = mode
    if mode == "value":
        override.override_value = args.get("value")
        override.override_code = None
    else:
        code = args.get("code") or ""
        # Auto-prepend return if the user wrote an expression without it
        code = code.strip()
        if code and not code.startswith("return "):
            code = f"return {code}"
        override.override_code = code
        override.override_value = None

    db.flush()

    # Invalidate scenario cache so next computation uses new overrides
    scenario_cache.mark_dirty_nodes(project_id, scenario_id, [node.id])

    return {
        "success": True,
        "message": f"Override appliqué sur {node.label}",
        "status": "modifie",
    }


def _delete_scenario_override(db: Session, project_id: str, nodes_map: dict, args: dict) -> dict:
    scenario_id = args.get("scenario_id")
    node_slug = args.get("node_slug")
    if not scenario_id or not node_slug:
        return {"success": False, "error": "scenario_id et node_slug requis"}
    node = nodes_map.get(node_slug)
    if not node:
        return {"success": False, "error": f"Nœud '{node_slug}' non trouvé"}
    deleted = db.query(ScenarioNodeOverride).filter(
        ScenarioNodeOverride.scenario_id == scenario_id,
        ScenarioNodeOverride.node_id == node.id,
    ).delete()
    if not deleted:
        return {"success": False, "error": "Override introuvable"}
    db.flush()
    return {"success": True, "message": f"Override supprimé pour {node.label}", "status": "supprime"}


def _recompute_project(db: Session, project_id: str, args: dict) -> dict:
    scenario_id = args.get("scenario_id")
    results = compute_all_nodes(db, project_id=project_id, scenario_id=scenario_id)
    errors = [r for r in results.values() if r.get("error")]
    return {
        "success": True,
        "message": f"Calcul relancé ({len(errors)} erreurs)",
        "errors": errors[:10],
        "status": "calcule",
    }


def _list_computation_errors(db: Session, project_id: str) -> dict:
    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    errors = [
        {"node_id": n.id, "slug": n.slug, "label": n.label, "error": n.computation_error}
        for n in nodes if n.computation_error
    ]
    return {"success": True, "errors": errors, "count": len(errors)}


def _search_nodes(db: Session, project_id: str, args: dict) -> dict:
    query = (args.get("query") or "").strip()
    if not query:
        return {"success": False, "error": "query requis"}
    q = db.query(Node).filter(Node.project_id == project_id)
    like = f"%{query.lower()}%"
    matches = [
        {"id": n.id, "slug": n.slug, "label": n.label, "status": n.status}
        for n in q.all()
        if like in (n.slug or "").lower() or like in (n.label or "").lower()
    ]
    return {"success": True, "matches": matches[:20], "count": len(matches)}


def _list_parameters(db: Session, project_id: str) -> dict:
    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    params = [
        {"node_slug": n.slug, "label": n.label, "value": n.value_computed, "unit": n.unit}
        for n in nodes
        if n.status == "imposed"
    ]
    return {"success": True, "parameters": params}


def _list_nodes(db: Session, project_id: str, args: dict) -> dict:
    limit = int(args.get("limit") or 50)
    offset = int(args.get("offset") or 0)
    limit = max(1, min(limit, 200))
    status = args.get("status")
    query = (args.get("query") or "").strip()

    q = db.query(Node).filter(Node.project_id == project_id)
    if status:
        q = q.filter(Node.status == status)
    if query:
        like = f"%{query}%"
        q = q.filter(or_(Node.slug.ilike(like), Node.label.ilike(like)))

    nodes = q.offset(offset).limit(limit).all()
    payload = [
        {
            "id": n.id,
            "slug": n.slug,
            "label": n.label,
            "status": n.status,
            "unit": n.unit,
            "value": n.value_computed,
        }
        for n in nodes
    ]
    return {"success": True, "nodes": payload, "count": len(payload), "offset": offset, "limit": limit}


def _list_edges(db: Session, project_id: str, args: dict) -> dict:
    limit = int(args.get("limit") or 50)
    offset = int(args.get("offset") or 0)
    limit = max(1, min(limit, 200))
    edges = db.query(Edge).filter(Edge.project_id == project_id).offset(offset).limit(limit).all()
    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    nodes_by_id = {n.id: n for n in nodes}
    payload = []
    for e in edges:
        payload.append({
            "id": e.id,
            "source": nodes_by_id.get(e.source).slug if nodes_by_id.get(e.source) else e.source,
            "target": nodes_by_id.get(e.target).slug if nodes_by_id.get(e.target) else e.target,
            "edge_type": e.edge_type,
        })
    return {"success": True, "edges": payload, "count": len(payload), "offset": offset, "limit": limit}


def _list_scenarios(db: Session, project_id: str) -> dict:
    scenarios = db.query(Scenario).filter(Scenario.project_id == project_id).all()
    if scenarios:
        overrides = db.query(ScenarioNodeOverride).filter(
            ScenarioNodeOverride.scenario_id.in_([s.id for s in scenarios])
        ).all()
    else:
        overrides = []
    overrides_by_scenario: dict[str, int] = {}
    for ov in overrides:
        overrides_by_scenario[ov.scenario_id] = overrides_by_scenario.get(ov.scenario_id, 0) + 1
    payload = [
        {
            "id": s.id,
            "name": s.name,
            "color": s.color,
            "overrides": overrides_by_scenario.get(s.id, 0),
        }
        for s in scenarios
    ]
    return {"success": True, "scenarios": payload, "count": len(payload)}


def _list_overrides(db: Session, project_id: str, args: dict) -> dict:
    scenario_id = args.get("scenario_id")
    scenario = db.query(Scenario).filter(
        Scenario.id == scenario_id, Scenario.project_id == project_id
    ).first()
    if not scenario:
        return {"success": False, "error": "Scénario introuvable"}
    overrides = db.query(ScenarioNodeOverride).filter(
        ScenarioNodeOverride.scenario_id == scenario_id
    ).all()
    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    nodes_by_id = {n.id: n for n in nodes}
    payload = []
    for ov in overrides:
        node = nodes_by_id.get(ov.node_id)
        payload.append({
            "node_slug": node.slug if node else ov.node_id,
            "node_label": node.label if node else ov.node_id,
            "mode": ov.mode,
            "value": ov.override_value,
            "code": ov.override_code,
        })
    return {"success": True, "overrides": payload, "count": len(payload)}


def _list_providers(db: Session, project_id: str) -> dict:
    nodes = db.query(Node).filter(Node.project_id == project_id, Node.provider_enabled == True).all()
    payload = [
        {
            "id": n.id,
            "slug": n.slug,
            "label": n.label,
            "provider_type": n.provider_type,
            "provider_url": n.provider_url,
        }
        for n in nodes
    ]
    return {"success": True, "providers": payload, "count": len(payload)}


def _get_project_summary(db: Session, project_id: str) -> dict:
    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    edges = db.query(Edge).filter(Edge.project_id == project_id).count()
    scenarios = db.query(Scenario).filter(Scenario.project_id == project_id).all()
    scenario_ids = [s.id for s in scenarios]
    overrides = (
        db.query(ScenarioNodeOverride)
        .filter(ScenarioNodeOverride.scenario_id.in_(scenario_ids))
        .count()
        if scenario_ids
        else 0
    )
    providers = db.query(Node).filter(Node.project_id == project_id, Node.provider_enabled == True).count()
    errors = [
        {"slug": n.slug, "label": n.label, "error": n.computation_error}
        for n in nodes if n.computation_error
    ]
    params = len([n for n in nodes if n.status == "imposed"])
    computed = len([n for n in nodes if n.status == "implied"])

    return {
        "success": True,
        "counts": {
            "nodes": len(nodes),
            "edges": edges,
            "parameters": params,
            "computed": computed,
            "scenarios": len(scenarios),
            "overrides": overrides,
            "providers": providers,
            "errors": len(errors),
        },
        "scenarios": [{"id": s.id, "name": s.name} for s in scenarios],
        "errors": errors[:10],
    }


def _ensure_unique_scenario_name(existing_names: set[str], base_name: str) -> str:
    name = base_name
    counter = 2
    while name in existing_names:
        name = f"{base_name} ({counter})"
        counter += 1
    existing_names.add(name)
    return name


def _create_sensitivity_analysis(db: Session, project_id: str, nodes_map: dict, args: dict) -> dict:
    target_slug = args.get("target_slug")
    if not target_slug:
        return {"success": False, "error": "target_slug requis"}

    target_node = nodes_map.get(target_slug)
    if not target_node:
        return {"success": False, "error": f"Nœud '{target_slug}' non trouvé"}

    delta_percent = float(args.get("delta_percent") or 10.0)
    prefix = args.get("prefix") or "Sensibilité"

    edges = db.query(Edge).filter(Edge.project_id == project_id).all()
    incoming_by_target: dict[str, list[str]] = {}
    for e in edges:
        incoming_by_target.setdefault(e.target, []).append(e.source)

    # Traverse upstream dependencies
    visited: set[str] = set()
    stack = [target_node.id]
    upstream: set[str] = set()
    while stack:
        current = stack.pop()
        for src in incoming_by_target.get(current, []):
            if src in visited:
                continue
            visited.add(src)
            upstream.add(src)
            stack.append(src)

    if not upstream:
        return {"success": False, "error": "Aucune dépendance détectée pour ce nœud"}

    nodes_by_id = {n.id: n for n in nodes_map.values()}
    input_nodes = []
    for node_id in upstream:
        node = nodes_by_id.get(node_id)
        if not node:
            continue
        has_incoming = node_id in incoming_by_target
        if node.status == "imposed" or not has_incoming:
            input_nodes.append(node)

    if not input_nodes:
        return {"success": False, "error": "Aucun paramètre d'entrée détecté"}

    existing_scenarios = db.query(Scenario).filter(Scenario.project_id == project_id).all()
    existing_names = {s.name for s in existing_scenarios}

    created = []
    skipped = []
    for node in input_nodes:
        base_value = node.value_computed
        if base_value is None:
            skipped.append({"slug": node.slug, "reason": "valeur non disponible"})
            continue

        up_value = float(base_value) * (1 + delta_percent / 100.0)
        down_value = float(base_value) * (1 - delta_percent / 100.0)

        base_label = node.label or node.slug
        up_name = _ensure_unique_scenario_name(
            existing_names,
            f"{prefix} {base_label} +{delta_percent:.0f}%"
        )
        down_name = _ensure_unique_scenario_name(
            existing_names,
            f"{prefix} {base_label} -{delta_percent:.0f}%"
        )

        for name, value in ((up_name, up_value), (down_name, down_value)):
            scenario = Scenario(
                id=str(uuid.uuid4()),
                project_id=project_id,
                name=name,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(scenario)
            db.flush()
            override = ScenarioNodeOverride(
                id=str(uuid.uuid4()),
                scenario_id=scenario.id,
                node_id=node.id,
                mode="value",
                override_value=value,
            )
            db.add(override)
            created.append({"scenario_id": scenario.id, "scenario_name": name, "node_slug": node.slug})

    db.flush()
    return {
        "success": True,
        "message": f"Analyse de sensibilité créée ({len(created)} scénarios)",
        "created": created,
        "skipped": skipped,
        "status": "cree",
    }


def _get_node_details(db: Session, project_id: str, nodes_map: dict, args: dict) -> dict:
    """Get detailed information about a node."""
    slug = args.get("node_slug")

    node = nodes_map.get(slug)
    if not node:
        return {"error": f"Nœud '{slug}' non trouvé"}

    # Get edges
    incoming_edges = db.query(Edge).filter(
        Edge.project_id == project_id,
        Edge.target == node.id,
        Edge.edge_type == "dependency"
    ).all()

    outgoing_edges = db.query(Edge).filter(
        Edge.project_id == project_id,
        Edge.source == node.id,
        Edge.edge_type == "dependency"
    ).all()

    # Map IDs to slugs
    id_to_slug = {n.id: n.slug for n in nodes_map.values()}

    return {
        "slug": node.slug,
        "label": node.label,
        "type": "paramètre" if node.status == "imposed" else "calculé",
        "value": node.value_computed,
        "unit": node.unit,
        "formula": node.computation_definition,
        "inputs": [id_to_slug.get(e.source, e.source) for e in incoming_edges],
        "outputs": [id_to_slug.get(e.target, e.target) for e in outgoing_edges],
        "error": node.computation_error
    }


def _detect_cycles(db: Session, project_id: str, nodes_map: dict) -> dict:
    """Detect cycles in the graph."""
    # Build adjacency list from edges
    edges = db.query(Edge).filter(
        Edge.project_id == project_id,
        Edge.edge_type == "dependency"
    ).all()

    id_to_slug = {n.id: n.slug for n in nodes_map.values()}

    # Dependencies: target depends on source
    dependencies = {}
    for edge in edges:
        target_slug = id_to_slug.get(edge.target)
        source_slug = id_to_slug.get(edge.source)
        if target_slug and source_slug:
            if target_slug not in dependencies:
                dependencies[target_slug] = []
            dependencies[target_slug].append(source_slug)

    # DFS to detect cycles
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {slug: WHITE for slug in nodes_map.keys()}
    cycles = []

    def dfs(node, path):
        color[node] = GRAY
        for dep in dependencies.get(node, []):
            if dep not in color:
                continue
            if color[dep] == GRAY:
                # Found cycle
                cycle_start = path.index(dep)
                cycle = path[cycle_start:] + [dep]
                cycles.append(cycle)
            elif color[dep] == WHITE:
                dfs(dep, path + [dep])
        color[node] = BLACK

    for node in nodes_map.keys():
        if color[node] == WHITE:
            dfs(node, [node])

    if cycles:
        return {
            "has_cycles": True,
            "cycles": cycles,
            "message": f"Cycles détectés: {cycles}"
        }
    return {
        "has_cycles": False,
        "message": "Aucun cycle détecté"
    }


def _regenerate_dashboard(db: Session, project_id: str) -> dict:
    """Regenerate the V2 dashboard config for the project."""
    try:
        from app.api.ai.dashboard_generator import (
            _build_v2_prompt, _validate_v2_config, DASHBOARD_V2_SYSTEM_PROMPT,
        )
        from app.api.ai.shared import GEMINI_MODEL, configure_gemini, clean_json_response
        from app.models import Project
        import json
        import google.generativeai as genai

        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return {"success": False, "error": "Projet non trouvé"}

        nodes = db.query(Node).filter(Node.project_id == project_id).all()
        edges = db.query(Edge).filter(Edge.project_id == project_id).all()
        if not nodes:
            return {"success": False, "error": "Aucun nœud dans le projet"}

        configure_gemini()
        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            system_instruction=DASHBOARD_V2_SYSTEM_PROMPT,
            generation_config=genai.GenerationConfig(
                temperature=0.2,
                response_mime_type="application/json",
            ),
        )
        response = model.generate_content(
            _build_v2_prompt(nodes, edges, project.name, project.description)
        )
        raw = response.text or "{}"
        config = json.loads(clean_json_response(raw))
        config = _validate_v2_config(config, nodes)

        project.dashboard_config = config
        db.commit()

        widget_count = len(config.get("kpi_widgets", []))
        return {
            "success": True,
            "message": f"Tableau de bord régénéré : {widget_count} widget(s) KPI",
            "widget_count": widget_count,
        }
    except Exception as e:
        logger.error("regenerate_dashboard failed", error=str(e), project_id=project_id)
        return {"success": False, "error": str(e)}
