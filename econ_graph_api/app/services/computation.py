"""
Computation engine for calculating node values from Python algorithms.

This module handles:
- Safe Python algorithm execution using RestrictedPython
- DAG-based dependency resolution
- Topological sorting for correct calculation order
- Cycle detection
- Timeout protection
"""

from typing import Dict, List, Set, Tuple, Optional, Any
import os
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select
import signal
import sys
from io import StringIO
import math
from types import SimpleNamespace
import json
import httpx
import time

from RestrictedPython import compile_restricted, safe_globals
from RestrictedPython.Guards import guarded_iter_unpack_sequence, safe_builtins

from app.models.edge import Edge
from app.models.node import Node
from app.models.scenario import ScenarioNodeOverride, ScenarioCompositeOverride
from app.models.composite import Composite
from app.schemas.composite import CompositeGraphData
from pydantic import ValidationError
from app.services.dependency_tracker import get_dependency_graph, DependencyGraph
import logging
from app.services import scenario_cache, composite_cache
from app.services import composite_root_cache

logger = logging.getLogger(__name__)


class ComputationError(Exception):
    """Raised when computation fails."""
    pass


class CycleDetectedError(ComputationError):
    """Raised when a cycle is detected in the dependency graph."""
    pass


def _load_composite_graph(composite: Composite) -> CompositeGraphData:
    try:
        return CompositeGraphData.model_validate(composite.graph_data or {})
    except ValidationError as exc:
        raise ComputationError(f"Composite graph invalid: {exc}")


def _find_composite_final_node(graph: CompositeGraphData) -> str:
    outgoing: Dict[str, int] = {node.id: 0 for node in graph.nodes}
    for edge in graph.edges or []:
        outgoing[edge.source] = outgoing.get(edge.source, 0) + 1
    leaves = [node_id for node_id, count in outgoing.items() if count == 0]
    if len(leaves) != 1:
        raise ComputationError("Composite must contain exactly one final node")
    return leaves[0]

def _extract_composite_root_metadata(graph: CompositeGraphData) -> list[dict]:
    nodes = graph.nodes or []
    incoming: Dict[str, int] = {node.id: 0 for node in nodes}
    for edge in graph.edges or []:
        incoming[edge.target] = incoming.get(edge.target, 0) + 1
    roots: list[dict] = []
    for node in nodes:
        if incoming.get(node.id, 0) == 0:
            raw_internal_id = getattr(node, "raw_internal_id", None) or node.id
            roots.append(
                {
                    "id": node.id,
                    "slug": getattr(node, "slug", None),
                    "raw_internal_id": raw_internal_id,
                    "label": getattr(node, "label", None),
                }
            )
    return roots


