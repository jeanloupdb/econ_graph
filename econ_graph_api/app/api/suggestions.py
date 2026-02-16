"""
AI Suggestions API endpoints.

Provides suggestions for improving SmartGraph models.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.project import Project
from app.models.user import User
from app.models.project_collaborator import ProjectCollaborator
from app.services.ai_suggestions import (
    get_suggestions_for_project,
    format_suggestion_for_api,
)

router = APIRouter(prefix="/projects", tags=["suggestions"])


class SuggestionResponse(BaseModel):
    """A single suggestion."""
    id: str
    type: str
    title: str
    description: str
    prompt: str
    priority: str
    node_id: Optional[str] = None
    node_label: Optional[str] = None


class SuggestionsListResponse(BaseModel):
    """List of suggestions for a project."""
    project_id: str
    suggestions: List[SuggestionResponse]


def _get_project_with_access(db: Session, project_id: str, user: User) -> Project:
    """Get project with access check."""
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    # Owner always has access
    if p.user_id == user.id:
        return p

    # Check collaborator
    collab = db.query(ProjectCollaborator).filter(
        ProjectCollaborator.project_id == project_id,
        ProjectCollaborator.user_id == user.id
    ).first()

    if not collab:
        raise HTTPException(status_code=403, detail="Not authorized to access this project")

    return p


@router.get("/{project_id}/suggestions", response_model=SuggestionsListResponse)
async def get_project_suggestions(
    project_id: str,
    max_suggestions: int = 3,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get AI-generated suggestions for improving a project.

    Analyzes the project structure and returns contextual suggestions
    that can be applied via the AI assistant.

    Args:
        project_id: ID of the project to analyze
        max_suggestions: Maximum number of suggestions to return (default 3)

    Returns:
        List of suggestions with prompts that can be sent to the AI
    """
    # Check access
    _get_project_with_access(db, project_id, current_user)

    # Get suggestions
    suggestions = get_suggestions_for_project(db, project_id, max_suggestions)

    return SuggestionsListResponse(
        project_id=project_id,
        suggestions=[
            SuggestionResponse(**format_suggestion_for_api(s))
            for s in suggestions
        ]
    )
