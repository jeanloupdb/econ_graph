from __future__ import annotations

from datetime import datetime
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.composite import Composite
from app.models.node import Node
from app.models.project import Project
from app.schemas.composite import (
    CompositeComputeRequest,
    CompositeComputeResponse,
    CompositeCreate,
    CompositeGraphData,
    CompositeOut,
    CompositeSummary,
    CompositeUpdate,
    CompositeUsage,
    CompositeUsageProject,
    CompositeUsageComposite,
)
from app.services.composite_compute import compute_composite_graph
from app.services.computation import CycleDetectedError
from app.services import composite_cache

router = APIRouter(prefix="/composites", tags=["composites"])


def _validate_graph(graph: CompositeGraphData) -> None:
    nodes = graph.nodes or []
    if len(nodes) == 0:
        raise HTTPException(status_code=400, detail="Composite must contain at least one node.")

    node_ids: set[str] = set()
    for node in nodes:
        if not node.id:
            raise HTTPException(status_code=400, detail="All nodes must have an id.")
        if node.id in node_ids:
            raise HTTPException(status_code=400, detail=f"Duplicate node id '{node.id}' detected.")
        node_ids.add(node.id)

    edges = graph.edges or []
    outgoing = {node_id: 0 for node_id in node_ids}
    for edge in edges:
        if edge.source not in node_ids:
            raise HTTPException(status_code=400, detail=f"Edge source '{edge.source}' is not defined in nodes.")
        if edge.target not in node_ids:
            raise HTTPException(status_code=400, detail=f"Edge target '{edge.target}' is not defined in nodes.")
        outgoing[edge.source] = outgoing.get(edge.source, 0) + 1

    leaves = [node_id for node_id in node_ids if outgoing.get(node_id, 0) == 0]
    if len(leaves) != 1:
        raise HTTPException(status_code=400, detail="Composite must contain exactly one final node.")


def _query_composite_usage(db: Session, composite_id: str):
    project_rows = (
        db.query(Project.id, Project.name)
        .join(Node, Node.project_id == Project.id)
        .filter(Node.composite_id == composite_id)
        .filter(Node.project_id.isnot(None))
        .distinct()
        .all()
    )

    composite_rows = []
    other_composites = (
        db.query(Composite.id, Composite.name, Composite.graph_data)
        .filter(Composite.id != composite_id)
        .all()
    )
    for cid, cname, graph_data in other_composites:
        nodes = (graph_data or {}).get("nodes") or []
        if any(
            isinstance(node, dict) and node.get("composite_id") == composite_id
            for node in nodes
        ):
            composite_rows.append((cid, cname))

    return project_rows, composite_rows


@router.get("", response_model=List[CompositeSummary])
def list_composites(db: Session = Depends(get_db)):
    return db.query(Composite).order_by(Composite.updated_at.desc()).all()


@router.get("/{composite_id}", response_model=CompositeOut)
def get_composite(composite_id: str, db: Session = Depends(get_db)):
    composite = db.query(Composite).filter(Composite.id == composite_id).first()
    if not composite:
        raise HTTPException(status_code=404, detail="Composite not found.")
    return composite


@router.get("/{composite_id}/usage", response_model=CompositeUsage)
def get_composite_usage(composite_id: str, db: Session = Depends(get_db)):
    composite = db.query(Composite).filter(Composite.id == composite_id).first()
    if not composite:
        raise HTTPException(status_code=404, detail="Composite not found.")
    project_rows, composite_rows = _query_composite_usage(db, composite_id)
    projects = [CompositeUsageProject(id=pid, name=pname) for pid, pname in project_rows]
    composites = [CompositeUsageComposite(id=cid, name=cname) for cid, cname in composite_rows]
    return CompositeUsage(id=composite.id, name=composite.name, projects=projects, composites=composites)


@router.post("", response_model=CompositeOut, status_code=201)
def create_composite(payload: CompositeCreate, db: Session = Depends(get_db)):
    graph = payload.graph_data
    _validate_graph(graph)

    composite_id = payload.id or str(uuid4())
    existing = db.query(Composite).filter(Composite.id == composite_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Composite id already exists.")

    now = datetime.utcnow()
    composite = Composite(
        id=composite_id,
        name=payload.name,
        graph_data=graph.model_dump(mode="json"),
        created_at=now,
        updated_at=now,
    )
    db.add(composite)
    db.flush()
    return composite


@router.patch("/{composite_id}", response_model=CompositeOut)
def update_composite(composite_id: str, payload: CompositeUpdate, db: Session = Depends(get_db)):
    composite = db.query(Composite).filter(Composite.id == composite_id).first()
    if not composite:
        raise HTTPException(status_code=404, detail="Composite not found.")

    data = payload.model_dump(exclude_unset=True)

    if "name" in data and data["name"]:
        composite.name = data["name"]

    if payload.graph_data is not None:
        _validate_graph(payload.graph_data)
        composite.graph_data = payload.graph_data.model_dump(mode="json")

    composite.updated_at = datetime.utcnow()
    db.flush()
    composite_cache.invalidate(composite_id)
    return composite


@router.delete("/{composite_id}", status_code=204)
def delete_composite(composite_id: str, db: Session = Depends(get_db)):
    composite = db.query(Composite).filter(Composite.id == composite_id).first()
    if not composite:
        raise HTTPException(status_code=404, detail="Composite not found.")
    project_rows, composite_rows = _query_composite_usage(db, composite_id)
    if project_rows or composite_rows:
        projects = [{"id": pid, "name": pname} for pid, pname in project_rows]
        composites = [{"id": cid, "name": cname} for cid, cname in composite_rows]
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Ce composite est utilisé dans d'autres projets ou composites.",
                "projects": projects,
                "composites": composites,
            },
        )
    db.delete(composite)
    db.flush()
    composite_cache.invalidate(composite_id)


@router.post("/compute", response_model=CompositeComputeResponse)
def compute_composite(payload: CompositeComputeRequest):
    try:
        results = compute_composite_graph(payload.graph_data)
    except CycleDetectedError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return CompositeComputeResponse(results=results)
