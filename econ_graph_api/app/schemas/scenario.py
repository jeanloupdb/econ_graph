"""
Pydantic schemas for scenario endpoints.
"""

from pydantic import BaseModel, Field, model_validator
from datetime import datetime
from typing import Optional, List, Literal


class ScenarioCreate(BaseModel):
    """Schema for creating a new scenario."""
    name: str = Field(..., min_length=1, max_length=255, description="Scenario name")
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$", description="Hex color code, e.g., #3B82F6")


class ScenarioUpdate(BaseModel):
    """Schema for updating an existing scenario."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")


class ScenarioNodeOverrideResponse(BaseModel):
    """Schema for a single node override within a scenario."""
    id: str
    scenario_id: str
    node_id: str
    mode: Literal["value", "formula"] = "value"
    override_value: Optional[float]
    override_code: Optional[str] = None

    class Config:
        from_attributes = True


class ScenarioCompositeOverrideResponse(BaseModel):
    """Override applied to an internal composite parameter."""
    id: str
    scenario_id: str
    composite_node_instance_id: str
    internal_id: str
    composite_internal_id: Optional[str] = None
    mode: Literal["value", "formula"] = "value"
    override_value: Optional[float]
    override_code: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def _ensure_internal_ids(cls, values):
        # Handle both dict and object cases
        if isinstance(values, dict):
            internal = values.get("internal_id") or values.get("composite_internal_id")
            values["internal_id"] = internal
            values["composite_internal_id"] = values.get("composite_internal_id") or internal
        else:
            # Already an object (from_attributes=True case)
            internal = getattr(values, "internal_id", None) or getattr(values, "composite_internal_id", None)
            if hasattr(values, "__dict__"):
                values.internal_id = internal
                if not hasattr(values, "composite_internal_id") or values.composite_internal_id is None:
                    values.composite_internal_id = internal
        return values

    class Config:
        from_attributes = True


class ScenarioResponse(BaseModel):
    """Schema for scenario response."""
    id: str
    project_id: str
    name: str
    color: Optional[str]
    created_at: datetime
    updated_at: datetime
    overrides: List[ScenarioNodeOverrideResponse] = []
    composite_overrides: List[ScenarioCompositeOverrideResponse] = []

    class Config:
        from_attributes = True


class OverrideUpdate(BaseModel):
    """Schema for updating a single override."""
    node_id: Optional[str] = Field(
        None, description="ID of the project node to override"
    )
    composite_node_instance_id: Optional[str] = Field(
        None, description="Composite node instance ID (for internal parameters)"
    )
    composite_internal_id: Optional[str] = Field(
        None, description="Identifier of the internal composite parameter"
    )
    mode: Optional[Literal["value", "formula"]] = Field(
        "value",
        description='Override mode: "value" (direct) or "formula" (Python expression)',
    )
    override_value: Optional[float] = Field(
        None,
        description="Override value (null to remove override when mode='value')",
    )
    override_code: Optional[str] = Field(
        None,
        description="Python code body for compute(real_value) when mode='formula'",
    )

    def target_type(self) -> Literal["node", "composite", "invalid"]:
        if self.node_id:
            return "node"
        if self.composite_node_instance_id and self.composite_internal_id:
            return "composite"
        return "invalid"


class OverrideBatchUpdate(BaseModel):
    """Schema for batch updating multiple node overrides."""
    overrides: List[OverrideUpdate] = Field(..., description="List of overrides to apply")


class ScenarioOverrideValidateRequest(BaseModel):
    """Schema for validating a scenario override formula."""
    node_id: str = Field(..., description="ID of the node to validate code against")
    code: str = Field(..., description="User code body (e.g. 'return real_value * 0.8')")
    real_value: float = Field(..., description="Reference real value used for test execution")


class ScenarioOverrideValidateResponse(BaseModel):
    """Result of validating an override formula."""
    ok: bool
    result: Optional[float] = None
    error: Optional[str] = None
