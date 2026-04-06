from __future__ import annotations

import copy
import json
from datetime import datetime, timezone
from typing import Any, Iterable
from uuid import uuid4

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.models.composite import Composite
from app.models.edge import Edge
from app.models.node import Node
from app.models.project import Project
from app.models.scenario import Scenario, ScenarioCompositeOverride, ScenarioNodeOverride
from app.schemas.composite import CompositeGraphData
from app.schemas.smgp import (
    SMGP_SCHEMA_VERSION,
    SmgpComposite,
    SmgpDocument,
    SmgpEdge,
    SmgpGraph,
    SmgpImportResponse,
    SmgpNode,
    SmgpProject,
    SmgpProvenance,
    SmgpScenario,
    SmgpScenarioCompositeOverride,
    SmgpScenarioNodeOverride,
)


class SmgpError(Exception):
    """Base exception for .smgp serialization and import errors."""


class SmgpImportError(SmgpError):
    """Raised when a .smgp document is invalid or cannot be imported."""


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _new_graph_id() -> str:
    return str(uuid4())[:8]


def _new_composite_id() -> str:
    return str(uuid4())


def _clone_json(value: Any) -> Any:
    return copy.deepcopy(value)


def _sorted_nodes(nodes: Iterable[Node]) -> list[Node]:
    return sorted(nodes, key=lambda node: (node.slug or "", node.label or "", node.id))


def _sorted_edges(edges: Iterable[Edge]) -> list[Edge]:
    return sorted(edges, key=lambda edge: (edge.source, edge.target, edge.id))


def _sorted_scenarios(scenarios: Iterable[Scenario]) -> list[Scenario]:
    return sorted(scenarios, key=lambda scenario: (scenario.name or "", scenario.id))


def _sorted_overrides(overrides: Iterable[ScenarioNodeOverride]) -> list[ScenarioNodeOverride]:
    return sorted(overrides, key=lambda override: (override.node_id, override.id))


def _sorted_composite_overrides(
    overrides: Iterable[ScenarioCompositeOverride],
) -> list[ScenarioCompositeOverride]:
    return sorted(
        overrides,
        key=lambda override: (
            override.composite_node_instance_id,
            override.internal_id,
            override.id,
        ),
    )


def _ensure_unique(values: Iterable[str], label: str) -> None:
    seen: set[str] = set()
    duplicates: set[str] = set()
    for value in values:
        if value in seen:
            duplicates.add(value)
        seen.add(value)
    if duplicates:
        rendered = ", ".join(sorted(duplicates))
        raise SmgpImportError(f"Duplicate {label} found in .smgp document: {rendered}")


def _ensure_supported_schema_version(schema_version: str) -> None:
    major = schema_version.split(".", 1)[0].strip()
    if major != "1":
        raise SmgpImportError(
            f"Unsupported .smgp schema_version '{schema_version}'. "
            f"This importer currently supports {SMGP_SCHEMA_VERSION}."
        )


def _validate_composite_graph_data(graph_data: dict[str, Any], *, context: str) -> CompositeGraphData:
    try:
        return CompositeGraphData.model_validate(graph_data or {})
    except ValidationError as exc:
        raise SmgpImportError(f"{context} has invalid graph_data: {exc}") from exc


def _collect_composite_closure(db: Session, root_composite_ids: Iterable[str]) -> list[Composite]:
    pending = sorted({composite_id for composite_id in root_composite_ids if composite_id})
    seen: set[str] = set()
    closure: dict[str, Composite] = {}

    while pending:
        composite_id = pending.pop(0)
        if composite_id in seen:
            continue

        composite = db.query(Composite).filter(Composite.id == composite_id).first()
        if not composite:
            raise SmgpError(f"Composite '{composite_id}' referenced by the project was not found")

        seen.add(composite_id)
        closure[composite_id] = composite

        graph = _validate_composite_graph_data(
            composite.graph_data or {},
            context=f"Composite '{composite.name}'",
        )
        nested_refs = sorted(
            {
                node.composite_id
                for node in graph.nodes or []
                if getattr(node, "composite_id", None)
            }
        )
        for nested_id in nested_refs:
            if nested_id not in seen:
                pending.append(nested_id)

    return sorted(closure.values(), key=lambda composite: (composite.name or "", composite.id))