def _compute_composite_node_value(
    db: Session,
    node: Node,
    slug_overrides: Optional[Dict[str, Dict[str, Any]]] = None,
    composite_overrides: Optional[Dict[str, Dict[str, Any]]] = None,
    scenario_values: Optional[Dict[str, Optional[float]]] = None,
    *,
    scenario_id: Optional[str] = None,
) -> Tuple[Optional[float], Optional[str], Dict[str, Dict[str, Any]]]:
    from app.services.composite_compute import compute_composite_graph, compute_root_node_value
    if not node.composite_id:
        return (None, "Composite not specified")
    composite = db.query(Composite).filter(Composite.id == node.composite_id).first()
    if not composite:
        return (None, "Composite introuvable")
    root_snapshot: Dict[str, Dict[str, Any]] = {}
    try:
        graph = _load_composite_graph(composite)
        root_meta = _extract_composite_root_metadata(graph)
        logger.info(
            "[compute_all] composite %s root_meta=%s",
            node.id,
            [
                {"id": meta.get("id"), "slug": meta.get("slug")}
                for meta in root_meta
            ],
        )
        resolved_overrides: Dict[str, Dict[str, Any]] = {}
        if slug_overrides:
            logger.info(
                "[_compute_composite] Received slug_overrides for %s: %s",
                node.id,
                {k: v.get("override_value") for k, v in slug_overrides.items()},
            )
            resolved_overrides.update(slug_overrides)
        if composite_overrides:
            logger.info(
                "[_compute_composite] Received composite_overrides for %s: %s",
                node.id,
                {k: v.get("override_value") for k, v in composite_overrides.items()},
            )
            resolved_overrides.update(composite_overrides)

        # Create lookup dictionaries for graph nodes (needed for nested composite detection)
        nodes_by_id = {n.id: n for n in graph.nodes or []}
        nodes_by_slug = {n.slug: n for n in graph.nodes or [] if n.slug}

        if node.project_id and root_meta:
            slug_keys = [root["slug"] for root in root_meta if root.get("slug")]
            id_keys = [root["id"] for root in root_meta if root.get("id")]

            slug_matches: Dict[str, Node] = {}
            if slug_keys:
                for match in (
                    db.query(Node)
                    .filter(Node.project_id == node.project_id)
                    .filter(Node.slug.in_(slug_keys))
                    .all()
                ):
                    if match.slug:
                        slug_matches[match.slug] = match

            id_matches: Dict[str, Node] = {}
            if id_keys:
                for match in (
                    db.query(Node)
                    .filter(Node.project_id == node.project_id)
                    .filter(Node.id.in_(id_keys))
                    .all()
                ):
                    id_matches[match.id] = match

            for root in root_meta:
                candidate_keys: list[str] = []
                raw_key = root.get("raw_internal_id") or root.get("id")
                slug_key = root.get("slug")
                if raw_key:
                    candidate_keys.append(raw_key)
                if slug_key and slug_key not in candidate_keys:
                    candidate_keys.append(slug_key)
                id_key = root.get("id")
                if id_key and id_key not in candidate_keys:
                    candidate_keys.append(id_key)
                if not candidate_keys:
                    continue
                if any(alias in resolved_overrides for alias in candidate_keys):
                    continue

                # IMPORTANT: Skip this resolution if the root references a composite
                # Nested composites will be computed recursively later, so we don't want
                # to pre-populate resolved_overrides with their cached/virtual values
                root_node_from_graph = nodes_by_id.get(id_key) if id_key else None
                if not root_node_from_graph and slug_key:
                    root_node_from_graph = nodes_by_slug.get(slug_key)
                if root_node_from_graph and getattr(root_node_from_graph, 'composite_id', None) and composite_overrides:
                    # This is a nested composite - skip pre-resolution, will be handled recursively
                    continue

                # First, try to find a project node that matches
                match = None
                if slug_key and slug_key in slug_matches:
                    match = slug_matches.get(slug_key)
                if not match and raw_key:
                    match = id_matches.get(raw_key)
                if not match and id_key and id_key in id_matches:
                    match = id_matches.get(id_key)

                node_value = None
                if match:
                    # Use scenario value if available, otherwise use computed value
                    if scenario_values and match.id in scenario_values:
                        node_value = scenario_values[match.id]
                        logger.info(
                            "[_compute_composite] Using scenario value from project node for %s (%s): %s",
                            match.slug,
                            match.id,
                            node_value,
                        )
                    elif match.value_computed is not None:
                        node_value = match.value_computed
                        logger.info(
                            "[_compute_composite] Using baseline value from project node for %s (%s): %s",
                            match.slug,
                            match.id,
                            node_value,
                        )
                else:
                    # No project node found - try to find value in scenario_values with composite virtual key format
                    # Look for: composite::any_composite_id::slug or composite::any_composite_id::raw_key
                    if scenario_values:
                        for virtual_key, virtual_value in scenario_values.items():
                            if not isinstance(virtual_key, str) or not virtual_key.startswith("composite::"):
                                continue
                            # Format: composite::composite_id::internal_id
                            parts = virtual_key.split("::")
                            if len(parts) != 3:
                                continue
                            internal_id = parts[2]
                            if internal_id in candidate_keys:
                                node_value = virtual_value
                                logger.info(
                                    "[_compute_composite] Using scenario value from virtual entry for %s: %s (key=%s)",
                                    internal_id,
                                    node_value,
                                    virtual_key,
                                )
                                break

                if node_value is not None:
                    payload = {
                        "mode": "value",
                        "override_value": node_value,
                        "override_code": None,
                    }
                    for alias in candidate_keys:
                        resolved_overrides[alias] = payload

        # nodes_by_id and nodes_by_slug already created above
        for root in root_meta:
            slot_key = root.get("slug") or root.get("id")
            root_node = nodes_by_id.get(root.get("id"))
            if not root_node and slot_key:
                root_node = nodes_by_slug.get(slot_key)
            if not root_node:
                continue

            # Check if this root references a nested composite
            # root_node is from the graph data, so we need to check if it has a composite_id field
            root_composite_id = getattr(root_node, 'composite_id', None)
            if root_composite_id and composite_overrides:
                # This root is a nested composite that needs to be computed with overrides
                # The composite_overrides are for the PARENT composite's internal parameters
                # We need to filter and pass only the relevant ones to the nested composite
                logger.info(
                    "[_compute_composite] Root %s references composite %s, computing with overrides",
                    root_node.id,
                    root_composite_id,
                )

                # Create a temporary Node object for the nested composite computation
                # We need this because _compute_composite_node_value expects a Node
                nested_composite_node = Node()
                nested_composite_node.id = root_node.id
                nested_composite_node.composite_id = root_composite_id
                nested_composite_node.project_id = node.project_id
                nested_composite_node.slug = getattr(root_node, 'slug', root_node.id)

                # Recursively compute the nested composite with the parent's composite_overrides
                nested_value, nested_error, nested_snapshot = _compute_composite_node_value(
                    db,
                    nested_composite_node,
                    slug_overrides,
                    composite_overrides,  # Pass parent's overrides down
                    scenario_values,
                    scenario_id=scenario_id,
                )

                primary_key = slot_key or root_node.id
                raw_internal_id = root.get("raw_internal_id") or root_node.id
                snapshot_entry = {
                    "value": nested_value,
                    "error": nested_error,
                    "__canonical_internal_id": raw_internal_id or primary_key,
                    "__alias_for": raw_internal_id if raw_internal_id and raw_internal_id != primary_key else None,
                }
                root_snapshot[primary_key] = snapshot_entry
                if raw_internal_id and raw_internal_id != primary_key:
                    root_snapshot[raw_internal_id] = {
                        "value": nested_value,
                        "error": nested_error,
                        "__canonical_internal_id": raw_internal_id,
                        "__alias_for": None,
                    }

                # IMPORTANT: Add the nested composite's computed value to resolved_overrides
                # so that compute_composite_graph uses it when calculating the parent composite
                if nested_value is not None:
                    override_payload = {
                        "mode": "value",
                        "override_value": nested_value,
                        "override_code": None,
                    }
                    # Add override for all possible keys the nested composite might be referenced by
                    candidate_override_keys = [primary_key]
                    if raw_internal_id and raw_internal_id != primary_key:
                        candidate_override_keys.append(raw_internal_id)
                    if slot_key and slot_key not in candidate_override_keys:
                        candidate_override_keys.append(slot_key)
                    for key in candidate_override_keys:
                        resolved_overrides[key] = override_payload
                        logger.info(
                            "[_compute_composite] Adding nested composite override: %s=%s",
                            key,
                            nested_value,
                        )

                logger.info(
                    "[_compute_composite] Nested composite %s computed with value=%s (error=%s)",
                    root_node.id,
                    nested_value,
                    nested_error or "None",
                )
                continue

            override_payload = None
            candidate_keys: list[str] = []
            raw_key = root.get("raw_internal_id") or root.get("id")
            if raw_key:
                candidate_keys.append(raw_key)
            if slot_key and slot_key not in candidate_keys:
                candidate_keys.append(slot_key)
            id_key = root.get("id")
            if id_key and id_key not in candidate_keys:
                candidate_keys.append(id_key)
            for alias in candidate_keys:
                if alias and alias in resolved_overrides:
                    override_payload = resolved_overrides.get(alias)
                    break
            value, error, _ = compute_root_node_value(root_node, override_payload)
            primary_key = slot_key or root_node.id
            raw_internal_id = root.get("raw_internal_id") or root_node.id
            snapshot_entry = {
                "value": value,
                "error": error,
                "__canonical_internal_id": raw_internal_id or primary_key,
                "__alias_for": raw_internal_id if raw_internal_id and raw_internal_id != primary_key else None,
            }
            root_snapshot[primary_key] = snapshot_entry
            if raw_internal_id and raw_internal_id != primary_key:
                root_snapshot[raw_internal_id] = {
                    "value": value,
                    "error": error,
                    "__canonical_internal_id": raw_internal_id,
                    "__alias_for": None,
                }

        cache_key: Optional[str] = None
        cached_entry = None
        if node.composite_id and root_meta and len(root_snapshot) == len(root_meta):
            cache_key = composite_cache.build_cache_key(root_snapshot)
            cached_entry = composite_cache.get_entry(node.composite_id, cache_key)
            if cached_entry:
                if cached_entry.error:
                    return (None, cached_entry.error, root_snapshot)
                return (cached_entry.value, None, root_snapshot)

        logger.info(
            "[_compute_composite] Calling compute_composite_graph with %d overrides: %s",
            len(resolved_overrides),
            {
                k: (
                    f"{v.get('mode')}:{v.get('override_value')}"
                    if v.get('mode') == 'value'
                    else f"{v.get('mode')}:{v.get('override_code', '')[:30]}..."
                )
                for k, v in resolved_overrides.items()
            },
        )
        results = compute_composite_graph(graph, overrides=resolved_overrides)
        logger.info(
            "[_compute_composite] compute_composite_graph returned %d results: %s",
            len(results),
            list(results.keys()),
        )

        # IMPORTANT: Update root_snapshot with the actual computed values from results
        # This ensures that virtual entries use values AFTER overrides are applied
        logger.info(
            "[_compute_composite] Updating root_snapshot: root_meta has %d roots, results has %d entries",
            len(root_meta),
            len(results),
        )
        for root in root_meta:
            root_id = root.get("id")
            root_slug = root.get("slug")
            logger.info(
                "[_compute_composite] Processing root: id=%s, slug=%s",
                root_id,
                root_slug,
            )
            # Find the result for this root (try both ID and slug)
            result_entry = results.get(root_id) or results.get(root_slug)
            if result_entry:
                computed_value = result_entry.get("value")
                computed_error = result_entry.get("error")
                logger.info(
                    "[_compute_composite] Found result for root %s: value=%s",
                    root_slug or root_id,
                    computed_value,
                )
                # Update all entries in root_snapshot that correspond to this root
                for key in [root_id, root_slug]:
                    if key and key in root_snapshot:
                        root_snapshot[key]["value"] = computed_value
                        root_snapshot[key]["error"] = computed_error
                        logger.info(
                            "[_compute_composite] Updated root_snapshot[%s] with computed value=%s",
                            key,
                            computed_value,
                        )
            else:
                logger.warning(
                    "[_compute_composite] No result found for root id=%s, slug=%s",
                    root_id,
                    root_slug,
                )

        final_id = _find_composite_final_node(graph)
    except ComputationError as exc:
        return (None, str(exc), root_snapshot)
    except Exception as exc:
        return (None, f"Composite compute error: {exc}", root_snapshot)

    final_result = results.get(final_id)
    if not final_result:
        return (None, "Composite final node introuvable")
    final_error = final_result.get("error")
    final_value = final_result.get("value")
    logger.info(
        "[_compute_composite] Composite %s final result: value=%s, error=%s",
        node.slug or node.id,
        final_value,
        final_error,
    )

    if cache_key and node.composite_id:
        composite_cache.set_entry(
            node.composite_id,
            cache_key,
            final_value,
            final_error,
            results,
        )

    # Store inputs of nested composites in composite_root_cache
    # This allows exposed-roots to find values for inputs of nested composites that don't have project nodes
    # NOTE: We now process this section even with composite_overrides (scenario context) because
    # the virtual entries need to be created with the correct override-applied values
    if node.project_id and root_meta:
        nested_composite_inputs: Dict[str, Dict[str, Any]] = {}

        # For each root that is itself a composite, load its inputs
        for root in root_meta:
            # Get the actual node from the graph to check if it has a composite_id
            root_node_id = root.get("id")
            root_node = nodes_by_id.get(root_node_id) if root_node_id else None
            if not root_node:
                continue

            root_composite_id = getattr(root_node, "composite_id", None)
            if not root_composite_id:
                continue

            # This root is a nested composite - load its definition
            nested_comp = db.query(Composite).filter(Composite.id == root_composite_id).first()
            if not nested_comp:
                continue

            try:
                nested_graph = _load_composite_graph(nested_comp)
                nested_root_meta = _extract_composite_root_metadata(nested_graph)

                logger.info(
                    "[compute_all] found nested composite %s in root %s, has %d inputs",
                    root_composite_id,
                    root.get("slug") or root.get("id"),
                    len(nested_root_meta),
                )
                logger.info(
                    "[compute_all] resolved_overrides keys for nested composite: %s",
                    list(resolved_overrides.keys()),
                )

                # For each input of the nested composite, try to get its value from the parent's calculation
                nested_nodes_by_id = {n.id: n for n in nested_graph.nodes or []}
                nested_nodes_by_slug = {n.slug: n for n in nested_graph.nodes or [] if n.slug}

                for nested_root in nested_root_meta:
                    nested_slot_key = nested_root.get("slug") or nested_root.get("id")
                    nested_root_node = nested_nodes_by_id.get(nested_root.get("id"))
                    if not nested_root_node and nested_slot_key:
                        nested_root_node = nested_nodes_by_slug.get(nested_slot_key)
                    if not nested_root_node:
                        continue

                    # Check if there's an override for this nested root
                    nested_override_payload = None
                    nested_candidate_keys: list[str] = []
                    nested_raw_key = nested_root.get("raw_internal_id") or nested_root.get("id")
                    if nested_raw_key:
                        nested_candidate_keys.append(nested_raw_key)
                    if nested_slot_key and nested_slot_key not in nested_candidate_keys:
                        nested_candidate_keys.append(nested_slot_key)
                    nested_id_key = nested_root.get("id")
                    if nested_id_key and nested_id_key not in nested_candidate_keys:
                        nested_candidate_keys.append(nested_id_key)
                    for alias in nested_candidate_keys:
                        if alias and alias in resolved_overrides:
                            nested_override_payload = resolved_overrides.get(alias)
                            break

                    # Calculate the value for this nested root (with override if present)
                    nested_value, nested_error, _ = compute_root_node_value(nested_root_node, nested_override_payload)
                    if nested_value is not None or nested_error:
                        raw_id = nested_root.get("raw_internal_id") or nested_slot_key or nested_root_node.id
                        nested_composite_inputs[raw_id] = {
                            "value": nested_value,
                            "error": nested_error,
                        }
                        # Also store under slug if different
                        if nested_slot_key and nested_slot_key != raw_id:
                            nested_composite_inputs[nested_slot_key] = {
                                "value": nested_value,
                                "error": nested_error,
                            }

                        # Add to root_snapshot so it's included in virtual entries
                        root_snapshot[raw_id] = {
                            "value": nested_value,
                            "error": nested_error,
                            "__canonical_internal_id": raw_id,
                            "__alias_for": None,
                        }
                        if nested_slot_key and nested_slot_key != raw_id:
                            root_snapshot[nested_slot_key] = {
                                "value": nested_value,
                                "error": nested_error,
                                "__canonical_internal_id": raw_id,
                                "__alias_for": raw_id if raw_id != nested_slot_key else None,
                            }

            except Exception as e:
                logger.warning(
                    "[compute_all] failed to process nested composite %s: %s",
                    root_composite_id,
                    str(e),
                )

        if nested_composite_inputs:
            logger.info(
                "[compute_all] storing %d nested composite inputs for node %s: %s",
                len(nested_composite_inputs),
                node.id,
                list(nested_composite_inputs.keys()),
            )
            if scenario_id:
                composite_root_cache.set_scenario_values(
                    node.project_id,
                    scenario_id,
                    node.id,
                    nested_composite_inputs,
                )
            else:
                composite_root_cache.set_real_values(
                    node.project_id,
                    node.id,
                    nested_composite_inputs,
                )

    if final_error:
        return (None, final_error, root_snapshot)
    return (final_value, None, root_snapshot)


