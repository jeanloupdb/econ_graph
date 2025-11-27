from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional, Set, Tuple
import logging

import httpx
import time

from fastapi import HTTPException

logger = logging.getLogger(__name__)
from app.api.nodes import extract_compute_params
from app.schemas.composite import CompositeGraphData
from app.schemas.node import NodeCreate
from app.services.computation import (
    ComputationError,
    TimeoutError,
    execute_algorithm,
    topological_sort,
)


def _fetch_provider_value(node: NodeCreate) -> Tuple[Optional[float], Optional[str]]:
    """Fetch a value from an external provider for root nodes."""
    url = node.provider_url
    if not url:
        return (None, "Provider enabled but no URL configured")
    timeout = float(node.provider_timeout or 12.0)

    def _fetch_with_retries(u: str, t: float, retries: int = 2) -> Any:
        attempt = 0
        backoff = 0.6
        last_err: Optional[Exception] = None
        while attempt <= retries:
            try:
                with httpx.Client(timeout=t) as client:
                    resp = client.get(u)
                    resp.raise_for_status()
                    return resp.json()
            except (httpx.TimeoutException, httpx.TransportError) as e:
                last_err = e
                if attempt == retries:
                    break
                time.sleep(backoff)
                backoff *= 2
                attempt += 1
            except Exception as e:  # pragma: no cover - best effort logging
                raise e
        assert last_err is not None
        raise last_err

    try:
        data = _fetch_with_retries(url, timeout)
    except Exception as exc:
        return (None, f"Provider error: {type(exc).__name__}: {exc}")

    value: Any = data
    path = node.provider_json_path or ""
    if path:
        for part in path.split("."):
            if not part:
                continue
            if isinstance(value, dict) and part in value:
                value = value[part]
            elif isinstance(value, list) and part.isdigit():
                idx = int(part)
                try:
                    value = value[idx]
                except Exception:
                    length = len(value) if isinstance(value, list) else "unknown"
                    return (None, f"JSON path index out of range: {part} (len={length})")
            else:
                available = (
                    list(value.keys())
                    if isinstance(value, dict)
                    else type(value).__name__
                )
                return (None, f"JSON path not found: {part} (available: {available})")
    try:
        return (float(value), None)
    except Exception:
        return (None, f"Provider value is not numeric: {value}")


