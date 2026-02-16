from fastapi import BackgroundTasks
import threading
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.project import Project
from app.services.project_insights import run_insights_task


def _resolve_project_owner(db: Session, project_id: str) -> str | None:
    proj = db.query(Project).filter(Project.id == project_id).first()
    return proj.user_id if proj else None


def schedule_project_insights(
    db: Session,
    project_id: str,
    user_id: str | None,
    background_tasks: BackgroundTasks | None = None,
) -> None:
    if not settings.INSIGHTS_ENABLED:
        return

    owner_id = user_id or _resolve_project_owner(db, project_id)
    if not owner_id:
        return

    if background_tasks is not None:
        background_tasks.add_task(run_insights_task, project_id, owner_id, settings.INSIGHTS_AI_ENABLED)
        return

    # Fallback: run in a background thread to avoid blocking request/streaming
    threading.Thread(
        target=run_insights_task,
        args=(project_id, owner_id, settings.INSIGHTS_AI_ENABLED),
        daemon=True,
    ).start()
