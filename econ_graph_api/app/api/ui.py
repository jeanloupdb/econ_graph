from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session
from typing import Dict
from app.core.db import get_db
from app.models.node import Node
from app.models.edge import Edge

router = APIRouter(prefix="/ui", tags=["ui"])


@router.get("/theme", response_model=dict)
def get_theme(project: str | None = Query(default=None)):
    """Return UI theme configuration (colors) used by the frontend.

    Optionally scoped by project in the future. For now returns a static
    configuration that the frontend can consume to style nodes, edges,
    and value sections consistently.
    """
    # Static defaults; later we can vary by project if needed
    return {
        "node_status": {
            "observed": {"bg": "#dcfce7", "border": "#86efac", "text": "#14532d"},
            "imposed": {"bg": "#dbeafe", "border": "#93c5fd", "text": "#1e3a8a"},
            "implied": {"bg": "#f3e8ff", "border": "#d8b4fe", "text": "#581c87"},
            "invalid": {"bg": "#fee2e2", "border": "#fca5a5", "text": "#7f1d1d"},
            "unknown": {"bg": "#f4f4f5", "border": "#d4d4d8", "text": "#3f3f46"},
        },
        # Unified tones for graph nodes
        "node_tone": {
            # Palette optimisée pour dark mode (proche de l'ancien design)
            # root (ambre): fond translucide ambre-900/30, bord ambre-700, texte ambre-200
            "root": {"bg": "rgba(120, 53, 15, 0.30)", "border": "#b45309", "text": "#fde68a"},
            # intermediate (bleu): fond bleu-900/30, bord bleu-700, texte bleu-200
            "intermediate": {"bg": "rgba(30, 58, 138, 0.30)", "border": "#1d4ed8", "text": "#bfdbfe"},
            # leaf (vert/émeraude): fond émeraude-900/20, bord émeraude-700, texte émeraude-200
            "leaf": {"bg": "rgba(6, 95, 70, 0.20)", "border": "#047857", "text": "#a7f3d0"},
            # error (rouge): fond rouge-900/30, bord rouge-700, texte rouge-200
            "error": {"bg": "rgba(153, 27, 27, 0.30)", "border": "#b91c1c", "text": "#fecaca"},
        },
        "edge_types": {
            "dependency": {"stroke": "#3b82f6"},
        },
        "value_states": {
            "ok": {"bg": "#ecfeff", "border": "#67e8f9", "text": "#164e63"},
            "out_of_range": {"bg": "#fff7ed", "border": "#fdba74", "text": "#7c2d12"},
            "error": {"bg": "#fef2f2", "border": "#fca5a5", "text": "#7f1d1d"},
            "unknown": {"bg": "#f4f4f5", "border": "#d4d4d8", "text": "#3f3f46"},
        },
    }


@router.get("/node-tones", response_model=dict)
def get_node_tones(project: str | None = Query(default=None), db: Session = Depends(get_db)) -> Dict[str, dict]:
    """Return tone classification for all nodes in a project.

    Tones:
      - error: node has a Python computation error
      - root: no incoming edges
      - leaf: no outgoing edges
      - intermediate: otherwise
    """
    # Load nodes scoped by project (or all if project not specified)
    qn = db.query(Node)
    if project:
        qn = qn.filter(Node.project_id == project)
    nodes = qn.all()

    # Build incoming/outgoing sets from edges
    qe = db.query(Edge)
    if project:
        qe = qe.filter(Edge.project_id == project)
    edges = qe.all()
    has_incoming = {e.target for e in edges}
    has_outgoing = {e.source for e in edges}

    out: Dict[str, dict] = {}
    for n in nodes:
        # Consider both algorithm error and provider error
        if getattr(n, 'computation_error', None) or getattr(n, 'provider_last_error', None):
            tone = 'error'
        else:
            incoming = n.id in has_incoming
            outgoing = n.id in has_outgoing
            if not incoming:
                tone = 'root'
            elif not outgoing:
                tone = 'leaf'
            else:
                tone = 'intermediate'
        out[n.id] = { 'tone': tone }
    return out
