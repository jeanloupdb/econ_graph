"""
Excel Import Service — "Read Like a Human" Architecture.

Two-pass approach:
  1. MECHANICAL PASS (openpyxl, no AI):  Extract the raw grid and render
     each sheet as a human-readable text table.  This is cheap and fast.
  2. AI PASS (Gemini):  The LLM receives the text tables and produces a
     clean SmartGraph model (parameters → calculations → results) with
     Python formulas, labels, units, and dependency information.

Why this works for *any* Excel:
- The LLM sees the spreadsheet the same way a human would.
- It handles French functions (SOMME, SI, NB.SI), VLOOKUP, INDEX/MATCH,
  merged cells, multi-sheet references, and arbitrary layouts.
- For large files we sample intelligently and let the AI triage.
"""

import io
import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple
import unicodedata

from openpyxl import load_workbook
from openpyxl.utils import get_column_letter

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class SheetSummary:
    """Compact summary of one Excel sheet."""
    name: str
    rows: int
    cols: int
    formula_count: int
    value_count: int
    text_count: int
    grid_text: str          # Human-readable text table
    has_formulas: bool


@dataclass
class ExcelSnapshot:
    """The mechanical extraction result — no AI involved."""
    sheets: List[SheetSummary]
    total_formulas: int
    total_values: int
    total_text: int
    total_sheets: int


# Keep light backward-compat types used by `export.py`
@dataclass
class CellInfo:
    """Minimal cell info for backward compatibility with analysis endpoint."""
    sheet: str
    col: str
    row: int
    address: str
    value: Any
    formula: Optional[str]
    is_formula: bool
    label: Optional[str] = None
    suggested_slug: Optional[str] = None
    suggested_python_expression: Optional[str] = None
    suggested_description: Optional[str] = None
    dependencies: List[str] = field(default_factory=list)


@dataclass
class ExcelAnalysis:
    """Result of Excel file analysis (used by the analyze endpoint)."""
    cells: Dict[str, CellInfo]
    parameters: List[str]
    calculations: List[str]
    results: List[str]
    dependency_graph: Dict[str, List[str]]
    labels: Dict[str, str]


# ---------------------------------------------------------------------------
# PASS 1 — Mechanical extraction  (no AI, no tokens)
# ---------------------------------------------------------------------------

MAX_PREVIEW_ROWS = 60
MAX_PREVIEW_COLS = 20


COL_WIDTH = 40  # Wide enough for most Excel formulas


def _render_sheet_as_text(ws, sheet_name: str, max_rows: int = MAX_PREVIEW_ROWS, max_cols: int = MAX_PREVIEW_COLS) -> Tuple[str, int, int, int]:
    """
    Render a worksheet as a human-readable text table.

    Returns (grid_text, formula_count, value_count, text_count).
    """
    formula_count = 0
    value_count = 0
    text_count = 0

    # Determine actual bounds
    actual_max_row = min(ws.max_row or 1, max_rows)
    actual_max_col = min(ws.max_column or 1, max_cols)

    # Build the grid
    lines = []

    # Header line with column letters
    header_parts = ["   "]  # row number column
    for c in range(1, actual_max_col + 1):
        header_parts.append(f" {get_column_letter(c):>{COL_WIDTH}}")
    lines.append("|".join(header_parts))
    lines.append("-" * len(lines[0]))

    for r in range(1, actual_max_row + 1):
        row_parts = [f"{r:>3}"]
        row_empty = True
        for c in range(1, actual_max_col + 1):
            cell = ws.cell(row=r, column=c)
            if cell.value is None:
                row_parts.append(f" {'':>{COL_WIDTH}}")
            elif isinstance(cell.value, str) and cell.value.startswith('='):
                # Formula cell — show the FULL formula
                formula_count += 1
                formula_display = cell.value[:COL_WIDTH]
                row_parts.append(f" {formula_display:>{COL_WIDTH}}")
                row_empty = False
            elif isinstance(cell.value, (int, float)):
                value_count += 1
                # Format number nicely
                if isinstance(cell.value, float) and cell.value == int(cell.value):
                    display = str(int(cell.value))
                else:
                    display = f"{cell.value:g}"
                row_parts.append(f" {display[:COL_WIDTH]:>{COL_WIDTH}}")
                row_empty = False
            elif isinstance(cell.value, str):
                text_count += 1
                display = cell.value.strip()[:COL_WIDTH]
                row_parts.append(f" {display:>{COL_WIDTH}}")
                row_empty = False
            else:
                # Date or other type
                display = str(cell.value)[:COL_WIDTH]
                row_parts.append(f" {display:>{COL_WIDTH}}")
                row_empty = False

        if not row_empty:
            lines.append("|".join(row_parts))

    # Add truncation notice
    if (ws.max_row or 0) > max_rows:
        lines.append(f"... ({ws.max_row - max_rows} more rows not shown)")
    if (ws.max_column or 0) > max_cols:
        lines.append(f"... ({ws.max_column - max_cols} more columns not shown)")

    grid_text = "\n".join(lines)
    return grid_text, formula_count, value_count, text_count


def extract_snapshot(file_content: bytes) -> ExcelSnapshot:
    """
    PASS 1: Mechanically extract an Excel file into text tables.
    No AI, no tokens. Pure openpyxl.
    """
    wb = load_workbook(io.BytesIO(file_content), data_only=False)
    
    sheets = []
    total_formulas = 0
    total_values = 0
    total_text = 0

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        
        grid_text, f_count, v_count, t_count = _render_sheet_as_text(ws, sheet_name)
        
        total_formulas += f_count
        total_values += v_count
        total_text += t_count

        sheets.append(SheetSummary(
            name=sheet_name,
            rows=ws.max_row or 0,
            cols=ws.max_column or 0,
            formula_count=f_count,
            value_count=v_count,
            text_count=t_count,
            grid_text=grid_text,
            has_formulas=f_count > 0,
        ))

    return ExcelSnapshot(
        sheets=sheets,
        total_formulas=total_formulas,
        total_values=total_values,
        total_text=total_text,
        total_sheets=len(sheets),
    )


