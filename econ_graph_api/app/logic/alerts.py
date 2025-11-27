"""Alert system for economic coherence violations."""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class AlertType(str, Enum):
    """Type of alert."""

    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class AlertSeverity(int, Enum):
    """Severity levels for alerts (higher = more critical)."""

    INFO = 1
    LOW = 2
    MEDIUM = 3
    HIGH = 4
    CRITICAL = 5


class Alert(BaseModel):
    """Represents a coherence violation or warning.

    Attributes:
        rule_id: Identifier of the rule that triggered this alert
        severity: Numerical severity (1-5)
        message: Human-readable explanation
        node_ids: List of node IDs involved in this violation
        suggestion: Optional suggested fix
        type: Classification (error, warning, info)
        details: Optional additional context
    """

    rule_id: str = Field(..., description="Rule identifier")
    severity: int = Field(..., ge=1, le=5, description="Severity level (1-5)")
    message: str = Field(..., description="Human-readable message")
    node_ids: list[str] = Field(default_factory=list, description="Nodes involved")
    suggestion: Optional[str] = Field(None, description="Suggested correction")
    type: AlertType = Field(AlertType.WARNING, description="Alert type")
    details: Optional[dict] = Field(None, description="Additional context")

    class Config:
        json_schema_extra = {
            "example": {
                "rule_id": "fisher_identity",
                "severity": 3,
                "message": "Fisher identity violated: nominal rate != real rate + inflation",
                "node_ids": ["nominal_rate", "real_rate", "inflation"],
                "suggestion": "Check if inflation expectations are correctly specified",
                "type": "warning",
                "details": {"expected": 5.0, "actual": 4.5, "deviation": 0.5},
            }
        }