def _normalize_manual_value(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _apply_root_override(
    override: Dict[str, Any], real_value: Optional[float]
) -> Tuple[Optional[float], Optional[str]]:
    mode = override.get("mode") or "value"
    if mode == "formula":
        code = (override.get("override_code") or "").strip()
        if not code:
            return (None, "Override formula is empty")
        indented = "\n".join(
            f"    {line}" for line in code.splitlines() if line.strip() != ""
        )
        algorithm = f"def compute(real_value):\n{indented or '    return real_value'}\n"
        try:
            result = execute_algorithm(
                algorithm,
                {
                    "real_value": float(real_value)
                    if real_value is not None
                    else 0.0
                },
            )
            return (result, None)
        except Exception as exc:
            return (None, str(exc))
    override_value = override.get("override_value")
    if override_value is None:
        return (None, None)
    try:
        return (float(override_value), None)
    except (TypeError, ValueError):
        return (None, "Override value is not numeric")


def compute_root_node_value(
    node: NodeCreate,
    override_payload: Optional[Dict[str, Any]] = None,
) -> Tuple[Optional[float], Optional[str], Optional[datetime]]:
    """
    Compute the effective value/error for a root node, including overrides.
    """
    base_value: Optional[float] = None
    base_error: Optional[str] = None
    timestamp: Optional[datetime] = None

    if node.provider_enabled:
        value, error = _fetch_provider_value(node)
        base_value = value if error is None else None
        base_error = error
        timestamp = datetime.utcnow() if error is None else None
    elif node.computation_definition:
        try:
            base_value = execute_algorithm(
                node.computation_definition,
                {},
            )
            timestamp = datetime.utcnow()
        except (ComputationError, TimeoutError) as exc:
            base_value = None
            base_error = str(exc)
            timestamp = None
    else:
        base_value = _normalize_manual_value(node.value_computed)
        base_error = None
        timestamp = node.last_computed_at

    if override_payload:
        logger.info(
            "[compute_root_node_value] Applying override to %s: mode=%s, base_value=%s",
            node.slug or node.id,
            override_payload.get('mode'),
            base_value,
        )
        override_value, override_error = _apply_root_override(
            override_payload, base_value
        )
        logger.info(
            "[compute_root_node_value] Override result for %s: value=%s, error=%s",
            node.slug or node.id,
            override_value,
            override_error,
        )
        if override_value is not None:
            override_ts = datetime.utcnow() if override_error is None else None
            return override_value, override_error, override_ts
        return base_value, override_error or base_error, timestamp

    return base_value, base_error, timestamp


def compute_composite_graph(
    graph: CompositeGraphData,
    overrides: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Dict[str, Any]]:
    """
    Compute values for a composite graph entirely in memory.

    Returns a mapping of node_id -> {value, error, last_computed_at}
    """
    nodes = {node.id: node for node in graph.nodes or []}
    if not nodes:
        return {}

    slug_to_id: Dict[str, str] = {}
    for node in graph.nodes or []:
        if node.slug:
            slug_to_id[node.slug] = node.id
        slug_to_id[node.id] = node.id

    dependencies: Dict[str, Set[str]] = {}
    param_aliases: Dict[str, list[tuple[str, str]]] = {}
    for node in graph.nodes or []:
        try:
            params = extract_compute_params(node.computation_definition or "")
        except HTTPException:
            params = []
        resolved: Set[str] = set()
        alias_pairs: list[tuple[str, str]] = []
        for param in params:
            dep_id = slug_to_id.get(param) or slug_to_id.get(param.strip())
            if not dep_id:
                dep_id = param
            resolved.add(dep_id)
            alias_pairs.append((param, dep_id))
        dependencies[node.id] = resolved
        param_aliases[node.id] = alias_pairs

    # Ensure referenced nodes without explicit definitions are part of the graph
    for deps in list(dependencies.values()):
        for source in deps:
            dependencies.setdefault(source, set())

    order = topological_sort(dependencies)

    computed_values: Dict[str, Optional[float]] = {}
    errors: Dict[str, Optional[str]] = {}
    timestamps: Dict[str, Optional[datetime]] = {}

    overrides = overrides or {}

    for node_id in order:
        node = nodes.get(node_id)
        deps = dependencies.get(node_id, set())
        if not node:
            errors[node_id] = "Node not defined in graph_data"
            computed_values[node_id] = None
            timestamps[node_id] = None
            continue

        slug_key = getattr(node, "slug", None) or node.id
        raw_internal_id = getattr(node, "raw_internal_id", None) or node.id
        override_payload = None
        candidate_keys: list[str] = []
        if raw_internal_id:
            candidate_keys.append(raw_internal_id)
        if slug_key and slug_key not in candidate_keys:
            candidate_keys.append(slug_key)
        for alias in candidate_keys:
            if alias in overrides:
                override_payload = overrides.get(alias)
                break

        override_mode = (override_payload or {}).get("mode") or "value"
        has_direct_value_override = (
            override_payload
            and override_mode != "formula"
            and override_payload.get("override_value") is not None
        )

        if deps and has_direct_value_override:
            override_value, override_error = _apply_root_override(
                override_payload,
                None,
            )
            if override_error:
                computed_values[node_id] = None
                errors[node_id] = override_error
                timestamps[node_id] = None
            else:
                computed_values[node_id] = override_value
                errors[node_id] = None
                timestamps[node_id] = datetime.utcnow()
            continue

        if not deps:
            value, error, timestamp = compute_root_node_value(node, override_payload)
            computed_values[node_id] = value
            errors[node_id] = error
            timestamps[node_id] = timestamp
            continue

        if not node.computation_definition:
            manual_value = _normalize_manual_value(node.value_computed)
            computed_values[node_id] = manual_value
            errors[node_id] = None
            timestamps[node_id] = node.last_computed_at
            continue

        variables: Dict[str, float] = {}
        dependency_error: Optional[str] = None
        for param_name, dep in param_aliases.get(node_id, []):
            if dep not in computed_values:
                dependency_error = f"Dependency {dep} not computed"
                break
            dep_value = computed_values.get(dep)
            if dep_value is None:
                dependency_error = errors.get(dep) or f"Dependency {dep} has no computed value"
                break
            variables[param_name] = dep_value

        if dependency_error:
            computed_values[node_id] = None
            errors[node_id] = dependency_error
            timestamps[node_id] = None
            continue

        try:
            logger.info(
                "[compute_composite_graph] Executing formula for %s with variables: %s",
                node.slug or node_id,
                variables,
            )
            result = execute_algorithm(node.computation_definition or "", variables)
            logger.info(
                "[compute_composite_graph] Formula result for %s: %s",
                node.slug or node_id,
                result,
            )
            # Apply formula-style overrides on computed nodes
            if override_payload and override_mode == "formula":
                override_value, override_error = _apply_root_override(
                    override_payload,
                    result,
                )
                if override_value is not None:
                    computed_values[node_id] = override_value
                    errors[node_id] = override_error
                    timestamps[node_id] = (
                        datetime.utcnow() if override_error is None else None
                    )
                else:
                    computed_values[node_id] = result
                    errors[node_id] = override_error
                    timestamps[node_id] = datetime.utcnow()
            else:
                computed_values[node_id] = result
                errors[node_id] = None
                timestamps[node_id] = datetime.utcnow()
        except (ComputationError, TimeoutError) as exc:
            computed_values[node_id] = None
            errors[node_id] = str(exc)
            timestamps[node_id] = None

    return {
        node_id: {
            "value": computed_values.get(node_id),
            "error": errors.get(node_id),
            "last_computed_at": timestamps.get(node_id),
        }
        for node_id in nodes.keys()
    }