# ---------------------------------------------------------------------------
# PASS 2 — AI interpretation
# ---------------------------------------------------------------------------

EXCEL_IMPORT_PROMPT = """Tu es un expert en modélisation financière.

On te donne le contenu d'un fichier Excel, feuille par feuille, sous forme de tableaux texte.
Ton objectif : identifier la STRUCTURE DU MODÈLE et la convertir en un graphe SmartGraph.

SmartGraph a 3 types de nœuds :
- **parameter** : une entrée modifiable (nombre fixe, sans formule)
- **calculation** : un calcul intermédiaire (formule)
- **result** : un résultat final / KPI (formule, pas utilisé par d'autres calculs)

RÈGLES CRITIQUES :
1. Identifie les VARIABLES du modèle, pas chaque cellule individuellement.
   Si un tableau a 12 colonnes "Jan-Déc" avec la même formule, crée UN SEUL nœud (le total ou la formule générique).
2. Donne des noms CLAIRS et BUSINESS en français : "Chiffre d'Affaires", "Marge Brute", pas "Cell B5".
3. Les formules Python doivent utiliser les slugs des dépendances comme variables.
   Ex: `def compute(prix_unitaire, volume): return prix_unitaire * volume`
4. Détecte les unités (€, %, mois, unités) à partir du contexte/labels.
5. IGNORE les cellules de mise en page, titres décoratifs, lignes vides.
6. Si des formules Excel utilisent SOMME, SI, RECHERCHEV etc., traduis L'INTENTION en Python simple.
7. Privilégie les résultats en unités réelles (€, %, mois) plutôt que des scores arbitraires.
8. IMPORTANT : la liste `dependencies` doit contenir EXACTEMENT les slugs utilisés dans la formule.
   N'invente pas de variables non définies dans `nodes`. Si une dépendance n'existe pas, crée le nœud correspondant.
   Si tu ne peux pas relier une formule à des dépendances claires, mets `formula: null` et `value` si disponible.

RÈGLES SPÉCIFIQUES POUR LES FICHIERS COMPTABLES (Journal, COA, P&L) :
9. Si le fichier contient un Journal comptable et un Plan Comptable (COA), c'est un fichier COMPTABLE.
10. Pour un fichier comptable, crée un modèle P&L SIMPLIFIÉ avec maximum 15 nœuds.
11. Structure recommandée pour un P&L :
    - Parameters (entrées) : chaque poste de revenu et charge individuel
    - Calculations : Chiffre d'Affaires Total, Total Charges, Marge Brute
    - Results : Résultat Net
12. CHAQUE parameter DOIT avoir une `value` numérique > 0. Utilise les valeurs du résumé calculé ci-dessous.
13. CHAQUE calculation et result DOIT avoir une `formula` valide avec des dépendances existantes.
14. NE CRÉE PAS de nœuds pour les écritures individuelles du journal. Agrège par poste comptable.
15. Si un résumé "VALEURS CALCULÉES" est fourni, utilise ces valeurs EXACTES pour les parameters.

CONTENU DU FICHIER EXCEL :
{sheets_content}

RETOURNE un JSON STRICT avec cette structure :
{{
  "model_name": "Nom descriptif du modèle",
  "model_description": "Description en une phrase de ce que ce modèle calcule",
  "nodes": [
    {{
      "slug": "chiffre_affaires",
      "label": "Chiffre d'Affaires",
      "type": "parameter|calculation|result",
      "unit": "€",
      "value": 50000,
      "formula": null,
      "dependencies": [],
      "description": "Revenu total des ventes"
    }},
    {{
      "slug": "marge_brute",
      "label": "Marge Brute",
      "type": "calculation",
      "unit": "€",
      "value": null,
      "formula": "chiffre_affaires * taux_marge / 100",
      "dependencies": ["chiffre_affaires", "taux_marge"],
      "description": "Marge après coûts directs"
    }}
  ]
}}

IMPORTANT :
- Pour les "parameter" : `formula` est null, `value` DOIT être un nombre > 0 (utilise les valeurs calculées).
- Pour "calculation" et "result" : `formula` est une expression Python valide utilisant les slugs des dépendances. `value` peut être la valeur calculée si connue, sinon null.
- `dependencies` liste les slugs des nœuds dont ce nœud dépend.
- Les slugs doivent être en snake_case ASCII.
- NE RETOURNE QUE LE JSON, rien d'autre.
"""


def _build_sheets_content(snapshot: ExcelSnapshot, business_summary_text: str = "") -> str:
    """Build the text content to send to the AI."""
    parts = []

    for sheet in snapshot.sheets:
        header = f"=== Feuille \"{sheet.name}\" ({sheet.rows} lignes × {sheet.cols} colonnes"
        if sheet.formula_count > 0:
            header += f", {sheet.formula_count} formules"
        header += ") ==="

        parts.append(header)
        parts.append(sheet.grid_text)
        parts.append("")

    if business_summary_text:
        parts.append(business_summary_text)
        parts.append("")

    return "\n".join(parts)


def ai_interpret_excel(snapshot: ExcelSnapshot, business_summary_text: str = "") -> Dict[str, Any]:
    """
    PASS 2: Send the text tables to the AI and get back a SmartGraph model.
    """
    from app.api.ai.shared import configure_gemini, GEMINI_MODEL, clean_json_response
    import google.generativeai as genai

    configure_gemini()
    model = genai.GenerativeModel(GEMINI_MODEL)

    sheets_content = _build_sheets_content(snapshot, business_summary_text=business_summary_text)
    prompt = EXCEL_IMPORT_PROMPT.format(sheets_content=sheets_content)

    logger.info(f"Sending Excel interpretation prompt ({len(prompt)} chars, {snapshot.total_sheets} sheets)")

    response = model.generate_content(
        prompt,
        generation_config={"response_mime_type": "application/json"}
    )

    text_resp = clean_json_response(response.text)
    ai_result = json.loads(text_resp)

    logger.info(f"AI identified {len(ai_result.get('nodes', []))} nodes in model '{ai_result.get('model_name', '?')}'")

    return ai_result


