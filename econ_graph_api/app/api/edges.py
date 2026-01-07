"""Edge API endpoints for listing edges."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.edge import Edge
from app.models.user import User

router = APIRouter(prefix="/edges", tags=["edges"])


class EdgeOut(BaseModel):
    id: str
    source: str
    target: str
    label: str | None = None
    edge_type: str
    project_id: str

    class Config:
        from_attributes = True


@router.get("", response_model=List[EdgeOut])
def list_edges(
    project: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all edges, optionally filtered by project."""
    q = db.query(Edge)
    if project:
        q = q.filter(Edge.project_id == project)
    edges = q.all()
    return [
        EdgeOut(
            id=e.id,
            source=e.source,
            target=e.target,
            label=e.label,
            edge_type=e.edge_type.value if hasattr(e.edge_type, 'value') else str(e.edge_type),
            project_id=e.project_id,
        )
        for e in edges
    ]

