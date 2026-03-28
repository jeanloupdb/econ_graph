from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: str
    project_id: str
    user_id: str
    source: str
    type: str
    title: str
    body: Optional[str] = None
    priority: int
    payload: Optional[dict[str, Any]] = None
    fingerprint: Optional[str] = None
    theme: Optional[str] = None
    objective: Optional[str] = None
    dedup_key: Optional[str] = None
    group_key: Optional[str] = None
    score: Optional[float] = None
    aggregate_count: Optional[int] = None
    last_event_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None
    category: Optional[str] = None
    created_at: datetime
    read_at: Optional[datetime] = None


class NotificationsListResponse(BaseModel):
    project_id: str
    unread_count: int
    notifications: list[NotificationOut]


class NotificationSection(BaseModel):
    key: str
    title: str
    notifications: list[NotificationOut]


class InsightsResponse(BaseModel):
    project_id: str
    unread_count: int
    headline: Optional[NotificationOut] = None
    notifications: list[NotificationOut]
    sections: Optional[list[NotificationSection]] = None