class TimeoutError(ComputationError):
    """Raised when algorithm execution times out."""
    pass


def timeout_handler(signum, frame):
    """Handler for algorithm timeout."""
    raise TimeoutError("Algorithm execution exceeded 5 second timeout")


def topological_sort(dependencies: Dict[str, Set[str]]) -> List[str]:
    """
    Perform topological sort to determine calculation order.

    Args:
        dependencies: Dict mapping node_id to set of its dependencies

    Returns:
        List of node_ids in calculation order (dependencies first)

    Raises:
        CycleDetectedError: If a cycle is detected
    """
    # Build in-degree map
    in_degree: Dict[str, int] = {}
    all_nodes = set(dependencies.keys())

    # Add all source nodes too
    for deps in dependencies.values():
        all_nodes.update(deps)

    # Initialize in-degrees
    for node in all_nodes:
        in_degree[node] = 0

    for node, deps in dependencies.items():
        in_degree[node] = len(deps)

    # Queue of nodes with no dependencies
    queue = [node for node in all_nodes if in_degree[node] == 0]
    result = []

    while queue:
        node = queue.pop(0)
        result.append(node)

        # Find nodes that depend on current node
        for dependent, deps in dependencies.items():
            if node in deps:
                in_degree[dependent] -= 1
                if in_degree[dependent] == 0:
                    queue.append(dependent)

    # Check for cycles
    if len(result) != len(all_nodes):
        # Find nodes that couldn't be processed
        unprocessed = all_nodes - set(result)
        raise CycleDetectedError(f"Cycle detected involving nodes: {unprocessed}")

    return result


