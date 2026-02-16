"""
Export/Import API endpoints for SmartGraph projects.

Provides endpoints for exporting and importing projects to/from various formats.
"""

import logging
import re
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
import urllib.parse

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.project import Project
from app.models.node import Node
from app.models.edge import Edge
from app.models.user import User
from app.models.project_collaborator import ProjectCollaborator
from app.services.excel_export import export_project_to_excel
from app.services.excel_import import create_project_from_excel, analyze_excel, enhance_analysis_with_ai
from app.services.computation import compute_all_nodes
from app.api.insights_trigger import schedule_project_insights

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/projects", tags=["export"])


class ExcelAnalysisResponse(BaseModel):
    """Response for quick Excel analysis (preview before import)."""
    filename: str
    total_cells: int
    formula_count: int
    sheet_count: int
    parameters_count: int
    calculations_count: int
    results_count: int
    detected_kpis: list[str]  # Labels of result cells (likely KPIs)
    sample_labels: list[str]  # Sample of detected labels
    estimated_nodes: int  # How many nodes would be created
    can_import: bool  # True if file is valid for import
    warning: Optional[str] = None  # Warning message if file is large
    
    # Suitability assessment
    suitability_score: int  # 0-100, how suitable is this file for SmartGraph
    suitability_level: str  # "excellent", "good", "limited", "not_suitable"
    suitability_message: str  # User-friendly explanation
    insights: list[str]  # List of insights about the file structure


class ExcelImportResponse(BaseModel):
    """Response for Excel import."""
    project_id: str
    project_name: str
    nodes_created: int
    edges_created: int
    summary: dict


def _get_project_with_access(db: Session, project_id: str, user: User, required_role: str = "viewer") -> Project:
    """Get project with access check."""
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    # Owner always has access
    if p.user_id == user.id:
        return p

    # Check collaborator
    collab = db.query(ProjectCollaborator).filter(
        ProjectCollaborator.project_id == project_id,
        ProjectCollaborator.user_id == user.id
    ).first()

    if not collab:
        raise HTTPException(status_code=403, detail="Not authorized to access this project")

    if required_role == "editor" and collab.role != "editor":
        raise HTTPException(status_code=403, detail="Editor access required")

    return p


