from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from .node import NodeCreate


class CompositeGraphEdge(BaseModel):
    source: str = Field(..., min_length=1, max_length=64)
    target: str = Field(..., min_length=1, max_length=64)


class CompositeRootInfo(BaseModel):
    id: str
    slug: str
    label: str
    unit: Optional[str] = None
    provider_url: Optional[str] = None
    description: Optional[str] = None


class CompositeGraphData(BaseModel):
    nodes: List[NodeCreate] = Field(default_factory=list)
    edges: List[CompositeGraphEdge] = Field(default_factory=list)
    exposed_roots: Optional[Dict[str, CompositeRootInfo]] = Field(default_factory=dict)


class CompositeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    graph_data: Optional[CompositeGraphData] = None


class CompositeCreate(CompositeBase):
    id: Optional[str] = Field(default=None, max_length=64)


class CompositeUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    graph_data: Optional[CompositeGraphData] = None


class CompositeOut(CompositeBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CompositeSummary(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    graph_data: Optional[CompositeGraphData] = None

    class Config:
        from_attributes = True


class CompositeComputeRequest(BaseModel):
    graph_data: CompositeGraphData


class CompositeComputeNodeResult(BaseModel):
    value: Optional[float]
    error: Optional[str]
    last_computed_at: Optional[datetime]


class CompositeComputeResponse(BaseModel):
    results: Dict[str, CompositeComputeNodeResult]


class CompositeUsageProject(BaseModel):
    id: str
    name: str


class CompositeUsageComposite(BaseModel):
    id: str
    name: str


class CompositeUsage(BaseModel):
    id: str
    name: str
    projects: List[CompositeUsageProject] = Field(default_factory=list)
    composites: List[CompositeUsageComposite] = Field(default_factory=list)
