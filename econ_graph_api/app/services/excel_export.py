"""
Excel Export Service - Convert SmartGraph models to Excel workbooks.

Converts the visual model to an Excel file with:
- Parameters sheet: Root nodes (editable inputs)
- Calculations sheet: Intermediate nodes with formulas
- Results sheet: Final output nodes
- Scenarios sheet: Different scenario configurations

All dependencies are preserved as Excel cell references.
"""

import re
import io
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.worksheet import Worksheet
from sqlalchemy.orm import Session

from app.models.node import Node
from app.models.edge import Edge
from app.models.scenario import Scenario, ScenarioNodeOverride


@dataclass
class NodeInfo:
    """Processed node information for Excel export."""
    id: str
    slug: str
    label: str
    unit: str
    value: Optional[float]
    computation_definition: Optional[str]
    category: str  # 'parameter', 'calculation', 'result'
    dependencies: List[str] = field(default_factory=list)  # List of dependency slugs
    excel_cell: str = ""  # Will be filled during export, e.g., "Paramètres!B2"


# Mapping Python functions to Excel equivalents
PYTHON_TO_EXCEL_FUNCTIONS = {
    'sqrt': 'SQRT',
    'pow': 'POWER',
    'max': 'MAX',
    'min': 'MIN',
    'abs': 'ABS',
    'sum': 'SUM',
    'log': 'LN',
    'log10': 'LOG10',
    'exp': 'EXP',
    'floor': 'FLOOR',
    'ceil': 'CEILING',
    'round': 'ROUND',
    'sin': 'SIN',
    'cos': 'COS',
    'tan': 'TAN',
    'asin': 'ASIN',
    'acos': 'ACOS',
    'atan': 'ATAN',
    'sinh': 'SINH',
    'cosh': 'COSH',
    'tanh': 'TANH',
}

# Excel styles
HEADER_FILL = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
HEADER_FONT = Font(color="FFFFFF", bold=True, size=11)
PARAM_FILL = PatternFill(start_color="E8F4FD", end_color="E8F4FD", fill_type="solid")
CALC_FILL = PatternFill(start_color="FFF3E0", end_color="FFF3E0", fill_type="solid")
RESULT_FILL = PatternFill(start_color="E8F5E9", end_color="E8F5E9", fill_type="solid")
THIN_BORDER = Border(
    left=Side(style='thin', color='CCCCCC'),
    right=Side(style='thin', color='CCCCCC'),
    top=Side(style='thin', color='CCCCCC'),
    bottom=Side(style='thin', color='CCCCCC')
)


def _extract_return_expression(computation_def: str) -> Optional[str]:
    """Extract the return expression from a compute function."""
    if not computation_def:
        return None

    # Pattern to find "return <expression>" in the compute function
    # Handle multiline with proper indentation
    lines = computation_def.strip().split('\n')

    for line in lines:
        stripped = line.strip()
        if stripped.startswith('return '):
            return stripped[7:].strip()

    return None


def _convert_python_to_excel_formula(
    expression: str,
    slug_to_cell: Dict[str, str]
) -> str:
    """
    Convert a Python expression to an Excel formula.

    Args:
        expression: Python expression (e.g., "prix * quantite")
        slug_to_cell: Mapping of node slugs to Excel cell references

    Returns:
        Excel formula string (e.g., "=Paramètres!B2*Paramètres!B3")
    """
    if not expression:
        return ""

    formula = expression

    # Replace Python operators with Excel equivalents
    # ** (power) -> ^ in Excel, but better to use POWER function
    formula = re.sub(r'\*\*', '^', formula)

    # Replace Python functions with Excel functions
    for py_func, excel_func in PYTHON_TO_EXCEL_FUNCTIONS.items():
        # Match function calls: func_name(...)
        pattern = rf'\b{py_func}\s*\('
        formula = re.sub(pattern, f'{excel_func}(', formula)

    # Handle math.func() calls (e.g., math.sqrt -> SQRT)
    for py_func, excel_func in PYTHON_TO_EXCEL_FUNCTIONS.items():
        pattern = rf'math\.{py_func}\s*\('
        formula = re.sub(pattern, f'{excel_func}(', formula)

    # Replace variable names with cell references
    # Sort by length (longest first) to avoid partial replacements
    sorted_slugs = sorted(slug_to_cell.keys(), key=len, reverse=True)
    for slug in sorted_slugs:
        cell_ref = slug_to_cell[slug]
        # Use word boundaries to match whole variable names
        pattern = rf'\b{re.escape(slug)}\b'
        formula = re.sub(pattern, cell_ref, formula)

    # Handle Python-style conditionals: "a if condition else b"
    # Convert to Excel IF: IF(condition, a, b)
    # This is a simplified conversion - complex conditionals may need manual adjustment
    if_pattern = r'(.+?)\s+if\s+(.+?)\s+else\s+(.+)'
    match = re.match(if_pattern, formula)
    if match:
        true_val, condition, false_val = match.groups()
        formula = f'IF({condition},{true_val},{false_val})'

    # Add = prefix if not already present
    if not formula.startswith('='):
        formula = '=' + formula

    return formula


