from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def _generate_id() -> str:
    return str(uuid4())


class Composite(Base):
    """Reusable sub-graph stored independently from projects."""

    __tablename__ = "composite"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=_generate_id,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    graph_data: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<Composite id={self.id} name={self.name}>"
