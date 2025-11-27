"""API endpoints for economic rules and coherence checking."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional, Literal
from pydantic import BaseModel, Field

from app.core.db import get_db
from app.models.node import Node
from app.logic import evaluate_rules, Alert

router = APIRouter(prefix="/rules", tags=["rules"])


class RuleResponse(BaseModel):
    """Rule metadata for frontend display."""

    id: str = Field(..., description="Unique rule identifier")
    name: str = Field(..., description="Human-readable rule name")
    description: str = Field(..., description="Detailed description of what the rule checks")
    severity: Literal["error", "warning", "info"] = Field(..., description="Rule severity level")
    enabled: bool = Field(True, description="Whether the rule is currently active")


class CheckSummary(BaseModel):
    """Summary of rules check execution."""

    checked: int = Field(..., description="Number of nodes checked")
    alerts: int = Field(..., description="Number of alerts generated")
    critical: int = Field(0, description="Number of critical alerts")
    warnings: int = Field(0, description="Number of warnings")
    info: int = Field(0, description="Number of info alerts")


class CheckResponse(BaseModel):
    """Response for rules check endpoint."""

    summary: CheckSummary
    alerts: List[Alert]

    class Config:
        json_schema_extra = {
            "example": {
                "summary": {
                    "checked": 10,
                    "alerts": 3,
                    "critical": 0,
                    "warnings": 2,
                    "info": 1,
                },
                "alerts": [
                    {
                        "rule_id": "fisher_identity",
                        "severity": 3,
                        "message": "Fisher identity violated",
                        "node_ids": ["nominal_rate", "real_rate", "inflation"],
                        "type": "warning",
                    }
                ],
            }
        }


@router.get("/check", response_model=CheckResponse)
def check_coherence(
    node_ids: Optional[str] = None,
    min_severity: int = 1,
    db: Session = Depends(get_db),
) -> CheckResponse:
    """Check economic coherence across all nodes.

    This endpoint evaluates all registered economic rules against the current
    state of nodes in the database and returns any violations or warnings.

    Args:
        node_ids: Optional comma-separated list of node IDs to check (default: all)
        min_severity: Minimum severity level to include (1-5, default: 1)
        db: Database session

    Returns:
        CheckResponse with summary and list of alerts
    """
    # Fetch nodes
    query = db.query(Node)

    if node_ids:
        id_list = [nid.strip() for nid in node_ids.split(",")]
        query = query.filter(Node.id.in_(id_list))

    nodes = query.all()

    # Run rules engine
    all_alerts = evaluate_rules(nodes)

    # Filter by severity
    filtered_alerts = [a for a in all_alerts if a.severity >= min_severity]

    # Calculate summary statistics
    critical_count = sum(1 for a in filtered_alerts if a.severity >= 4)
    warning_count = sum(1 for a in filtered_alerts if a.severity == 3 or a.severity == 2)
    info_count = sum(1 for a in filtered_alerts if a.severity == 1)

    summary = CheckSummary(
        checked=len(nodes),
        alerts=len(filtered_alerts),
        critical=critical_count,
        warnings=warning_count,
        info=info_count,
    )

    return CheckResponse(summary=summary, alerts=filtered_alerts)


def _severity_to_string(severity: int) -> Literal["error", "warning", "info"]:
    """Convert numeric severity to string for frontend."""
    if severity >= 4:
        return "error"
    elif severity >= 2:
        return "warning"
    else:
        return "info"


def _rule_id_to_name(rule_id: str) -> str:
    """Convert rule_id to human-readable name."""
    return " ".join(word.capitalize() for word in rule_id.split("_"))


@router.get("", response_model=List[RuleResponse])
@router.get("/catalog", response_model=List[RuleResponse])
def get_rules_catalog() -> List[RuleResponse]:
    """Get the catalog of all available rules.

    This endpoint returns metadata about all registered rules including:
    - Rule ID and human-readable name
    - Description of what the rule checks
    - Severity level (error/warning/info)
    - Whether the rule is currently enabled

    Returns:
        List of rule definitions formatted for frontend display
    """
    from app.logic.rules_catalog import RULES

    return [
        RuleResponse(
            id=rule["id"],
            name=_rule_id_to_name(rule["id"]),
            description=rule["description"],
            severity=_severity_to_string(rule["severity"]),
            enabled=True,  # All rules enabled by default for now
        )
        for rule in RULES
    ]