def _expand_dependents(
    start_nodes: Set[str], dependents: Dict[str, Set[str]]
) -> Set[str]:
    """
    Given a set of starting nodes, return the transitive closure of their dependents.
    """
    to_visit = list(start_nodes)
    visited = set(start_nodes)

    while to_visit:
        current = to_visit.pop()
        for child in dependents.get(current, set()):
            if child not in visited:
                visited.add(child)
                to_visit.append(child)
    return visited


def _sanitize_algorithm(algorithm: str) -> str:
    """
    Fix common LLM-generated formula issues before compilation.
    - Remove backticks around variable names (`var` → var)
    - Replace ^ with ** for exponentiation
    - Normalize body identifiers to match declared parameter names
      (e.g., Revenu_Initial → revenu_initial if that's the param name)
    """
    import re as _re
    import unicodedata as _ud

    # 1. Remove backticks around identifiers: `some_var` → some_var
    sanitized = _re.sub(r'`([a-zA-Z_][a-zA-Z0-9_]*)`', r'\1', algorithm)

    # 2. Replace ^ with ** for exponentiation
    sanitized = sanitized.replace(' ^ ', ' ** ')
    sanitized = sanitized.replace(')^', ')**')
    sanitized = sanitized.replace('^(', '**(')
    sanitized = _re.sub(r'(\w)\^(\w)', r'\1**\2', sanitized)

    # 3. Wrap range() arguments with int() to handle float parameters
    sanitized = _re.sub(r'range\(([^,)]+)\)', r'range(int(\1))', sanitized)
    sanitized = _re.sub(r'range\(([^,)]+),\s*([^,)]+)\)', r'range(int(\1), int(\2))', sanitized)
    sanitized = _re.sub(r'range\(([^,)]+),\s*([^,)]+),\s*([^)]+)\)', r'range(int(\1), int(\2), int(\3))', sanitized)

    # 4. Normalize body identifiers to match declared param names
    # Extract declared parameter names from "def compute(a, b, c):"
    sig_match = _re.search(r'def\s+compute\s*\(([^)]*)\)\s*:', sanitized)
    if sig_match:
        params_str = sig_match.group(1).strip()
        if params_str:
            declared_params = [p.strip() for p in params_str.split(',') if p.strip()]
            # Build a lookup: normalized form → declared param name
            def _norm(s: str) -> str:
                s = ''.join(c for c in _ud.normalize('NFKD', s) if not _ud.combining(c))
                return _re.sub(r'[^a-z0-9]', '_', s.lower()).strip('_')

            norm_to_param = {_norm(p): p for p in declared_params}

            # Find the body (everything after the signature line)
            sig_end = sig_match.end()
            header = sanitized[:sig_end]
            body = sanitized[sig_end:]

            # Find all identifiers in body (including accented chars like é, è, ê)
            body_tokens = set(_re.findall(r'(?<!\w)(\w+)(?!\w)', body))
            reserved = {'return', 'if', 'else', 'elif', 'for', 'in', 'and', 'or', 'not',
                        'True', 'False', 'None', 'sum', 'min', 'max', 'abs', 'round',
                        'len', 'int', 'float', 'pow', 'sqrt', 'exp', 'log', 'math',
                        'compute', 'def'}

            for token in body_tokens:
                if token in declared_params or token in reserved:
                    continue
                if token.isdigit():
                    continue
                # Check if this token's normalized form matches a declared param
                token_norm = _norm(token)
                if token_norm in norm_to_param:
                    correct_param = norm_to_param[token_norm]
                    if token != correct_param:
                        body = _re.sub(
                            r'(?<!\w)' + _re.escape(token) + r'(?!\w)',
                            correct_param, body,
                        )

            sanitized = header + body

    return sanitized


