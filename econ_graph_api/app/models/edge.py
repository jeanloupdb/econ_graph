from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
import enum
from app.core.db import Base


class EdgeType(str, enum.Enum):
    """Type of relationship between nodes."""
    default = "default"
    dependency = "dependency"
    influence = "influence"
    correlation = "correlation"


class Edge(Base):
    """Graph edge representing relationships between economic nodes."""
    __tablename__ = "edge"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(64), ForeignKey("project.id", ondelete="CASCADE"), nullable=False, default="default")
    source: Mapped[str] = mapped_column(String(64), ForeignKey("node.id", ondelete="CASCADE"), nullable=False)
    target: Mapped[str] = mapped_column(String(64), ForeignKey("node.id", ondelete="CASCADE"), nullable=False)
    label: Mapped[str | None] = mapped_column(String(2000), nullable=True)  # Extended for equations/algorithms
    edge_type: Mapped[EdgeType] = mapped_column(String(50), nullable=False, default=EdgeType.default)
    rule_id: Mapped[str | None] = mapped_column(String(64), nullable=True)  # Associated rule if any
