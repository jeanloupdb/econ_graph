from __future__ import annotations

import io
import json
import mimetypes
import re
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4
from xml.etree import ElementTree

from app.services.smgp import load_smgp_document


MAX_WIZARD_ATTACHMENT_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_EXCERPT_CHARS = 2400
TEXT_EXTENSIONS = {".txt", ".md", ".csv", ".json", ".yaml", ".yml", ".xml"}
SUPPORTED_WIZARD_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".xlsx",
    ".xls",
    ".csv",
    ".txt",
    ".md",
    ".json",
    ".yaml",
    ".yml",
    ".xml",
    ".smgp",
}


class WizardDocumentError(Exception):
    """Raised when the uploaded wizard document cannot be analyzed."""


@dataclass
class WizardDocumentAnalysis:
    id: str
    file_name: str
    file_kind: str
    mime_type: str | None
    size_bytes: int
    summary: str
    excerpt: str | None
    prompt_hints: list[str]
    warnings: list[str]
    created_at: str


def analyze_wizard_document(
    *,
    file_name: str,
    content: bytes,
    mime_type: str | None = None,
) -> WizardDocumentAnalysis:
    if not file_name:
        raise WizardDocumentError("Nom de fichier manquant.")
    if len(content) > MAX_WIZARD_ATTACHMENT_SIZE:
        raise WizardDocumentError(
            f"Fichier trop volumineux (max {MAX_WIZARD_ATTACHMENT_SIZE // (1024 * 1024)} MB)."
        )

    extension = Path(file_name).suffix.lower()
    inferred_mime = mime_type or mimetypes.guess_type(file_name)[0]

    try:
        if extension == ".pdf":
            summary, excerpt, prompt_hints, warnings = _analyze_pdf(content)
            file_kind = "pdf"
        elif extension == ".docx":
            summary, excerpt, prompt_hints, warnings = _analyze_docx(content)
            file_kind = "docx"
        elif extension in {".xlsx", ".xls"}:
            summary, excerpt, prompt_hints, warnings = _analyze_excel(content)
            file_kind = "excel"
        elif extension == ".smgp":
            summary, excerpt, prompt_hints, warnings = _analyze_smgp(content)
            file_kind = "smgp"
        elif extension in TEXT_EXTENSIONS:
            summary, excerpt, prompt_hints, warnings = _analyze_textual(file_name, content)
            file_kind = extension.lstrip(".") or "text"
        else:
            raise WizardDocumentError(
                f"Format non supporté pour le wizard: {extension or 'inconnu'}."
            )
    except WizardDocumentError:
        raise
    except Exception as exc:  # pragma: no cover - defensive fallback
        raise WizardDocumentError(f"Impossible d'analyser {file_name}: {exc}") from exc

    return WizardDocumentAnalysis(
        id=f"wdoc_{uuid4().hex[:10]}",
        file_name=file_name,
        file_kind=file_kind,
        mime_type=inferred_mime,
        size_bytes=len(content),
        summary=summary,
        excerpt=excerpt,
        prompt_hints=prompt_hints,
        warnings=warnings,
        created_at=datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
    )


def format_wizard_document_context(attachments: list[Any] | None) -> str:
    if not attachments:
        return ""

    rendered: list[str] = []
    for index, attachment in enumerate(attachments[:5], start=1):
        summary = _coerce_text(_attachment_value(attachment, "summary"))
        excerpt = _coerce_text(_attachment_value(attachment, "excerpt"))
        prompt_hints = _attachment_value(attachment, "prompt_hints", [])
        warnings = _attachment_value(attachment, "warnings", [])
        file_name = _coerce_text(_attachment_value(attachment, "file_name", f"Document {index}"))
        file_kind = _coerce_text(_attachment_value(attachment, "file_kind", "document"))

        lines = [
            f"Document {index}: {file_name} ({file_kind})",
            f"Résumé: {summary}",
        ]
        if prompt_hints:
            lines.append("Indices exploitables: " + "; ".join(str(h).strip() for h in prompt_hints[:4] if str(h).strip()))
        if excerpt:
            lines.append("Extrait utile:\n" + excerpt)
        if warnings:
            lines.append("Limites: " + "; ".join(str(w).strip() for w in warnings[:2] if str(w).strip()))
        rendered.append("\n".join(lines))

    return (
        "## DOCUMENTS JOINTS\n"
        "Tu dois t'appuyer sur ces documents comme contexte métier prioritaire.\n"
        "Ne recopie pas le document mot à mot: synthétise-le et transforme-le en hypothèses ou variables de modèle.\n\n"
        + "\n\n".join(rendered)
    )