def execute_algorithm(algorithm: str, variables: Dict[str, float], timeout: int = 5) -> float:
    """
    Safely execute a Python algorithm with given variable values.

    Args:
        algorithm: Python algorithm code (must define a 'compute' function)
        variables: Dict mapping variable names to their values
        timeout: Maximum execution time in seconds (default: 5)

    Returns:
        Computed result

    Raises:
        ComputationError: If execution fails
        TimeoutError: If execution exceeds timeout
    """
    try:
        # Sanitize common LLM artifacts before compilation
        algorithm = _sanitize_algorithm(algorithm)

        # Compile the algorithm with RestrictedPython
        try:
            byte_code = compile_restricted(algorithm, '<string>', 'exec')
        except SyntaxError as e:
            raise ComputationError(f"Algorithm compilation failed: {str(e)}")

        # Create a restricted execution environment
        # Safe math namespace (module-like) exposed as `math`
        safe_math = SimpleNamespace(
            # constants
            pi=math.pi,
            e=math.e,
            tau=getattr(math, 'tau', 2 * math.pi),
            inf=math.inf,
            nan=math.nan,
            # basic operations
            sqrt=math.sqrt,
            pow=math.pow,
            exp=math.exp,
            log=math.log,
            log10=math.log10,
            log2=getattr(math, 'log2', lambda x: math.log(x, 2)),
            # trig
            sin=math.sin,
            cos=math.cos,
            tan=math.tan,
            asin=math.asin,
            acos=math.acos,
            atan=math.atan,
            # hyperbolic
            sinh=math.sinh,
            cosh=math.cosh,
            tanh=math.tanh,
            # rounding
            floor=math.floor,
            ceil=math.ceil,
            trunc=math.trunc,
            fabs=math.fabs,
            fmod=math.fmod,
            # statistics-like
            prod=getattr(math, 'prod', None),
            gcd=getattr(math, 'gcd', None),
            lcm=getattr(math, 'lcm', None),
        )
        restricted_globals = {
            '__builtins__': safe_builtins,
            '_getiter_': iter,
            '_iter_unpack_sequence_': guarded_iter_unpack_sequence,
            # Allow safe math operations
            'abs': abs,
            'min': min,
            'max': max,
            'round': round,
            'sum': sum,
            'len': len,
            'int': int,
            'float': float,
            'pow': pow,
            'sqrt': math.sqrt,
            'exp': math.exp,
            'log': math.log,
            'log10': math.log10,
            'sin': math.sin,
            'cos': math.cos,
            'tan': math.tan,
            'floor': math.floor,
            'ceil': math.ceil,
            # Expose `math` module as safe namespace
            'math': safe_math,
            # Add input variables
            **variables
        }

        restricted_locals = {}

        # Set timeout alarm (Unix-only, only works in main thread)
        timeout_enabled = False
        if sys.platform != 'win32':
            try:
                signal.signal(signal.SIGALRM, timeout_handler)
                signal.alarm(timeout)
                timeout_enabled = True
            except ValueError:
                # Not in main thread, skip timeout
                pass

        try:
            # Execute the algorithm (byte_code is already a code object)
            exec(byte_code, restricted_globals, restricted_locals)

            # Look for the 'compute' function
            if 'compute' not in restricted_locals:
                raise ComputationError("Algorithm must define a 'compute' function")

            compute_func = restricted_locals['compute']

            # Call the compute function with variables
            result = compute_func(**variables)

            # Ensure result is a number
            if isinstance(result, str):
                raise ComputationError(
                    f"La formule retourne une chaîne de caractères '{result}' au lieu d'un nombre. "
                    f"Encodez les catégories comme des entiers (ex: 0=linéaire, 1=dégressif)."
                )
            return float(result)

        finally:
            # Cancel timeout alarm
            if timeout_enabled:
                signal.alarm(0)

    except TimeoutError:
        raise
    except ComputationError:
        raise
    except Exception as e:
        raise ComputationError(f"Algorithm execution failed: {type(e).__name__}: {str(e)}")