def export_project_to_smgp(
    db: Session,
    project_id: str,
    *,
    exported_by_user_id: str | None = None,
) -> SmgpDocument:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise SmgpError("Project not found")

    nodes = _sorted_nodes(db.query(Node).filter(Node.project_id == project_id).all())
    edges = _sorted_edges(db.query(Edge).filter(Edge.project_id == project_id).all())
    scenarios = _sorted_scenarios(
        db.query(Scenario).filter(Scenario.project_id == project_id).all()
    )
    composites = _collect_composite_closure(
        db,
        {node.composite_id for node in nodes if node.composite_id},
    )

    return SmgpDocument(
        schema_version=SMGP_SCHEMA_VERSION,
        project=SmgpProject(
            id=project.id,
            name=project.name,
            status=project.status,
            description=project.description,
            generation_prompt=project.generation_prompt,
            dashboard_config=_clone_json(project.dashboard_config),
            created_at=project.created_at,
            updated_at=project.updated_at,
        ),
        graph=SmgpGraph(
            nodes=[
                SmgpNode(
                    id=node.id,
                    slug=node.slug,
                    label=node.label,
                    unit=node.unit,
                    status=node.status.value if hasattr(node.status, "value") else node.status,
                    confidence=node.confidence,
                    notes=node.notes,
                    composite_id=node.composite_id,
                    value_computed=node.value_computed,
                    computation_definition=node.computation_definition,
                    last_computed_at=node.last_computed_at,
                    computation_error=node.computation_error,
                    pos_x=node.pos_x,
                    pos_y=node.pos_y,
                    plausible_min=node.plausible_min,
                    plausible_max=node.plausible_max,
                    provider_enabled=node.provider_enabled,
                    provider_type=node.provider_type,
                    provider_url=node.provider_url,
                    provider_json_path=node.provider_json_path,
                    provider_timeout=node.provider_timeout,
                    provider_cache_ttl=node.provider_cache_ttl,
                    provider_last_fetched_at=node.provider_last_fetched_at,
                    provider_last_error=node.provider_last_error,
                )
                for node in nodes
            ],
            edges=[
                SmgpEdge(
                    id=edge.id,
                    source=edge.source,
                    target=edge.target,
                    label=edge.label,
                    edge_type=edge.edge_type,
                    rule_id=edge.rule_id,
                )
                for edge in edges
            ],
        ),
        scenarios=[
            SmgpScenario(
                id=scenario.id,
                name=scenario.name,
                color=scenario.color,
                created_at=scenario.created_at,
                updated_at=scenario.updated_at,
                overrides=[
                    SmgpScenarioNodeOverride(
                        id=override.id,
                        node_id=override.node_id,
                        mode=override.mode,
                        override_value=override.override_value,
                        override_code=override.override_code,
                    )
                    for override in _sorted_overrides(scenario.overrides or [])
                ],
                composite_overrides=[
                    SmgpScenarioCompositeOverride(
                        id=override.id,
                        composite_node_instance_id=override.composite_node_instance_id,
                        internal_id=override.internal_id,
                        mode=override.mode,
                        override_value=override.override_value,
                        override_code=override.override_code,
                    )
                    for override in _sorted_composite_overrides(
                        scenario.composite_overrides or []
                    )
                ],
            )
            for scenario in scenarios
        ],
        composites=[
            SmgpComposite(
                id=composite.id,
                name=composite.name,
                graph_data=_clone_json(composite.graph_data or {"nodes": [], "edges": []}),
                created_at=composite.created_at,
                updated_at=composite.updated_at,
            )
            for composite in composites
        ],
        provenance=SmgpProvenance(
            exported_at=_utcnow(),
            source_project_id=project.id,
            source_project_name=project.name,
            exported_by_user_id=exported_by_user_id,
        ),
    )


def serialize_smgp_document(document: SmgpDocument) -> bytes:
    return json.dumps(
        document.model_dump(mode="json", exclude_none=True),
        ensure_ascii=False,
        indent=2,
        sort_keys=True,
    ).encode("utf-8")


def load_smgp_document(content: bytes) -> SmgpDocument:
    if not content:
        raise SmgpImportError("Empty .smgp file")

    try:
        raw = json.loads(content.decode("utf-8-sig"))
    except UnicodeDecodeError as exc:
        raise SmgpImportError("Invalid .smgp encoding. Expected UTF-8 JSON.") from exc
    except json.JSONDecodeError as exc:
        raise SmgpImportError(f"Invalid .smgp JSON: {exc}") from exc

    try:
        document = SmgpDocument.model_validate(raw)
    except ValidationError as exc:
        raise SmgpImportError(f"Invalid .smgp document: {exc}") from exc

    _validate_document_references(document)
    return document


