from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from app.core.db import Base


class Project(Base):
    __tablename__ = "project"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    user_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("user.id"), nullable=True)  # Nullable for backward compatibility
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    public_view_token: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    head_snapshot_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    
    # Project status: 'draft' = wizard in progress, 'completed' = graph generated
    status: Mapped[str] = mapped_column(String(20), default="completed", nullable=False)
    
    # Wizard state (JSONB) - persisted conversation for drafts
    wizard_state: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    
    # AI Generation fields
    generation_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)  # Original prompt used to generate
    description: Mapped[str | None] = mapped_column(Text, nullable=True)  # AI-understood intent or user description

    # AI Dashboard config (JSONB) - persisted widget layout
    dashboard_config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    owner = relationship("User", backref="projects")
    scenarios = relationship("Scenario", back_populates="project", cascade="all, delete-orphan")
    snapshots = relationship("ProjectSnapshot", backref="project", cascade="all, delete-orphan")
