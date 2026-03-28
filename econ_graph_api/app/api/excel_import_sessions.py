"""
Session-based Excel import API (Lot 2).

Flow:
  POST /excel-import/sessions          → upload + qualify (synchronous)
  GET  /excel-import/sessions/{id}     → read session + candidate blocks
  POST /excel-import/sessions/{id}/selection → set import scope
  POST /excel-import/sessions/{id}/commit    → run import, create project
  DELETE /excel-import/sessions/{id}         → cancel
"""

import logging
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.excel_import_session import ExcelImportSession
from app.models.project import Project
from app.models.node import Node
from app.models.edge import Edge
from app.models.user import User
from app.services.excel_import import qualify_workbook, create_project_from_excel
from app.services.computation import compute_all_nodes
from app.api.insights_trigger import schedule_project_insights
from fastapi import BackgroundTasks

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/excel-import", tags=["excel-import"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class SelectionPayload(BaseModel):
    mode: str = "sheet"          # "sheet" | "block" | "full"
    target_ids: list[str]        # block_ids to import


class CommitPayload(BaseModel):
    project_name: Optional[str] = None


def _session_to_dict(s: ExcelImportSession) -> dict:
    """Serialize a session to the API response shape."""
    scan = s.scan_result or {}
    return {
        "id": s.id,
        "status": s.status,
        "file_name": s.file_name,
        "file_size": s.file_size,
        "classification": scan.get("classification"),
        "verdict_message": scan.get("verdict_message"),
        "workbook_summary": scan.get("workbook_summary"),
        "candidate_blocks": scan.get("candidate_blocks", []),
        "recommended_scope": scan.get("recommended_scope"),
        "selected_scope": s.selected_scope,
        "project_id": s.project_id,
        "warnings": scan.get("warnings", []),
        "errors": scan.get("errors", []),
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _cleanup_expired(db: Session):
    """Lazily delete sessions that have passed their expiry."""
    try:
        db.query(ExcelImportSession).filter(
            ExcelImportSession.expires_at < datetime.utcnow()
        ).delete(synchronize_session=False)
    except Exception as e:
        logger.warning(f"Session TTL cleanup failed: {e}")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/sessions")
async def create_session(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a workbook and qualify it synchronously.
    Returns the full session with candidate blocks on the first call —
    no polling required for standard files.
    """
    _cleanup_expired(db)

    # Validate
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Format invalide. Utilisez un fichier .xlsx ou .xls")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, f"Fichier trop volumineux (max {MAX_FILE_SIZE // (1024*1024)} MB)")

    session_id = "imp_" + uuid.uuid4().hex[:8]
    session = ExcelImportSession.new(
        session_id=session_id,
        user_id=current_user.id,
        file_name=file.filename,
        file_size=len(content),
        file_bytes=content,
    )
    db.add(session)
    db.flush()

    # Qualify synchronously — fast mechanical pass
    try:
        scan_result = qualify_workbook(content)
        classification = scan_result.get("classification", "not_suitable")
        session.scan_result = scan_result
        session.status = (
            "qualified_refused" if classification == "not_suitable"
            else "awaiting_selection"
        )
    except Exception as e:
        logger.exception("qualify_workbook failed")
        session.status = "failed"
        session.scan_result = {"errors": [str(e)], "candidate_blocks": [], "warnings": []}

    db.commit()
    return _session_to_dict(session)


@router.get("/sessions/{session_id}")
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _get_owned_session(db, session_id, current_user)
    return _session_to_dict(session)


@router.post("/sessions/{session_id}/selection")
def select_scope(
    session_id: str,
    payload: SelectionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set the import scope chosen by the user."""
    session = _get_owned_session(db, session_id, current_user)

    if session.status not in ("awaiting_selection", "qualified_refused"):
        raise HTTPException(400, f"Session status '{session.status}' does not allow scope selection.")

    session.selected_scope = {
        "mode": payload.mode,
        "target_ids": payload.target_ids,
    }
    session.updated_at = datetime.utcnow()
    db.commit()
    return _session_to_dict(session)


@router.post("/sessions/{session_id}/commit")
def commit_session(
    session_id: str,
    payload: CommitPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Run the actual import using the selected (or recommended) scope.
    Creates a Smart Graph project and returns the result.
    """
    import uuid as _uuid

    session = _get_owned_session(db, session_id, current_user)

    if session.status in ("completed", "importing"):
        raise HTTPException(400, "Session already committed.")
    if session.status == "failed":
        raise HTTPException(400, "Cannot commit a failed session.")
    if not session.file_bytes:
        raise HTTPException(400, "File data no longer available. Please restart the session.")

    # Resolve target sheets from selected scope or fall back to recommended
    target_sheets = _resolve_target_sheets(session)

    project_name = (
        payload.project_name
        or session.file_name.rsplit(".", 1)[0]
        or "Modèle importé"
    )

    session.status = "importing"
    session.updated_at = datetime.utcnow()
    db.flush()

    try:
        structure = create_project_from_excel(
            session.file_bytes,
            project_name,
            max_cells=5000,
            target_sheets=target_sheets,
        )
    except Exception as e:
        session.status = "failed"
        db.commit()
        raise HTTPException(400, f"Échec de l'import : {str(e)}")

    # Create project
    project_id = _uuid.uuid4().hex[:8]
    project = Project(
        id=project_id,
        name=project_name,
        user_id=current_user.id,
        status="completed",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        description=f"Importé depuis Excel : {session.file_name}",
    )
    db.add(project)
    db.flush()

    # Create nodes
    nodes_created = 0
    slug_to_id: dict = {}
    sorted_nodes = sorted(
        structure["nodes"],
        key=lambda n: (0 if n["category"] == "parameter" else 1 if n["category"] == "calculation" else 2),
    )
    for node_data in sorted_nodes:
        node_id = _uuid.uuid4().hex[:8]
        slug_to_id[node_data["slug"]] = node_id
        db.add(Node(
            id=node_id,
            project_id=project_id,
            slug=node_data["slug"],
            label=node_data["label"],
            unit=node_data.get("unit", ""),
            value_computed=node_data.get("value"),
            computation_definition=node_data.get("computation_definition"),
            notes=node_data.get("notes"),
            status="unknown",
            confidence=1.0,
        ))
        nodes_created += 1

    db.flush()

    # Create edges
    edges_created = 0
    for node_data in structure["nodes"]:
        target_id = slug_to_id.get(node_data["slug"])
        if not target_id:
            continue
        for dep_slug in node_data.get("dependencies", []):
            source_id = slug_to_id.get(dep_slug)
            if source_id:
                db.add(Edge(
                    id=f"{source_id}->{target_id}",
                    project_id=project_id,
                    source=source_id,
                    target=target_id,
                    edge_type="dependency",
                ))
                edges_created += 1

    # Update session
    session.status = "completed"
    session.project_id = project_id
    session.file_bytes = None  # Free storage
    session.updated_at = datetime.utcnow()

    db.commit()

    # Background: compute nodes + insights
    try:
        compute_all_nodes(db, project_id=project_id)
    except Exception as e:
        logger.warning(f"Post-import compute failed (non-fatal): {e}")

    schedule_project_insights(db, project_id, current_user.id, background_tasks)

    summary = structure.get("summary", {})

    # Build import guide: key inputs/outputs for the post-import UX
    all_nodes = structure.get("nodes", [])
    key_inputs = [
        {"label": n["label"], "value": n.get("value"), "slug": n["slug"]}
        for n in all_nodes
        if n.get("category") == "parameter" and n.get("value") is not None
    ][:5]
    key_outputs = [
        {"label": n["label"], "value": n.get("value"), "slug": n["slug"]}
        for n in all_nodes
        if n.get("category") == "result"
    ][:3]

    return {
        "session_id": session_id,
        "status": "completed",
        "project_id": project_id,
        "nodes_created": nodes_created,
        "edges_created": edges_created,
        "summary": {
            "parameters": summary.get("parameters", 0),
            "calculations": summary.get("calculations", 0),
            "results": summary.get("results", 0),
        },
        "import_guide": {
            "key_inputs": key_inputs,
            "key_outputs": key_outputs,
        },
    }


@router.delete("/sessions/{session_id}", status_code=204)
def cancel_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _get_owned_session(db, session_id, current_user)
    if session.status in ("completed", "cancelled"):
        return
    session.status = "cancelled"
    session.file_bytes = None
    session.updated_at = datetime.utcnow()
    db.commit()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_owned_session(db: Session, session_id: str, user: User) -> ExcelImportSession:
    s = db.query(ExcelImportSession).filter(ExcelImportSession.id == session_id).first()
    if not s:
        raise HTTPException(404, "Session introuvable")
    if s.user_id != user.id:
        raise HTTPException(403, "Accès refusé")
    if s.expires_at and s.expires_at < datetime.utcnow():
        raise HTTPException(410, "Session expirée. Veuillez recommencer.")
    return s


def _resolve_target_sheets(session: ExcelImportSession) -> list[str] | None:
    """Extract target sheet names from selected_scope or recommended_scope."""
    # User-selected scope takes priority
    if session.selected_scope:
        target_ids = session.selected_scope.get("target_ids", [])
        if target_ids and session.scan_result:
            blocks = session.scan_result.get("candidate_blocks", [])
            sheets = [
                b["source_sheet"] for b in blocks
                if b["block_id"] in target_ids
            ]
            if sheets:
                return sheets

    # Fall back to recommended scope
    if session.scan_result:
        rec = session.scan_result.get("recommended_scope")
        if rec and rec.get("includes"):
            return rec["includes"]

    return None  # Import full workbook