# ---------------------------------------------------------------------------
# Build SmartGraph structure from AI output
# ---------------------------------------------------------------------------

def _ensure_unique_slugs(nodes: List[Dict]) -> List[Dict]:
    """Ensure all slugs are unique, propagating renames to formulas and dependencies."""
    seen: Set[str] = set()
    renames: Dict[str, str] = {}  # old_slug -> new_slug

    for node in nodes:
        slug = node.get("slug", "node")
        base = slug
        counter = 1
        original = slug
        while slug in seen:
            slug = f"{base}_{counter}"
            counter += 1
        if slug != original:
            renames[original] = slug
        node["slug"] = slug
        seen.add(slug)

    # Propagate renames to dependencies and formulas
    if renames:
        for node in nodes:
            node["dependencies"] = [
                renames.get(d, d) for d in node.get("dependencies", [])
            ]
            formula = node.get("formula")
            if formula:
                for old, new in renames.items():
                    formula = re.sub(rf"\b{re.escape(old)}\b", new, formula)
                node["formula"] = formula

    return nodes


_STOPWORDS = {"de", "des", "du", "la", "le", "les", "aux", "d", "l"}


def _strip_accents(value: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", value) if not unicodedata.combining(c)
    )


def _normalize_label(value: str, drop_stopwords: bool = False) -> str:
    cleaned = _strip_accents(value)
    cleaned = re.sub(r"[^a-zA-Z0-9\\s]", " ", cleaned)
    tokens = [t for t in cleaned.lower().split() if t]
    if drop_stopwords:
        tokens = [t for t in tokens if t not in _STOPWORDS]
    return " ".join(tokens)


def _should_skip_value_sheet(sheet_name: str) -> bool:
    lowered = sheet_name.strip().lower()
    return lowered in {"coa", "chart", "plan comptable", "accounts"}


def _extract_label_value_map(file_content: bytes, *, formula_only: bool) -> Dict[str, float]:
    """
    Build a best-effort mapping from label text -> numeric value.
    If formula_only=True, only use formula cells (computed values).
    If formula_only=False, only use raw (non-formula) cells.
    """
    wb_formula = load_workbook(io.BytesIO(file_content), data_only=False)
    wb_values = load_workbook(io.BytesIO(file_content), data_only=True)
    label_map: Dict[str, float] = {}

    for sheet_name in wb_formula.sheetnames:
        if _should_skip_value_sheet(sheet_name):
            continue
        ws_formula = wb_formula[sheet_name]
        ws_values = wb_values[sheet_name]
        for row in ws_formula.iter_rows(max_row=ws_formula.max_row or 1, max_col=ws_formula.max_column or 1):
            for cell in row:
                is_formula = isinstance(cell.value, str) and cell.value.startswith("=")
                if formula_only and not is_formula:
                    continue
                if not formula_only and is_formula:
                    continue

                if is_formula:
                    # For formula cells, try data_only cached value
                    value_cell = ws_values.cell(row=cell.row, column=cell.column).value
                else:
                    # For raw cells, use the value directly
                    value_cell = cell.value

                if not isinstance(value_cell, (int, float)):
                    continue

                label = None
                if cell.column > 1:
                    left = ws_formula.cell(row=cell.row, column=cell.column - 1).value
                    if isinstance(left, str) and left.strip() and not str(left).startswith("="):
                        label = left
                if not label and cell.row > 1:
                    above = ws_formula.cell(row=cell.row - 1, column=cell.column).value
                    if isinstance(above, str) and above.strip() and not str(above).startswith("="):
                        label = above

                if label:
                    norm = _normalize_label(label)
                    norm_wo = _normalize_label(label, drop_stopwords=True)
                    if norm and norm not in label_map:
                        label_map[norm] = float(value_cell)
                    if norm_wo and norm_wo not in label_map:
                        label_map[norm_wo] = float(value_cell)

    return label_map


def _extract_formula_dependencies(formula: str, slug_set: Set[str]) -> Tuple[Set[str], Set[str]]:
    tokens = set(re.findall(r"\b[a-zA-Z_][a-zA-Z0-9_]*\b", formula))
    reserved = {
        "sum", "min", "max", "abs", "round",
        "if", "else", "for", "in", "and", "or", "not",
        "True", "False", "None",
    }
    deps = {t for t in tokens if t in slug_set}
    unknown = {t for t in tokens if t not in reserved and t not in slug_set}
    return deps, unknown


def _replace_label_refs(formula: str, label_to_slug: Dict[str, str]) -> str:
    updated = formula
    # Replace longer labels first to avoid partial replacements
    # Use word boundaries to avoid replacing inside slugs (e.g., "Loyer" inside "loyer_annuel")
    for label, slug in sorted(label_to_slug.items(), key=lambda x: len(x[0]), reverse=True):
        if not label:
            continue
        # Only replace if not already part of a slug (surrounded by word chars/underscores)
        pattern = r"(?<![a-zA-Z0-9_])" + re.escape(label) + r"(?![a-zA-Z0-9_])"
        updated = re.sub(pattern, slug, updated, flags=re.IGNORECASE)
    return updated


