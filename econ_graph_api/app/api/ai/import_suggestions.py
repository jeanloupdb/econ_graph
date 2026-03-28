"""
Post-import AI scenario suggestions.

POST /ai/projects/{project_id}/suggest-import-scenarios
  → Generates 2 "what-if" scenarios from the freshly imported project structure
    and persists them directly in DB.
"""

import json
import logging
import uuid

import google.generativeai as genai
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.node import Node
from app.models.project import Project
from app.models.scenario import Scenario
from app.models.scenario import ScenarioNodeOverride
from app.models.user import User
from .shared import GEMINI_MODEL, clean_json_response, configure_gemini

logger = logging.getLogger(__name__)
router = APIRouter()

SYSTEM_PROMPT = """Tu es un expert en analyse de modèles économiques et en simulation de scénarios.
On vient d'importer un modèle Excel dans Smart Graph.
Tu dois générer exactement 2 scénarios "what-if" réalistes et contrastés.

Règles strictes :
- Chaque scénario a un nom court (3-4 mots max, ex: "Croissance forte", "Scénario de crise")
- Une couleur hex : utilise des couleurs distinctes et lisibles (#10b981, #f59e0b, #3b82f6, #f43f5e, #8b5cf6)
- Les overrides varient les PARAMÈTRES uniquement (pas les calculs ni résultats)
- Variation réaliste : entre ±10% et ±50% selon le type de variable
- Le scénario 1 est optimiste/favorable, le scénario 2 est pessimiste/défavorable
- Touche 2-4 paramètres clés par scénario (pas tous)

Réponds UNIQUEMENT en JSON valide, sans markdown :
{
  "scenarios": [
    {
      "name": "Nom scénario 1",
      "color": "#10b981",
      "description": "Une phrase courte",
      "overrides": [
        {"slug": "slug_param", "value": 1234.5}
      ]
    },
    {
      "name": "Nom scénario 2",
      "color": "#f43f5e",
      "description": "Une phrase courte",
      "overrides": [
        {"slug": "slug_param", "value": 800.0}
      ]
    }
  ]
}"""


class SuggestScenariosResponse(BaseModel):
    scenario_ids: list[str]
    scenarios: list[dict]


@router.post("/projects/{project_id}/suggest-import-scenarios", response_model=SuggestScenariosResponse)
def suggest_import_scenarios(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate and persist 2 what-if scenarios from the project's parameter structure.
    Called once after an Excel import to give the user ready-to-explore scenarios.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Projet introuvable")
    if project.user_id != current_user.id:
        raise HTTPException(403, "Accès refusé")

    # Gather parameters (nodes without computation_definition = input nodes)
    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    param_nodes = [n for n in nodes if not n.computation_definition]
    result_nodes = [n for n in nodes if n.computation_definition]

    if len(param_nodes) < 2:
        raise HTTPException(400, "Pas assez de paramètres pour générer des scénarios.")

    # Build prompt context
    param_lines = "\n".join(
        f"  - {n.label or n.slug} (slug={n.slug}) = {n.value_computed}"
        + (f" {n.unit}" if n.unit else "")
        for n in param_nodes[:10]
        if n.value_computed is not None
    )
    result_lines = "\n".join(
        f"  - {n.label or n.slug} = {n.value_computed}"
        + (f" {n.unit}" if n.unit else "")
        for n in result_nodes[:5]
        if n.value_computed is not None
    )

    user_message = f"""Modèle : {project.name}

PARAMÈTRES (variables d'entrée) :
{param_lines or "  (aucune valeur calculée)"}

RÉSULTATS (outputs calculés) :
{result_lines or "  (aucune valeur calculée)"}

Génère 2 scénarios contrastés pour ce modèle."""

    # Call Gemini
    try:
        configure_gemini()
        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            system_instruction=SYSTEM_PROMPT,
            generation_config=genai.GenerationConfig(
                temperature=0.3,
                response_mime_type="application/json",
            ),
        )
        response = model.generate_content(user_message)
        raw = response.text or ""
        data = json.loads(clean_json_response(raw))
        suggested = data.get("scenarios", [])
    except Exception as e:
        logger.exception(f"Scenario suggestion AI failed: {e}")
        raise HTTPException(500, "L'IA n'a pas pu générer de scénarios.")

    # Build slug → node_id map
    slug_to_node = {n.slug: n for n in param_nodes}

    # Persist scenarios
    created_ids = []
    created_data = []
    for s in suggested[:2]:
        name = s.get("name", "Scénario")
        color = s.get("color", "#8b5cf6")
        scenario_id = str(uuid.uuid4())[:8]
        scenario = Scenario(
            id=scenario_id,
            project_id=project_id,
            name=name,
            color=color,
        )
        db.add(scenario)
        db.flush()

        overrides_saved = 0
        for override in s.get("overrides", []):
            slug = override.get("slug")
            value = override.get("value")
            node = slug_to_node.get(slug)
            if not node or value is None:
                continue
            db.add(ScenarioNodeOverride(
                id=str(uuid.uuid4())[:8],
                scenario_id=scenario_id,
                node_id=node.id,
                mode="value",
                override_value=float(value),
            ))
            overrides_saved += 1

        if overrides_saved > 0:
            created_ids.append(scenario_id)
            created_data.append({
                "id": scenario_id,
                "name": name,
                "color": color,
                "description": s.get("description", ""),
            })

    db.commit()
    return SuggestScenariosResponse(scenario_ids=created_ids, scenarios=created_data)
