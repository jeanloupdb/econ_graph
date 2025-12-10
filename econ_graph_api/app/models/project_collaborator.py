from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey
from app.core.db import Base

class ProjectCollaborator(Base):
    __tablename__ = "project_collaborator"

    project_id: Mapped[str] = mapped_column(String(64), ForeignKey("project.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("user.id"), primary_key=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False) # "viewer" | "editor"

    # Relationships
    project = relationship("Project", backref="collaborators")
    user = relationship("User", backref="collaborations")
