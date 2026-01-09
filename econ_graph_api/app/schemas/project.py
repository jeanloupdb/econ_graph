from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime


class ProjectCreate(BaseModel):
  id: str = Field(..., min_length=1, max_length=64)
  name: str = Field(..., min_length=1, max_length=200)
  generation_prompt: Optional[str] = None
  description: Optional[str] = None


class ProjectUpdate(BaseModel):
  name: Optional[str] = Field(default=None, min_length=1, max_length=200)
  description: Optional[str] = None


class ProjectOut(BaseModel):
  id: str
  name: str
  created_at: datetime
  updated_at: datetime
  public_view_token: Optional[str] = None
  user_id: Optional[str] = None  # owner_id
  user_role: Optional[str] = None  # "owner" | "editor" | "viewer"
  generation_prompt: Optional[str] = None
  description: Optional[str] = None

  class Config:
    from_attributes = True


class ViewerProjectOut(BaseModel):
  id: str
  name: str
  updated_at: datetime
  # No created_at, no public_view_token (it's in the URL), no owner info unless needed

  class Config:
    from_attributes = True


class ProjectExposedRoot(BaseModel):
  instance_id: str
  label: str
  unit: Optional[str] = None
  type: Literal["project"] = "project"


class CompositeExposedRoot(BaseModel):
  composite_node_instance_id: str
  composite_id: str
  internal_id: str
  raw_internal_id: Optional[str] = None
  composite_instance_path: List[str] = Field(default_factory=list)
  linked_node_instance_id: Optional[str] = None
  label: Optional[str] = None
  unit: Optional[str] = None
  current_value: Optional[float] = None
  type: Literal["composite"] = "composite"


class ProjectExposedRootsResponse(BaseModel):
  project_roots: List[ProjectExposedRoot]
  composite_roots: List[CompositeExposedRoot]


class ProjectCollaboratorOut(BaseModel):
  user_id: str
  username: str
  email: str
  role: str # "viewer" | "editor"

  class Config:
    from_attributes = True


class CollaboratorAdd(BaseModel):
  email_or_username: str
  role: Literal["viewer", "editor"]
