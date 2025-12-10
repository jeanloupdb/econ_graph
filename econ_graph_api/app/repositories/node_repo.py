from sqlalchemy.orm import Session
from app.models.node import Node, Status
from typing import Optional


def to_model(payload) -> Node:
    """Convert a Pydantic schema to a SQLAlchemy model."""
    slug_value = (getattr(payload, 'slug', '') or '').strip()
    n = Node(
        slug=slug_value,
        label=payload.label,
        unit=payload.unit,
        notes=getattr(payload, 'notes', None),
        project_id=getattr(payload, 'project_id', None) or 'default',
        composite_id=getattr(payload, 'composite_id', None),
        status=payload.status or "unknown",
        confidence=payload.confidence or 1.0,
        # Computation fields (algorithm-only)
        value_computed=payload.value_computed if hasattr(payload, 'value_computed') else None,
        computation_definition=payload.computation_definition if hasattr(payload, 'computation_definition') else None,
        last_computed_at=payload.last_computed_at if hasattr(payload, 'last_computed_at') else None,
        computation_error=payload.computation_error if hasattr(payload, 'computation_error') else None,
        # Provider fields
        provider_enabled=getattr(payload, 'provider_enabled', None) or False,
        provider_type=getattr(payload, 'provider_type', None) or 'http_json' if getattr(payload, 'provider_enabled', None) else None,
        provider_url=getattr(payload, 'provider_url', None),
        provider_json_path=getattr(payload, 'provider_json_path', None),
        provider_timeout=getattr(payload, 'provider_timeout', None),
        provider_cache_ttl=getattr(payload, 'provider_cache_ttl', None),
        provider_last_fetched_at=getattr(payload, 'provider_last_fetched_at', None),

        provider_last_error=getattr(payload, 'provider_last_error', None),
        # UI Position
        pos_x=getattr(payload, 'pos_x', None),
        pos_y=getattr(payload, 'pos_y', None),
    )
    node_id = getattr(payload, 'id', None)
    if node_id:
        n.id = node_id
    # Plausible range removed from API surface (kept in DB, unused)
    return n


def in_range(node: Node) -> Optional[bool]:
    """Check if node value is within plausible range."""
    if node.value_computed is None or node.plausible_min is None or node.plausible_max is None:
        return None
    return node.plausible_min <= node.value_computed <= node.plausible_max


def create(db: Session, payload, project_id: str | None = None):
    """Create a new node (optionally scoped to project_id override)."""
    n = to_model(payload)
    if project_id:
        n.project_id = project_id
    db.add(n)
    db.flush()
    return n


def update(db: Session, node: Node, payload):
    """Update an existing node."""
    data = payload.model_dump(exclude_unset=True)
    if "slug" in data and isinstance(data["slug"], str):
        data["slug"] = data["slug"].strip()
    # Ignore plausible_range updates (feature disabled)
    if "plausible_range" in data:
        data.pop("plausible_range", None)
    for k, v in data.items():
        if hasattr(node, k):
            setattr(node, k, v)
    db.flush()
    return node
