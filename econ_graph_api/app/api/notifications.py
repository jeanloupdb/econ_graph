"""
Project Notifications & Insights API.
"""

from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.project import Project
from app.models.project_collaborator import ProjectCollaborator
from app.models.project_notification import ProjectNotification
from app.models.user import User
from app.schemas.notification import NotificationOut, NotificationsListResponse, InsightsResponse
from app.services.project_insights import generate_project_notifications
from app.core.config import settings

router = APIRouter(prefix="/projects", tags=["notifications"])


class MarkReadRequest(BaseModel):
    ids: Optional[List[str]] = None
    all: bool = False


def _get_project_with_access(db: Session, project_id: str, user: User) -> Project:
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    if p.user_id == user.id:
        return p

    collab = db.query(ProjectCollaborator).filter(
        ProjectCollaborator.project_id == project_id,
        ProjectCollaborator.user_id == user.id
    ).first()
    if not collab:
        raise HTTPException(status_code=403, detail="Not authorized to access this project")

    return p


def _to_schema(n: ProjectNotification) -> NotificationOut:
    return NotificationOut(
        id=n.id,
        project_id=n.project_id,
        user_id=n.user_id,
        source=n.source,
        type=n.type,
        title=n.title,
        body=n.body,
        priority=n.priority,
        payload=n.payload,
        fingerprint=n.fingerprint,
        created_at=n.created_at,
        read_at=n.read_at,
    )


@router.get("/{project_id}/notifications", response_model=NotificationsListResponse)
def list_notifications(
    project_id: str,
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationsListResponse:
    _get_project_with_access(db, project_id, current_user)

    query = db.query(ProjectNotification).filter(ProjectNotification.project_id == project_id)
    if unread_only:
        query = query.filter(ProjectNotification.read_at.is_(None))

    notifications = query.order_by(ProjectNotification.created_at.desc()).limit(limit).all()
    unread_count = db.query(ProjectNotification).filter(
        ProjectNotification.project_id == project_id,
        ProjectNotification.read_at.is_(None),
    ).count()

    return NotificationsListResponse(
        project_id=project_id,
        unread_count=unread_count,
        notifications=[_to_schema(n) for n in notifications],
    )


@router.post("/{project_id}/notifications/mark-read", response_model=NotificationsListResponse)
def mark_notifications_read(
    project_id: str,
    payload: MarkReadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationsListResponse:
    _get_project_with_access(db, project_id, current_user)

    query = db.query(ProjectNotification).filter(ProjectNotification.project_id == project_id)
    if payload.all:
        query.update({ProjectNotification.read_at: datetime.utcnow()})
    elif payload.ids:
        query = query.filter(ProjectNotification.id.in_(payload.ids))
        query.update({ProjectNotification.read_at: datetime.utcnow()}, synchronize_session=False)

    db.commit()

    # Return latest list
    return list_notifications(project_id=project_id, limit=20, unread_only=False, db=db, current_user=current_user)


@router.post("/{project_id}/notifications/refresh", response_model=NotificationsListResponse)
def refresh_notifications(
    project_id: str,
    max_notifications: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationsListResponse:
    _get_project_with_access(db, project_id, current_user)

    generate_project_notifications(
        db,
        project_id=project_id,
        user_id=current_user.id,
        max_notifications=max_notifications,
        use_ai=settings.INSIGHTS_AI_ENABLED,
    )
    db.commit()

    return list_notifications(project_id=project_id, limit=max_notifications, unread_only=False, db=db, current_user=current_user)


@router.get("/{project_id}/insights", response_model=InsightsResponse)
def get_project_insights(
    project_id: str,
    refresh: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InsightsResponse:
    _get_project_with_access(db, project_id, current_user)

    if refresh:
        generate_project_notifications(
            db,
            project_id=project_id,
            user_id=current_user.id,
            max_notifications=5,
            use_ai=settings.INSIGHTS_AI_ENABLED,
        )
        db.commit()

    notifications = (
        db.query(ProjectNotification)
        .filter(ProjectNotification.project_id == project_id)
        .order_by(ProjectNotification.created_at.desc())
        .limit(10)
        .all()
    )
    unread_count = db.query(ProjectNotification).filter(
        ProjectNotification.project_id == project_id,
        ProjectNotification.read_at.is_(None),
    ).count()

    headline = next((n for n in notifications if n.read_at is None), None)
    if not headline and notifications:
        headline = notifications[0]

    return InsightsResponse(
        project_id=project_id,
        unread_count=unread_count,
        headline=_to_schema(headline) if headline else None,
        notifications=[_to_schema(n) for n in notifications],
    )