def _analyze_pdf(content: bytes) -> tuple[str, str | None, list[str], list[str]]:
    try:
        import pypdf
    except ModuleNotFoundError as exc:
        raise WizardDocumentError("Le support PDF n'est pas disponible sur ce serveur.") from exc

    reader = pypdf.PdfReader(io.BytesIO(content))
    extracted_pages: list[str] = []
    for page in reader.pages[:8]:
        text = page.extract_text() or ""
        if text.strip():
            extracted_pages.append(text.strip())

    full_text = "\n\n".join(extracted_pages)
    if not full_text.strip():
        raise WizardDocumentError("PDF lisible mais sans texte exploitable.")

    summary = (
        f"PDF de {len(reader.pages)} page(s) avec contenu textuel extrait. "
        "À utiliser pour récupérer définitions, contraintes, hypothèses et indicateurs métier."
    )
    excerpt = _truncate_text(_normalize_text(full_text))
    prompt_hints = [
        "Identifier les objectifs, hypothèses et chiffres mentionnés explicitement.",
        "Réutiliser le vocabulaire métier du document dans le brief final.",
    ]
    warnings = []
    return summary, excerpt, prompt_hints, warnings


def _analyze_docx(content: bytes) -> tuple[str, str | None, list[str], list[str]]:
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            xml_bytes = archive.read("word/document.xml")
    except KeyError as exc:
        raise WizardDocumentError("Le fichier DOCX ne contient pas de document principal lisible.") from exc
    except zipfile.BadZipFile as exc:
        raise WizardDocumentError("Le fichier DOCX est corrompu ou invalide.") from exc

    root = ElementTree.fromstring(xml_bytes)
    namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    texts = [node.text for node in root.findall(".//w:t", namespace) if node.text and node.text.strip()]
    full_text = "\n".join(texts)
    if not full_text.strip():
        raise WizardDocumentError("DOCX lisible mais sans texte exploitable.")

    summary = (
        "Document Word avec texte structuré. "
        "À utiliser pour récupérer objectifs, exigences fonctionnelles et règles métier."
    )
    excerpt = _truncate_text(_normalize_text(full_text))
    prompt_hints = [
        "Extraire les termes métier et les contraintes formulées noir sur blanc.",
        "Transformer les exigences en paramètres, calculs et résultats attendus.",
    ]
    warnings = []
    return summary, excerpt, prompt_hints, warnings


def _analyze_excel(content: bytes) -> tuple[str, str | None, list[str], list[str]]:
    try:
        from app.services.excel_import import extract_snapshot, qualify_workbook
    except ModuleNotFoundError as exc:
        raise WizardDocumentError("Le support Excel n'est pas disponible sur ce serveur.") from exc

    qualification = qualify_workbook(content)
    snapshot = extract_snapshot(content)

    workbook_summary = qualification.get("workbook_summary") or {}
    verdict_message = qualification.get("verdict_message") or "Classeur analysé."
    formula_blocks = workbook_summary.get("formula_blocks_count", 0)
    summary = (
        f"Classeur Excel avec {workbook_summary.get('sheet_count', snapshot.total_sheets)} feuille(s), "
        f"{workbook_summary.get('total_formulas', snapshot.total_formulas)} formule(s) et "
        f"{formula_blocks} zone(s) calculatoire(s). {verdict_message}"
    )

    sheet_previews: list[str] = []
    for sheet in snapshot.sheets[:2]:
        sheet_previews.append(
            f"Feuille: {sheet.name}\n"
            f"- {sheet.rows} lignes x {sheet.cols} colonnes\n"
            f"- {sheet.formula_count} formule(s), {sheet.value_count} valeur(s)\n"
            f"{_truncate_text(_normalize_text(sheet.grid_text), max_chars=900)}"
        )

    recommended_scope = qualification.get("recommended_scope") or {}
    prompt_hints = [
        "Repérer les variables d'entrée, les formules intermédiaires et les KPI finaux.",
    ]
    if recommended_scope.get("includes"):
        included = ", ".join(recommended_scope["includes"][:2])
        prompt_hints.append(f"Se concentrer d'abord sur {included}.")

    warnings = list(qualification.get("warnings") or [])
    excerpt = _truncate_text("\n\n".join(sheet_previews)) if sheet_previews else None
    return summary, excerpt, prompt_hints, warnings


