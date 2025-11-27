"""
In-memory caches for real and scenario-specific node values.

Responsibilities:
- Store baseline (real) computed values per project.
- Store scenario-specific computed values per scenario.
- Track "dirty" nodes for each scenario so the computation layer can
  recalculate only affected descendants.

This module does not perform any computation; it simply manages cache
state with basic invalidation helpers.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import RLock
from typing import Dict, Optional, Set, Iterable, Tuple

NodeValue = Optional[float]


def _now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class ScenarioCacheState:
    """Holds values + dirty tracking for a scenario."""

    values: Dict[str, NodeValue] = field(default_factory=dict)
    dirty_nodes: Set[str] = field(default_factory=set)
    updated_at: datetime = field(default_factory=_now)


@dataclass
class ProjectCacheState:
    """Cache data for a project (real values + scenarios)."""

    real_values: Dict[str, NodeValue] = field(default_factory=dict)
    scenarios: Dict[str, ScenarioCacheState] = field(default_factory=dict)
    updated_at: datetime = field(default_factory=_now)


_PROJECT_CACHES: Dict[str, ProjectCacheState] = {}
_LOCK = RLock()


def _get_project_state(project_id: Optional[str]) -> ProjectCacheState:
    """
    Access (and create if needed) the cache state for a project.

    None-project is valid and represents shared/global state, but we
    still store it using the string "default".
    """
    if project_id is None:
        project_id = "default"

    with _LOCK:
        state = _PROJECT_CACHES.get(project_id)
        if not state:
            state = ProjectCacheState()
            _PROJECT_CACHES[project_id] = state
        return state


def _get_scenario_state(
    project_id: Optional[str], scenario_id: str
) -> ScenarioCacheState:
    project_state = _get_project_state(project_id)
    with _LOCK:
        scenario_state = project_state.scenarios.get(scenario_id)
        if not scenario_state:
            scenario_state = ScenarioCacheState()
            project_state.scenarios[scenario_id] = scenario_state
        return scenario_state


# ---------------------------------------------------------------------------
# Real value cache helpers
# ---------------------------------------------------------------------------

def get_real_value(project_id: Optional[str], node_id: str) -> NodeValue:
    """Return cached real value for a node (if any)."""
    state = _get_project_state(project_id)
    with _LOCK:
        return state.real_values.get(node_id)


def set_real_values(
    project_id: Optional[str], updates: Dict[str, NodeValue]
) -> None:
    """Merge a set of real values into the cache."""
    state = _get_project_state(project_id)
    with _LOCK:
        state.real_values.update(updates)
        state.updated_at = _now()


def get_all_real_values(project_id: Optional[str]) -> Dict[str, NodeValue]:
    """Return a copy of all real values cached for a project."""
    state = _get_project_state(project_id)
    with _LOCK:
        return dict(state.real_values)


def clear_real_cache(project_id: Optional[str] = None) -> None:
    """Remove cached real values (optionally for a specific project)."""
    if project_id is None:
        project_id = "default"
    with _LOCK:
        state = _PROJECT_CACHES.get(project_id)
        if state:
            state.real_values.clear()
            state.updated_at = _now()


# ---------------------------------------------------------------------------
# Scenario cache helpers
# ---------------------------------------------------------------------------

def get_scenario_value(
    project_id: Optional[str], scenario_id: str, node_id: str
) -> NodeValue:
    """Fetch a cached scenario value if available."""
    scenario_state = _get_scenario_state(project_id, scenario_id)
    with _LOCK:
        return scenario_state.values.get(node_id)


def get_scenario_values(
    project_id: Optional[str],
    scenario_id: str,
    node_ids: Optional[Iterable[str]] = None,
) -> Dict[str, NodeValue]:
    """
    Return scenario values for specific nodes (or all if node_ids is None).
    """
    scenario_state = _get_scenario_state(project_id, scenario_id)
    with _LOCK:
        if node_ids is None:
            return dict(scenario_state.values)
        return {node_id: scenario_state.values.get(node_id) for node_id in node_ids}


def set_scenario_values(
    project_id: Optional[str],
    scenario_id: str,
    updates: Dict[str, NodeValue],
    mark_clean: bool = False,
) -> None:
    """
    Merge new scenario values into cache.

    Args:
        mark_clean: when True, removes the updated nodes from dirty set.
    """
    scenario_state = _get_scenario_state(project_id, scenario_id)
    with _LOCK:
        scenario_state.values.update(updates)
        if mark_clean:
            scenario_state.dirty_nodes.difference_update(updates.keys())
        scenario_state.updated_at = _now()


def mark_dirty_nodes(
    project_id: Optional[str],
    scenario_id: str,
    node_ids: Iterable[str],
) -> None:
    """Mark the provided nodes as dirty for a scenario."""
    scenario_state = _get_scenario_state(project_id, scenario_id)
    with _LOCK:
        scenario_state.dirty_nodes.update(node_ids)
        scenario_state.updated_at = _now()


def consume_dirty_nodes(
    project_id: Optional[str], scenario_id: str
) -> Set[str]:
    """
    Retrieve and clear dirty nodes for a scenario.

    Returns a copy of the dirty set to avoid exposing internal state.
    """
    scenario_state = _get_scenario_state(project_id, scenario_id)
    with _LOCK:
        dirty = set(scenario_state.dirty_nodes)
        scenario_state.dirty_nodes.clear()
        return dirty


def drop_scenario_cache(
    project_id: Optional[str], scenario_id: str
) -> None:
    """Completely remove cached data for a scenario."""
    project_state = _get_project_state(project_id)
    with _LOCK:
        project_state.scenarios.pop(scenario_id, None)
        project_state.updated_at = _now()


# ---------------------------------------------------------------------------
# Global helpers
# ---------------------------------------------------------------------------

def invalidate_project_cache(project_id: Optional[str]) -> None:
    """Remove cache state for a project."""
    if project_id is None:
        project_id = "default"
    with _LOCK:
        _PROJECT_CACHES.pop(project_id, None)


def clear_all_caches() -> None:
    """Reset every cache (mainly for tests)."""
    with _LOCK:
        _PROJECT_CACHES.clear()
