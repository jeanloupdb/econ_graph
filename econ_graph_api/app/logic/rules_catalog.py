"""Catalog of economic coherence rules.

This module defines declarative rules for checking economic consistency.
Rules can be of different types:
- identity: Mathematical identities that must hold exactly (e.g., Fisher equation)
- bound_check: Values must be within plausible bounds
- inequality: Monotonicity or ordering constraints
- consistency: Cross-node logical consistency
"""

from typing import TypedDict, Optional, Literal


class RuleDefinition(TypedDict):
    """Definition of a coherence rule."""

    id: str
    description: str
    type: Literal["identity", "bound_check", "inequality", "consistency"]
    severity: int
    expression: Optional[str]
    tolerance: Optional[float]


# Main catalog of economic rules
RULES: list[RuleDefinition] = [
    # ========== IDENTITIES ==========
    {
        "id": "fisher_identity",
        "description": "Fisher equation: nominal rate = real rate + expected inflation",
        "type": "identity",
        "expression": "nominal_rate = real_rate + inflation_expected",
        "severity": 3,
        "tolerance": 0.01,  # Allow 1bp deviation
    },
    {
        "id": "taylor_rule",
        "description": "Taylor rule: policy rate responds to inflation and output gaps",
        "type": "identity",
        "expression": "policy_rate = neutral_rate + 1.5 * inflation_gap + 0.5 * output_gap",
        "severity": 2,
        "tolerance": 0.5,
    },
    {
        "id": "uncovered_interest_parity",
        "description": "UIP: interest differential = expected FX depreciation",
        "type": "identity",
        "expression": "interest_diff = fx_expected_change",
        "severity": 2,
        "tolerance": 0.02,
    },
    # ========== BOUND CHECKS ==========
    {
        "id": "plausible_bounds",
        "description": "Node value must be within defined plausible bounds",
        "type": "bound_check",
        "severity": 2,
        "expression": None,
        "tolerance": None,
    },
    {
        "id": "confidence_bounds",
        "description": "Confidence level must be between 0 and 1",
        "type": "bound_check",
        "severity": 4,
        "expression": None,
        "tolerance": None,
    },
    # ========== INEQUALITIES ==========
    {
        "id": "discount_monotonicity",
        "description": "Zero-coupon prices must decrease with maturity",
        "type": "inequality",
        "expression": "P_tau2 <= P_tau1 when tau2 > tau1",
        "severity": 3,
        "tolerance": None,
    },
    {
        "id": "forward_rate_positive",
        "description": "Forward rates should be positive (or close to zero)",
        "type": "inequality",
        "expression": "forward_rate >= -0.01",
        "severity": 2,
        "tolerance": None,
    },
    {
        "id": "yield_curve_normal",
        "description": "In normal conditions, long rates > short rates",
        "type": "inequality",
        "expression": "yield_10y >= yield_2y",
        "severity": 1,  # Low severity (inversion can happen)
        "tolerance": None,
    },
    # ========== CONSISTENCY CHECKS ==========
    {
        "id": "missing_critical_data",
        "description": "Critical economic variables should have values",
        "type": "consistency",
        "severity": 3,
        "expression": None,
        "tolerance": None,
    },
    {
        "id": "status_consistency",
        "description": "Observed nodes must have values; imposed nodes should have high confidence",
        "type": "consistency",
        "severity": 2,
        "expression": None,
        "tolerance": None,
    },
]


# Mapping of node patterns for rules (for dynamic rule application)
CRITICAL_NODES = [
    "gdp_growth",
    "inflation",
    "policy_rate",
    "exchange_rate",
    "unemployment",
]


def get_rule_by_id(rule_id: str) -> Optional[RuleDefinition]:
    """Get a rule definition by its ID."""
    for rule in RULES:
        if rule["id"] == rule_id:
            return rule
    return None


def get_rules_by_type(rule_type: str) -> list[RuleDefinition]:
    """Get all rules of a specific type."""
    return [rule for rule in RULES if rule["type"] == rule_type]