def _extract_journal_sums(file_content: bytes) -> Dict[str, Tuple[float, float]]:
    """
    Extract debit/credit sums from a 'Journal' sheet by Description.
    Returns: normalized_label -> (debit_sum, credit_sum)
    """
    wb = load_workbook(io.BytesIO(file_content), data_only=True)
    if "Journal" not in wb.sheetnames:
        return {}
    ws = wb["Journal"]

    # Map headers to columns
    headers = {}
    for cell in ws[1]:
        if not isinstance(cell.value, str):
            continue
        key = _normalize_label(cell.value)
        headers[key] = cell.column

    def _find_col(candidates: List[str]) -> Optional[int]:
        for name in candidates:
            if name in headers:
                return headers[name]
        return None

    col_desc = _find_col(["description", "libelle", "libellé"])
    col_debit = _find_col(["debit", "debit (eur)", "débit"])
    col_credit = _find_col(["credit", "crédit"])

    if not col_desc or (not col_debit and not col_credit):
        return {}

    sums: Dict[str, Tuple[float, float]] = {}
    for row in ws.iter_rows(min_row=2, max_row=ws.max_row or 1):
        desc_cell = row[col_desc - 1] if col_desc else None
        if not desc_cell or not isinstance(desc_cell.value, str):
            continue
        label_norm = _normalize_label(desc_cell.value)
        if not label_norm:
            continue

        debit = 0.0
        credit = 0.0
        if col_debit:
            val = row[col_debit - 1].value
            if isinstance(val, (int, float)):
                debit = float(val)
        if col_credit:
            val = row[col_credit - 1].value
            if isinstance(val, (int, float)):
                credit = float(val)

        d, c = sums.get(label_norm, (0.0, 0.0))
        sums[label_norm] = (d + debit, c + credit)

    return sums


def _extract_journal_account_sums(file_content: bytes) -> Dict[int, Tuple[float, float]]:
    """
    Extract debit/credit sums from a 'Journal' sheet by Account number.
    Returns: account_number -> (debit_sum, credit_sum)
    """
    wb = load_workbook(io.BytesIO(file_content), data_only=True)
    if "Journal" not in wb.sheetnames:
        return {}
    ws = wb["Journal"]

    headers = {}
    for cell in ws[1]:
        if not isinstance(cell.value, str):
            continue
        key = _normalize_label(cell.value)
        headers[key] = cell.column

    def _find_col(candidates: List[str]) -> Optional[int]:
        for name in candidates:
            if name in headers:
                return headers[name]
        return None

    col_account = _find_col(["account", "compte"])
    col_debit = _find_col(["debit", "debit (eur)", "débit"])
    col_credit = _find_col(["credit", "crédit"])

    if not col_account or (not col_debit and not col_credit):
        return {}

    sums: Dict[int, Tuple[float, float]] = {}
    for row in ws.iter_rows(min_row=2, max_row=ws.max_row or 1):
        acc_cell = row[col_account - 1]
        acc_val = acc_cell.value
        if isinstance(acc_val, float):
            acc_val = int(acc_val)
        if not isinstance(acc_val, int):
            continue

        debit = 0.0
        credit = 0.0
        if col_debit:
            val = row[col_debit - 1].value
            if isinstance(val, (int, float)):
                debit = float(val)
        if col_credit:
            val = row[col_credit - 1].value
            if isinstance(val, (int, float)):
                credit = float(val)

        d, c = sums.get(acc_val, (0.0, 0.0))
        sums[acc_val] = (d + debit, c + credit)

    return sums


def _extract_coa_mapping(file_content: bytes) -> Dict[str, Tuple[int, Optional[str]]]:
    """
    Extract COA mapping: normalized account name -> (account_number, normal_side)
    """
    wb = load_workbook(io.BytesIO(file_content), data_only=True)
    if "COA" not in wb.sheetnames:
        return {}
    ws = wb["COA"]

    headers = {}
    for cell in ws[1]:
        if not isinstance(cell.value, str):
            continue
        headers[_normalize_label(cell.value)] = cell.column

    def _find_col(candidates: List[str]) -> Optional[int]:
        for name in candidates:
            if name in headers:
                return headers[name]
        return None

    col_account = _find_col(["account", "compte"])
    col_name = _find_col(["name", "nom"])
    col_normal = _find_col(["normal"])

    if not col_account or not col_name:
        return {}

    mapping: Dict[str, Tuple[int, Optional[str]]] = {}
    for row in ws.iter_rows(min_row=2, max_row=ws.max_row or 1):
        acc_val = row[col_account - 1].value
        name_val = row[col_name - 1].value
        if isinstance(acc_val, float):
            acc_val = int(acc_val)
        if not isinstance(acc_val, int) or not isinstance(name_val, str):
            continue
        normal = None
        if col_normal:
            nval = row[col_normal - 1].value
            if isinstance(nval, str) and nval.strip():
                normal = nval.strip().lower()
        mapping[_normalize_label(name_val)] = (acc_val, normal)

    return mapping


