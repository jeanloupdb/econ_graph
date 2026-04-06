from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.insights_trigger import schedule_project_insights
from app.api.projects import _get_project_with_access
from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.project_snapshot import (
    ProjectSnapshotCreate,
    ProjectSnapshotOut,
    ProjectSnapshotRestoreRequest,
    ProjectSnapshotRestoreResponse,
)
from app.services.project_snapshots import (
    create_project_snapshot,
    get_project_snapshot,
    list_project_snapshots,
    restore_project_snapshot,
    snapshot_to_schema,
)
from app.services.smgp import SmgpImportError


router = APIRouter(prefix="/projects", tags=["project-snapshots"])


@router.get("/{project_id}/snapshots", response_model=list[ProjectSnapshotOut])
def list_snapshots(
    project_id: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_project_with_access(db, project_id, current_user, required_role="viewer")
    snapshots = list_project_snapshots(db, project.id, limit=limit)
    return [
        snapshot_to_schema(snapshot, head_snapshot_id=project.head_snapshot_id)
        for snapshot in snapshots
    ]


@router.post("/{project_id}/snapshots", response_model=ProjectSnapshotOut)
def create_snapshot(
    project_id: str,
    payload: ProjectSnapshotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_project_with_access(db, project_id, current_user, required_role="editor")
    snapshot, _created = create_project_snapshot(
        db,
        project,
        author_user_id=current_user.id,
        message=payload.message,
        trigger=payload.trigger,
    )
    return snapshot_to_schema(snapshot, head_snapshot_id=project.head_snapshot_id)


@router.post(
    "/{project_id}/snapshots/{snapshot_id}/restore",
    response_model=ProjectSnapshotRestoreResponse,
)
def restore_snapshot(
    project_id: str,
    snapshot_id: str,
    payload: ProjectSnapshotRestoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None,
):
    project = _get_project_with_access(db, project_id, current_user, required_role="editor")
    snapshot = get_project_snapshot(db, project.id, snapshot_id)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    try:
        response = restore_project_snapshot(
            db,
            project,
            snapshot,
            actor_user_id=current_user.id,
            message=payload.message,
        )
    except SmgpImportError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    schedule_project_insights(db, project.id, current_user.id, background_tasks)
    return response
