import asyncio
import logging
from datetime import datetime, timedelta

from app.core.config import settings
from app.core.db import SessionLocal
from app.models.project import Project
from app.models.project_notification import ProjectNotification
from app.services.project_insights import generate_project_notifications

logger = logging.getLogger(__name__)

_task: asyncio.Task | None = None


async def _run_cycle():
    if not settings.INSIGHTS_ENABLED:
        return

    db = SessionLocal()
    try:
        projects = db.query(Project).all()
        if not projects:
            return

        interval = timedelta(minutes=settings.INSIGHTS_INTERVAL_MINUTES)
        now = datetime.utcnow()

        for project in projects:
            latest = (
                db.query(ProjectNotification)
                .filter(ProjectNotification.project_id == project.id)
                .order_by(
                    ProjectNotification.last_event_at.desc().nulls_last(),
                    ProjectNotification.created_at.desc(),
                )
                .first()
            )
            latest_at = latest.last_event_at or latest.created_at if latest else None
            if latest_at and (now - latest_at) < interval:
                continue

            try:
                generate_project_notifications(
                    db,
                    project_id=project.id,
                    user_id=project.user_id,
                    max_notifications=settings.INSIGHTS_MAX_PER_PROJECT,
                    use_ai=settings.INSIGHTS_AI_ENABLED,
                )
                db.commit()
            except Exception as e:
                logger.warning("Insights generation failed", project_id=project.id, error=str(e))
                db.rollback()
    finally:
        db.close()


async def _loop():
    logger.info("Insights scheduler started", enabled=settings.INSIGHTS_ENABLED)
    while True:
        try:
            await _run_cycle()
        except Exception as e:
            logger.warning("Insights scheduler error", error=str(e))
        await asyncio.sleep(settings.INSIGHTS_INTERVAL_MINUTES * 60)


def start_scheduler():
    global _task
    if _task or not settings.INSIGHTS_ENABLED:
        return
    _task = asyncio.create_task(_loop())


def stop_scheduler():
    global _task
    if _task:
        _task.cancel()
        _task = None
