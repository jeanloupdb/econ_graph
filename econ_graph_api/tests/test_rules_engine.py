"""Tests for the economic rules engine."""

import pytest
from app.models.node import Node, Status
from app.logic import evaluate_rules, RulesEngine, Alert


class TestRulesEngine:
    """Test suite for rules engine."""

    def test_empty_nodes(self):
        """Test engine with empty node list."""
        alerts = evaluate_rules([])
        assert isinstance(alerts, list)
        assert len(alerts) == 0

    def test_plausible_bounds_violation(self):
        """Test detection of values outside plausible bounds."""
        node = Node(
            id="test_node",
            label="Test Node",
            value_computed=15.0,
            plausible_min=0.0,
            plausible_max=10.0,
            status=Status.observed,
            confidence=0.9,
        )

        alerts = evaluate_rules([node])
        bound_alerts = [a for a in alerts if a.rule_id == "plausible_bounds"]
        assert len(bound_alerts) == 1
        assert "outside plausible range" in bound_alerts[0].message.lower()
        assert "test_node" in bound_alerts[0].node_ids

    def test_plausible_bounds_within_range(self):
        """Test no alert when value is within plausible bounds."""
        node = Node(
            id="test_node",
            label="Test Node",
            value_computed=5.0,
            plausible_min=0.0,
            plausible_max=10.0,
            status=Status.observed,
            confidence=0.9,
        )

        alerts = evaluate_rules([node])
        bound_alerts = [a for a in alerts if a.rule_id == "plausible_bounds"]
        assert len(bound_alerts) == 0

    def test_confidence_bounds_violation(self):
        """Test detection of invalid confidence values."""
        node = Node(
            id="test_node",
            label="Test Node",
            value_computed=5.0,
            status=Status.observed,
            confidence=1.5,  # Invalid
        )

        alerts = evaluate_rules([node])
        conf_alerts = [a for a in alerts if a.rule_id == "confidence_bounds"]
        assert len(conf_alerts) == 1
        assert conf_alerts[0].severity == 4  # High severity

    def test_fisher_identity_valid(self):
        """Test Fisher identity when it holds."""
        nodes = [
            Node(
                id="nominal_rate",
                label="Nominal Rate",
                value_computed=5.0,
                status=Status.observed,
                confidence=0.95,
            ),
            Node(
                id="real_rate",
                label="Real Rate",
                value_computed=2.0,
                status=Status.observed,
                confidence=0.9,
            ),
            Node(
                id="inflation_expected",
                label="Expected Inflation",
                value_computed=3.0,
                status=Status.imposed,
                confidence=0.85,
            ),
        ]

        alerts = evaluate_rules(nodes)
        fisher_alerts = [a for a in alerts if a.rule_id == "fisher_identity"]
        assert len(fisher_alerts) == 0  # Should be valid (5 = 2 + 3)

    def test_fisher_identity_violation(self):
        """Test Fisher identity when violated."""
        nodes = [
            Node(
                id="nominal_rate",
                label="Nominal Rate",
                value_computed=6.0,  # Should be 5.0
                status=Status.observed,
                confidence=0.95,
            ),
            Node(
                id="real_rate",
                label="Real Rate",
                value_computed=2.0,
                status=Status.observed,
                confidence=0.9,
            ),
            Node(
                id="inflation_expected",
                label="Expected Inflation",
                value_computed=3.0,
                status=Status.imposed,
                confidence=0.85,
            ),
        ]

        alerts = evaluate_rules(nodes)
        fisher_alerts = [a for a in alerts if a.rule_id == "fisher_identity"]
        assert len(fisher_alerts) == 1
        assert fisher_alerts[0].severity == 3
        assert "fisher identity violated" in fisher_alerts[0].message.lower()
        assert len(fisher_alerts[0].node_ids) == 3

    def test_missing_critical_data(self):
        """Test detection of missing critical economic variables."""
        # Create only one node (not a critical one)
        nodes = [
            Node(
                id="some_random_var",
                label="Some Variable",
                value_computed=1.0,
                status=Status.observed,
                confidence=0.9,
            )
        ]

        alerts = evaluate_rules(nodes)
        missing_alerts = [a for a in alerts if a.rule_id == "missing_critical_data"]
        assert len(missing_alerts) >= 1  # Should detect missing critical nodes

    def test_status_consistency_observed_no_value(self):
        """Test alert when node is 'observed' but has no value."""
        node = Node(
            id="test_node",
            label="Test Node",
            value_computed=None,  # No value
            status=Status.observed,  # But marked as observed!
            confidence=0.9,
        )

        alerts = evaluate_rules([node])
        status_alerts = [a for a in alerts if a.rule_id == "status_consistency"]
        assert len(status_alerts) >= 1

    def test_status_consistency_imposed_low_confidence(self):
        """Test info alert when imposed node has low confidence."""
        node = Node(
            id="test_node",
            label="Test Node",
            value_computed=5.0,
            status=Status.imposed,
            confidence=0.5,  # Low confidence for imposed value
        )

        alerts = evaluate_rules([node])
        status_alerts = [a for a in alerts if a.rule_id == "status_consistency"]
        # Should generate an info alert
        assert len(status_alerts) >= 1

    def test_yield_curve_inversion(self):
        """Test detection of yield curve inversion."""
        nodes = [
            Node(
                id="yield_2y",
                label="2Y Yield",
                value_computed=5.0,
                unit=Unit.percent,
                status=Status.observed,
                confidence=0.95,
            ),
            Node(
                id="yield_10y",
                label="10Y Yield",
                value_computed=4.5,  # Inverted
                unit=Unit.percent,
                status=Status.observed,
                confidence=0.95,
            ),
        ]

        alerts = evaluate_rules(nodes)
        curve_alerts = [a for a in alerts if a.rule_id == "yield_curve_normal"]
        assert len(curve_alerts) == 1
        assert "inversion" in curve_alerts[0].message.lower()

    def test_alert_severity_ordering(self):
        """Test that alerts are sorted by severity (highest first)."""
        nodes = [
            # Create multiple violations
            Node(
                id="test1",
                label="Test 1",
                value_computed=15.0,
                plausible_min=0.0,
                plausible_max=10.0,
                status=Status.observed,
                confidence=1.5,  # Also invalid confidence
            ),
            Node(
                id="test2",
                label="Test 2",
                value_computed=None,
                status=Status.observed,  # Inconsistent
                confidence=0.9,
            ),
        ]

        alerts = evaluate_rules(nodes)
        # Check that alerts are sorted (descending severity)
        for i in range(len(alerts) - 1):
            assert alerts[i].severity >= alerts[i + 1].severity

    def test_taylor_rule_approximation(self):
        """Test Taylor rule checking (if nodes exist)."""
        nodes = [
            Node(id="policy_rate", label="Policy Rate", value_computed=5.5, status=Status.observed, confidence=0.95),
            Node(id="neutral_rate", label="Neutral Rate", value_computed=2.0, status=Status.imposed, confidence=0.8),
            Node(id="inflation_gap", label="Inflation Gap", value_computed=1.0, status=Status.observed, confidence=0.9),
            Node(id="output_gap", label="Output Gap", value_computed=0.5, status=Status.observed, confidence=0.85),
        ]

        # Expected: 2 + 1.5*1 + 0.5*0.5 = 2 + 1.5 + 0.25 = 3.75
        # Actual: 5.5 -> Deviation = 1.75 > tolerance (0.5)

        alerts = evaluate_rules(nodes)
        taylor_alerts = [a for a in alerts if a.rule_id == "taylor_rule"]
        assert len(taylor_alerts) >= 1


