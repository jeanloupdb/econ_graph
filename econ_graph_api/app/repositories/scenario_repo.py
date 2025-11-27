"""
Repository for scenario-related database operations.
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from typing import List, Optional
from uuid import uuid4

from app.models.scenario import Scenario, ScenarioNodeOverride, ScenarioCompositeOverride
from app.schemas.scenario import ScenarioCreate, ScenarioUpdate


def list_scenarios(db: Session, project_id: str) -> List[Scenario]:
    """List all scenarios for a project."""
    stmt = (
        select(Scenario)
        .where(Scenario.project_id == project_id)
        .options(
            joinedload(Scenario.overrides),
            joinedload(Scenario.composite_overrides),
        )
        .order_by(Scenario.created_at.desc())
    )
    result = db.execute(stmt)
    return list(result.unique().scalars().all())


def get_scenario(db: Session, scenario_id: str) -> Optional[Scenario]:
    """Get a single scenario by ID with its overrides."""
    stmt = (
        select(Scenario)
        .where(Scenario.id == scenario_id)
        .options(
            joinedload(Scenario.overrides),
            joinedload(Scenario.composite_overrides),
        )
    )
    result = db.execute(stmt)
    # When joinedload includes collections, ensure uniqueness before scalar
    return result.unique().scalar_one_or_none()


def create_scenario(db: Session, project_id: str, data: ScenarioCreate) -> Scenario:
    """Create a new scenario."""
    scenario_id = str(uuid4())
    scenario = Scenario(
        id=scenario_id,
        project_id=project_id,
        name=data.name,
        color=data.color
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario


def update_scenario(db: Session, scenario_id: str, data: ScenarioUpdate) -> Optional[Scenario]:
    """Update an existing scenario."""
    scenario = db.get(Scenario, scenario_id)
    if not scenario:
        return None

    if data.name is not None:
        scenario.name = data.name
    if data.color is not None:
        scenario.color = data.color

    db.commit()
    db.refresh(scenario)
    return scenario


def delete_scenario(db: Session, scenario_id: str) -> bool:
    """Delete a scenario and all its overrides (cascade)."""
    scenario = db.get(Scenario, scenario_id)
    if not scenario:
        return False

    db.delete(scenario)
    db.commit()
    return True


def duplicate_scenario(db: Session, scenario_id: str) -> Optional[Scenario]:
    """
    Duplicate a scenario and all its overrides.

    The new scenario:
    - Belongs to the same project
    - Has name "<original name> (copy)"
    - Inherits the original color
    - Copies all node overrides
    """
    original = get_scenario(db, scenario_id)
    if not original:
        return None

    new_id = str(uuid4())
    new_name = f"{original.name} (copy)"

    new_scenario = Scenario(
        id=new_id,
        project_id=original.project_id,
        name=new_name,
        color=original.color,
    )
    db.add(new_scenario)
    db.flush()

    # Copy node overrides
    for override in original.overrides:
        new_override = ScenarioNodeOverride(
            id=str(uuid4()),
            scenario_id=new_id,
            node_id=override.node_id,
            mode=override.mode or "value",
            override_value=override.override_value,
            override_code=override.override_code,
        )
        db.add(new_override)

    # Copy composite overrides
    for override in original.composite_overrides:
        new_composite_override = ScenarioCompositeOverride(
            id=str(uuid4()),
            scenario_id=new_id,
            composite_node_instance_id=override.composite_node_instance_id,
            internal_id=override.internal_id,
            mode=override.mode or "value",
            override_value=override.override_value,
            override_code=override.override_code,
        )
        db.add(new_composite_override)

    db.commit()

    # Reload with overrides relationship populated
    return get_scenario(db, new_id)


def get_overrides(db: Session, scenario_id: str) -> List[ScenarioNodeOverride]:
    """Get all overrides for a scenario."""
    stmt = (
        select(ScenarioNodeOverride)
        .where(ScenarioNodeOverride.scenario_id == scenario_id)
    )
    result = db.execute(stmt)
    return list(result.scalars().all())


# Composite overrides ---------------------------------------------------------

def get_composite_overrides(db: Session, scenario_id: str) -> List[ScenarioCompositeOverride]:
    stmt = (
        select(ScenarioCompositeOverride)
        .where(ScenarioCompositeOverride.scenario_id == scenario_id)
    )
    result = db.execute(stmt)
    return list(result.scalars().all())


def upsert_override(
    db: Session,
    scenario_id: str,
    node_id: str,
    override_value: Optional[float],
    mode: str = "value",
    override_code: Optional[str] = None,
) -> ScenarioNodeOverride:
    """
    Create or update an override for a node in a scenario.

    If override_value is None, the override is deleted (removes the override).
    """
    # Check if override already exists
    stmt = (
        select(ScenarioNodeOverride)
        .where(
            ScenarioNodeOverride.scenario_id == scenario_id,
            ScenarioNodeOverride.node_id == node_id
        )
    )
    result = db.execute(stmt)
    existing = result.scalar_one_or_none()

    # If both override_value and override_code are None, delete the override
    if override_value is None and (override_code is None or override_code.strip() == ""):
        if existing:
            db.delete(existing)
            db.commit()
        return None

    # Update existing or create new
    if existing:
        existing.mode = mode or "value"
        existing.override_value = override_value
        existing.override_code = override_code
        db.commit()
        db.refresh(existing)
        return existing
    else:
        override_id = str(uuid4())
        new_override = ScenarioNodeOverride(
            id=override_id,
            scenario_id=scenario_id,
            node_id=node_id,
            mode=mode or "value",
            override_value=override_value,
            override_code=override_code,
        )
        db.add(new_override)
        db.commit()
        db.refresh(new_override)
        return new_override


def upsert_composite_override(
    db: Session,
    scenario_id: str,
    composite_node_instance_id: str,
    internal_id: str,
    override_value: Optional[float],
    mode: str = "value",
    override_code: Optional[str] = None,
) -> Optional[ScenarioCompositeOverride]:
    stmt = (
        select(ScenarioCompositeOverride)
        .where(
            ScenarioCompositeOverride.scenario_id == scenario_id,
            ScenarioCompositeOverride.composite_node_instance_id == composite_node_instance_id,
            ScenarioCompositeOverride.internal_id == internal_id,
        )
    )
    result = db.execute(stmt)
    existing = result.scalar_one_or_none()

    if override_value is None and (override_code is None or override_code.strip() == ""):
        if existing:
            db.delete(existing)
            db.commit()
        return None

    if existing:
        existing.mode = mode or "value"
        existing.override_value = override_value
        existing.override_code = override_code
        db.commit()
        db.refresh(existing)
        return existing

    new_override = ScenarioCompositeOverride(
        id=str(uuid4()),
        scenario_id=scenario_id,
        composite_node_instance_id=composite_node_instance_id,
        internal_id=internal_id,
        mode=mode or "value",
        override_value=override_value,
        override_code=override_code,
    )
    db.add(new_override)
    db.commit()
    db.refresh(new_override)
    return new_override


def delete_override(db: Session, scenario_id: str, node_id: str) -> bool:
    """Delete a specific override."""
    stmt = (
        select(ScenarioNodeOverride)
        .where(
            ScenarioNodeOverride.scenario_id == scenario_id,
            ScenarioNodeOverride.node_id == node_id
        )
    )
    result = db.execute(stmt)
    override = result.scalar_one_or_none()

    if not override:
        return False

    db.delete(override)
    db.commit()
    return True


def delete_composite_override(
    db: Session,
    scenario_id: str,
    composite_node_instance_id: str,
    internal_id: str,
) -> bool:
    stmt = (
        select(ScenarioCompositeOverride)
        .where(
            ScenarioCompositeOverride.scenario_id == scenario_id,
            ScenarioCompositeOverride.composite_node_instance_id == composite_node_instance_id,
            ScenarioCompositeOverride.internal_id == internal_id,
        )
    )
    result = db.execute(stmt)
    override = result.scalar_one_or_none()
    if not override:
        return False
    db.delete(override)
    db.commit()
    return True
