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
    created_at: datetime
    read_at: Optional[datetime] = None


class NotificationsListResponse(BaseModel):
    project_id: str
    unread_count: int
    notifications: list[NotificationOut]


class InsightsResponse(BaseModel):
    project_id: str
    unread_count: int
    headline: Optional[NotificationOut] = None
    notifications: list[NotificationOut]