def _categorize_nodes(
    nodes: List[Node],
    edges: List[Edge]
) -> Dict[str, List[NodeInfo]]:
    """
    Categorize nodes into parameters, calculations, and results.

    - Parameters: nodes with no incoming edges (root nodes)
    - Results: nodes with no outgoing edges (leaf nodes)
    - Calculations: all other nodes (intermediate)
    """
    node_by_id = {n.id: n for n in nodes}

    # Build incoming and outgoing edge counts
    incoming = {n.id: set() for n in nodes}
    outgoing = {n.id: set() for n in nodes}

    for edge in edges:
        if edge.target in incoming:
            incoming[edge.target].add(edge.source)
        if edge.source in outgoing:
            outgoing[edge.source].add(edge.target)

    categories: Dict[str, List[NodeInfo]] = {
        'parameters': [],
        'calculations': [],
        'results': []
    }

    for node in nodes:
        has_incoming = len(incoming.get(node.id, set())) > 0
        has_outgoing = len(outgoing.get(node.id, set())) > 0

        # Get dependency slugs
        dep_ids = incoming.get(node.id, set())
        dep_slugs = []
        for dep_id in dep_ids:
            dep_node = node_by_id.get(dep_id)
            if dep_node:
                dep_slugs.append(dep_node.slug)

        if not has_incoming:
            category = 'parameter'
            categories['parameters'].append(NodeInfo(
                id=node.id,
                slug=node.slug,
                label=node.label,
                unit=node.unit or '',
                value=node.value_computed,
                computation_definition=node.computation_definition,
                category=category,
                dependencies=dep_slugs
            ))
        elif not has_outgoing:
            category = 'result'
            categories['results'].append(NodeInfo(
                id=node.id,
                slug=node.slug,
                label=node.label,
                unit=node.unit or '',
                value=node.value_computed,
                computation_definition=node.computation_definition,
                category=category,
                dependencies=dep_slugs
            ))
        else:
            category = 'calculation'
            categories['calculations'].append(NodeInfo(
                id=node.id,
                slug=node.slug,
                label=node.label,
                unit=node.unit or '',
                value=node.value_computed,
                computation_definition=node.computation_definition,
                category=category,
                dependencies=dep_slugs
            ))

    return categories


def _setup_sheet_header(ws: Worksheet, title: str, fill: PatternFill):
    """Set up a sheet with headers."""
    headers = ['Variable', 'Unite', 'Valeur']

    # Title row
    ws.merge_cells('A1:C1')
    ws['A1'] = title
    ws['A1'].font = Font(bold=True, size=14)
    ws['A1'].alignment = Alignment(horizontal='center')

    # Header row
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=2, column=col, value=header)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.border = THIN_BORDER
        cell.alignment = Alignment(horizontal='center')

    # Set column widths
    ws.column_dimensions['A'].width = 30
    ws.column_dimensions['B'].width = 15
    ws.column_dimensions['C'].width = 18


def _add_nodes_to_sheet(
    ws: Worksheet,
    nodes: List[NodeInfo],
    start_row: int,
    fill: PatternFill,
    slug_to_cell: Dict[str, str],
    sheet_name: str
) -> int:
    """
    Add nodes to a worksheet.

    Returns the next available row number.
    """
    current_row = start_row

    for node in nodes:
        # Column A: Variable name (label)
        cell_a = ws.cell(row=current_row, column=1, value=node.label)
        cell_a.fill = fill
        cell_a.border = THIN_BORDER

        # Column B: Unit
        cell_b = ws.cell(row=current_row, column=2, value=node.unit)
        cell_b.fill = fill
        cell_b.border = THIN_BORDER

        # Column C: Value or formula
        cell_ref = f'{sheet_name}!C{current_row}'
        slug_to_cell[node.slug] = cell_ref
        node.excel_cell = cell_ref

        cell_c = ws.cell(row=current_row, column=3)
        cell_c.border = THIN_BORDER

        if node.category == 'parameter':
            # Parameters get their direct value
            cell_c.value = node.value if node.value is not None else 0
            cell_c.fill = fill
        else:
            # Calculations and results get formulas (will be set later)
            cell_c.value = node.value if node.value is not None else 0
            cell_c.fill = fill

        current_row += 1

    return current_row


