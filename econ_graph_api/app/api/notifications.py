"""
Project Notifications & Insights API.
"""

from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.project import Project
from app.models.project_collaborator import ProjectCollaborator
from app.models.project_notification import ProjectNotification
from app.models.user import User
from app.schemas.notification import NotificationOut, NotificationsListResponse, InsightsResponse, NotificationSection
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


def _category_for(n: ProjectNotification) -> str:
    if n.type == "alert":
        return "important"
    if n.type == "suggestion":
        return "advice"
    if n.type == "insight":
        return "advice"
    return "info"


def _active_filter(now: datetime):
    stale_cutoff = now - timedelta(days=30)
    return or_(
        ProjectNotification.expires_at > now,
        and_(ProjectNotification.expires_at.is_(None), ProjectNotification.created_at >= stale_cutoff),
    )


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
        theme=n.theme,
        objective=n.objective,
        dedup_key=n.dedup_key,
        group_key=n.group_key,
        score=n.score,
        aggregate_count=n.aggregate_count,
        last_event_at=n.last_event_at,
        expires_at=n.expires_at,
        archived_at=n.archived_at,
        category=_category_for(n),
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

    now = datetime.utcnow()
    query = (
        db.query(ProjectNotification)
        .filter(ProjectNotification.project_id == project_id)
        .filter(ProjectNotification.archived_at.is_(None))
        .filter(_active_filter(now))
    )
    if unread_only:
        query = query.filter(ProjectNotification.read_at.is_(None))

    notifications = (
        query.order_by(
            ProjectNotification.score.desc().nulls_last(),
            ProjectNotification.last_event_at.desc().nulls_last(),
            ProjectNotification.created_at.desc(),
        )
        .limit(limit)
        .all()
    )
    unread_count = db.query(ProjectNotification).filter(
        ProjectNotification.project_id == project_id,
        ProjectNotification.read_at.is_(None),
        ProjectNotification.archived_at.is_(None),
        _active_filter(now),
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


@router.delete("/{project_id}/notifications/{notification_id}")
def delete_notification(
    project_id: str,
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    _get_project_with_access(db, project_id, current_user)

    notification = db.query(ProjectNotification).filter(
        ProjectNotification.id == notification_id,
        ProjectNotification.project_id == project_id,
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notification)
    db.commit()

    return {"success": True, "message": "Notification deleted"}


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

    now = datetime.utcnow()
    notifications = (
        db.query(ProjectNotification)
        .filter(ProjectNotification.project_id == project_id)
        .filter(ProjectNotification.archived_at.is_(None))
        .filter(_active_filter(now))
        .order_by(
            ProjectNotification.score.desc().nulls_last(),
            ProjectNotification.last_event_at.desc().nulls_last(),
            ProjectNotification.created_at.desc(),
        )
        .limit(3)
        .all()
    )
    # Count only unread among the 3 displayed (not total unread)
    unread_count = len([n for n in notifications if n.read_at is None])

    headline = next((n for n in notifications if n.read_at is None), None)
    if not headline and notifications:
        headline = notifications[0]

    sections_map: dict[str, list[ProjectNotification]] = {
        "important": [],
        "advice": [],
        "info": [],
    }
    for n in notifications:
        sections_map[_category_for(n)].append(n)

    sections: list[NotificationSection] = []
    if sections_map["important"]:
        sections.append(
            NotificationSection(
                key="important",
                title="Important",
                notifications=[_to_schema(n) for n in sections_map["important"]],
            )
        )
    if sections_map["advice"]:
        sections.append(
            NotificationSection(
                key="advice",
                title="Conseils",
                notifications=[_to_schema(n) for n in sections_map["advice"]],
            )
        )
    if sections_map["info"]:
        sections.append(
            NotificationSection(
                key="info",
                title="Infos",
                notifications=[_to_schema(n) for n in sections_map["info"]],
            )
        )

    return InsightsResponse(
        project_id=project_id,
        unread_count=unread_count,
        headline=_to_schema(headline) if headline else None,
        notifications=[_to_schema(n) for n in notifications],
        sections=sections or None,
    )
