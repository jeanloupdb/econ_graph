from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def _generate_id() -> str:
    return str(uuid4())


class ProjectSnapshot(Base):
    __tablename__ = "project_snapshot"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_generate_id)
    project_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("project.id", ondelete="CASCADE"),
        nullable=False,
    )
    parent_snapshot_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    author_user_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("user.id", ondelete="SET NULL"),
        nullable=True,
    )
    trigger: Mapped[str] = mapped_column(String(32), nullable=False, default="manual")
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    smgp_payload: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_project_snapshot_project_created", "project_id", "created_at"),
        Index("ix_project_snapshot_project_hash", "project_id", "content_hash"),
    )