def _apply_formulas(
    wb: Workbook,
    nodes: List[NodeInfo],
    slug_to_cell: Dict[str, str],
    sheet_name: str
):
    """Apply Excel formulas to calculation and result nodes."""
    ws = wb[sheet_name]

    for node in nodes:
        if node.category == 'parameter':
            continue

        # Extract the return expression
        expression = _extract_return_expression(node.computation_definition)
        if not expression:
            continue

        # Convert to Excel formula
        excel_formula = _convert_python_to_excel_formula(expression, slug_to_cell)

        # Find the cell for this node
        if node.excel_cell:
            # Parse the cell reference
            cell_ref = node.excel_cell.split('!')[-1]  # e.g., "C3"
            row = int(re.search(r'\d+', cell_ref).group())

            # Set the formula in column C (value column)
            ws.cell(row=row, column=3).value = excel_formula


def _add_scenarios_sheet(
    wb: Workbook,
    scenarios: List[Scenario],
    overrides: Dict[str, List[ScenarioNodeOverride]],
    node_by_id: Dict[str, Node],
    slug_to_cell: Dict[str, str]
):
    """Add a scenarios comparison sheet."""
    if not scenarios:
        return

    ws = wb.create_sheet("Scenarios")

    # Header
    ws.merge_cells('A1:' + get_column_letter(len(scenarios) + 2) + '1')
    ws['A1'] = "Comparaison des Scenarios"
    ws['A1'].font = Font(bold=True, size=14)
    ws['A1'].alignment = Alignment(horizontal='center')

    # Column headers
    ws.cell(row=2, column=1, value="Variable").font = HEADER_FONT
    ws.cell(row=2, column=1).fill = HEADER_FILL
    ws.cell(row=2, column=2, value="Baseline").font = HEADER_FONT
    ws.cell(row=2, column=2).fill = HEADER_FILL

    for idx, scenario in enumerate(scenarios, 3):
        cell = ws.cell(row=2, column=idx, value=scenario.name)
        cell.font = HEADER_FONT
        cell.fill = PatternFill(
            start_color=scenario.color.replace('#', '') if scenario.color else "4A90D9",
            end_color=scenario.color.replace('#', '') if scenario.color else "4A90D9",
            fill_type="solid"
        )

    # Collect all overridden node IDs
    all_node_ids = set()
    for scenario_overrides in overrides.values():
        for override in scenario_overrides:
            all_node_ids.add(override.node_id)

    # Add rows for each overridden node
    current_row = 3
    for node_id in all_node_ids:
        node = node_by_id.get(node_id)
        if not node:
            continue

        ws.cell(row=current_row, column=1, value=node.label)
        ws.cell(row=current_row, column=2, value=node.value_computed or 0)

        for idx, scenario in enumerate(scenarios, 3):
            scenario_overrides = overrides.get(scenario.id, [])
            override = next((o for o in scenario_overrides if o.node_id == node_id), None)

            if override:
                if override.mode == 'value':
                    ws.cell(row=current_row, column=idx, value=override.override_value or 0)
                else:
                    # Formula mode - show the formula
                    ws.cell(row=current_row, column=idx, value=f"={override.override_code}")
            else:
                # No override - reference baseline
                ws.cell(row=current_row, column=idx, value=node.value_computed or 0)

        current_row += 1

    # Adjust column widths
    ws.column_dimensions['A'].width = 30
    for col in range(2, len(scenarios) + 3):
        ws.column_dimensions[get_column_letter(col)].width = 15