def compute_node(db: Session, node_id: str, project_id: str | None = None) -> Tuple[float, Optional[str]]:
    """
    Compute the value of a single node.

    Args:
        db: Database session
        node_id: ID of the node to compute

    Returns:
        Tuple of (computed_value, error_message)
        Error message is None if computation succeeded
    """
    qn = db.query(Node).filter(Node.id == node_id)
    if project_id:
        qn = qn.filter(Node.project_id == project_id)
    node = qn.first()
    if not node:
        return (0.0, f"Node {node_id} not found")

    if node.composite_id:
        value, error, _ = _compute_composite_node_value(db, node)
        if error:
            return (0.0, error)
        if value is None:
            return (0.0, "Composite n'a retourné aucune valeur")
        return (float(value), None)

    # Provider fetch for root nodes (no incoming edges) when enabled
    if node.provider_enabled and (db.query(Edge).filter(Edge.target == node_id).count() == 0):
        try:
            url = node.provider_url
            if not url:
                return (0.0, "Provider enabled but no URL configured")
            timeout = float(node.provider_timeout or 12.0)

            # basic retry with exponential backoff on timeouts / transport errors
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
                    except Exception as e:
                        # other errors: no retry
                        raise e
                assert last_err is not None
                raise last_err

            data = _fetch_with_retries(url, timeout)

            # dot-path extraction with list index support
            value: Any = data
            path = node.provider_json_path or ''
            if path:
                for part in path.split('.'):
                    if part == '':
                        continue
                    if isinstance(value, dict) and part in value:
                        value = value[part]
                    elif isinstance(value, list) and part.isdigit():
                        idx = int(part)
                        try:
                            value = value[idx]
                        except Exception:
                            return (0.0, f"JSON path index out of range: {part} (len={len(value)})")
                    else:
                        avail = list(value.keys()) if isinstance(value, dict) else (f"list(len={len(value)})" if isinstance(value, list) else type(value).__name__)
                        return (0.0, f"JSON path not found: {part} (available: {avail})")
            try:
                fval = float(value)
            except Exception:
                return (0.0, f"Provider value is not numeric: {value}")
            node.provider_last_fetched_at = datetime.utcnow()
            node.provider_last_error = None
            return (fval, None)
        except Exception as e:
            node.provider_last_error = str(e)
            return (0.0, f"Provider error: {type(e).__name__}: {e}")

    if not node.computation_definition:
        return (0.0, "No computation definition provided")

    try:
        # Get dependencies (inputs)
        stmt = select(Edge).where(Edge.target == node_id)
        if project_id:
            stmt = stmt.where(Edge.project_id == project_id)
        dependencies = db.execute(stmt).scalars().all()

        # Build variable context
        variables = {}
        for edge in dependencies:
            qsrc = db.query(Node).filter(Node.id == edge.source)
            if project_id:
                qsrc = qsrc.filter(Node.project_id == project_id)
            source_node = qsrc.first()
            if not source_node:
                return (0.0, f"Dependency node {edge.source} not found")

            # Algorithm-only: use computed value only
            value = source_node.value_computed

            if value is None:
                return (0.0, f"Dependency {source_node.slug} has no computed value")

            variables[source_node.slug] = value

        # Execute the algorithm
        result = execute_algorithm(node.computation_definition, variables)
        return (result, None)

    except (ComputationError, TimeoutError) as e:
        return (0.0, str(e))
    except Exception as e:
        return (0.0, f"Unexpected error: {str(e)}")


