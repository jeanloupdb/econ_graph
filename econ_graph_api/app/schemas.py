from typing import Optional, Tuple, Literal
from pydantic import BaseModel, Field

Status = Literal["unknown", "observed", "imposed", "implied", "invalid"]

class NodeBase(BaseModel):
    label: str = Field(..., description="Nom lisible du nœud")
    value: Optional[float] = Field(None, description="Valeur numérique")
    unit: Optional[str] = Field(None, description="Unité (%, bps, level...)")
    plausible_range: Optional[tuple[float, float]] = Field(
        default=None, description="Borne plausible (min, max)"
    )
    status: Status = Field(default="unknown", description="Statut sémantique")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Confiance [0,1]")

class NodeCreate(NodeBase):
    id: str = Field(..., pattern=r"^[a-zA-Z_][a-zA-Z0-9_\-]*$")

class NodeUpdate(BaseModel):
    label: Optional[str] = None
    value: Optional[float] = None
    unit: Optional[str] = None
    plausible_range: Optional[tuple[float, float]] = None
    status: Optional[Status] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)

class NodeOut(NodeBase):
    id: str
    in_range: Optional[bool] = Field(None, description="True si la valeur est dans la plage")
