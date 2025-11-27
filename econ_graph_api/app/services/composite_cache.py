"""
In-memory cache for composite computations.

Keys:
- composite_id
- cache key derived from effective root values/errors

Stored payload keeps final value/error plus internal node outputs so
subsequent calls can reuse expensive computations across project nodes
and scenarios.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from threading import RLock
from typing import Any, Dict, Optional


@dataclass
class CompositeCacheEntry:
    value: Optional[float]
    error: Optional[str]
    nodes: Dict[str, Dict[str, Any]]
    computed_at: datetime


_CACHE: Dict[str, Dict[str, CompositeCacheEntry]] = {}
_LOCK = RLock()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def build_cache_key(root_snapshot: Dict[str, Dict[str, Any]]) -> str:
    """
    Build a deterministic cache key for a composite based on root values/errors.
    """
    payload = {
        "root_values": {k: root_snapshot[k].get("value") for k in sorted(root_snapshot.keys())},
        "root_errors": {k: root_snapshot[k].get("error") for k in sorted(root_snapshot.keys())},
    }
    blob = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()


def get_entry(composite_id: str, cache_key: str) -> Optional[CompositeCacheEntry]:
    with _LOCK:
        return _CACHE.get(composite_id, {}).get(cache_key)


def set_entry(
    composite_id: str,
    cache_key: str,
    value: Optional[float],
    error: Optional[str],
    nodes: Dict[str, Dict[str, Any]],
) -> CompositeCacheEntry:
    entry = CompositeCacheEntry(
        value=value,
        error=error,
        nodes=nodes,
        computed_at=_now(),
    )
    with _LOCK:
        bucket = _CACHE.setdefault(composite_id, {})
        bucket[cache_key] = entry
    return entry


def invalidate(composite_id: Optional[str] = None) -> None:
    """
    Drop cache entries for a composite, or clear all when composite_id is None.
    """
    with _LOCK:
        if composite_id is None:
            _CACHE.clear()
            return
        _CACHE.pop(composite_id, None)