def _validate_document_references(document: SmgpDocument) -> None:
    _ensure_supported_schema_version(document.schema_version)

    nodes = document.graph.nodes or []
    edges = document.graph.edges or []
    composites = document.composites or []
    scenarios = document.scenarios or []

    _ensure_unique((node.id for node in nodes), "node ids")
    _ensure_unique((node.slug for node in nodes), "node slugs")
    _ensure_unique((composite.id for composite in composites), "composite ids")
    _ensure_unique((scenario.id for scenario in scenarios), "scenario ids")

    node_ids = {node.id for node in nodes}
    nodes_by_id = {node.id: node for node in nodes}
    composite_ids = {composite.id for composite in composites}

    for node in nodes:
        if node.composite_id and node.composite_id not in composite_ids:
            raise SmgpImportError(
                f"Node '{node.slug}' references missing composite '{node.composite_id}'"
            )

    for edge in edges:
        if edge.source not in node_ids:
            raise SmgpImportError(
                f"Edge '{edge.id}' references missing source node '{edge.source}'"
            )
        if edge.target not in node_ids:
            raise SmgpImportError(
                f"Edge '{edge.id}' references missing target node '{edge.target}'"
            )

    for composite in composites:
        graph = _validate_composite_graph_data(
            composite.graph_data,
            context=f"Composite '{composite.name}'",
        )
        nested_refs = {
            node.composite_id
            for node in graph.nodes or []
            if getattr(node, "composite_id", None)
        }
        missing_nested = sorted(ref for ref in nested_refs if ref not in composite_ids)
        if missing_nested:
            rendered = ", ".join(missing_nested)
            raise SmgpImportError(
                f"Composite '{composite.name}' references missing nested composites: {rendered}"
            )

    for scenario in scenarios:
        for override in scenario.overrides or []:
            if override.node_id not in node_ids:
                raise SmgpImportError(
                    f"Scenario '{scenario.name}' references missing node '{override.node_id}'"
                )
        for override in scenario.composite_overrides or []:
            if override.composite_node_instance_id not in node_ids:
                raise SmgpImportError(
                    f"Scenario '{scenario.name}' references missing composite node "
                    f"'{override.composite_node_instance_id}'"
                )
            target_node = nodes_by_id[override.composite_node_instance_id]
            if not target_node.composite_id:
                raise SmgpImportError(
                    f"Scenario '{scenario.name}' targets node "
                    f"'{target_node.slug}' as a composite override, but that node is not composite-backed"
                )


def _remap_composite_graph_data(
    graph_data: dict[str, Any],
    composite_id_map: dict[str, str],
) -> dict[str, Any]:
    remapped = _clone_json(graph_data or {"nodes": [], "edges": []})
    nodes = remapped.get("nodes")
    if isinstance(nodes, list):
        for node in nodes:
            if not isinstance(node, dict):
                continue
            old_composite_id = node.get("composite_id")
            if old_composite_id in composite_id_map:
                node["composite_id"] = composite_id_map[old_composite_id]

    exposed_roots = remapped.get("exposed_roots")
    if isinstance(exposed_roots, dict):
        for root in exposed_roots.values():
            if not isinstance(root, dict):
                continue
            old_composite_id = root.get("composite_id")
            if old_composite_id in composite_id_map:
                root["composite_id"] = composite_id_map[old_composite_id]

    return remapped