def _analyze_smgp(content: bytes) -> tuple[str, str | None, list[str], list[str]]:
    document = load_smgp_document(content)
    nodes = document.graph.nodes
    edges = document.graph.edges
    scenarios = document.scenarios
    composites = document.composites

    node_labels = [node.label for node in nodes[:8] if node.label]
    summary = (
        f"Modèle SmartGraph existant: {len(nodes)} variable(s), {len(edges)} relation(s), "
        f"{len(scenarios)} scénario(s), {len(composites)} composite(s)."
    )
    excerpt_lines = [
        f"Projet: {document.project.name}",
        f"Description: {document.project.description or 'Non renseignée'}",
    ]
    if node_labels:
        excerpt_lines.append("Variables repérées: " + ", ".join(node_labels))
    excerpt = _truncate_text("\n".join(excerpt_lines), max_chars=900)
    prompt_hints = [
        "Réutiliser la structure métier déjà présente plutôt que repartir de zéro.",
        "Identifier ce qu'il faut compléter, simplifier ou adapter au nouveau besoin.",
    ]
    warnings: list[str] = []
    return summary, excerpt, prompt_hints, warnings


def _analyze_textual(file_name: str, content: bytes) -> tuple[str, str | None, list[str], list[str]]:
    text = _decode_text(content)
    normalized = _normalize_text(text)
    if not normalized:
        raise WizardDocumentError(f"{file_name} ne contient pas de texte exploitable.")

    extension = Path(file_name).suffix.lower()
    lines = [line for line in normalized.splitlines() if line.strip()]
    first_line = lines[0] if lines else file_name
    summary = (
        f"Document {extension.lstrip('.') or 'texte'} avec {len(lines)} ligne(s) utiles. "
        f"Première information repérée: {first_line[:120]}"
    )
    prompt_hints = [
        "Réutiliser les libellés, colonnes et hypothèses présents dans le document.",
    ]
    warnings: list[str] = []

    if extension == ".json":
        try:
            payload = json.loads(text)
            summary = _summarize_json(payload)
            prompt_hints.append("Identifier les champs numériques et les entités métier récurrentes.")
        except json.JSONDecodeError:
            warnings.append("JSON invalide: lecture en texte brut.")

    excerpt = _truncate_text(normalized)
    return summary, excerpt, prompt_hints, warnings


def _summarize_json(payload: Any) -> str:
    if isinstance(payload, dict):
        keys = list(payload.keys())
        preview = ", ".join(str(k) for k in keys[:8])
        return f"JSON objet avec {len(keys)} clé(s) principales: {preview or 'aucune'}."
    if isinstance(payload, list):
        return f"JSON liste avec {len(payload)} élément(s)."
    return f"JSON scalaire de type {type(payload).__name__}."


def _decode_text(content: bytes) -> str:
    for encoding in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise WizardDocumentError("Encodage non supporté pour ce document texte.")


def _normalize_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _truncate_text(text: str, *, max_chars: int = MAX_EXCERPT_CHARS) -> str:
    compact = _normalize_text(text)
    if len(compact) <= max_chars:
        return compact
    return compact[: max_chars - 1].rstrip() + "…"


def _coerce_text(value: Any) -> str:
    return str(value or "").strip()


def _attachment_value(attachment: Any, key: str, default: Any = None) -> Any:
    if isinstance(attachment, dict):
        return attachment.get(key, default)
    return getattr(attachment, key, default)
