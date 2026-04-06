import json

import pytest

from app.models.composite import Composite
from app.models.edge import Edge
from app.models.node import Node
from app.models.project import Project
from app.models.scenario import Scenario, ScenarioCompositeOverride, ScenarioNodeOverride
from app.models.user import User
from app.services.smgp import (
    SmgpImportError,
    export_project_to_smgp,
    import_project_from_smgp,
    load_smgp_document,
    serialize_smgp_document,
)


def _build_child_composite() -> Composite:
    return Composite(
        id="comp_child",
        name="Child Composite",
        user_id="user_1",
        graph_data={
            "nodes": [
                {
                    "id": "child_input",
                    "raw_internal_id": "child_input",
                    "slug": "child_input",
                    "label": "Child Input",
                    "unit": "EUR",
                    "status": "observed",
                    "confidence": 1.0,
                    "value_computed": 4.0,
                },
                {
                    "id": "child_output",
                    "raw_internal_id": "child_output",
                    "slug": "child_output",
                    "label": "Child Output",
                    "unit": "EUR",
                    "status": "implied",
                    "confidence": 1.0,
                    "computation_definition": "def compute(child_input):\n    return child_input * 2",
                },
            ],
            "edges": [
                {"source": "child_input", "target": "child_output"},
            ],
            "exposed_roots": {
                "child_input": {
                    "id": "child_input",
                    "slug": "child_input",
                    "label": "Child Input",
                    "unit": "EUR",
                }
            },
        },
    )


def _build_parent_composite() -> Composite:
    return Composite(
        id="comp_parent",
        name="Parent Composite",
        user_id="user_1",
        graph_data={
            "nodes": [
                {
                    "id": "parent_input",
                    "raw_internal_id": "parent_input",
                    "slug": "parent_input",
                    "label": "Parent Input",
                    "unit": "EUR",
                    "status": "observed",
                    "confidence": 1.0,
                    "value_computed": 8.0,
                },
                {
                    "id": "nested_child",
                    "raw_internal_id": "nested_child",
                    "slug": "nested_child",
                    "label": "Nested Child",
                    "unit": "EUR",
                    "status": "implied",
                    "confidence": 1.0,
                    "composite_id": "comp_child",
                },
                {
                    "id": "parent_output",
                    "raw_internal_id": "parent_output",
                    "slug": "parent_output",
                    "label": "Parent Output",
                    "unit": "EUR",
                    "status": "implied",
                    "confidence": 1.0,
                    "computation_definition": (
                        "def compute(parent_input, nested_child):\n"
                        "    return parent_input + nested_child"
                    ),
                },
            ],
            "edges": [
                {"source": "parent_input", "target": "parent_output"},
                {"source": "nested_child", "target": "parent_output"},
            ],
            "exposed_roots": {
                "parent_input": {
                    "id": "parent_input",
                    "slug": "parent_input",
                    "label": "Parent Input",
                    "unit": "EUR",
                }
            },
        },
    )


def _seed_project_graph(db_session):
    user = User(
        id="user_1",
        email="owner@example.com",
        username="owner",
        hashed_password="hashed",
        is_active=True,
        is_superuser=False,
    )
    project = Project(
        id="proj_001",
        name="Unit Economics",
        user_id=user.id,
        status="completed",
        description="Baseline unit economics model",
        generation_prompt="Build a unit economics model",
        dashboard_config={"widgets": [{"kind": "kpi", "node_slug": "profit"}]},
    )
    child = _build_child_composite()
    parent = _build_parent_composite()

    revenue = Node(
        id="node_rev",
        project_id=project.id,
        slug="revenue",
        label="Revenue",
        unit="EUR",
        status="observed",
        confidence=1.0,
        value_computed=120.0,
        computation_definition="def compute():\n    return 120",
        plausible_min=0.0,
        plausible_max=1000.0,
        pos_x=10.0,
        pos_y=20.0,
    )
    cost = Node(
        id="node_cost",
        project_id=project.id,
        slug="cost",
        label="Cost",
        unit="EUR",
        status="observed",
        confidence=1.0,
        value_computed=45.0,
        computation_definition="def compute():\n    return 45",
    )
    profit = Node(
        id="node_profit",
        project_id=project.id,
        slug="profit",
        label="Profit",
        unit="EUR",
        status="implied",
        confidence=1.0,
        value_computed=75.0,
        computation_definition="def compute(revenue, cost):\n    return revenue - cost",
    )
    module = Node(
        id="node_module",
        project_id=project.id,
        slug="module",
        label="Module",
        unit="EUR",
        status="implied",
        confidence=1.0,
        value_computed=12.0,
        composite_id=parent.id,
    )

    scenario = Scenario(
        id="scenario_1",
        project_id=project.id,
        name="Upside",
        color="#10B981",
    )
    revenue_override = ScenarioNodeOverride(
        id="override_rev",
        scenario_id=scenario.id,
        node_id=revenue.id,
        mode="value",
        override_value=150.0,
    )
    module_override = ScenarioCompositeOverride(
        id="override_module",
        scenario_id=scenario.id,
        composite_node_instance_id=module.id,
        internal_id="parent_input",
        mode="value",
        override_value=16.0,
    )

    db_session.add_all(
        [
            user,
            project,
            child,
            parent,
            revenue,
            cost,
            profit,
            module,
            Edge(
                id=f"{revenue.id}->{profit.id}",
                project_id=project.id,
                source=revenue.id,
                target=profit.id,
                edge_type="dependency",
            ),
            Edge(
                id=f"{cost.id}->{profit.id}",
                project_id=project.id,
                source=cost.id,
                target=profit.id,
                edge_type="dependency",
            ),
            scenario,
            revenue_override,
            module_override,
        ]
    )
    db_session.commit()
    return {
        "user": user,
        "project": project,
        "child": child,
        "parent": parent,
        "nodes": {
            "revenue": revenue,
            "cost": cost,
            "profit": profit,
            "module": module,
        },
    }


