from pydantic import BaseModel, Field
from typing import Literal


EdgeTypeEnum = Literal["default", "dependency", "influence", "correlation"]


class EdgeBase(BaseModel):
    """Base schema for edge data."""
    source: str = Field(..., min_length=1, max_length=64)
    target: str = Field(..., min_length=1, max_length=64)
    label: str | None = Field(None, max_length=2000, description="Edge label, can contain equations or algorithm definitions")
    edge_type: EdgeTypeEnum = "default"
    rule_id: str | None = Field(None, max_length=64)
    project_id: str | None = Field(None, max_length=64)


class EdgeCreate(EdgeBase):
    """Schema for creating a new edge."""
    id: str = Field(..., min_length=1, max_length=128, description="Unique edge identifier, typically 'source-target'")


class EdgeUpdate(BaseModel):
    """Schema for updating an edge."""
    label: str | None = Field(None, max_length=2000, description="Edge label, can contain equations or algorithm definitions")
    edge_type: EdgeTypeEnum | None = None
    rule_id: str | None = Field(None, max_length=64)


class EdgeResponse(EdgeBase):
    """Schema for edge responses."""
    id: str

    class Config:
        from_attributes = True
