"""Tests for the alert system."""

import pytest
from app.logic.alerts import Alert, AlertType, AlertSeverity


class TestAlertModel:
    """Test the Alert Pydantic model."""

    def test_alert_creation(self):
        """Test creating a basic alert."""
        alert = Alert(
            rule_id="test_rule",
            severity=3,
            message="Test message",
            node_ids=["node1", "node2"],
        )

        assert alert.rule_id == "test_rule"
        assert alert.severity == 3
        assert alert.message == "Test message"
        assert alert.node_ids == ["node1", "node2"]
        assert alert.type == AlertType.WARNING  # Default
        assert alert.suggestion is None
        assert alert.details is None

    def test_alert_with_all_fields(self):
        """Test creating an alert with all fields."""
        alert = Alert(
            rule_id="fisher_identity",
            severity=3,
            message="Fisher identity violated",
            node_ids=["nominal_rate", "real_rate", "inflation"],
            suggestion="Check inflation expectations",
            type=AlertType.ERROR,
            details={"expected": 5.0, "actual": 4.5, "deviation": 0.5},
        )

        assert alert.rule_id == "fisher_identity"
        assert alert.severity == 3
        assert alert.type == AlertType.ERROR
        assert alert.suggestion == "Check inflation expectations"
        assert alert.details["deviation"] == 0.5

    def test_alert_severity_bounds(self):
        """Test alert severity must be between 1 and 5."""
        # Valid severities
        for sev in range(1, 6):
            alert = Alert(
                rule_id="test",
                severity=sev,
                message="Test",
                node_ids=[],
            )
            assert alert.severity == sev

        # Invalid severity (too low)
        with pytest.raises(Exception):  # Pydantic ValidationError
            Alert(
                rule_id="test",
                severity=0,
                message="Test",
                node_ids=[],
            )

        # Invalid severity (too high)
        with pytest.raises(Exception):  # Pydantic ValidationError
            Alert(
                rule_id="test",
                severity=6,
                message="Test",
                node_ids=[],
            )

    def test_alert_types(self):
        """Test different alert types."""
        for alert_type in [AlertType.ERROR, AlertType.WARNING, AlertType.INFO]:
            alert = Alert(
                rule_id="test",
                severity=2,
                message="Test",
                node_ids=[],
                type=alert_type,
            )
            assert alert.type == alert_type

    def test_alert_json_serialization(self):
        """Test alert can be serialized to JSON."""
        alert = Alert(
            rule_id="test_rule",
            severity=2,
            message="Test message",
            node_ids=["node1"],
            suggestion="Fix this",
            type=AlertType.WARNING,
            details={"key": "value"},
        )

        alert_dict = alert.model_dump()
        assert isinstance(alert_dict, dict)
        assert alert_dict["rule_id"] == "test_rule"
        assert alert_dict["severity"] == 2
        assert alert_dict["type"] == "warning"

    def test_alert_empty_node_list(self):
        """Test alert with empty node list."""
        alert = Alert(
            rule_id="test",
            severity=1,
            message="Test",
        )
        assert alert.node_ids == []


class TestAlertSeverity:
    """Test the AlertSeverity enum."""

    def test_severity_levels(self):
        """Test all severity levels."""
        assert AlertSeverity.INFO.value == 1
        assert AlertSeverity.LOW.value == 2
        assert AlertSeverity.MEDIUM.value == 3
        assert AlertSeverity.HIGH.value == 4
        assert AlertSeverity.CRITICAL.value == 5

    def test_severity_ordering(self):
        """Test severity ordering."""
        assert AlertSeverity.INFO.value < AlertSeverity.LOW.value
        assert AlertSeverity.LOW.value < AlertSeverity.MEDIUM.value
        assert AlertSeverity.MEDIUM.value < AlertSeverity.HIGH.value
        assert AlertSeverity.HIGH.value < AlertSeverity.CRITICAL.value


class TestAlertType:
    """Test the AlertType enum."""

    def test_alert_types_exist(self):
        """Test all alert types exist."""
        assert AlertType.ERROR == "error"
        assert AlertType.WARNING == "warning"
        assert AlertType.INFO == "info"