def _compute_business_summary(file_content: bytes) -> Tuple[Dict[str, float], str]:
    """
    Pre-compute P&L / balance values from Journal + COA.
    Returns (value_map, formatted_text_for_prompt).
    value_map: normalized_label -> balance value (always positive, meaningful)
    formatted_text: human-readable P&L summary to include in the AI prompt
    """
    acc_sums = _extract_journal_account_sums(file_content)
    if not acc_sums:
        return {}, ""

    wb = load_workbook(io.BytesIO(file_content), data_only=True)
    coa_sheet = None
    for name in ("COA", "Plan Comptable", "Accounts", "Chart"):
        if name in wb.sheetnames:
            coa_sheet = wb[name]
            break
    if not coa_sheet:
        return {}, ""

    # Find COA column indices
    headers: Dict[str, int] = {}
    for cell in coa_sheet[1]:
        if isinstance(cell.value, str):
            headers[cell.value.strip().lower()] = cell.column

    col_acc = headers.get("account") or headers.get("compte")
    col_name = headers.get("name") or headers.get("nom")
    col_type = headers.get("type")
    col_normal = headers.get("normal")

    if not col_acc or not col_name:
        return {}, ""

    # Build account info list
    accounts: list = []
    for row in coa_sheet.iter_rows(min_row=2, max_row=coa_sheet.max_row or 1):
        acc_val = row[col_acc - 1].value
        name_val = row[col_name - 1].value
        if acc_val is None or not isinstance(name_val, str):
            continue
        if isinstance(acc_val, float):
            acc_val = int(acc_val)
        if not isinstance(acc_val, int):
            continue
        typ = row[col_type - 1].value.strip() if col_type and row[col_type - 1].value else ""
        normal = row[col_normal - 1].value.strip().lower() if col_normal and row[col_normal - 1].value else ""
        accounts.append((acc_val, name_val.strip(), typ.lower(), normal))

    value_map: Dict[str, float] = {}
    revenues: list = []
    expenses: list = []
    assets: list = []
    liabilities: list = []
    total_revenue = 0.0
    total_expenses = 0.0

    for acc, name, typ, normal in accounts:
        d, c = acc_sums.get(acc, (0.0, 0.0))
        if d == 0 and c == 0:
            continue

        # Compute balance based on normal side
        if normal == "debit":
            balance = d - c
        elif normal == "credit":
            balance = c - d
        else:
            balance = d - c

        if balance == 0:
            continue

        abs_balance = abs(balance)

        # Store in value_map with multiple key variants for fuzzy matching
        norm_name = _normalize_label(name)
        norm_name_wo = _normalize_label(name, drop_stopwords=True)
        value_map[norm_name] = abs_balance
        if norm_name_wo and norm_name_wo != norm_name:
            value_map[norm_name_wo] = abs_balance

        if typ == "revenue":
            revenues.append((name, abs_balance))
            total_revenue += abs_balance
        elif typ == "expense":
            expenses.append((name, abs_balance))
            total_expenses += abs_balance
        elif typ == "asset":
            assets.append((name, abs_balance))
        elif typ in ("liability", "equity"):
            liabilities.append((name, abs_balance))

    # Add computed aggregates and common aliases
    net_result = total_revenue - total_expenses
    salary_gross = sum(v for n, v in expenses if any(k in n.lower() for k in ("personnel",)) and "charge" not in n.lower())
    social_charges = sum(v for n, v in expenses if "charges sociales" in n.lower())
    payroll_total = salary_gross + social_charges

    if total_revenue > 0:
        value_map[_normalize_label("Chiffre d'Affaires")] = total_revenue
        value_map[_normalize_label("Chiffre d'Affaires", drop_stopwords=True)] = total_revenue
        value_map["chiffre affaires"] = total_revenue
        value_map["ca"] = total_revenue
        value_map["total revenus"] = total_revenue
        value_map["revenus totaux"] = total_revenue
        value_map["total revenue"] = total_revenue
    if total_expenses > 0:
        value_map["total charges"] = total_expenses
        value_map["charges totales"] = total_expenses
        value_map["total depenses"] = total_expenses
        value_map["total expenses"] = total_expenses
    if net_result != 0:
        value_map["resultat net"] = abs(net_result)
        value_map["resultat exercice"] = abs(net_result)
        value_map["benefice net"] = abs(net_result)
        value_map["resultat"] = abs(net_result)
    if total_revenue > 0 and total_expenses > 0:
        cogs = sum(v for n, v in expenses if "achat" in n.lower())
        value_map["marge brute"] = max(total_revenue - cogs, 0)
    if salary_gross > 0:
        value_map["salaires"] = salary_gross
        value_map["salaires bruts"] = salary_gross
    if payroll_total > 0:
        value_map["charges salariales"] = payroll_total
        value_map["charges salariales totales"] = payroll_total
        value_map["masse salariale"] = payroll_total
        value_map["cout personnel"] = payroll_total
        value_map["couts personnel"] = payroll_total

    # Build formatted text for prompt
    lines = ["\n=== VALEURS CALCULÉES À PARTIR DU JOURNAL (source fiable) ==="]
    lines.append("Ces valeurs sont les totaux réels extraits du journal comptable.\n")

    if revenues:
        lines.append("REVENUS:")
        for name, val in revenues:
            lines.append(f"  - {name}: {val:,.0f} €")
        lines.append(f"  → TOTAL REVENUS: {total_revenue:,.0f} €\n")

    if expenses:
        lines.append("CHARGES:")
        for name, val in expenses:
            lines.append(f"  - {name}: {val:,.0f} €")
        lines.append(f"  → TOTAL CHARGES: {total_expenses:,.0f} €\n")

    lines.append(f"RÉSULTAT NET: {net_result:,.0f} €")

    if assets:
        lines.append("\nACTIFS SIGNIFICATIFS:")
        for name, val in assets:
            lines.append(f"  - {name}: {val:,.0f} €")

    formatted_text = "\n".join(lines)
    return value_map, formatted_text


def _fuzzy_lookup(label: str, value_maps: List[Dict[str, float]]) -> Optional[float]:
    """
    Try multiple normalization strategies to find a value for a label.
    Returns the first match found, or None.
    """
    # Strategy 1: exact normalized match
    norm = _normalize_label(label)
    norm_wo = _normalize_label(label, drop_stopwords=True)
    for vmap in value_maps:
        if not vmap:
            continue
        if norm in vmap:
            return vmap[norm]
        if norm_wo and norm_wo in vmap:
            return vmap[norm_wo]

    # Strategy 2: slug-based match (replace _ with space)
    slug_norm = label.replace("_", " ").lower().strip()
    slug_norm = _strip_accents(slug_norm)
    for vmap in value_maps:
        if not vmap:
            continue
        if slug_norm in vmap:
            return vmap[slug_norm]

    # Strategy 3: partial match — check if the key IS the label (containment)
    # Only match if the shorter string is at least 60% of the longer string length
    # to avoid false positives like "materiel" matching "depreciation materiel"
    for vmap in value_maps:
        if not vmap:
            continue
        for key, val in vmap.items():
            if not key or len(key) < 5:
                continue
            shorter = min(len(key), len(norm))
            longer = max(len(key), len(norm))
            if shorter / longer < 0.6:
                continue
            if key in norm or norm in key:
                return val

    return None


