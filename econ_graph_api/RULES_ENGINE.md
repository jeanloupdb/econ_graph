# Economic Rules Engine

The Econ Graph API includes a sophisticated rules engine for checking economic coherence across nodes. This document describes how the rules engine works and how to use it.

## Overview

The rules engine evaluates a set of economic rules against nodes in the database and generates alerts when violations are detected. Rules are organized by type and severity.

## Rule Types

### 1. **Identity Rules**
Mathematical identities that must hold exactly (with small tolerance).

**Examples:**
- **Fisher Identity**: `nominal_rate = real_rate + inflation_expected`
- **Taylor Rule**: `policy_rate = neutral_rate + 1.5 * inflation_gap + 0.5 * output_gap`
- **Uncovered Interest Parity**: `interest_diff = fx_expected_change`

### 2. **Bound Check Rules**
Verify computed values are within acceptable ranges.

**Examples:**
- Plausible bounds defined per node
- Confidence must be in [0, 1]

### 3. **Inequality Rules**
Monotonicity or ordering constraints.

**Examples:**
- **Discount Curve Monotonicity**: Zero-coupon prices must decrease with maturity
- **Forward Rate Positivity**: Forward rates should be positive (or near zero)
- **Yield Curve Normal**: In normal conditions, long rates > short rates

### 4. **Consistency Rules**
Logical consistency across nodes.

**Examples:**
- Critical economic variables should have computed values
- Observed nodes must have computed values
- Imposed nodes should have high confidence

## Alert Severity Levels

Alerts are classified by severity (1-5):

| Level | Name | Description |
|-------|------|-------------|
| 1 | INFO | Informational, may be expected |
| 2 | LOW | Minor issue, review recommended |
| 3 | MEDIUM | Moderate issue, requires attention |
| 4 | HIGH | Serious issue, investigate immediately |
| 5 | CRITICAL | Critical violation, action required |

## API Usage

### Check All Nodes

```bash
GET /rules/check
```

**Response:**
```json
{
  "summary": {
    "checked": 10,
    "alerts": 3,
    "critical": 0,
    "warnings": 2,
    "info": 1
  },
  "alerts": [
    {
      "rule_id": "fisher_identity",
      "severity": 3,
      "message": "Fisher identity violated: nominal rate (6.00) != real rate (2.00) + inflation (3.00) = 5.00. Deviation: 1.00",
      "node_ids": ["nominal_rate", "real_rate", "inflation_expected"],
      "suggestion": "Check if inflation expectations are correctly specified",
      "type": "warning",
      "details": {
        "expected": 5.0,
        "actual": 6.0,
        "deviation": 1.0
      }
    }
  ]
}
```

### Check Specific Nodes

```bash
GET /rules/check?node_ids=gdp_growth,inflation
```

### Filter by Severity

```bash
GET /rules/check?min_severity=3
```

Only returns alerts with severity >= 3 (MEDIUM and above).

### Get Rules Catalog

```bash
GET /rules/catalog
```

Returns the full catalog of available rules.

## Example Scenarios

### Scenario 1: Fisher Identity Violation

**Setup:**
```bash
# Create nodes
curl -X POST http://localhost:8000/nodes -H "Content-Type: application/json" -d '{
  "id": "nominal_rate",
  "label": "Nominal Interest Rate",
  "value_computed": 6.0,
  "status": "observed",
  "confidence": 0.95
}'

curl -X POST http://localhost:8000/nodes -H "Content-Type: application/json" -d '{
  "id": "real_rate",
  "label": "Real Interest Rate",
  "value_computed": 2.0,
  "status": "observed",
  "confidence": 0.9
}'

curl -X POST http://localhost:8000/nodes -H "Content-Type: application/json" -d '{
  "id": "inflation_expected",
  "label": "Expected Inflation",
  "value_computed": 3.0,
  "status": "imposed",
  "confidence": 0.85
}'
```

**Check:**
```bash
curl http://localhost:8000/rules/check
```

**Result:** Alert generated because 6.0 ≠ 2.0 + 3.0 (with tolerance).

### Scenario 2: Yield Curve Inversion

**Setup:**
```bash
curl -X POST http://localhost:8000/nodes -H "Content-Type: application/json" -d '{
  "id": "yield_2y",
  "label": "2Y Treasury Yield",
  "value_computed": 5.0,
  "unit": "percent",
  "status": "observed",
  "confidence": 0.95
}'

curl -X POST http://localhost:8000/nodes -H "Content-Type: application/json" -d '{
  "id": "yield_10y",
  "label": "10Y Treasury Yield",
  "value_computed": 4.5,
  "unit": "percent",
  "status": "observed",
  "confidence": 0.95
}'
```

**Result:** Info alert about yield curve inversion (potential recession signal).

## Extending the Rules Engine

To add a new rule:

1. **Add rule definition** to `app/logic/rules_catalog.py`:

```python
{
    "id": "my_new_rule",
    "description": "Description of the rule",
    "type": "identity",  # or bound_check, inequality, consistency
    "severity": 3,
    "expression": "optional_mathematical_expression",
    "tolerance": 0.01,  # optional
}
```

2. **Implement check logic** in `app/logic/rules_engine.py`:

```python
def _check_my_new_rule(self, rule: RuleDefinition) -> None:
    """Check my new economic rule."""
    # Find relevant nodes
    node1 = self._find_node_by_pattern(["pattern1", "alias1"])
    
    # Check condition
    if violation_detected:
        self.alerts.append(
            Alert(
                rule_id=rule["id"],
                severity=rule["severity"],
                message="Violation description",
                node_ids=[node1.id],
                suggestion="How to fix",
                type=AlertType.WARNING,
            )
        )
```

3. **Add tests** in `tests/test_rules_engine.py`.

## Critical Nodes

The following nodes are considered critical and should typically have values:

- `gdp_growth`
- `inflation`
- `policy_rate`
- `exchange_rate`
- `unemployment`

Missing values for these nodes will trigger a consistency alert.

## Performance Considerations

- The rules engine evaluates all rules on each `/rules/check` call
- For large datasets, consider caching results or implementing incremental checking
- Use the `node_ids` parameter to check only specific nodes
- Use `min_severity` to filter out low-priority alerts

## Best Practices

1. **Regular Monitoring**: Schedule periodic coherence checks
2. **Alert Triage**: Address CRITICAL and HIGH alerts first
3. **Documentation**: Document why specific violations are acceptable if they are
4. **Thresholds**: Adjust rule tolerances based on your use case
5. **Testing**: Always test rules with realistic data before production