@router.get("/{project_id}/export/excel")
async def export_project_excel(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export a project to Excel format.

    Returns an .xlsx file with:
    - Parameters sheet: Input values that can be modified
    - Calculations sheet: Intermediate calculations with formulas
    - Results sheet: Final output values
    - Scenarios sheet: Comparison of different scenarios

    All formulas are converted from Python to Excel format,
    maintaining the dependency chain so changes propagate correctly.
    """
    # Check access (viewer can export)
    project = _get_project_with_access(db, project_id, current_user, required_role="viewer")

    # Generate Excel file
    try:
        excel_buffer = export_project_to_excel(db, project_id, project.name)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate Excel file: {str(e)}"
        )

    # Sanitize filename
    safe_name = "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in project.name)
    filename = f"{safe_name}_SmartGraph.xlsx"

    # URL encode for Content-Disposition header
    encoded_filename = urllib.parse.quote(filename)

    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


@router.post("/analyze-excel", response_model=ExcelAnalysisResponse)
async def analyze_excel_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Quick analysis of an Excel file before import.
    
    Returns statistics about the file structure without creating a project.
    Use this to preview what the import will create and let the user decide.
    
    Args:
        file: Excel file (.xlsx)
        
    Returns:
        Analysis with cell counts, detected KPIs, and import feasibility
    """
    # Validate file type
    if not file.filename or not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload an Excel file (.xlsx)"
        )
    
    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to read file: {str(e)}"
        )
    
    # Quick analysis (limit to 500 cells for preview, we're not creating yet)
    try:
        analysis = analyze_excel(content, max_cells=500)
    except Exception as e:
        logger.exception("Failed to analyze Excel file")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to analyze Excel file: {str(e)}"
        )

    # Enrich analysis with AI to improve label understanding and graph translation
    try:
        analysis = enhance_analysis_with_ai(analysis)
    except Exception as e:
        logger.warning(f"AI enrichment skipped: {e}")
    
    # Count formulas
    formula_count = sum(1 for cell in analysis.cells.values() if cell.is_formula)
    
    # Get sheet names from cells
    sheet_names = set(cell.sheet for cell in analysis.cells.values())
    
    # Get KPI labels (results are likely the main KPIs)
    def _normalize_kpi_label(label: str) -> str:
        # Strip period-like suffixes (e.g., "Marge M1" -> "Marge")
        cleaned = re.sub(r"\s+M\d+\b", "", label, flags=re.IGNORECASE).strip()
        return cleaned or label

    detected_kpis = []
    for address in analysis.results[:10]:  # Inspect more, then de-duplicate
        cell = analysis.cells.get(address)
        if cell and cell.label:
            detected_kpis.append(_normalize_kpi_label(cell.label))
        elif cell:
            detected_kpis.append(f"Cell {cell.col}{cell.row}")
    # De-duplicate while preserving order and limit to 5
    deduped = []
    for label in detected_kpis:
        if label not in deduped:
            deduped.append(label)
    detected_kpis = deduped[:5]
    
    # Get sample of all labels
    sample_labels = list(analysis.labels.values())[:10]
    
    # Estimated nodes = parameters + calculations + results
    estimated_nodes = len(analysis.parameters) + len(analysis.calculations) + len(analysis.results)
    
    # Warning for large files
    warning = None
    if len(analysis.cells) >= 500:
        warning = f"Fichier volumineux détecté. L'import sera limité aux {estimated_nodes} variables les plus pertinentes."
    
    # === SUITABILITY ASSESSMENT ===
    insights = []
    suitability_score = 0
    
    # Factor 1: Has formulas? (most important - 40 points)
    if formula_count > 0:
        formula_ratio = formula_count / max(len(analysis.cells), 1)
        suitability_score += min(40, int(formula_ratio * 100))
        insights.append(f"✓ {formula_count} formule(s) détectée(s) - relations calculables")
    else:
        insights.append("⚠ Aucune formule détectée - ce fichier ne contient que des données brutes")
    
    # Factor 2: Has calculation chain? (30 points)
    if len(analysis.calculations) > 0:
        suitability_score += 30
        insights.append(f"✓ {len(analysis.calculations)} calcul(s) intermédiaire(s) - structure de modèle détectée")
    elif len(analysis.results) > 0:
        suitability_score += 15
        insights.append(f"✓ {len(analysis.results)} résultat(s) final(aux) identifié(s)")
    else:
        insights.append("⚠ Aucun résultat final - toutes les cellules sont des paramètres d'entrée")
    
    # Factor 3: Has meaningful labels? (15 points)
    labeled_count = len(analysis.labels)
    if labeled_count > 5:
        suitability_score += 15
        insights.append(f"✓ {labeled_count} libellés détectés - nommage automatique possible")
    elif labeled_count > 0:
        suitability_score += 7
        insights.append(f"○ {labeled_count} libellé(s) - nommage partiel")
    else:
        insights.append("○ Pas de libellés détectés - les variables seront nommées par leur adresse")
    
    # Factor 4: Reasonable complexity (15 points)
    if 5 <= estimated_nodes <= 50:
        suitability_score += 15
        insights.append(f"✓ Complexité idéale : {estimated_nodes} variables")
    elif estimated_nodes < 5:
        suitability_score += 5
        insights.append(f"○ Modèle simple : seulement {estimated_nodes} variables")
    else:
        suitability_score += 10
        insights.append(f"○ Modèle complexe : {estimated_nodes} variables (simplification recommandée)")
    
    # Determine suitability level and message
    if formula_count == 0:
        suitability_level = "not_suitable"
        suitability_message = (
            "Ce fichier Excel ne contient que des listes de données sans formules. "
            "SmartGraph est conçu pour modéliser des relations causales (formules, dépendances). "
            "Pour convertir ce fichier, ajoutez des formules Excel ou décrivez les relations que vous souhaitez modéliser."
        )
        can_import = False  # Don't allow import of formula-less files
    elif suitability_score >= 70:
        suitability_level = "excellent"
        suitability_message = (
            "Ce fichier est parfaitement adapté à SmartGraph ! "
            f"Il contient {formula_count} formule(s) et une structure de modèle claire."
        )
    elif suitability_score >= 45:
        suitability_level = "good"
        suitability_message = (
            "Ce fichier peut être converti en SmartGraph. "
            "Certaines informations pourront nécessiter des ajustements manuels."
        )
    else:
        suitability_level = "limited"
        suitability_message = (
            "Ce fichier a une utilité limitée pour SmartGraph. "
            "Envisagez d'ajouter des formules pour définir les relations entre variables."
        )
    
    return ExcelAnalysisResponse(
        filename=file.filename or "unknown.xlsx",
        total_cells=len(analysis.cells),
        formula_count=formula_count,
        sheet_count=len(sheet_names),
        parameters_count=len(analysis.parameters),
        calculations_count=len(analysis.calculations),
        results_count=len(analysis.results),
        detected_kpis=detected_kpis,
        sample_labels=sample_labels,
        estimated_nodes=estimated_nodes,
        can_import=can_import if formula_count == 0 else estimated_nodes > 0,
        warning=warning,
        suitability_score=suitability_score,
        suitability_level=suitability_level,
        suitability_message=suitability_message,
        insights=insights
    )