def import_project_from_smgp(
    db: Session,
    document: SmgpDocument,
    *,
    owner_id: str,
    project_name_override: str | None = None,
) -> SmgpImportResponse:
    _validate_document_references(document)

    now = _utcnow()
    project_name = (project_name_override or document.project.name or "").strip()
    if not project_name:
        project_name = "Imported SmartGraph Model"

    project_id = _new_graph_id()
    composite_id_map = {
        composite.id: _new_composite_id()
        for composite in document.composites
    }
    node_id_map = {node.id: _new_graph_id() for node in document.graph.nodes}
    scenario_id_map = {scenario.id: _new_graph_id() for scenario in document.scenarios}

    project = Project(
        id=project_id,
        name=project_name,
        user_id=owner_id,
        status=document.project.status or "completed",
        created_at=now,
        updated_at=now,
        description=document.project.description,
        generation_prompt=document.project.generation_prompt,
        dashboard_config=_clone_json(document.project.dashboard_config),
    )
    db.add(project)
    db.flush()

    for composite_doc in document.composites:
        remapped_graph_data = _remap_composite_graph_data(
            composite_doc.graph_data,
            composite_id_map,
        )
        _validate_composite_graph_data(
            remapped_graph_data,
            context=f"Composite '{composite_doc.name}'",
        )
        db.add(
            Composite(
                id=composite_id_map[composite_doc.id],
                name=composite_doc.name,
                user_id=owner_id,
                graph_data=remapped_graph_data,
                created_at=now,
                updated_at=now,
            )
        )

    db.flush()

    for node_doc in document.graph.nodes:
        db.add(
            Node(
                id=node_id_map[node_doc.id],
                project_id=project_id,
                slug=node_doc.slug,
                label=node_doc.label,
                unit=node_doc.unit,
                plausible_min=node_doc.plausible_min,
                plausible_max=node_doc.plausible_max,
                status=node_doc.status,
                confidence=node_doc.confidence,
                value_computed=node_doc.value_computed,
                computation_definition=node_doc.computation_definition,
                last_computed_at=node_doc.last_computed_at,
                computation_error=node_doc.computation_error,
                notes=node_doc.notes,
                pos_x=node_doc.pos_x,
                pos_y=node_doc.pos_y,
                composite_id=composite_id_map.get(node_doc.composite_id)
                if node_doc.composite_id
                else None,
                provider_enabled=node_doc.provider_enabled
                if node_doc.provider_enabled is not None
                else False,
                provider_type=node_doc.provider_type,
                provider_url=node_doc.provider_url,
                provider_json_path=node_doc.provider_json_path,
                provider_timeout=node_doc.provider_timeout,
                provider_cache_ttl=node_doc.provider_cache_ttl,
                provider_last_fetched_at=node_doc.provider_last_fetched_at,
                provider_last_error=node_doc.provider_last_error,
            )
        )

    db.flush()

    for edge_doc in document.graph.edges:
        source_id = node_id_map[edge_doc.source]
        target_id = node_id_map[edge_doc.target]
        db.add(
            Edge(
                id=f"{source_id}->{target_id}",
                project_id=project_id,
                source=source_id,
                target=target_id,
                label=edge_doc.label,
                edge_type=edge_doc.edge_type,
                rule_id=edge_doc.rule_id,
            )
        )

    for scenario_doc in document.scenarios:
        scenario_id = scenario_id_map[scenario_doc.id]
        db.add(
            Scenario(
                id=scenario_id,
                project_id=project_id,
                name=scenario_doc.name,
                color=scenario_doc.color,
                created_at=now,
                updated_at=now,
            )
        )

        for override_doc in scenario_doc.overrides:
            db.add(
                ScenarioNodeOverride(
                    id=_new_graph_id(),
                    scenario_id=scenario_id,
                    node_id=node_id_map[override_doc.node_id],
                    mode=override_doc.mode,
                    override_value=override_doc.override_value,
                    override_code=override_doc.override_code,
                )
            )

        for override_doc in scenario_doc.composite_overrides:
            db.add(
                ScenarioCompositeOverride(
                    id=_new_graph_id(),
                    scenario_id=scenario_id,
                    composite_node_instance_id=node_id_map[
                        override_doc.composite_node_instance_id
                    ],
                    internal_id=override_doc.internal_id,
                    mode=override_doc.mode,
                    override_value=override_doc.override_value,
                    override_code=override_doc.override_code,
                )
            )

    db.flush()

    return SmgpImportResponse(
        project_id=project_id,
        project_name=project_name,
        nodes_created=len(document.graph.nodes),
        edges_created=len(document.graph.edges),
        scenarios_created=len(document.scenarios),
        composites_created=len(document.composites),
    )