class TestCheckEndpoint:
    """Test the /rules/check API endpoint."""

    def test_check_empty_database(self, client):
        """Test /rules/check with no nodes."""
        response = client.get("/rules/check")
        assert response.status_code == 200

        data = response.json()
        assert data["summary"]["checked"] == 0
        assert data["summary"]["alerts"] == 0

    def test_check_with_nodes(self, client, fisher_nodes_data):
        """Test /rules/check with nodes."""
        # Create nodes
        for node_data in fisher_nodes_data:
            client.post("/nodes", json=node_data)

        # Check coherence
        response = client.get("/rules/check")
        assert response.status_code == 200

        data = response.json()
        assert data["summary"]["checked"] == 3
        assert isinstance(data["alerts"], list)

    def test_check_specific_nodes(self, client, sample_nodes_data):
        """Test /rules/check with specific node IDs."""
        # Create nodes
        for node_data in sample_nodes_data:
            client.post("/nodes", json=node_data)

        # Check only specific nodes
        response = client.get("/rules/check?node_ids=gdp_growth,inflation")
        assert response.status_code == 200

        data = response.json()
        assert data["summary"]["checked"] == 2

    def test_check_min_severity_filter(self, client, fisher_nodes_data):
        """Test /rules/check with severity filter."""
        # Create nodes that will trigger alerts
        for node_data in fisher_nodes_data:
            client.post("/nodes", json=node_data)

        # Check with min_severity=4 (only critical)
        response = client.get("/rules/check?min_severity=4")
        assert response.status_code == 200

        data = response.json()
        # All returned alerts should have severity >= 4
        for alert in data["alerts"]:
            assert alert["severity"] >= 4

    def test_rules_catalog_endpoint(self, client):
        """Test /rules/catalog endpoint."""
        response = client.get("/rules/catalog")
        assert response.status_code == 200

        catalog = response.json()
        assert isinstance(catalog, list)
        assert len(catalog) > 0

        # Check structure of first rule
        first_rule = catalog[0]
        assert "id" in first_rule
        assert "description" in first_rule
        assert "type" in first_rule
        assert "severity" in first_rule
