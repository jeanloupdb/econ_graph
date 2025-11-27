from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime
from datetime import datetime
from app.core.db import Base


class Project(Base):
    __tablename__ = "project"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    scenarios = relationship("Scenario", back_populates="project", cascade="all, delete-orphan")

