"""
AI Suggestions Service - Generate contextual business improvement suggestions.

Focuses on actionable, business-oriented suggestions that an entrepreneur
can understand and act on immediately.
"""

import logging
from typing import List, Optional
from dataclasses import dataclass
from enum import Enum
from sqlalchemy.orm import Session

from app.models.node import Node
from app.models.edge import Edge
from app.models.scenario import Scenario

logger = logging.getLogger(__name__)


class SuggestionType(str, Enum):
    """Types of suggestions."""
    ADD_SCENARIO = "add_scenario"
    ADD_SAFETY_MARGIN = "add_safety_margin"


class SuggestionPriority(str, Enum):
    """Priority levels for suggestions."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class Suggestion:
    """A single improvement suggestion."""
    id: str
    type: SuggestionType
    title: str
    description: str
    prompt: str  # The prompt to send to AI if user accepts
    priority: SuggestionPriority
    node_id: Optional[str] = None
    node_label: Optional[str] = None


def _analyze_scenarios(scenarios: List[Scenario], nodes: List[Node]) -> List[Suggestion]:
    """Suggest business scenarios when obvious ones are missing."""
    suggestions = []

    scenario_names = [s.name.lower() for s in scenarios]

    # Find leaf nodes (results) to make the prompt more relevant
    result_labels = [n.label for n in nodes if n.computation_definition]
    main_result = result_labels[0] if result_labels else None
    result_hint = f" en visant '{main_result}'" if main_result else ""

    if not any('pessimiste' in name or 'worst' in name or 'pire' in name or 'crise' in name for name in scenario_names):
        suggestions.append(Suggestion(
            id="scenario_pessimistic",
            type=SuggestionType.ADD_SCENARIO,
            title="Testez votre résistance à la crise",
            description=f"Simulez des conditions défavorables{result_hint} pour mesurer votre marge de manœuvre.",
            prompt=f"Crée un scénario 'Scénario de crise' : identifie d'abord les paramètres (avec list_parameters), puis crée le scénario et applique des baisses de 20% sur les revenus/ventes et des hausses de 15% sur les coûts. Utilise create_scenario pour créer et set_scenario_override pour les modifications.",
            priority=SuggestionPriority.HIGH,
        ))

    if not any('optimiste' in name or 'best' in name or 'meilleur' in name or 'croissance' in name for name in scenario_names):
        suggestions.append(Suggestion(
            id="scenario_optimistic",
            type=SuggestionType.ADD_SCENARIO,
            title="Explorez votre plein potentiel",
            description=f"Calculez votre résultat dans les meilleures conditions{result_hint}.",
            prompt=f"Crée un scénario 'Scénario optimiste' : identifie d'abord les paramètres (avec list_parameters), puis crée le scénario et applique des hausses de 30% sur les revenus/ventes et des baisses de 10% sur les coûts. Utilise create_scenario pour créer et set_scenario_override pour les modifications.",
            priority=SuggestionPriority.MEDIUM,
        ))

    return suggestions


def _analyze_parameters(nodes: List[Node], edges: List[Edge]) -> List[Suggestion]:
    """Suggest a buffer/safety-margin parameter for key numeric inputs."""
    suggestions = []

    incoming_edges = {e.target for e in edges}
    parameters = [n for n in nodes if n.id not in incoming_edges and n.value_computed is not None]
    # Only suggest for models with enough parameters
    if len(parameters) < 2:
        return suggestions

    # Pick the highest-value parameter (likely the most impactful)
    top_param = max(parameters, key=lambda p: abs(p.value_computed or 0), default=None)
    if not top_param or not top_param.value_computed:
        return suggestions

    suggestions.append(Suggestion(
        id=f"buffer_{top_param.id}",
        type=SuggestionType.ADD_SAFETY_MARGIN,
        title="Construisez un filet de sécurité",
        description=f"Ajoutez un paramètre d'aléa sur '{top_param.label}' pour simuler l'impact d'imprévus.",
        prompt=f"Ajoute un paramètre 'Aléa {top_param.label}' (en %) initialisé à 0%, qui s'applique à {top_param.label}. Ce paramètre permettra de simuler des variations imprévues.",
        priority=SuggestionPriority.LOW,
        node_id=top_param.id,
        node_label=top_param.label,
    ))

    return suggestions


def get_suggestions_for_project(
    db: Session,
    project_id: str,
    max_suggestions: int = 3
) -> List[Suggestion]:
    """
    Analyze a project and generate business-focused improvement suggestions.
    """
    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    edges = db.query(Edge).filter(Edge.project_id == project_id).all()
    scenarios = db.query(Scenario).filter(Scenario.project_id == project_id).all()

    if not nodes:
        return []

    all_suggestions: List[Suggestion] = []
    all_suggestions.extend(_analyze_scenarios(scenarios, nodes))
    all_suggestions.extend(_analyze_parameters(nodes, edges))

    priority_order = {
        SuggestionPriority.HIGH: 0,
        SuggestionPriority.MEDIUM: 1,
        SuggestionPriority.LOW: 2,
    }
    all_suggestions.sort(key=lambda s: priority_order[s.priority])

    return all_suggestions[:max_suggestions]


def format_suggestion_for_api(suggestion: Suggestion) -> dict:
    """Convert a Suggestion to API-friendly format."""
    return {
        "id": suggestion.id,
        "type": suggestion.type.value,
        "title": suggestion.title,
        "description": suggestion.description,
        "prompt": suggestion.prompt,
        "priority": suggestion.priority.value,
        "node_id": suggestion.node_id,
        "node_label": suggestion.node_label,
        # action_prompt used by NotificationBell to send prompt to AI
        "action_prompt": suggestion.prompt,
    }
