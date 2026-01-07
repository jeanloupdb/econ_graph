import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Optional, Set
from app.core.db import get_db
from app.models.project import Project
from app.models.node import Node
from app.models.edge import Edge
from app.models.composite import Composite
from app.schemas.project import ViewerProjectOut, ProjectExposedRootsResponse, ProjectExposedRoot, CompositeExposedRoot
from app.api.projects import _is_overridable_project_node, _collect_composite_roots, _flatten_composite_root_entry, _normalize_identifier

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/viewer", tags=["viewer"])

@router.get("/{token}/full", response_model=dict)
def get_public_project_full(token: str, db: Session = Depends(get_db)):
    """Get full project data for public access via token - used by /public/[token] route"""
    project = db.query(Project).filter(Project.public_view_token == token).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or invalid token")

    nodes = db.query(Node).filter(Node.project_id == project.id).all()
    edges = db.query(Edge).filter(Edge.project_id == project.id).all()
    
    # Sanitize nodes for public view
    sanitized_nodes = []
    for n in nodes:
        node_data = {
            "id": n.id,
            "label": n.label,
            "pos_x": n.pos_x,
            "pos_y": n.pos_y,
            "parent_id": n.parent_id if hasattr(n, "parent_id") else None,
            "slug": n.slug,
            "unit": n.unit,
            "value_computed": n.value_computed,
            "status": n.status,
            "composite_id": n.composite_id,
            "computation_definition": "",  # Hide code
            "notes": n.notes,
        }
        sanitized_nodes.append(node_data)

    sanitized_edges = []
    for e in edges:
        sanitized_edges.append({
            "id": e.id,
            "source": e.source,
            "target": e.target,
            "label": e.label,
            "edge_type": e.edge_type,
        })

    return {
        "project": {
            "id": project.id,
            "name": project.name,
            "updated_at": project.updated_at,
            "user_role": "public"
        },
        "nodes": sanitized_nodes,
        "edges": sanitized_edges,
    }

@router.get("/{token}", response_model=dict)
def get_public_project(token: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.public_view_token == token).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or invalid token")

    # Reuse logic from get_project_exposed_roots but return a slightly different structure if needed
    # For the viewer, we likely need the full graph (nodes + edges) but sanitized.
    # The requirement says: "Canvas read-only", "Values visible", "Scenarios visible".
    
    # Let's return a structure similar to what the graph page expects, but filtered.
    
    nodes = db.query(Node).filter(Node.project_id == project.id).all()
    edges = db.query(Edge).filter(Edge.project_id == project.id).all()
    
    # Sanitize nodes
    sanitized_nodes = []
    for n in nodes:
        node_data = {
            "id": n.id,
            "label": n.label,
            # "type": n.type,  # Node model has no type field
            "pos_x": n.pos_x,
            "pos_y": n.pos_y,
            "parent_id": n.parent_id if hasattr(n, "parent_id") else None,
            "slug": n.slug,
            "unit": n.unit,
            "value_computed": n.value_computed, # Real value
            "status": n.status,
            "composite_id": n.composite_id,
            # EXCLUDE: computation_definition, notes (maybe?), etc.
            # We might need computation_definition if the frontend uses it for something visual, 
            # but the requirement says "Pas de code".
            # However, the frontend might need to know if it's a computed node.
            # Let's send an empty string or a flag.
            "computation_definition": "", # HIDE CODE
            "notes": n.notes, # Notes might be useful for viewers
        }
        sanitized_nodes.append(node_data)

    sanitized_edges = []
    for e in edges:
        sanitized_edges.append({
            "id": e.id,
            "source": e.source,
            "target": e.target,
            "label": e.label,
            "edge_type": e.edge_type,
            # Exclude rule_id if sensitive? Probably fine.
        })

    # We also need scenarios?
    # The requirement says "Menu Scénarios accessible en lecture seule".
    # So we should probably return scenarios too.
    # But wait, the frontend fetches scenarios separately usually.
    # Let's check if we need a separate endpoint for viewer scenarios or if we bundle it.
    # For simplicity, let's bundle project info + nodes + edges here.
    # Scenarios might be fetched via a separate public endpoint or included.
    
    # Actually, let's look at how the frontend loads data. 
    # It uses `useGraphData` which calls `/nodes?project=...` and `/edges?project=...`.
    # We should probably provide a single "load everything" endpoint for the viewer to avoid multiple roundtrips and complex auth logic.
    
    return {
        "project": ViewerProjectOut.model_validate(project),
        "nodes": sanitized_nodes,
        "edges": sanitized_edges,
    }

@router.get("/{token}/scenarios", response_model=List[dict])
def get_public_project_scenarios(token: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.public_view_token == token).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Return scenarios
    # We need to import Scenario model
    from app.models.scenario import Scenario
    scenarios = db.query(Scenario).filter(Scenario.project_id == project.id).all()
    
    return [
        {
            "id": s.id,
            "name": s.name,
            "is_base": s.is_base,
            # Exclude internal details if any
        }
        for s in scenarios
    ]
