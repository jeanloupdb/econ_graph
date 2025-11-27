"""
Centralized dependency graph tracking for scenario computations.

This module builds and caches both:
- dependencies: node -> set of upstream node IDs (sources)
- dependents: node -> set of downstream node IDs (targets)

The cache is keyed by project to avoid rebuilding the adjacency lists
on every computation run.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from threading import RLock
from typing import Dict, Set, Tuple, Optional

from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.edge import Edge


GraphMap = Dict[str, Set[str]]


@dataclass
class DependencyGraph:
    """Container for dependency and dependent adjacency lists."""

    dependencies: GraphMap
    dependents: GraphMap
    updated_at: datetime


_CACHE: Dict[Tuple[Optional[str]], DependencyGraph] = {}
_LOCK = RLock()
_CACHE_KEY_ALL = (None,)


def _cache_key(project_id: Optional[str]) -> Tuple[Optional[str]]:
    return (project_id,) if project_id else _CACHE_KEY_ALL


def _build_graphs(db: Session, project_id: Optional[str]) -> DependencyGraph:
    """Query edges and construct both dependency and dependent maps."""
    dependencies: GraphMap = {}

    stmt = select(Edge)
    if project_id:
        stmt = stmt.where(Edge.project_id == project_id)
    edges = db.execute(stmt).scalars().all()

    for edge in edges:
        if edge.edge_type != "dependency":
            continue
        if edge.target not in dependencies:
            dependencies[edge.target] = set()
        dependencies[edge.target].add(edge.source)

    # Build reverse adjacency (dependents)
    dependents: GraphMap = {}
    for target, sources in dependencies.items():
        for source in sources:
            if source not in dependents:
                dependents[source] = set()
            dependents[source].add(target)

    # Ensure every node seen as target is present in dependents (even if empty)
    for target in dependencies.keys():
        dependents.setdefault(target, set())

    return DependencyGraph(
        dependencies=dependencies,
        dependents=dependents,
        updated_at=datetime.now(timezone.utc),
    )


def get_dependency_graph(
    db: Session, project_id: Optional[str] = None, force_refresh: bool = False
) -> DependencyGraph:
    """
    Retrieve the cached dependency graph for a project.

    Args:
        db: SQLAlchemy session used when a rebuild is required.
        project_id: Optional project filter; None means "global".
        force_refresh: When True, bypass cache and rebuild.
    """
    key = _cache_key(project_id)
    if not force_refresh:
        with _LOCK:
            cached = _CACHE.get(key)
            if cached:
                return cached

    graph = _build_graphs(db, project_id)

    with _LOCK:
        _CACHE[key] = graph

    return graph


def invalidate_dependency_graph(project_id: Optional[str] = None) -> None:
    """Remove the cached dependency graph for a given project (or all)."""
    key = _cache_key(project_id)
    with _LOCK:
        _CACHE.pop(key, None)


def clear_dependency_cache() -> None:
    """Clear every cached dependency graph."""
    with _LOCK:
        _CACHE.clear()
