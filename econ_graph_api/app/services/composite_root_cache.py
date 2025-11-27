"""
In-memory cache storing resolved values for composite root parameters.

Keys:
  project_id -> composite_node_instance_id -> internal_id
Each entry stores the latest real baseline value/error as well as optional
scenario-specific overrides.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from threading import RLock
from typing import Dict, Optional


@dataclass
class RootValue:
    value: Optional[float]
    error: Optional[str]


@dataclass
class CompositeRootEntry:
    real: RootValue = field(default_factory=lambda: RootValue(value=None, error=None))
    scenarios: Dict[str, RootValue] = field(default_factory=dict)


_CACHE: Dict[str, Dict[str, Dict[str, CompositeRootEntry]]] = {}
_LOCK = RLock()


def _get_entry(
    project_id: Optional[str],
    composite_node_id: str,
    internal_id: str,
    create: bool = False,
) -> Optional[CompositeRootEntry]:
    project_key = project_id or "default"
    with _LOCK:
        project_bucket = _CACHE.get(project_key)
        if project_bucket is None:
            if not create:
                return None
            project_bucket = {}
            _CACHE[project_key] = project_bucket
        composite_bucket = project_bucket.get(composite_node_id)
        if composite_bucket is None:
            if not create:
                return None
            composite_bucket = {}
            project_bucket[composite_node_id] = composite_bucket
        entry = composite_bucket.get(internal_id)
        if entry is None and create:
            entry = CompositeRootEntry()
            composite_bucket[internal_id] = entry
        return entry


def set_real_values(
    project_id: Optional[str],
    composite_node_id: str,
    root_snapshot: Dict[str, Dict[str, Optional[float]]],
) -> None:
    for internal_id, payload in (root_snapshot or {}).items():
        entry = _get_entry(project_id, composite_node_id, internal_id, create=True)
        if not entry:
            continue
        entry.real = RootValue(
            value=payload.get("value"),
            error=payload.get("error"),
        )


def set_scenario_values(
    project_id: Optional[str],
    scenario_id: str,
    composite_node_id: str,
    root_snapshot: Dict[str, Dict[str, Optional[float]]],
) -> None:
    for internal_id, payload in (root_snapshot or {}).items():
        entry = _get_entry(project_id, composite_node_id, internal_id, create=True)
        if not entry:
            continue
        entry.scenarios[scenario_id] = RootValue(
            value=payload.get("value"),
            error=payload.get("error"),
        )


def get_real_value(
    project_id: Optional[str],
    composite_node_id: str,
    internal_id: str,
) -> Optional[float]:
    entry = _get_entry(project_id, composite_node_id, internal_id, create=False)
    if not entry:
        return None
    return entry.real.value


def list_real_keys(
    project_id: Optional[str], composite_node_id: str
) -> list[str]:
    project_key = project_id or "default"
    with _LOCK:
        project_bucket = _CACHE.get(project_key, {})
        composite_bucket = project_bucket.get(composite_node_id, {})
        return list(composite_bucket.keys())


def get_scenario_value(
    project_id: Optional[str],
    scenario_id: str,
    composite_node_id: str,
    internal_id: str,
) -> Optional[float]:
    entry = _get_entry(project_id, composite_node_id, internal_id, create=False)
    if not entry:
        return None
    scenario_entry = entry.scenarios.get(scenario_id)
    return scenario_entry.value if scenario_entry else None


def _get_composite_bucket(
    project_id: Optional[str],
    composite_node_id: str,
) -> Dict[str, CompositeRootEntry] | None:
    project_key = project_id or "default"
    with _LOCK:
        project_bucket = _CACHE.get(project_key)
        if not project_bucket:
            return None
        return project_bucket.get(composite_node_id)


def get_real_snapshot(
    project_id: Optional[str],
    composite_node_id: str,
) -> Dict[str, Dict[str, Optional[float]]]:
    bucket = _get_composite_bucket(project_id, composite_node_id)
    if not bucket:
        return {}
    snapshot: Dict[str, Dict[str, Optional[float]]] = {}
    for internal_id, entry in bucket.items():
        snapshot[internal_id] = {
            "value": entry.real.value,
            "error": entry.real.error,
        }
    return snapshot


def get_scenario_snapshot(
    project_id: Optional[str],
    scenario_id: str,
    composite_node_id: str,
) -> Dict[str, Dict[str, Optional[float]]]:
    bucket = _get_composite_bucket(project_id, composite_node_id)
    if not bucket:
        return {}
    snapshot: Dict[str, Dict[str, Optional[float]]] = {}
    for internal_id, entry in bucket.items():
        scenario_entry = entry.scenarios.get(scenario_id)
        if not scenario_entry:
            continue
        snapshot[internal_id] = {
            "value": scenario_entry.value,
            "error": scenario_entry.error,
        }
    return snapshot
