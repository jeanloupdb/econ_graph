from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


SnapshotTrigger = Literal["manual", "ai", "ai_auto", "import", "restore", "system"]


class ProjectSnapshotCreate(BaseModel):
    message: Optional[str] = Field(default=None, max_length=2000)
    trigger: SnapshotTrigger = "manual"


class ProjectSnapshotRestoreRequest(BaseModel):
    message: Optional[str] = Field(default=None, max_length=2000)


class ProjectSnapshotOut(BaseModel):
    id: str
    project_id: str
    parent_snapshot_id: Optional[str] = None
    author_user_id: Optional[str] = None
    trigger: str
    message: Optional[str] = None
    content_hash: str
    created_at: datetime
    is_head: bool = False

    class Config:
        from_attributes = True


class ProjectSnapshotRestoreResponse(BaseModel):
    project_id: str
    restored_snapshot_id: str
    head_snapshot_id: str
    nodes_restored: int
    edges_restored: int
    scenarios_restored: int
    composites_restored: int