def restore_project_from_smgp(
    db: Session,
    project: Project,
    document: SmgpDocument,
    *,
    owner_id: str | None = None,
) -> SmgpImportResponse:
    _validate_document_references(document)

    now = _utcnow()
    composite_id_map = {
        composite.id: _new_composite_id()
        for composite in document.composites
    }
    node_id_map = {node.id: _new_graph_id() for node in document.graph.nodes}
    scenario_id_map = {scenario.id: _new_graph_id() for scenario in document.scenarios}
    existing_scenario_ids = [
        scenario_id
        for (scenario_id,) in db.query(Scenario.id).filter(Scenario.project_id == project.id).all()
    ]

    db.query(Edge).filter(Edge.project_id == project.id).delete(synchronize_session=False)
    if existing_scenario_ids:
        db.query(ScenarioNodeOverride).filter(
            ScenarioNodeOverride.scenario_id.in_(existing_scenario_ids)
        ).delete(synchronize_session=False)
        db.query(ScenarioCompositeOverride).filter(
            ScenarioCompositeOverride.scenario_id.in_(existing_scenario_ids)
        ).delete(synchronize_session=False)
    db.query(Scenario).filter(Scenario.project_id == project.id).delete(synchronize_session=False)
    db.query(Node).filter(Node.project_id == project.id).delete(synchronize_session=False)

    project.name = (document.project.name or project.name or "").strip() or project.name
    project.status = document.project.status or project.status or "completed"
    project.description = document.project.description
    project.generation_prompt = document.project.generation_prompt
    project.dashboard_config = _clone_json(document.project.dashboard_config)
    project.updated_at = now
    if owner_id:
        project.user_id = owner_id

    for composite_doc in document.composites:
        remapped_graph_data = _remap_composite_graph_data(
            composite_doc.graph_data,
            composite_id_map,
        )
        _validate_composite_graph_data(
            remapped_graph_data,
            context=f"Composite '{composite_doc.name}'",
        )
        db.add(
            Composite(
                id=composite_id_map[composite_doc.id],
                name=composite_doc.name,
                user_id=owner_id or project.user_id,
                graph_data=remapped_graph_data,
                created_at=now,
                updated_at=now,
            )
        )

    db.flush()

    for node_doc in document.graph.nodes:
        db.add(
            Node(
                id=node_id_map[node_doc.id],
                project_id=project.id,
                slug=node_doc.slug,
                label=node_doc.label,
                unit=node_doc.unit,
                plausible_min=node_doc.plausible_min,
                plausible_max=node_doc.plausible_max,
                status=node_doc.status,
                confidence=node_doc.confidence,
                value_computed=node_doc.value_computed,
                computation_definition=node_doc.computation_definition,
                last_computed_at=node_doc.last_computed_at,
                computation_error=node_doc.computation_error,
                notes=node_doc.notes,
                pos_x=node_doc.pos_x,
                pos_y=node_doc.pos_y,
                composite_id=composite_id_map.get(node_doc.composite_id)
                if node_doc.composite_id
                else None,
                provider_enabled=node_doc.provider_enabled
                if node_doc.provider_enabled is not None
                else False,
                provider_type=node_doc.provider_type,
                provider_url=node_doc.provider_url,
                provider_json_path=node_doc.provider_json_path,
                provider_timeout=node_doc.provider_timeout,
                provider_cache_ttl=node_doc.provider_cache_ttl,
                provider_last_fetched_at=node_doc.provider_last_fetched_at,
                provider_last_error=node_doc.provider_last_error,
            )
        )

    db.flush()

    for edge_doc in document.graph.edges:
        source_id = node_id_map[edge_doc.source]
        target_id = node_id_map[edge_doc.target]
        db.add(
            Edge(
                id=f"{source_id}->{target_id}",
                project_id=project.id,
                source=source_id,
                target=target_id,
                label=edge_doc.label,
                edge_type=edge_doc.edge_type,
                rule_id=edge_doc.rule_id,
            )
        )

    for scenario_doc in document.scenarios:
        scenario_id = scenario_id_map[scenario_doc.id]
        db.add(
            Scenario(
                id=scenario_id,
                project_id=project.id,
                name=scenario_doc.name,
                color=scenario_doc.color,
                created_at=now,
                updated_at=now,
            )
        )

        for override_doc in scenario_doc.overrides:
            db.add(
                ScenarioNodeOverride(
                    id=_new_graph_id(),
                    scenario_id=scenario_id,
                    node_id=node_id_map[override_doc.node_id],
                    mode=override_doc.mode,
                    override_value=override_doc.override_value,
                    override_code=override_doc.override_code,
                )
            )

        for override_doc in scenario_doc.composite_overrides:
            db.add(
                ScenarioCompositeOverride(
                    id=_new_graph_id(),
                    scenario_id=scenario_id,
                    composite_node_instance_id=node_id_map[
                        override_doc.composite_node_instance_id
                    ],
                    internal_id=override_doc.internal_id,
                    mode=override_doc.mode,
                    override_value=override_doc.override_value,
                    override_code=override_doc.override_code,
                )
            )

    db.flush()

    return SmgpImportResponse(
        project_id=project.id,
        project_name=project.name,
        nodes_created=len(document.graph.nodes),
        edges_created=len(document.graph.edges),
        scenarios_created=len(document.scenarios),
        composites_created=len(document.composites),
    )
