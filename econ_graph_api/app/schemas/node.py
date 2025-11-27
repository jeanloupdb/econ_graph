from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime

Status = Literal["unknown", "observed", "imposed", "implied", "invalid"]
Unit = str

class CompositeRootInfo(BaseModel):
    """Metadata for a composite node's root parameter."""
    id: str
    slug: Optional[str] = None
    raw_internal_id: Optional[str] = None
    label: Optional[str] = None
    unit: Optional[str] = None
    provider_type: Optional[str] = None
    provider_url: Optional[str] = None
    composite_id: Optional[str] = None
    overridable: Optional[bool] = None
    current_value: Optional[float] = None


class NodeBase(BaseModel):
    slug: Optional[str] = Field(default=None, min_length=1, max_length=128)
    raw_internal_id: Optional[str] = None
    label: str
    unit: Optional[Unit] = None
    status: Status = "unknown"
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    notes: Optional[str] = None
    composite_id: Optional[str] = None
    composite_roots: Optional[List[CompositeRootInfo]] = None

    # Computation fields (algorithm-only)
    value_computed: Optional[float] = None
    computation_definition: Optional[str] = Field(default=None, max_length=2000)
    last_computed_at: Optional[datetime] = None
    computation_error: Optional[str] = None
    # UI position (optional)
    pos_x: Optional[float] = None
    pos_y: Optional[float] = None
    project_id: Optional[str] = None

    # Provider fields
    provider_enabled: Optional[bool] = None
    provider_type: Optional[str] = None
    provider_url: Optional[str] = None
    provider_json_path: Optional[str] = None
    provider_timeout: Optional[float] = Field(default=None, ge=0.1, le=30.0)
    provider_cache_ttl: Optional[float] = Field(default=None, ge=0.0, le=86400.0)


class NodeCreate(NodeBase):
    id: Optional[str] = Field(default=None, min_length=1, max_length=64)
    slug: Optional[str] = Field(default=None, min_length=1, max_length=128)


class NodeUpdate(BaseModel):
    slug: Optional[str] = Field(default=None, min_length=1, max_length=128)
    composite_id: Optional[str] = None
    label: Optional[str] = None
    unit: Optional[Unit] = None
    status: Optional[Status] = None
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    notes: Optional[str] = None

    # Computation fields (algorithm-only)
    value_computed: Optional[float] = None
    computation_definition: Optional[str] = Field(default=None, max_length=2000)
    last_computed_at: Optional[datetime] = None
    computation_error: Optional[str] = None
    pos_x: Optional[float] = None
    pos_y: Optional[float] = None
    # Provider fields
    provider_enabled: Optional[bool] = None
    provider_type: Optional[str] = None
    provider_url: Optional[str] = None
    provider_json_path: Optional[str] = None
    provider_timeout: Optional[float] = Field(default=None, ge=0.1, le=30.0)
    provider_cache_ttl: Optional[float] = Field(default=None, ge=0.0, le=86400.0)
    provider_last_fetched_at: Optional[datetime] = None
    provider_last_error: Optional[str] = None


class NodeOut(NodeBase):
    id: str
    project_id: Optional[str] = None
    composite_root_ids: Optional[list[str]] = None