def _add_model_info_sheet(wb: Workbook, project_name: str, node_count: int):
    """Add a model information sheet."""
    ws = wb.create_sheet("A propos")
    ws.sheet_view.showGridLines = False

    ws['A1'] = "SmartGraph - Export Excel"
    ws['A1'].font = Font(bold=True, size=16)

    ws['A3'] = "Modele:"
    ws['B3'] = project_name
    ws['B3'].font = Font(bold=True)

    ws['A4'] = "Variables:"
    ws['B4'] = node_count

    ws['A6'] = "Structure du fichier:"
    ws['A6'].font = Font(bold=True)

    ws['A7'] = "- Parametres"
    ws['B7'] = "Variables d'entree modifiables"

    ws['A8'] = "- Calculs"
    ws['B8'] = "Calculs intermediaires avec formules"

    ws['A9'] = "- Resultats"
    ws['B9'] = "Resultats finaux du modele"

    ws['A11'] = "Conseil:"
    ws['A11'].font = Font(bold=True)
    ws['A12'] = "Modifiez les valeurs dans la feuille 'Parametres' pour voir les resultats se mettre a jour automatiquement."

    ws.column_dimensions['A'].width = 20
    ws.column_dimensions['B'].width = 50


def export_project_to_excel(
    db: Session,
    project_id: str,
    project_name: str
) -> io.BytesIO:
    """
    Export a SmartGraph project to an Excel workbook.

    Args:
        db: Database session
        project_id: ID of the project to export
        project_name: Name of the project

    Returns:
        BytesIO buffer containing the Excel file
    """
    # Load nodes and edges
    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    edges = db.query(Edge).filter(Edge.project_id == project_id).all()

    # Load scenarios and overrides
    scenarios = db.query(Scenario).filter(Scenario.project_id == project_id).all()
    overrides: Dict[str, List[ScenarioNodeOverride]] = {}
    for scenario in scenarios:
        scenario_overrides = db.query(ScenarioNodeOverride).filter(
            ScenarioNodeOverride.scenario_id == scenario.id
        ).all()
        overrides[scenario.id] = scenario_overrides

    node_by_id = {n.id: n for n in nodes}

    # Categorize nodes
    categories = _categorize_nodes(nodes, edges)

    # Create workbook
    wb = Workbook()

    # Remove default sheet
    if 'Sheet' in wb.sheetnames:
        del wb['Sheet']

    # Mapping of slug to Excel cell reference
    slug_to_cell: Dict[str, str] = {}

    # Create Parameters sheet
    ws_params = wb.create_sheet("Parametres")
    _setup_sheet_header(ws_params, "Parametres d'entree", PARAM_FILL)
    next_row = _add_nodes_to_sheet(
        ws_params,
        categories['parameters'],
        start_row=3,
        fill=PARAM_FILL,
        slug_to_cell=slug_to_cell,
        sheet_name="Parametres"
    )

    # Create Calculations sheet
    ws_calc = wb.create_sheet("Calculs")
    _setup_sheet_header(ws_calc, "Calculs intermediaires", CALC_FILL)
    next_row = _add_nodes_to_sheet(
        ws_calc,
        categories['calculations'],
        start_row=3,
        fill=CALC_FILL,
        slug_to_cell=slug_to_cell,
        sheet_name="Calculs"
    )

    # Create Results sheet
    ws_results = wb.create_sheet("Resultats")
    _setup_sheet_header(ws_results, "Resultats", RESULT_FILL)
    next_row = _add_nodes_to_sheet(
        ws_results,
        categories['results'],
        start_row=3,
        fill=RESULT_FILL,
        slug_to_cell=slug_to_cell,
        sheet_name="Resultats"
    )

    # Now apply formulas (after all cells are registered)
    all_nodes = categories['parameters'] + categories['calculations'] + categories['results']

    for node in categories['calculations']:
        _apply_formula_to_node(wb, node, slug_to_cell, "Calculs")

    for node in categories['results']:
        _apply_formula_to_node(wb, node, slug_to_cell, "Resultats")

    # Add scenarios sheet
    _add_scenarios_sheet(wb, scenarios, overrides, node_by_id, slug_to_cell)

    # Add model info sheet
    _add_model_info_sheet(wb, project_name, len(nodes))

    # Save to buffer
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return buffer


def _apply_formula_to_node(
    wb: Workbook,
    node: NodeInfo,
    slug_to_cell: Dict[str, str],
    sheet_name: str
):
    """Apply Excel formula to a single node."""
    if not node.computation_definition:
        return

    # Extract the return expression
    expression = _extract_return_expression(node.computation_definition)
    if not expression:
        return

    # Convert to Excel formula
    excel_formula = _convert_python_to_excel_formula(expression, slug_to_cell)

    # Find the cell for this node
    if node.excel_cell:
        ws = wb[sheet_name]
        # Parse the cell reference
        cell_ref = node.excel_cell.split('!')[-1]  # e.g., "C3"
        row = int(re.search(r'\d+', cell_ref).group())

        # Set the formula in column C (value column)
        ws.cell(row=row, column=3).value = excel_formula
