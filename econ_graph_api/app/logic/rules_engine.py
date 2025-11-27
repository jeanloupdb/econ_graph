"""Economic rules engine for coherence checking.

This module implements the core logic for evaluating economic rules
against a set of nodes and generating alerts for violations.
"""

import re
from typing import Optional
from app.models.node import Node
from .alerts import Alert, AlertType, AlertSeverity
from .rules_catalog import RULES, CRITICAL_NODES, RuleDefinition, get_rules_by_type


class RulesEngine:
    """Engine for evaluating economic coherence rules."""

    def __init__(self, nodes: list[Node]):
        """Initialize engine with a set of nodes.

        Args:
            nodes: List of Node objects to check
        """
        self.nodes = nodes
        self.nodes_by_id = {node.id: node for node in nodes}
        self.alerts: list[Alert] = []

    def evaluate_all(self) -> list[Alert]:
        """Evaluate all rules and return alerts.

        Returns:
            List of Alert objects for all violations found
        """
        self.alerts = []

        # Check each rule type
        self._check_bound_violations()
        self._check_identities()
        self._check_inequalities()
        self._check_consistency()

        # Sort by severity (highest first)
        self.alerts.sort(key=lambda a: a.severity, reverse=True)

        return self.alerts

    def _check_bound_violations(self) -> None:
        """Check for values outside plausible bounds."""
        for node in self.nodes:
            # Check plausible bounds
            if node.value_computed is not None and node.plausible_min is not None and node.plausible_max is not None:
                if node.value_computed < node.plausible_min or node.value_computed > node.plausible_max:
                    self.alerts.append(
                        Alert(
                            rule_id="plausible_bounds",
                            severity=AlertSeverity.MEDIUM.value,
                            message=f"Node '{node.label}' value {node.value_computed} is outside plausible range "
                            f"[{node.plausible_min}, {node.plausible_max}]",
                            node_ids=[node.id],
                            suggestion=f"Verify data source or adjust plausible bounds for {node.id}",
                            type=AlertType.WARNING,
                            details={
                                "value": node.value_computed,
                                "plausible_min": node.plausible_min,
                                "plausible_max": node.plausible_max,
                            },
                        )
                    )

            # Check confidence bounds (should always be [0, 1])
            if node.confidence < 0 or node.confidence > 1:
                self.alerts.append(
                    Alert(
                        rule_id="confidence_bounds",
                        severity=AlertSeverity.HIGH.value,
                        message=f"Node '{node.label}' has invalid confidence {node.confidence} (must be in [0, 1])",
                        node_ids=[node.id],
                        suggestion=f"Fix confidence value for {node.id}",
                        type=AlertType.ERROR,
                        details={"confidence": node.confidence},
                    )
                )

    def _check_identities(self) -> None:
        """Check mathematical identities like Fisher equation."""
        identity_rules = get_rules_by_type("identity")

        for rule in identity_rules:
            if rule["id"] == "fisher_identity":
                self._check_fisher_identity(rule)
            elif rule["id"] == "taylor_rule":
                self._check_taylor_rule(rule)
            elif rule["id"] == "uncovered_interest_parity":
                self._check_uip(rule)

    def _check_fisher_identity(self, rule: RuleDefinition) -> None:
        """Check Fisher identity: nominal = real + inflation_expected."""
        # Try to find nodes matching the pattern
        nominal = self._find_node_by_pattern(["nominal_rate", "i", "interest_nominal"])
        real = self._find_node_by_pattern(["real_rate", "r", "interest_real"])
        inflation = self._find_node_by_pattern(["inflation_expected", "pi_e", "inflation_exp"])

        if not (nominal and real and inflation):
            return  # Not enough data to check

        if nominal.value_computed is None or real.value_computed is None or inflation.value_computed is None:
            return  # Can't check without values

        expected = real.value_computed + inflation.value_computed
        actual = nominal.value_computed
        deviation = abs(actual - expected)
        tolerance = rule.get("tolerance", 0.01)

        if deviation > tolerance:
            self.alerts.append(
                Alert(
                    rule_id=rule["id"],
                    severity=rule["severity"],
                    message=f"Fisher identity violated: nominal rate ({actual:.2f}) != real rate ({real.value_computed:.2f}) "
                    f"+ inflation ({inflation.value_computed:.2f}) = {expected:.2f}. Deviation: {deviation:.2f}",
                    node_ids=[nominal.id, real.id, inflation.id],
                    suggestion="Check if inflation expectations are correctly specified or if rates are for compatible periods",
                    type=AlertType.WARNING,
                    details={
                        "expected": round(expected, 4),
                        "actual": round(actual, 4),
                        "deviation": round(deviation, 4),
                        "tolerance": tolerance,
                    },
                )
            )

    def _check_taylor_rule(self, rule: RuleDefinition) -> None:
        """Check Taylor rule approximation."""
        policy = self._find_node_by_pattern(["policy_rate", "fed_funds", "policy"])
        neutral = self._find_node_by_pattern(["neutral_rate", "r_star", "equilibrium_rate"])
        inflation_gap = self._find_node_by_pattern(["inflation_gap", "pi_gap"])
        output_gap = self._find_node_by_pattern(["output_gap", "y_gap"])

        if not all([policy, neutral, inflation_gap, output_gap]):
            return

        if any(n.value_computed is None for n in [policy, neutral, inflation_gap, output_gap]):
            return

        expected = neutral.value_computed + 1.5 * inflation_gap.value_computed + 0.5 * output_gap.value_computed
        actual = policy.value_computed
        deviation = abs(actual - expected)
        tolerance = rule.get("tolerance", 0.5)

        if deviation > tolerance:
            self.alerts.append(
                Alert(
                    rule_id=rule["id"],
                    severity=rule["severity"],
                    message=f"Taylor rule deviation: policy rate ({actual:.2f}) differs from implied rate ({expected:.2f}) "
                    f"by {deviation:.2f}",
                    node_ids=[policy.id, neutral.id, inflation_gap.id, output_gap.id],
                    suggestion="Central bank may be deviating from standard Taylor rule (check for financial stability concerns, "
                    "or adjust rule coefficients)",
                    type=AlertType.INFO,
                    details={"expected": round(expected, 4), "actual": round(actual, 4), "deviation": round(deviation, 4)},
                )
            )

    def _check_uip(self, rule: RuleDefinition) -> None:
        """Check uncovered interest parity."""
        interest_diff = self._find_node_by_pattern(["interest_diff", "interest_differential"])
        fx_change = self._find_node_by_pattern(["fx_expected_change", "fx_change", "depreciation_expected"])

        if not (interest_diff and fx_change):
            return

        if interest_diff.value_computed is None or fx_change.value_computed is None:
            return

        deviation = abs(interest_diff.value_computed - fx_change.value_computed)
        tolerance = rule.get("tolerance", 0.02)

        if deviation > tolerance:
            self.alerts.append(
                Alert(
                    rule_id=rule["id"],
                    severity=rule["severity"],
                    message=f"UIP violation: interest differential ({interest_diff.value_computed:.2f}%) != "
                    f"expected FX change ({fx_change.value_computed:.2f}%). Deviation: {deviation:.2f}%",
                    node_ids=[interest_diff.id, fx_change.id],
                    suggestion="Check for risk premium, capital controls, or market expectations issues",
                    type=AlertType.WARNING,
                    details={
                        "interest_diff": round(interest_diff.value_computed, 4),
                        "fx_change": round(fx_change.value_computed, 4),
                        "deviation": round(deviation, 4),
                    },
                )
            )

    def _check_inequalities(self) -> None:
        """Check inequality constraints (monotonicity, positivity)."""
        # Check discount curve monotonicity
        discount_nodes = [n for n in self.nodes if "discount" in n.id.lower() or n.id.startswith("P_")]
        if len(discount_nodes) >= 2:
            # Sort by maturity (extract from ID if possible)
            sorted_nodes = sorted(discount_nodes, key=lambda n: self._extract_maturity(n.id))
            for i in range(len(sorted_nodes) - 1):
                n1, n2 = sorted_nodes[i], sorted_nodes[i + 1]
                if n1.value_computed is not None and n2.value_computed is not None:
                    if n2.value_computed > n1.value_computed:
                        self.alerts.append(
                            Alert(
                                rule_id="discount_monotonicity",
                                severity=AlertSeverity.MEDIUM.value,
                                message=f"Discount curve violation: P({self._extract_maturity(n2.id)}) > "
                                f"P({self._extract_maturity(n1.id)})",
                                node_ids=[n1.id, n2.id],
                                suggestion="Check pricing data or curve interpolation",
                                type=AlertType.WARNING,
                            )
                        )

        # Check forward rates positivity
        forward_nodes = [n for n in self.nodes if "forward" in n.id.lower()]
        for node in forward_nodes:
            if node.value_computed is not None and node.value_computed < -0.01:
                self.alerts.append(
                    Alert(
                        rule_id="forward_rate_positive",
                        severity=AlertSeverity.LOW.value,
                        message=f"Forward rate '{node.label}' is negative: {node.value_computed:.2f}%",
                        node_ids=[node.id],
                        suggestion="Verify if negative forward rates are realistic in current environment",
                        type=AlertType.INFO,
                    )
                )

        # Check yield curve
        yield_2y = self._find_node_by_pattern(["yield_2y", "y2", "2y_yield"])
        yield_10y = self._find_node_by_pattern(["yield_10y", "y10", "10y_yield"])

        if yield_2y and yield_10y and yield_2y.value_computed is not None and yield_10y.value_computed is not None:
            if yield_10y.value_computed < yield_2y.value_computed:
                inversion = yield_2y.value_computed - yield_10y.value_computed
                self.alerts.append(
                    Alert(
                        rule_id="yield_curve_normal",
                        severity=AlertSeverity.INFO.value,
                        message=f"Yield curve inversion detected: 10Y ({yield_10y.value_computed:.2f}%) < "
                        f"2Y ({yield_2y.value_computed:.2f}%) by {inversion:.2f}bp",
                        node_ids=[yield_2y.id, yield_10y.id],
                        suggestion="Inverted yield curve may signal recession risk",
                        type=AlertType.INFO,
                        details={"inversion_bp": round(inversion * 100, 2)},
                    )
                )

    def _check_consistency(self) -> None:
        """Check logical consistency across nodes."""
        # Check for missing critical data
        missing_critical = []
        for crit_id in CRITICAL_NODES:
            node = self.nodes_by_id.get(crit_id)
            if not node:
                missing_critical.append(crit_id)
            elif node.value_computed is None:
                missing_critical.append(crit_id)

        if missing_critical:
            self.alerts.append(
                Alert(
                    rule_id="missing_critical_data",
                    severity=AlertSeverity.MEDIUM.value,
                    message=f"Missing data for {len(missing_critical)} critical variable(s): {', '.join(missing_critical[:3])}",
                    node_ids=missing_critical,
                    suggestion="Populate values for critical economic indicators",
                    type=AlertType.WARNING,
                    details={"missing_count": len(missing_critical), "missing_ids": missing_critical},
                )
            )

        # Check status-value consistency
        for node in self.nodes:
            if node.status.value == "observed" and node.value_computed is None:
                self.alerts.append(
                    Alert(
                        rule_id="status_consistency",
                        severity=AlertSeverity.LOW.value,
                        message=f"Node '{node.label}' is marked as 'observed' but has no value",
                        node_ids=[node.id],
                        suggestion=f"Either provide a value or change status for {node.id}",
                        type=AlertType.WARNING,
                    )
                )
            elif node.status.value == "imposed" and node.confidence < 0.8:
                self.alerts.append(
                    Alert(
                        rule_id="status_consistency",
                        severity=AlertSeverity.LOW.value,
                        message=f"Node '{node.label}' is 'imposed' but has low confidence ({node.confidence})",
                        node_ids=[node.id],
                        suggestion=f"Imposed values typically should have high confidence (>0.8)",
                        type=AlertType.INFO,
                    )
                )

    def _find_node_by_pattern(self, patterns: list[str]) -> Optional[Node]:
        """Find a node matching any of the given ID patterns."""
        for pattern in patterns:
            if pattern in self.nodes_by_id:
                return self.nodes_by_id[pattern]
        return None

    def _extract_maturity(self, node_id: str) -> float:
        """Extract maturity from node ID (e.g., 'P_10' -> 10.0)."""
        match = re.search(r'(\d+)', node_id)
        return float(match.group(1)) if match else 0.0


def evaluate_rules(nodes: list[Node]) -> list[Alert]:
    """Convenience function to evaluate all rules on a set of nodes.

    Args:
        nodes: List of Node objects to check

    Returns:
        List of Alert objects for violations found
    """
    engine = RulesEngine(nodes)
    return engine.evaluate_all()
