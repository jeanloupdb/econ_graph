"""
API endpoints for scenario management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from app.core.db import get_db
from app.schemas.scenario import (
    ScenarioCreate,
    ScenarioUpdate,
    ScenarioResponse,
    OverrideBatchUpdate,
    ScenarioNodeOverrideResponse,
    ScenarioOverrideValidateRequest,
    ScenarioOverrideValidateResponse,
)
from app.repositories import scenario_repo
from app.services import scenario_cache
from app.services.computation import execute_algorithm
from app.api.insights_trigger import schedule_project_insights

router = APIRouter(prefix="/api", tags=["scenarios"])


@router.get("/projects/{project_id}/scenarios", response_model=List[ScenarioResponse])
def list_scenarios(
    project_id: str,
    db: Session = Depends(get_db)
):
    """List all scenarios for a project."""
    scenarios = scenario_repo.list_scenarios(db, project_id)
    return scenarios


@router.post("/projects/{project_id}/scenarios", response_model=ScenarioResponse, status_code=201)
def create_scenario(
    project_id: str,
    data: ScenarioCreate,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """Create a new scenario for a project."""
    scenario = scenario_repo.create_scenario(db, project_id, data)
    schedule_project_insights(db, project_id, None, background_tasks)
    return scenario


@router.get("/scenarios/{scenario_id}", response_model=ScenarioResponse)
def get_scenario(
    scenario_id: str,
    db: Session = Depends(get_db)
):
    """Get a single scenario by ID."""
    scenario = scenario_repo.get_scenario(db, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


@router.patch("/scenarios/{scenario_id}", response_model=ScenarioResponse)
def update_scenario(
    scenario_id: str,
    data: ScenarioUpdate,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """Update a scenario's name or color."""
    scenario = scenario_repo.update_scenario(db, scenario_id, data)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    schedule_project_insights(db, scenario.project_id, None, background_tasks)
    return scenario


@router.delete("/scenarios/{scenario_id}", status_code=204)
def delete_scenario(
    scenario_id: str,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """Delete a scenario and all its overrides."""
    scenario = scenario_repo.get_scenario(db, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    success = scenario_repo.delete_scenario(db, scenario_id)
    if not success:
        raise HTTPException(status_code=404, detail="Scenario not found")
    schedule_project_insights(db, scenario.project_id, None, background_tasks)
    return None


@router.post("/scenarios/{scenario_id}/duplicate", response_model=ScenarioResponse, status_code=201)
def duplicate_scenario(
    scenario_id: str,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """Duplicate a scenario and all its overrides."""
    new_scenario = scenario_repo.duplicate_scenario(db, scenario_id)
    if not new_scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    schedule_project_insights(db, new_scenario.project_id, None, background_tasks)
    return new_scenario


@router.get("/scenarios/{scenario_id}/overrides", response_model=List[ScenarioNodeOverrideResponse])
def get_overrides(
    scenario_id: str,
    db: Session = Depends(get_db)
):
    """Get all overrides for a scenario."""
    overrides = scenario_repo.get_overrides(db, scenario_id)
    return overrides


@router.put("/scenarios/{scenario_id}/overrides")
def update_overrides(
    scenario_id: str,
    data: OverrideBatchUpdate,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """
    Batch update node overrides for a scenario.

    For each override:
    - If override_value is provided, create or update the override
    - If override_value is null, remove the override
    """
    # Verify scenario exists
    scenario = scenario_repo.get_scenario(db, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    dirty_targets = set()

    for override in data.overrides:
        target_type = override.target_type()
        if target_type == "node":
            scenario_repo.upsert_override(
                db,
                scenario_id,
                override.node_id,
                override.override_value,
                override.mode or "value",
                override.override_code,
            )
            dirty_targets.add(override.node_id)
        elif target_type == "composite":
            scenario_repo.upsert_composite_override(
                db,
                scenario_id,
                override.composite_node_instance_id,
                override.composite_internal_id,
                override.override_value,
                override.mode or "value",
                override.override_code,
            )
            dirty_targets.add(override.composite_node_instance_id)
        else:
            raise HTTPException(
                status_code=422,
                detail="Chaque override doit cibler soit un node_id, soit un paramètre interne de composite.",
            )

    if dirty_targets:
        scenario_cache.mark_dirty_nodes(
            scenario.project_id,
            scenario_id,
            dirty_targets,
        )

    schedule_project_insights(db, scenario.project_id, None, background_tasks)
    return scenario_repo.get_overrides(db, scenario_id)


@router.post(
    "/scenarios/{scenario_id}/overrides/validate",
    response_model=ScenarioOverrideValidateResponse,
)
def validate_override_code(
    scenario_id: str,
    data: ScenarioOverrideValidateRequest,
    db: Session = Depends(get_db),
):
    """
    Validate a Python override formula for a scenario node.

    The code is executed in the same sandbox as algorithm nodes, with the
    following structure:

        def compute(real_value):
            <code>
    """
    # Ensure scenario exists (helps return 404 early if needed)
    scenario = scenario_repo.get_scenario(db, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # Build algorithm wrapper
    user_code = data.code or ""
    # Normalize indentation: we treat user code as a single or multi-line body
    body_lines = [line.rstrip() for line in user_code.splitlines() if line.strip() != ""]
    if not body_lines:
        return ScenarioOverrideValidateResponse(ok=False, error="Code is empty")

    indented = "\n".join(f"    {line}" for line in body_lines)
    algorithm = f"def compute(real_value):\n{indented}\n"

    try:
        result = execute_algorithm(algorithm, {"real_value": data.real_value})
        return ScenarioOverrideValidateResponse(ok=True, result=result)
    except Exception as exc:
        return ScenarioOverrideValidateResponse(ok=False, error=str(exc))
