import json
from types import SimpleNamespace

from app.services.wizard_documents import (
    analyze_wizard_document,
    format_wizard_document_context,
)


def test_analyze_plain_text_document():
    analysis = analyze_wizard_document(
        file_name="brief.txt",
        content=b"CA mensuel\nCharges fixes\nMarge nette attendue\n",
        mime_type="text/plain",
    )

    assert analysis.file_kind == "txt"
    assert analysis.file_name == "brief.txt"
    assert "document" in analysis.summary.lower()
    assert "CA mensuel" in (analysis.excerpt or "")


def test_analyze_smgp_document():
    payload = {
        "format": "smartgraph-project",
        "schema_version": "1.0.0",
        "project": {
            "id": "proj_demo",
            "name": "Demo Model",
            "status": "completed",
            "description": "Modele de demo",
        },
        "graph": {
            "nodes": [
                {"id": "n_revenue", "slug": "revenue", "label": "Revenue", "status": "observed"},
                {"id": "n_profit", "slug": "profit", "label": "Profit", "status": "implied"},
            ],
            "edges": [
                {"id": "n_revenue->n_profit", "source": "n_revenue", "target": "n_profit"},
            ],
        },
        "scenarios": [],
        "composites": [],
        "provenance": {
            "exported_at": "2026-04-06T12:00:00",
            "source_project_id": "proj_demo",
            "source_project_name": "Demo Model",
        },
    }

    analysis = analyze_wizard_document(
        file_name="demo.smgp",
        content=json.dumps(payload).encode("utf-8"),
        mime_type="application/vnd.smartgraph.project+json",
    )

    assert analysis.file_kind == "smgp"
    assert "SmartGraph" in analysis.summary
    assert "Revenue" in (analysis.excerpt or "")


def test_format_context_accepts_dicts_and_objects():
    context = format_wizard_document_context(
        [
            {
                "file_name": "brief.pdf",
                "file_kind": "pdf",
                "summary": "Document métier principal.",
                "excerpt": "Bénéfice net cible: 15 000€.",
                "prompt_hints": ["Reprendre les hypothèses financières."],
                "warnings": [],
            },
            SimpleNamespace(
                file_name="modele.smgp",
                file_kind="smgp",
                summary="Modèle existant de référence.",
                excerpt=None,
                prompt_hints=["Réutiliser la structure du graphe."],
                warnings=["Variables incomplètes."],
            ),
        ]
    )

    assert "brief.pdf" in context
    assert "modele.smgp" in context
    assert "Variables incomplètes." in context