def _ai_result_to_structure(
    ai_result: Dict[str, Any],
    project_name: str,
    label_value_map: Optional[Dict[str, float]] = None,
    raw_value_map: Optional[Dict[str, float]] = None,
    business_summary_map: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """Convert AI result to the SmartGraph creation structure."""
    nodes_data = ai_result.get("nodes", [])
    nodes_data = _ensure_unique_slugs(nodes_data)

    slug_set = {n["slug"] for n in nodes_data}
    nodes = []
    missing_param_slugs: Set[str] = set()

    label_value_map = label_value_map or {}
    raw_value_map = raw_value_map or {}
    business_summary_map = business_summary_map or {}

    label_to_slug = {n.get("label", "").strip(): n.get("slug", "") for n in nodes_data if n.get("label") and n.get("slug")}
    journal_sums = raw_value_map.get("__journal_sums__") if isinstance(raw_value_map, dict) else None
    journal_account_sums = raw_value_map.get("__journal_account_sums__") if isinstance(raw_value_map, dict) else None
    coa_map = raw_value_map.get("__coa_map__") if isinstance(raw_value_map, dict) else None
    has_business_summary = bool(business_summary_map)

    for node_def in nodes_data:
        slug = node_def["slug"]
        label = node_def.get("label", slug.replace("_", " ").title())
        node_type = node_def.get("type", "parameter")
        unit = node_def.get("unit", "")
        value = node_def.get("value")
        formula = node_def.get("formula")
        description = node_def.get("description", "")
        deps = [d for d in node_def.get("dependencies", []) if d in slug_set and d != slug]

        # Map type to category
        if formula:
            category = "result" if node_type == "result" else "calculation"
        else:
            category = "parameter"

        # For parameters: validate/resolve value using business summary as primary source
        if category == "parameter":
            # Accept AI value if it looks reasonable (> 0)
            if isinstance(value, (int, float)) and value > 0:
                pass  # keep AI-provided value
            else:
                # Try business_summary_map first (most reliable)
                resolved = _fuzzy_lookup(label, [business_summary_map])
                if resolved is None:
                    resolved = _fuzzy_lookup(slug, [business_summary_map])
                # Try journal sums
                if resolved is None and journal_sums:
                    base_label = re.sub(r"\s*\(journal\)\s*$", "", label, flags=re.IGNORECASE)
                    jkey = _normalize_label(base_label)
                    if jkey in journal_sums:
                        d, c = journal_sums[jkey]
                        resolved = d if d > 0 else c
                # Try COA + account sums
                if resolved is None and coa_map and journal_account_sums:
                    key = _normalize_label(label)
                    if key in coa_map:
                        acc, normal = coa_map[key]
                        if acc in journal_account_sums:
                            d, c = journal_account_sums[acc]
                            if normal == "debit":
                                resolved = d
                            elif normal == "credit":
                                resolved = c
                            else:
                                resolved = d if d > 0 else c
                # Try other maps as last resort
                if resolved is None:
                    resolved = _fuzzy_lookup(label, [label_value_map])

                if isinstance(resolved, (int, float)) and resolved > 0:
                    value = resolved

        # Build computation_definition
        computation_definition = None
        if formula:
            formula = _replace_label_refs(formula, label_to_slug)
            formula = re.sub(r"\bsum\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)", r"\1", formula)
            formula_deps, unknown = _extract_formula_dependencies(formula, slug_set)
            if slug in formula_deps:
                formula = re.sub(rf"\b{re.escape(slug)}\b", "0", formula)
                formula_deps.discard(slug)

            if formula_deps:
                deps = sorted(formula_deps)

            if unknown:
                # Try to resolve unknowns: drop them from formula if they're not real deps
                resolvable_unknowns = set()
                for unk in unknown:
                    # Check if it's a known Python builtin or math concept
                    if unk in {"sum", "min", "max", "abs", "round", "len", "int", "float"}:
                        resolvable_unknowns.add(unk)
                real_unknowns = unknown - resolvable_unknowns
                if real_unknowns:
                    missing_param_slugs.update(real_unknowns)
                    deps = sorted(set(deps).union(real_unknowns))

            if not deps and formula:
                # Formula with no deps: try to get a static value instead
                norm = _normalize_label(label)
                fallback_value = _fuzzy_lookup(label, [business_summary_map, label_value_map])
                if isinstance(fallback_value, (int, float)) and fallback_value > 0:
                    value = fallback_value
                    formula = None
                    category = "parameter"

        if formula and deps:
            params = ", ".join(sorted(set(deps)))
            computation_definition = f"def compute({params}):\n    return {formula}"
        elif formula:
            computation_definition = f"def compute():\n    return {formula}"
        elif isinstance(value, (int, float)):
            computation_definition = f"def compute():\n    return {value}"

        node = {
            "slug": slug,
            "label": label,
            "unit": unit,
            "value": value if isinstance(value, (int, float)) else None,
            "computation_definition": computation_definition,
            "category": category,
            "notes": description,
            "dependencies": deps,
        }
        nodes.append(node)

    # Create missing parameter nodes inferred from formulas
    for missing_slug in sorted(missing_param_slugs):
        if missing_slug in slug_set:
            continue
        label = missing_slug.replace("_", " ").title()
        value = _fuzzy_lookup(label, [business_summary_map, label_value_map])
        if value is None:
            value = _fuzzy_lookup(missing_slug, [business_summary_map])
        node = {
            "slug": missing_slug,
            "label": label,
            "unit": "",
            "value": value if isinstance(value, (int, float)) else None,
            "computation_definition": f"def compute():\n    return {value}" if isinstance(value, (int, float)) else None,
            "category": "parameter",
            "notes": "Paramètre ajouté automatiquement (dépendance manquante).",
            "dependencies": [],
        }
        nodes.append(node)

    # POST-PROCESSING: Remove parameters with no value (they'd show as 0)
    if has_business_summary:
        valid_slugs = set()
        filtered_nodes = []
        for n in nodes:
            if n["category"] == "parameter" and n["value"] is None:
                logger.warning(f"Removing parameter '{n['slug']}' with no value (would display as 0)")
                continue
            filtered_nodes.append(n)
            valid_slugs.add(n["slug"])

        # Clean up dependencies referencing removed nodes
        for n in filtered_nodes:
            n["dependencies"] = [d for d in n["dependencies"] if d in valid_slugs]
            if n["computation_definition"] and n["dependencies"]:
                params = ", ".join(sorted(set(n["dependencies"])))
                formula_part = n["computation_definition"].split("return ", 1)
                if len(formula_part) == 2:
                    n["computation_definition"] = f"def compute({params}):\n    return {formula_part[1]}"

        nodes = filtered_nodes

    return {
        "project_name": ai_result.get("model_name", project_name),
        "nodes": nodes,
        "summary": {
            "total_cells": sum(1 for n in nodes),
            "parameters": sum(1 for n in nodes if n["category"] == "parameter"),
            "calculations": sum(1 for n in nodes if n["category"] == "calculation"),
            "results": sum(1 for n in nodes if n["category"] == "result"),
        },
    }


# ---------------------------------------------------------------------------
# Public API — called by export.py endpoints
# ---------------------------------------------------------------------------

def analyze_excel(file_content: bytes, max_cells: int = 500) -> ExcelAnalysis:
    """
    Quick analysis for the preview endpoint.
    Uses mechanical extraction only (no AI) for speed.
    """
    snapshot = extract_snapshot(file_content)

    # Build minimal CellInfo objects for backward compat
    cells: Dict[str, CellInfo] = {}
    labels: Dict[str, str] = {}
    parameters: List[str] = []
    calculations: List[str] = []
    results: List[str] = []

    wb = load_workbook(io.BytesIO(file_content), data_only=False)

    cell_count = 0
    all_referenced: Set[str] = set()  # cells that appear in formulas
    formula_cells: Dict[str, List[str]] = {}  # address -> dependencies

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        for row in ws.iter_rows(max_row=min(ws.max_row or 1, MAX_PREVIEW_ROWS),
                                max_col=min(ws.max_column or 1, MAX_PREVIEW_COLS)):
            for cell in row:
                if cell_count >= max_cells:
                    break
                if cell.value is None:
                    continue

                col_letter = get_column_letter(cell.column)
                address = f"{sheet_name}!{col_letter}{cell.row}"

                is_formula = isinstance(cell.value, str) and cell.value.startswith('=')

                if not is_formula and not isinstance(cell.value, (int, float)):
                    continue

                # Simple label detection: look left
                label = None
                if cell.column > 1:
                    left_cell = ws.cell(row=cell.row, column=cell.column - 1)
                    if left_cell.value and isinstance(left_cell.value, str) and not str(left_cell.value).startswith('='):
                        label = str(left_cell.value).strip()[:50]

                if not label and cell.row > 1:
                    above_cell = ws.cell(row=cell.row - 1, column=cell.column)
                    if above_cell.value and isinstance(above_cell.value, str) and not str(above_cell.value).startswith('='):
                        label = str(above_cell.value).strip()[:50]

                # Extract references from formulas
                deps: List[str] = []
                if is_formula:
                    refs = re.findall(r'[A-Z]+\d+', cell.value.replace('$', '').upper())
                    for ref in refs:
                        full_ref = f"{sheet_name}!{ref}"
                        deps.append(full_ref)
                        all_referenced.add(full_ref)

                formula_cells[address] = deps

                cell_info = CellInfo(
                    sheet=sheet_name,
                    col=col_letter,
                    row=cell.row,
                    address=address,
                    value=cell.value if not is_formula else None,
                    formula=cell.value if is_formula else None,
                    is_formula=is_formula,
                    label=label,
                    dependencies=deps,
                )
                cells[address] = cell_info
                if label:
                    labels[address] = label
                cell_count += 1

    # Categorize
    for address, ci in cells.items():
        if not ci.is_formula and not ci.dependencies:
            parameters.append(address)
        elif address in all_referenced:
            calculations.append(address)
        elif ci.is_formula:
            results.append(address)
        else:
            parameters.append(address)

    # Try to get computed values
    try:
        wb_data = load_workbook(io.BytesIO(file_content), data_only=True)
        for address, ci in cells.items():
            if ci.is_formula:
                sheet_name, col_row = address.split('!')
                ws_data = wb_data[sheet_name]
                ci.value = ws_data[col_row].value
    except Exception:
        pass

    return ExcelAnalysis(
        cells=cells,
        parameters=parameters,
        calculations=calculations,
        results=results,
        dependency_graph=formula_cells,
        labels=labels,
    )


def qualify_workbook(file_content: bytes) -> dict:
    """
    Qualify a workbook before import: compute candidate blocks (one per sheet),
    a suitability verdict, and a recommended scope.
    No AI — pure mechanical pass. Used by the session-based import flow.
    """
    snapshot = extract_snapshot(file_content)

    candidate_blocks = []
    for sheet in snapshot.sheets:
        total_cells = sheet.formula_count + sheet.value_count + sheet.text_count
        if total_cells == 0:
            continue

        formula_density = sheet.formula_count / max(total_cells, 1)

        # Sheet type classification
        if sheet.formula_count == 0:
            sheet_type = "decorative" if sheet.text_count > sheet.value_count * 2 else "raw_data"
        elif formula_density > 0.4:
            sheet_type = "calculation"
        elif formula_density > 0.15:
            sheet_type = "mixed"
        else:
            sheet_type = "input"

        # Interest score: how valuable is this sheet as a model block
        interest = 0
        if sheet.has_formulas:
            interest += 40
        interest += min(30, int(formula_density * 100))
        if sheet.text_count > 5:
            interest += 15  # has labels → nodes will be well-named
        estimated_nodes = min(sheet.formula_count + sheet.value_count, 50)
        if 3 <= estimated_nodes <= 40:
            interest += 15
        interest = min(100, interest)

        warnings = []
        if sheet_type == "raw_data":
            warnings.append("Cette feuille contient principalement des données brutes.")
        if estimated_nodes > 40:
            warnings.append("Feuille complexe — une simplification sera appliquée à l'import.")

        candidate_blocks.append({
            "block_id": f"block_{re.sub(r'[^a-z0-9]', '_', sheet.name.lower())}",
            "label": sheet.name,
            "source_sheet": sheet.name,
            "sheet_type": sheet_type,
            "estimated_node_count": estimated_nodes,
            "formula_count": sheet.formula_count,
            "value_count": sheet.value_count,
            "interest_score": interest,
            "is_recommended": False,
            "warnings": warnings,
        })

    # Mark the best block as recommended
    formula_blocks = [b for b in candidate_blocks if b["formula_count"] > 0]
    if formula_blocks:
        best = max(formula_blocks, key=lambda b: b["interest_score"])
        best["is_recommended"] = True

    # Overall classification
    overall_warnings = []
    errors = []

    if snapshot.total_formulas == 0:
        classification = "not_suitable"
        verdict_message = "Ce classeur ne contient que des données brutes sans formules."
        errors.append("Aucune formule détectée — impossible de construire un graphe causal.")
    elif not formula_blocks:
        classification = "not_suitable"
        verdict_message = "Aucune feuille n'a de structure de modèle exploitable."
        errors.append("Les formules détectées sont trop isolées pour construire un graphe.")
    elif snapshot.total_formulas > 300 or len(formula_blocks) > 3:
        classification = "partially_importable"
        verdict_message = f"{len(formula_blocks)} feuille(s) exploitable(s) — import recommandé par bloc."
        overall_warnings.append("Un import complet créerait un graphe difficile à lire. Sélectionnez un bloc.")
    else:
        classification = "importable"
        verdict_message = "Ce classeur est adapté à Smart Graph."

    workbook_summary = {
        "sheet_count": snapshot.total_sheets,
        "total_formulas": snapshot.total_formulas,
        "total_values": snapshot.total_values,
        "formula_blocks_count": len(formula_blocks),
        "verdict": classification,
    }

    # Recommended scope
    recommended_scope = None
    if formula_blocks:
        best_block = max(formula_blocks, key=lambda b: b["interest_score"])
        excludes = [b["source_sheet"] for b in candidate_blocks if b["block_id"] != best_block["block_id"]]
        recommended_scope = {
            "kind": "sheet",
            "target_id": best_block["block_id"],
            "reason": f"Meilleur équilibre qualité/lisibilité ({best_block['formula_count']} formules).",
            "includes": [best_block["source_sheet"]],
            "excludes": excludes[:3],
        }

    return {
        "classification": classification,
        "verdict_message": verdict_message,
        "workbook_summary": workbook_summary,
        "candidate_blocks": candidate_blocks,
        "recommended_scope": recommended_scope,
        "warnings": overall_warnings,
        "errors": errors,
    }


def enhance_analysis_with_ai(analysis: ExcelAnalysis) -> ExcelAnalysis:
    """
    Enrich analysis labels using AI (lightweight).
    Works on the ExcelAnalysis object to improve the preview.
    """
    # For the preview/analyze endpoint, we don't do heavy AI work.
    # The real AI work happens during import via create_project_from_excel.
    return analysis


def create_project_from_excel(
    file_content: bytes,
    project_name: str,
    max_cells: int = 100,
    target_sheets: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Main entry point: parse Excel and generate SmartGraph project structure.

    Two-pass approach:
    1. Mechanically extract the grid as text tables (openpyxl).
    2. Send to AI for semantic interpretation.

    Returns a dict with 'nodes', 'summary', 'project_name'.
    """
    logger.info(f"Starting Excel import for project '{project_name}'")

    # PASS 0: Pre-compute business summary from Journal + COA
    business_summary_map, business_summary_text = _compute_business_summary(file_content)
    if business_summary_map:
        logger.info(f"Business summary: {len(business_summary_map)} value entries computed from Journal+COA")

    # PASS 1: Mechanical extraction
    snapshot = extract_snapshot(file_content)

    # Filter to target sheets if a specific scope was selected
    if target_sheets:
        filtered = [s for s in snapshot.sheets if s.name in target_sheets]
        if filtered:
            snapshot = ExcelSnapshot(
                sheets=filtered,
                total_formulas=sum(s.formula_count for s in filtered),
                total_values=sum(s.value_count for s in filtered),
                total_text=sum(s.text_count for s in filtered),
                total_sheets=len(filtered),
            )

    logger.info(
        f"Mechanical pass: {snapshot.total_sheets} sheets, "
        f"{snapshot.total_formulas} formulas, "
        f"{snapshot.total_values} values, "
        f"{snapshot.total_text} text cells"
    )

    if snapshot.total_formulas == 0 and snapshot.total_values == 0:
        raise ValueError("Le fichier Excel ne contient aucune donnée exploitable.")

    if snapshot.total_formulas == 0:
        raise ValueError(
            "Ce fichier Excel ne contient que des listes de données sans formules. "
            "SmartGraph est conçu pour modéliser des relations causales (formules, dépendances). "
            "Ajoutez des formules Excel ou décrivez les relations que vous souhaitez modéliser."
        )

    # PASS 2: AI interpretation (include business summary in prompt)
    try:
        ai_result = ai_interpret_excel(snapshot, business_summary_text=business_summary_text)
    except Exception as e:
        logger.exception(f"AI interpretation failed: {e}")
        raise ValueError(
            f"L'IA n'a pas pu interpréter ce fichier Excel. "
            f"Essayez avec un fichier plus simple ou décrivez votre modèle dans le chat."
        )

    # Build structure
    label_value_map = _extract_label_value_map(file_content, formula_only=True)
    raw_value_map = _extract_label_value_map(file_content, formula_only=False)
    journal_sums = _extract_journal_sums(file_content)
    if journal_sums:
        raw_value_map["__journal_sums__"] = journal_sums
    journal_account_sums = _extract_journal_account_sums(file_content)
    if journal_account_sums:
        raw_value_map["__journal_account_sums__"] = journal_account_sums
    coa_map = _extract_coa_mapping(file_content)
    if coa_map:
        raw_value_map["__coa_map__"] = coa_map
    structure = _ai_result_to_structure(
        ai_result, project_name, label_value_map, raw_value_map,
        business_summary_map=business_summary_map,
    )

    if not structure["nodes"]:
        raise ValueError("L'IA n'a trouvé aucune variable exploitable dans ce fichier.")

    logger.info(
        f"AI import complete: {structure['summary']['parameters']} params, "
        f"{structure['summary']['calculations']} calcs, "
        f"{structure['summary']['results']} results"
    )

    return structure
