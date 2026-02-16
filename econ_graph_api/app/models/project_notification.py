from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from uuid import uuid4

from app.core.db import Base


def _generate_id() -> str:
    return str(uuid4())


class ProjectNotification(Base):
    __tablename__ = "project_notification"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_generate_id)
    project_id: Mapped[str] = mapped_column(String(64), ForeignKey("project.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("user.id", ondelete="CASCADE"), nullable=False)

    source: Mapped[str] = mapped_column(String(32), nullable=False)  # rules | suggestions | ai
    type: Mapped[str] = mapped_column(String(32), nullable=False)    # insight | alert | quiz | suggestion
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    fingerprint: Mapped[str | None] = mapped_column(String(64), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_project_notification_project_created", "project_id", "created_at"),
        Index("ix_project_notification_user_created", "user_id", "created_at"),
    )