@router.post("/import/excel", response_model=ExcelImportResponse)
async def import_excel_to_project(
    file: UploadFile = File(...),
    project_name: Optional[str] = Form(None),
    max_cells: int = Form(100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None,
):
    """
    Import an Excel file and create a new SmartGraph project.

    The Excel file is analyzed to:
    - Extract cells with values and formulas
    - Identify dependencies between cells
    - Categorize into parameters, calculations, and results
    - Convert Excel formulas to Python computation definitions

    Args:
        file: Excel file (.xlsx)
        project_name: Optional name for the project (defaults to filename)
        max_cells: Maximum number of cells to process (default 100)

    Returns:
        Project information with created nodes and edges count
    """
    # Validate file type
    if not file.filename or not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload an Excel file (.xlsx)"
        )

    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to read file: {str(e)}"
        )

    # Generate project name if not provided
    if not project_name:
        project_name = file.filename.rsplit('.', 1)[0] if file.filename else "Imported Model"

    # Parse Excel and generate structure
    try:
        structure = create_project_from_excel(content, project_name, max_cells)
    except Exception as e:
        logger.exception("Failed to parse Excel file")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse Excel file: {str(e)}"
        )

    # Create project
    project_id = str(uuid.uuid4())[:8]
    project = Project(
        id=project_id,
        name=project_name,
        user_id=current_user.id,
        status="completed",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        description=f"Imported from Excel: {file.filename}"
    )
    db.add(project)
    db.flush()

    # Create nodes
    nodes_created = 0
    slug_to_id: dict = {}

    # Sort nodes: parameters first, then calculations, then results
    sorted_nodes = sorted(
        structure['nodes'],
        key=lambda n: (
            0 if n['category'] == 'parameter' else
            1 if n['category'] == 'calculation' else 2
        )
    )

    for node_data in sorted_nodes:
        node_id = str(uuid.uuid4())[:8]
        slug_to_id[node_data['slug']] = node_id

        node = Node(
            id=node_id,
            project_id=project_id,
            slug=node_data['slug'],
            label=node_data['label'],
            unit=node_data.get('unit', ''),
            value_computed=node_data.get('value'),
            computation_definition=node_data.get('computation_definition'),
            notes=node_data.get('notes'),
            status='unknown',
            confidence=1.0,
        )
        db.add(node)
        nodes_created += 1

    db.flush()

    # Create edges based on dependencies
    edges_created = 0
    for node_data in structure['nodes']:
        target_id = slug_to_id.get(node_data['slug'])
        if not target_id:
            continue

        for dep_slug in node_data.get('dependencies', []):
            source_id = slug_to_id.get(dep_slug)
            if source_id:
                edge_id = f"{source_id}->{target_id}"
                edge = Edge(
                    id=edge_id,
                    project_id=project_id,
                    source=source_id,
                    target=target_id,
                    edge_type='dependency',
                )
                db.add(edge)
                edges_created += 1

    db.commit()

    # Compute all node values (topological order)
    try:
        compute_all_nodes(db, project_id=project_id)
        logger.info(f"Computed all node values for project '{project_name}'")
    except Exception as e:
        logger.warning(f"Graph computation after import failed (non-fatal): {e}")

    schedule_project_insights(db, project_id, current_user.id, background_tasks)

    logger.info(
        f"Created project '{project_name}' from Excel: "
        f"{nodes_created} nodes, {edges_created} edges"
    )

    return ExcelImportResponse(
        project_id=project_id,
        project_name=project_name,
        nodes_created=nodes_created,
        edges_created=edges_created,
        summary=structure['summary']
    )
