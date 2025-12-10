from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, ForeignKey
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

    # Relationships
    owner = relationship("User", backref="projects")
    scenarios = relationship("Scenario", back_populates="project", cascade="all, delete-orphan")