def compute_all_nodes(
    db: Session,
    project_id: str | None = None,
    scenario_id: str | None = None
) -> Dict[str, Dict[str, Any]]:
    """
    Compute all computed nodes in the graph in correct dependency order.

    When scenario_id is provided:
    - Overrides are applied to root nodes (API nodes or nodes without dependencies)
    - The graph is computed twice: once for real values, once for scenario values
    - Scenario computation uses override values for root nodes and propagates them

    Args:
        db: Database session
        project_id: Optional project filter
        scenario_id: Optional scenario ID to apply overrides

    Returns:
        Dict mapping node_id to {
            "value": computed_value (scenario if scenario_id, else real),
            "real_value": real_value (from provider or previous computation),
            "scenario_value": scenario_value (with overrides applied),
            "error": error_message (None if success)
        }
    """
    results = {}
    force_full_recompute = os.getenv("FORCE_FULL_COMPUTE_ALL", "").lower() in {"1", "true", "yes"}

    try:
        # Load scenario overrides if scenario_id provided
        overrides_map: Dict[str, ScenarioNodeOverride] = {}
        slug_override_payload: Dict[str, Dict[str, Any]] = {}
        real_root_snapshots: Dict[str, Dict[str, Dict[str, Any]]] = {}
        composite_override_map: Dict[str, Dict[str, Dict[str, Any]]] = {}
        if scenario_id:
            stmt = select(ScenarioNodeOverride).where(
                ScenarioNodeOverride.scenario_id == scenario_id
            )
            overrides = db.execute(stmt).scalars().all()
            overrides_map = {o.node_id: o for o in overrides}
            if overrides_map:
                override_ids = list(overrides_map.keys())
                slug_rows = (
                    db.query(Node.id, Node.slug)
                    .filter(Node.id.in_(override_ids))
                    .all()
                )
                for node_id, slug in slug_rows:
                    if not slug:
                        continue
                    override = overrides_map.get(node_id)
                    if not override:
                        continue
                    # Skip overrides with None values to avoid polluting resolved_overrides
                    if override.override_value is None and (override.mode or "value") == "value":
                        continue
                    payload = {
                        "mode": override.mode or "value",
                        "override_value": override.override_value,
                        "override_code": override.override_code,
                    }
                    slug_override_payload[slug] = payload
                    slug_override_payload[node_id] = payload

            comp_stmt = select(ScenarioCompositeOverride).where(
                ScenarioCompositeOverride.scenario_id == scenario_id
            )
            composite_overrides = db.execute(comp_stmt).scalars().all()
            for override in composite_overrides:
                # Skip overrides with None values to avoid polluting resolved_overrides
                if override.override_value is None and (override.mode or "value") == "value":
                    continue
                payload = {
                    "mode": override.mode or "value",
                    "override_value": override.override_value,
                    "override_code": override.override_code,
                }
                composite_override_map.setdefault(
                    override.composite_node_instance_id, {}
                )[override.internal_id] = payload

        dependency_graph: DependencyGraph = get_dependency_graph(
            db, project_id=project_id
        )
        dependencies = dependency_graph.dependencies
        dependents = dependency_graph.dependents

        # Strip self-loops before topological sort (defensive guard)
        for node_id in list(dependencies.keys()):
            dependencies[node_id].discard(node_id)

        computation_order = topological_sort(dependencies)
        all_nodes = list(computation_order)

        # Also include isolated nodes (no edges at all) that topological_sort misses
        if project_id:
            stmt_all_ids = select(Node.id).where(Node.project_id == project_id)
            all_project_node_ids = set(db.execute(stmt_all_ids).scalars().all())
            computation_set = set(computation_order)
            isolated_ids = [nid for nid in all_project_node_ids if nid not in computation_set]
            if isolated_ids:
                all_nodes = list(computation_order) + isolated_ids

        real_cache_values = scenario_cache.get_all_real_values(project_id)
        scenario_cached_values: Dict[str, Optional[float]] = {}

        if scenario_id:
            scenario_cached_values = scenario_cache.get_scenario_values(
                project_id, scenario_id
            )
            dirty_nodes = scenario_cache.consume_dirty_nodes(
                project_id, scenario_id
            )
            if dirty_nodes:
                nodes_to_recompute = _expand_dependents(dirty_nodes, dependents)
            elif not scenario_cached_values or force_full_recompute:
                nodes_to_recompute = set(all_nodes)
            else:
                nodes_to_recompute = set()
        else:
            nodes_to_recompute = set(all_nodes)

        scenario_computed_values: Dict[str, Optional[float]] = (
            dict(scenario_cached_values) if scenario_id else {}
        )

        real_updates: Dict[str, Optional[float]] = {}
        scenario_updates: Dict[str, Optional[float]] = {}

        for node_id in all_nodes:
            qn = db.query(Node).filter(Node.id == node_id)
            if project_id:
                qn = qn.filter(Node.project_id == project_id)
            node = qn.first()
            if not node:
                continue

            is_root = node_id not in dependencies or len(dependencies[node_id]) == 0

            skip_recompute = False
            if scenario_id:
                if node_id not in nodes_to_recompute and node_id in scenario_cached_values:
                    skip_recompute = True

            if skip_recompute:
                scenario_value = scenario_cached_values.get(node_id)
                real_value = real_cache_values.get(node_id, node.value_computed)
                results[node_id] = {
                    "value": scenario_value,
                    "real_value": real_value,
                    "scenario_value": scenario_value,
                    "error": node.computation_error,
                }
                # Only add to scenario_computed_values if not None
                if scenario_value is not None:
                    scenario_computed_values[node_id] = scenario_value

                if node.composite_id:
                    real_snapshot_cached = composite_root_cache.get_real_snapshot(
                        project_id,
                        node.id,
                    )
                    scenario_snapshot_cached = (
                        composite_root_cache.get_scenario_snapshot(
                            project_id,
                            scenario_id,
                            node.id,
                        )
                        if scenario_id
                        else None
                    )
                    composite_virtual_entries = _build_virtual_composite_results(
                        node.id,
                        real_snapshot_cached,
                        scenario_snapshot_cached,
                        scenario_id,
                    )
                    for virtual_id, payload in composite_virtual_entries.items():
                        results.setdefault(virtual_id, payload["result"])
                        if scenario_id:
                            # Only add to scenario_computed_values if not None
                            scenario_val = payload["scenario_value"]
                            if scenario_val is not None:
                                scenario_computed_values[virtual_id] = scenario_val
                continue

            real_value = None
            error = None

            base_virtual_entries: Dict[str, Dict[str, Any]] = {}
            if node.composite_id:
                real_value, error, root_snapshot_real = _compute_composite_node_value(db, node)
                if root_snapshot_real:
                    logger.info(
                        "[compute_all] composite %s real snapshot keys=%s",
                        node.id,
                        list(root_snapshot_real.keys()),
                    )
                    composite_root_cache.set_real_values(
                        project_id,
                        node.id,
                        root_snapshot_real,
                    )
                    real_root_snapshots[node.id] = root_snapshot_real

                    # IMPORTANT: Add virtual entries to scenario_computed_values NOW
                    # so they are available when computing dependent composites with scenario
                    if scenario_id:
                        base_virtual_entries = _build_virtual_composite_results(
                            node.id,
                            root_snapshot_real,
                            None,
                            None,
                        )
                        for virtual_id, payload in base_virtual_entries.items():
                            # Pre-populate with real values - will be updated with scenario values later
                            # Only add if real_value is not None to avoid polluting scenario_computed_values
                            real_val = payload["real_value"]
                            if real_val is not None:
                                scenario_computed_values[virtual_id] = real_val
                                logger.info(
                                    "[compute_all] Pre-adding virtual entry %s with real_value=%s to scenario_computed_values",
                                    virtual_id,
                                    real_val,
                                )
                else:
                    logger.info(
                        "[compute_all] composite %s produced empty real snapshot",
                        node.id,
                    )
                    base_virtual_entries = _build_virtual_composite_results(
                        node.id,
                        root_snapshot_real,
                        None,
                        None,
                    )
            elif node.computation_definition:
                real_value, error = compute_node(db, node_id, project_id=project_id)
            elif node.provider_enabled:
                real_value = node.value_computed
            else:
                # Plain parameter with a stored value (no formula, no provider)
                real_value = node.value_computed

            if error is None and real_value is not None:
                node.value_computed = real_value
                node.computation_error = None
            else:
                node.computation_error = error

            node.last_computed_at = datetime.utcnow()
            real_updates[node_id] = real_value
            for virtual_id, payload in base_virtual_entries.items():
                real_updates[virtual_id] = payload["real_value"]
                if not scenario_id:
                    logger.info(
                        "[compute_all] base virtual %s value=%s",
                        virtual_id,
                        payload["real_value"],
                    )
                    results[virtual_id] = payload["result"]

            scenario_value = real_value

            if scenario_id:
                composite_virtual_entries: Dict[str, Dict[str, Any]] = {}
                if node.composite_id:
                    scenario_override_value, scenario_override_error, root_snapshot_scenario = _compute_composite_node_value(
                        db,
                        node,
                        slug_override_payload,
                        composite_override_map.get(node.id),
                        scenario_computed_values,
                        scenario_id=scenario_id,
                    )
                    if root_snapshot_scenario:
                        composite_root_cache.set_scenario_values(
                            project_id,
                            scenario_id,
                            node.id,
                            root_snapshot_scenario,
                        )
                    logger.info(
                        "[compute_all] Composite %s returned scenario_override_value=%s, error=%s",
                        node.slug or node.id,
                        scenario_override_value,
                        scenario_override_error,
                    )
                    if scenario_override_error is None and scenario_override_value is not None:
                        scenario_value = scenario_override_value
                    elif scenario_override_error:
                        scenario_value = scenario_override_value or real_value
                    composite_virtual_entries = _build_virtual_composite_results(
                        node.id,
                        real_root_snapshots.get(node.id),
                        root_snapshot_scenario,
                        scenario_id,
                    )

                elif is_root and node_id in overrides_map and not node.composite_id:
                    override = overrides_map[node_id]
                    if override.mode == "formula" and override.override_code:
                        try:
                            code_str = override.override_code.strip()
                            if not code_str.startswith("return "):
                                code_str = f"return {code_str}"
                            algorithm = f"def compute(real_value):\n    {code_str}\n"
                            scenario_value = execute_algorithm(
                                algorithm,
                                {
                                    "real_value": float(real_value)
                                    if real_value is not None
                                    else 0.0
                                },
                            )
                        except Exception:
                            scenario_value = real_value
                    else:
                        scenario_value = override.override_value
                elif node.computation_definition:
                    scenario_variables = {}
                    stmt_deps = select(Edge).where(Edge.target == node_id)
                    if project_id:
                        stmt_deps = stmt_deps.where(Edge.project_id == project_id)
                    node_dependencies = db.execute(stmt_deps).scalars().all()

                    for edge in node_dependencies:
                        qsrc = db.query(Node).filter(Node.id == edge.source)
                        if project_id:
                            qsrc = qsrc.filter(Node.project_id == project_id)
                        source_node = qsrc.first()
                        if not source_node:
                            continue
                        var_key = source_node.slug
                        if edge.source in scenario_computed_values:
                            scenario_variables[var_key] = scenario_computed_values[edge.source]
                        elif source_node.value_computed is not None:
                            scenario_variables[var_key] = source_node.value_computed

                    try:
                        scenario_value = execute_algorithm(
                            node.computation_definition, scenario_variables
                        )
                    except Exception:
                        scenario_value = real_value
                else:
                    scenario_value = real_value

                scenario_updates[node_id] = scenario_value
                # Only add to scenario_computed_values if not None
                if scenario_value is not None:
                    scenario_computed_values[node_id] = scenario_value
                if node.composite_id:
                    logger.info(
                        "[compute_all] Composite %s (%s) scenario_value=%s (real=%s)",
                        node.slug,
                        node_id,
                        scenario_value,
                        real_value,
                    )
                for virtual_id, payload in composite_virtual_entries.items():
                    results[virtual_id] = payload["result"]
                    real_updates[virtual_id] = payload["real_value"]
                    scenario_updates[virtual_id] = payload["scenario_value"]
                    # Only add to scenario_computed_values if not None
                    scenario_val = payload["scenario_value"]
                    if scenario_val is not None:
                        scenario_computed_values[virtual_id] = scenario_val
                    logger.info(
                        "[compute_all] Updating virtual entry %s with scenario_value=%s",
                        virtual_id,
                        payload["scenario_value"],
                    )

            results[node_id] = {
                "value": scenario_value if scenario_id else real_value,
                "real_value": real_value,
                "scenario_value": scenario_value if scenario_id else real_value,
                "error": error,
            }

        db.commit()

        if real_updates:
            scenario_cache.set_real_values(project_id, real_updates)
        if scenario_id and scenario_updates:
            scenario_cache.set_scenario_values(
                project_id, scenario_id, scenario_updates, mark_clean=True
            )

    except CycleDetectedError as e:
        results["_error"] = {"error": str(e)}
    except Exception as e:
        results["_error"] = {"error": f"Computation failed: {str(e)}"}

    return results


