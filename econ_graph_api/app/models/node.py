from sqlalchemy import CheckConstraint, Double, Enum, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
import enum
from datetime import datetime
from uuid import uuid4
from app.core.db import Base


"""
Unit previously was an Enum. It is now a free-form string stored in the
database to allow arbitrary unit labels (e.g., "milliards de dollars").
Keep Status as an enum. Nodes are algorithm-only for computation.
"""


class Status(str, enum.Enum):
    unknown = "unknown"
    observed = "observed"
    imposed = "imposed"
    implied = "implied"
    invalid = "invalid"


def _generate_id() -> str:
    return str(uuid4())


class Node(Base):
    __tablename__ = "node"

    # project-scoped graph
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_generate_id)
    slug: Mapped[str] = mapped_column(String(128), nullable=False)
    project_id: Mapped[str] = mapped_column(String(64), ForeignKey("project.id", ondelete="CASCADE"), nullable=False, default="default")
    composite_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("composite.id", ondelete="SET NULL"), nullable=True)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    unit: Mapped[str | None] = mapped_column(String(100), nullable=True)
    plausible_min: Mapped[float | None] = mapped_column(Double, nullable=True)
    plausible_max: Mapped[float | None] = mapped_column(Double, nullable=True)
    status: Mapped[Status] = mapped_column(Enum(Status), nullable=False, default=Status.unknown)
    confidence: Mapped[float] = mapped_column(Double, nullable=False, default=1.0)

    # Computation fields (algorithm-only)
    value_computed: Mapped[float | None] = mapped_column(Double, nullable=True)
    computation_definition: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    last_computed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    computation_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    pos_x: Mapped[float | None] = mapped_column(Double, nullable=True)
    pos_y: Mapped[float | None] = mapped_column(Double, nullable=True)

    # Provider fields (optional) for root nodes fetching from external APIs
    provider_enabled: Mapped[bool] = mapped_column(default=False)
    provider_type: Mapped[str | None] = mapped_column(String(32), nullable=True)  # e.g., 'http_json'
    provider_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    provider_json_path: Mapped[str | None] = mapped_column(String(200), nullable=True)  # dot.path.to.value
    provider_timeout: Mapped[float | None] = mapped_column(Double, nullable=True)  # seconds
    provider_cache_ttl: Mapped[float | None] = mapped_column(Double, nullable=True)  # seconds
    provider_last_fetched_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    provider_last_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("project_id", "slug", name="uq_node_project_slug"),
        CheckConstraint("confidence >= 0.0 AND confidence <= 1.0", name="confidence_between_0_1"),
        CheckConstraint(
            "(plausible_min IS NULL) OR (plausible_max IS NULL) OR (plausible_min <= plausible_max)",
            name="plausible_bounds_ok",
        ),
    )
