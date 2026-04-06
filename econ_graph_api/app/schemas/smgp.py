from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .edge import EdgeTypeEnum
from .node import Status


SMGP_FORMAT = "smartgraph-project"
SMGP_SCHEMA_VERSION = "1.0.0"
SMGP_MEDIA_TYPE = "application/vnd.smartgraph.project+json"


class SmgpBaseModel(BaseModel):
    model_config = ConfigDict(extra="allow")


class SmgpProject(SmgpBaseModel):
    id: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=200)
    status: str = Field(default="completed", min_length=1, max_length=32)
    description: Optional[str] = None
    generation_prompt: Optional[str] = None
    dashboard_config: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SmgpNode(SmgpBaseModel):
    id: str = Field(..., min_length=1, max_length=64)
    slug: str = Field(..., min_length=1, max_length=128)
    label: str = Field(..., min_length=1, max_length=200)
    unit: Optional[str] = Field(default=None, max_length=100)
    status: Status = "unknown"
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    notes: Optional[str] = None
    composite_id: Optional[str] = Field(default=None, max_length=64)
    value_computed: Optional[float] = None
    computation_definition: Optional[str] = Field(default=None, max_length=2000)
    last_computed_at: Optional[datetime] = None
    computation_error: Optional[str] = None
    pos_x: Optional[float] = None
    pos_y: Optional[float] = None
    plausible_min: Optional[float] = None
    plausible_max: Optional[float] = None
    provider_enabled: Optional[bool] = None
    provider_type: Optional[str] = Field(default=None, max_length=32)
    provider_url: Optional[str] = Field(default=None, max_length=500)
    provider_json_path: Optional[str] = Field(default=None, max_length=200)
    provider_timeout: Optional[float] = Field(default=None, ge=0.1, le=30.0)
    provider_cache_ttl: Optional[float] = Field(default=None, ge=0.0, le=86400.0)
    provider_last_fetched_at: Optional[datetime] = None
    provider_last_error: Optional[str] = None

    @model_validator(mode="after")
    def _validate_plausible_bounds(self) -> "SmgpNode":
        if (
            self.plausible_min is not None
            and self.plausible_max is not None
            and self.plausible_min > self.plausible_max
        ):
            raise ValueError("plausible_min cannot be greater than plausible_max")
        return self


class SmgpEdge(SmgpBaseModel):
    id: str = Field(..., min_length=1, max_length=128)
    source: str = Field(..., min_length=1, max_length=64)
    target: str = Field(..., min_length=1, max_length=64)
    label: Optional[str] = Field(default=None, max_length=2000)
    edge_type: EdgeTypeEnum = "default"
    rule_id: Optional[str] = Field(default=None, max_length=64)


class SmgpGraph(SmgpBaseModel):
    nodes: List[SmgpNode] = Field(default_factory=list)
    edges: List[SmgpEdge] = Field(default_factory=list)


class SmgpComposite(SmgpBaseModel):
    id: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=200)
    graph_data: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SmgpScenarioNodeOverride(SmgpBaseModel):
    id: str = Field(..., min_length=1, max_length=64)
    node_id: str = Field(..., min_length=1, max_length=64)
    mode: Literal["value", "formula"] = "value"
    override_value: Optional[float] = None
    override_code: Optional[str] = None


class SmgpScenarioCompositeOverride(SmgpBaseModel):
    id: str = Field(..., min_length=1, max_length=64)
    composite_node_instance_id: str = Field(..., min_length=1, max_length=64)
    internal_id: str = Field(..., min_length=1, max_length=128)
    mode: Literal["value", "formula"] = "value"
    override_value: Optional[float] = None
    override_code: Optional[str] = None


class SmgpScenario(SmgpBaseModel):
    id: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=255)
    color: Optional[str] = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    overrides: List[SmgpScenarioNodeOverride] = Field(default_factory=list)
    composite_overrides: List[SmgpScenarioCompositeOverride] = Field(default_factory=list)


class SmgpProvenance(SmgpBaseModel):
    exported_at: datetime
    source_project_id: Optional[str] = Field(default=None, max_length=64)
    source_project_name: Optional[str] = Field(default=None, max_length=200)
    exported_by_user_id: Optional[str] = Field(default=None, max_length=64)
    app_version: Optional[str] = Field(default=None, max_length=32)


class SmgpDocument(SmgpBaseModel):
    format: Literal["smartgraph-project"] = SMGP_FORMAT
    schema_version: str = Field(default=SMGP_SCHEMA_VERSION, min_length=1, max_length=16)
    project: SmgpProject
    graph: SmgpGraph
    scenarios: List[SmgpScenario] = Field(default_factory=list)
    composites: List[SmgpComposite] = Field(default_factory=list)
    provenance: SmgpProvenance


class SmgpImportResponse(BaseModel):
    project_id: str
    project_name: str
    nodes_created: int
    edges_created: int
    scenarios_created: int
    composites_created: int