def test_smgp_roundtrip_remaps_nested_composites_and_scenarios(db_session):
    seeded = _seed_project_graph(db_session)

    document = export_project_to_smgp(
        db_session,
        seeded["project"].id,
        exported_by_user_id=seeded["user"].id,
    )
    assert document.project.name == "Unit Economics"
    assert {composite.id for composite in document.composites} == {"comp_child", "comp_parent"}
    assert document.provenance.source_project_id == seeded["project"].id

    payload = serialize_smgp_document(document)
    reloaded = load_smgp_document(payload)
    result = import_project_from_smgp(
        db_session,
        reloaded,
        owner_id=seeded["user"].id,
        project_name_override="Imported Copy",
    )
    db_session.commit()

    imported_project = db_session.query(Project).filter(Project.id == result.project_id).one()
    imported_nodes = db_session.query(Node).filter(Node.project_id == imported_project.id).all()
    imported_nodes_by_slug = {node.slug: node for node in imported_nodes}
    imported_scenario = (
        db_session.query(Scenario).filter(Scenario.project_id == imported_project.id).one()
    )

    assert result.project_name == "Imported Copy"
    assert len(imported_nodes) == 4
    assert set(imported_nodes_by_slug) == {"revenue", "cost", "profit", "module"}
    assert imported_project.dashboard_config == seeded["project"].dashboard_config
    assert imported_nodes_by_slug["profit"].computation_definition == (
        "def compute(revenue, cost):\n    return revenue - cost"
    )
    assert imported_nodes_by_slug["module"].composite_id not in {"comp_child", "comp_parent"}

    imported_parent = (
        db_session.query(Composite)
        .filter(Composite.id == imported_nodes_by_slug["module"].composite_id)
        .one()
    )
    nested_child_node = next(
        node for node in imported_parent.graph_data["nodes"] if node["id"] == "nested_child"
    )
    assert nested_child_node["composite_id"] not in {"comp_child", "comp_parent"}
    assert db_session.query(Composite).filter(
        Composite.id == nested_child_node["composite_id"]
    ).one()

    node_override = (
        db_session.query(ScenarioNodeOverride)
        .filter(ScenarioNodeOverride.scenario_id == imported_scenario.id)
        .one()
    )
    composite_override = (
        db_session.query(ScenarioCompositeOverride)
        .filter(ScenarioCompositeOverride.scenario_id == imported_scenario.id)
        .one()
    )

    assert node_override.node_id == imported_nodes_by_slug["revenue"].id
    assert composite_override.composite_node_instance_id == imported_nodes_by_slug["module"].id
    assert composite_override.internal_id == "parent_input"
    assert composite_override.override_value == 16.0


def test_load_smgp_document_rejects_missing_edge_targets(db_session):
    seeded = _seed_project_graph(db_session)
    document = export_project_to_smgp(db_session, seeded["project"].id)
    raw = json.loads(serialize_smgp_document(document).decode("utf-8"))
    raw["graph"]["edges"][0]["target"] = "missing_node"

    with pytest.raises(SmgpImportError, match="missing target node"):
        load_smgp_document(json.dumps(raw).encode("utf-8"))
