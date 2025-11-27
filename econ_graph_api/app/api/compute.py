"""
Computation endpoints for calculating node values.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Optional, List
from datetime import datetime

from app.core.db import get_db
from app.models.node import Node
from app.services.computation import (
    compute_node,
    compute_all_nodes,
    ComputationError,
    CycleDetectedError
)
from pydantic import BaseModel


router = APIRouter(prefix="/compute", tags=["compute"])


class ComputeResponse(BaseModel):
    """Response model for single node computation."""
    node_id: str
    value: Optional[float]
    error: Optional[str]
    computed_at: Optional[datetime]


class ComputeNodeResponse(BaseModel):
    """Response model for a node with scenario support."""
    value: Optional[float]
    real_value: Optional[float]
    scenario_value: Optional[float]
    error: Optional[str]


class ComputeAllResponse(BaseModel):
    """Response model for bulk computation."""
    results: Dict[str, ComputeResponse]
    total_computed: int
    total_errors: int


class ComputeAllScenarioResponse(BaseModel):
    """Response model for bulk computation with scenario support."""
    results: Dict[str, ComputeNodeResponse]
    total_computed: int
    total_errors: int


class CompareRequest(BaseModel):
    """Request model for comparing two scenarios."""
    scenario_a_id: str
    scenario_b_id: str


class CompareNodeResult(BaseModel):
    """Result for a single node in scenario comparison."""
    node_id: str
    value_a: Optional[float]
    value_b: Optional[float]
    delta: Optional[float]
    real_value: Optional[float]
    error_a: Optional[str]
    error_b: Optional[str]


class CompareGraphResponse(BaseModel):
    """Response model for comparison of two scenarios."""
    nodes: List[CompareNodeResult]


@router.post("/nodes/{node_id}", response_model=ComputeResponse)
def compute_node_endpoint(
    node_id: str,
    project: str | None = Query(default=None),
    db: Session = Depends(get_db)
):
    """
    Compute the value of a specific node.

    The node must have a computation definition (algorithm mode only).
    """
    # Check node exists
    q = db.query(Node).filter(Node.id == node_id)
    if project:
        q = q.filter(Node.project_id == project)
    node = q.first()
    if not node:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")

    has_compute_logic = bool(node.computation_definition)
    has_provider = bool(getattr(node, 'provider_enabled', False))
    if not node.composite_id and not has_compute_logic and not has_provider:
        raise HTTPException(status_code=400, detail=f"Node {node_id} has no computation definition")

    # Perform computation
    value, error = compute_node(db, node_id, project_id=project)

    # Update node
    node.value_computed = value if error is None else None
    node.computation_error = error
    node.last_computed_at = datetime.utcnow()
    db.commit()
    db.refresh(node)

    return ComputeResponse(
        node_id=node_id,
        value=node.value_computed,
        error=node.computation_error,
        computed_at=node.last_computed_at
    )


@router.post("/all")
def compute_all_endpoint(
    project: str | None = Query(default=None),
    scenario_id: str | None = Query(default=None),
    db: Session = Depends(get_db)
):
    """
    Compute all computed nodes in the graph.

    Nodes are calculated in topological order to respect dependencies.

    If scenario_id is provided, returns extended response with real_value and scenario_value.
    Otherwise, returns legacy response format.
    """
    results_dict = compute_all_nodes(db, project_id=project, scenario_id=scenario_id)

    # Build response
    total_computed = 0
    total_errors = 0

    if scenario_id:
        # New response format with scenario support
        results = {}
        for node_id, node_data in results_dict.items():
            if node_id == "_error":
                # Global error
                raise HTTPException(status_code=400, detail=node_data.get("error"))

            error = node_data.get("error")
            results[node_id] = ComputeNodeResponse(
                value=node_data.get("value"),
                real_value=node_data.get("real_value"),
                scenario_value=node_data.get("scenario_value"),
                error=error
            )

            if error is None:
                total_computed += 1
            else:
                total_errors += 1

        return ComputeAllScenarioResponse(
            results=results,
            total_computed=total_computed,
            total_errors=total_errors
        )
    else:
        # Legacy response format (backward compatibility)
        results = {}
        for node_id, node_data in results_dict.items():
            if node_id == "_error":
                # Global error
                raise HTTPException(status_code=400, detail=node_data.get("error"))

            node = db.get(Node, node_id)
            error = node_data.get("error")
            value = node_data.get("value")

            results[node_id] = ComputeResponse(
                node_id=node_id,
                value=value if error is None else None,
                error=error,
                computed_at=node.last_computed_at if node else None
            )

            if error is None:
                total_computed += 1
            else:
                total_errors += 1

        return ComputeAllResponse(
            results=results,
            total_computed=total_computed,
            total_errors=total_errors
        )


@router.post("/compare", response_model=CompareGraphResponse)
def compare_scenarios_endpoint(
    data: CompareRequest,
    project: str | None = Query(default=None),
    db: Session = Depends(get_db)
):
    """
    Compare two scenarios by computing the graph twice.

    Returns value_a (scenario A), value_b (scenario B), delta (B - A),
    and the real_value for each node.
    """
    # Treat the special ID "baseline" as "no scenario" (real values only)
    scenario_a = None if data.scenario_a_id == "baseline" else data.scenario_a_id
    scenario_b = None if data.scenario_b_id == "baseline" else data.scenario_b_id

    # Compute for scenario A
    results_a = compute_all_nodes(db, project_id=project, scenario_id=scenario_a)
    # Compute for scenario B
    results_b = compute_all_nodes(db, project_id=project, scenario_id=scenario_b)

    nodes: List[CompareNodeResult] = []

    all_node_ids = set(results_a.keys()) | set(results_b.keys())
    all_node_ids.discard("_error")

    for node_id in sorted(all_node_ids):
        node_a = results_a.get(node_id, {}) or {}
        node_b = results_b.get(node_id, {}) or {}

        # Extract values
        value_a = node_a.get("scenario_value")
        value_b = node_b.get("scenario_value")

        # Real value (baseline) is the same for both, prefer A's then B's
        real_value = node_a.get("real_value")
        if real_value is None:
            real_value = node_b.get("real_value")

        # Errors per scenario
        error_a = node_a.get("error")
        error_b = node_b.get("error")

        # Compute delta when both numeric
        delta: Optional[float] = None
        if isinstance(value_a, (int, float)) and isinstance(value_b, (int, float)):
            delta = value_b - value_a

        nodes.append(
            CompareNodeResult(
                node_id=node_id,
                value_a=value_a,
                value_b=value_b,
                delta=delta,
                real_value=real_value,
                error_a=error_a,
                error_b=error_b,
            )
        )

    return CompareGraphResponse(nodes=nodes)