def validate_algorithm(algorithm: str) -> Optional[str]:
    """
    Validate an algorithm before saving.

    Args:
        algorithm: The Python algorithm code

    Returns:
        Error message if invalid, None if valid
    """
    try:
        # Sanitize common LLM artifacts before validation
        algorithm = _sanitize_algorithm(algorithm)

        # Try to compile the algorithm
        byte_code = compile_restricted(algorithm, '<string>', 'exec')

        # Check if it defines a 'compute' function
        if 'def compute' not in algorithm:
            return "Algorithm must define a 'compute' function"

        return None

    except SyntaxError as e:
        return f"Syntax error: {str(e)}"
    except Exception as e:
        return f"Validation error: {str(e)}"
def _build_virtual_composite_results(
    composite_node_id: str,
    real_snapshot: Optional[Dict[str, Dict[str, Any]]],
    scenario_snapshot: Optional[Dict[str, Dict[str, Any]]],
    scenario_id: Optional[str],
) -> Dict[str, Dict[str, Any]]:
    entries: Dict[str, Dict[str, Any]] = {}
    if not real_snapshot and not scenario_snapshot:
        return entries
    internal_ids = set()
    if real_snapshot:
        internal_ids.update(real_snapshot.keys())
    if scenario_snapshot:
        internal_ids.update(scenario_snapshot.keys())
    for internal_id in internal_ids:
        real_info = (real_snapshot or {}).get(internal_id, {})
        scenario_info = (scenario_snapshot or {}).get(internal_id, real_info)
        alias_marker = real_info.get("__alias_for") or scenario_info.get("__alias_for")
        if alias_marker:
            continue
        canonical_internal_id = (
            real_info.get("__canonical_internal_id")
            or scenario_info.get("__canonical_internal_id")
            or internal_id
        )
        virtual_key = canonical_internal_id or internal_id
        virtual_id = f"composite::{composite_node_id}::{virtual_key}"
        real_value = real_info.get("value")
        scenario_value = scenario_info.get("value")
        result_payload = {
            "value": scenario_value if scenario_id else real_value,
            "real_value": real_value,
            "scenario_value": scenario_value if scenario_id else real_value,
            "error": scenario_info.get("error") if scenario_id else real_info.get("error"),
        }
        entries[virtual_id] = {
            "result": result_payload,
            "real_value": real_value,
            "scenario_value": result_payload["scenario_value"],
        }
    return entries
