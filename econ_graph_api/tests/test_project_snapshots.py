from app.api.ai.project_chat_tools import execute_tool
from app.models.node import Node
from app.models.project_snapshot import ProjectSnapshot
from app.models.scenario import Scenario
from app.services.project_snapshots import (
    create_project_snapshot,
    list_project_snapshots,
    restore_project_snapshot,
)
from tests.test_smgp import _seed_project_graph


def test_create_project_snapshot_dedupes_same_state(db_session):
    seeded = _seed_project_graph(db_session)
    project = seeded["project"]
    user = seeded["user"]

    first_snapshot, first_created = create_project_snapshot(
        db_session,
        project,
        author_user_id=user.id,
        message="Baseline",
        trigger="manual",
    )
    second_snapshot, second_created = create_project_snapshot(
        db_session,
        project,
        author_user_id=user.id,
        message="No-op",
        trigger="manual",
    )
    db_session.flush()
    db_session.refresh(project)

    assert first_created is True
    assert second_created is False
    assert second_snapshot.id == first_snapshot.id
    assert project.head_snapshot_id == first_snapshot.id
    assert (
        db_session.query(ProjectSnapshot)
        .filter(ProjectSnapshot.project_id == project.id)
        .count()
        == 1
    )


def test_restore_project_snapshot_creates_new_restore_head(db_session):
    seeded = _seed_project_graph(db_session)
    project = seeded["project"]
    user = seeded["user"]

    baseline_snapshot, baseline_created = create_project_snapshot(
        db_session,
        project,
        author_user_id=user.id,
        message="Baseline",
        trigger="manual",
    )
    assert baseline_created is True

    db_session.add(
        Node(
            id="node_tax",
            project_id=project.id,
            slug="tax",
            label="Tax",
            unit="EUR",
            status="observed",
            confidence=1.0,
            value_computed=12.0,
            computation_definition="def compute():\n    return 12",
        )
    )
    project.description = "Modified description"
    db_session.flush()

    modified_snapshot, modified_created = create_project_snapshot(
        db_session,
        project,
        author_user_id=user.id,
        message="Added tax",
        trigger="manual",
    )
    assert modified_created is True

    restored = restore_project_snapshot(
        db_session,
        project,
        baseline_snapshot,
        actor_user_id=user.id,
        message="Rollback to baseline",
    )
    db_session.flush()
    db_session.refresh(project)

    project_nodes = db_session.query(Node).filter(Node.project_id == project.id).all()
    snapshots = list_project_snapshots(db_session, project.id, limit=10)

    assert restored.restored_snapshot_id == baseline_snapshot.id
    assert restored.head_snapshot_id == project.head_snapshot_id
    assert restored.head_snapshot_id not in {baseline_snapshot.id, modified_snapshot.id}
    assert snapshots[0].id == restored.head_snapshot_id
    assert snapshots[0].trigger == "restore"
    assert snapshots[0].parent_snapshot_id == modified_snapshot.id
    assert {node.slug for node in project_nodes} == {"revenue", "cost", "profit", "module"}
    assert project.description == "Baseline unit economics model"


def test_execute_tool_creates_before_and_after_auto_checkpoints(db_session):
    seeded = _seed_project_graph(db_session)
    project = seeded["project"]
    nodes_map = dict(seeded["nodes"])

    result = execute_tool(
        "create_scenario",
        {"name": "Stress", "color": "#EF4444"},
        db_session,
        project.id,
        nodes_map,
    )
    db_session.flush()
    db_session.refresh(project)

    snapshots = list_project_snapshots(db_session, project.id, limit=10)
    scenarios = db_session.query(Scenario).filter(Scenario.project_id == project.id).all()

    assert result["success"] is True
    assert result["auto_checkpoint_before"]["phase"] == "before"
    assert result["auto_checkpoint_after"]["phase"] == "after"
    assert result["auto_checkpoint_before"]["snapshot_id"] != result["auto_checkpoint_after"]["snapshot_id"]
    assert project.head_snapshot_id == result["auto_checkpoint_after"]["snapshot_id"]
    assert len(scenarios) == 2
    assert len(snapshots) == 2
    assert snapshots[0].id == result["auto_checkpoint_after"]["snapshot_id"]
    assert snapshots[0].parent_snapshot_id == result["auto_checkpoint_before"]["snapshot_id"]
    assert snapshots[0].trigger == "ai_auto"
