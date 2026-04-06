from __future__ import annotations

import hashlib
import json

from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.project_notification import ProjectNotification
from app.models.project_snapshot import ProjectSnapshot
from app.schemas.project_snapshot import ProjectSnapshotOut, ProjectSnapshotRestoreResponse
from app.services import composite_cache, composite_root_cache, scenario_cache
from app.services.dependency_tracker import invalidate_dependency_graph
from app.services.smgp import (
    SmgpImportError,
    export_project_to_smgp,
    load_smgp_document,
    restore_project_from_smgp,
    serialize_smgp_document,
)


VALID_SNAPSHOT_TRIGGERS = {"manual", "ai", "ai_auto", "import", "restore", "system"}


def _normalize_trigger(trigger: str | None) -> str:
    candidate = (trigger or "manual").strip().lower()
    if candidate not in VALID_SNAPSHOT_TRIGGERS:
        return "manual"
    return candidate


def _payload_hash(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _normalized_snapshot_payload(document) -> bytes:
    raw = document.model_dump(mode="json", exclude_none=True)

    provenance = raw.get("provenance")
    if isinstance(provenance, dict):
        provenance.pop("exported_at", None)
        provenance.pop("exported_by_user_id", None)

    project = raw.get("project")
    if isinstance(project, dict):
        project.pop("updated_at", None)

    graph = raw.get("graph")
    nodes = graph.get("nodes") if isinstance(graph, dict) else None
    if isinstance(nodes, list):
        for node in nodes:
            if not isinstance(node, dict):
                continue
            node.pop("last_computed_at", None)
            node.pop("provider_last_fetched_at", None)

    return json.dumps(
        raw,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")


def _invalidate_project_runtime_state(project_id: str) -> None:
    invalidate_dependency_graph(project_id)
    scenario_cache.invalidate_project_cache(project_id)
    composite_root_cache.invalidate_project_cache(project_id)
    composite_cache.invalidate()


def list_project_snapshots(
    db: Session,
    project_id: str,
    *,
    limit: int = 50,
) -> list[ProjectSnapshot]:
    return (
        db.query(ProjectSnapshot)
        .filter(ProjectSnapshot.project_id == project_id)
        .order_by(ProjectSnapshot.created_at.desc())
        .limit(max(1, min(limit, 200)))
        .all()
    )


def create_project_snapshot(
    db: Session,
    project: Project,
    *,
    author_user_id: str | None = None,
    message: str | None = None,
    trigger: str = "manual",
) -> tuple[ProjectSnapshot, bool]:
    document = export_project_to_smgp(
        db,
        project.id,
        exported_by_user_id=author_user_id,
    )
    payload = serialize_smgp_document(document)
    content_hash = _payload_hash(_normalized_snapshot_payload(document))

    current_head = None
    if project.head_snapshot_id:
        current_head = (
            db.query(ProjectSnapshot)
            .filter(
                ProjectSnapshot.id == project.head_snapshot_id,
                ProjectSnapshot.project_id == project.id,
            )
            .first()
        )
        if current_head and current_head.content_hash == content_hash:
            return current_head, False

    snapshot = ProjectSnapshot(
        project_id=project.id,
        parent_snapshot_id=project.head_snapshot_id,
        author_user_id=author_user_id,
        trigger=_normalize_trigger(trigger),
        message=(message or "").strip() or None,
        content_hash=content_hash,
        smgp_payload=payload.decode("utf-8"),
    )
    db.add(snapshot)
    db.flush()

    project.head_snapshot_id = snapshot.id
    project.updated_at = snapshot.created_at
    db.flush()
    return snapshot, True


def get_project_snapshot(db: Session, project_id: str, snapshot_id: str) -> ProjectSnapshot | None:
    return (
        db.query(ProjectSnapshot)
        .filter(
            ProjectSnapshot.project_id == project_id,
            ProjectSnapshot.id == snapshot_id,
        )
        .first()
    )


def restore_project_snapshot(
    db: Session,
    project: Project,
    snapshot: ProjectSnapshot,
    *,
    actor_user_id: str | None = None,
    message: str | None = None,
) -> ProjectSnapshotRestoreResponse:
    try:
        document = load_smgp_document(snapshot.smgp_payload.encode("utf-8"))
    except SmgpImportError as exc:
        raise SmgpImportError(f"Snapshot '{snapshot.id}' is invalid and cannot be restored: {exc}") from exc

    db.query(ProjectNotification).filter(
        ProjectNotification.project_id == project.id
    ).delete(synchronize_session=False)

    result = restore_project_from_smgp(
        db,
        project,
        document,
        owner_id=actor_user_id or project.user_id,
    )
    restored_head, _created = create_project_snapshot(
        db,
        project,
        author_user_id=actor_user_id or project.user_id,
        message=message or f"Restauration depuis le snapshot {snapshot.id}",
        trigger="restore",
    )
    db.flush()
    _invalidate_project_runtime_state(project.id)

    return ProjectSnapshotRestoreResponse(
        project_id=project.id,
        restored_snapshot_id=snapshot.id,
        head_snapshot_id=restored_head.id,
        nodes_restored=result.nodes_created,
        edges_restored=result.edges_created,
        scenarios_restored=result.scenarios_created,
        composites_restored=result.composites_created,
    )


def snapshot_to_schema(
    snapshot: ProjectSnapshot,
    *,
    head_snapshot_id: str | None,
) -> ProjectSnapshotOut:
    return ProjectSnapshotOut(
        id=snapshot.id,
        project_id=snapshot.project_id,
        parent_snapshot_id=snapshot.parent_snapshot_id,
        author_user_id=snapshot.author_user_id,
        trigger=snapshot.trigger,
        message=snapshot.message,
        content_hash=snapshot.content_hash,
        created_at=snapshot.created_at,
        is_head=snapshot.id == head_snapshot_id,
    )
