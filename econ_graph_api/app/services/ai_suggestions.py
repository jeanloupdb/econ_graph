"""
AI Suggestions Service - Generate contextual improvement suggestions for SmartGraph models.

This service analyzes a project's structure and generates relevant suggestions
that can be applied via the AI assistant.
"""

import logging
import random
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
    ADD_PARAMETER = "add_parameter"
    ADD_SCENARIO = "add_scenario"
    DECOMPOSE_CALCULATION = "decompose_calculation"
    ADD_SENSITIVITY = "add_sensitivity"
    IMPROVE_FORMULA = "improve_formula"
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
    node_id: Optional[str] = None  # Related node if applicable
    node_label: Optional[str] = None


def _analyze_parameters(nodes: List[Node], edges: List[Edge]) -> List[Suggestion]:
    """Analyze parameters and suggest improvements."""
    suggestions = []

    # Find root nodes (parameters)
    incoming_edges = {e.target for e in edges}
    parameters = [n for n in nodes if n.id not in incoming_edges]

    # Check if any parameter lacks a safety margin
    numeric_params = [p for p in parameters if p.value_computed is not None]

    if numeric_params and len(numeric_params) >= 2:
        # Suggest adding safety margin to critical parameters
        for param in numeric_params[:2]:  # Limit suggestions
            if param.value_computed and param.value_computed > 0:
                suggestions.append(Suggestion(
                    id=f"safety_{param.id}",
                    type=SuggestionType.ADD_SAFETY_MARGIN,
                    title=f"Ajouter une marge de sécurité",
                    description=f"Créer un paramètre de marge pour '{param.label}' afin de tester la robustesse du modèle.",
                    prompt=f"Ajoute un paramètre 'Marge de sécurité {param.label}' (en %) qui s'applique à {param.label}. La valeur par défaut devrait être 0%, mais permettre de simuler des variations.",
                    priority=SuggestionPriority.MEDIUM,
                    node_id=param.id,
                    node_label=param.label
                ))

    return suggestions


def _analyze_scenarios(scenarios: List[Scenario], nodes: List[Node]) -> List[Suggestion]:
    """Analyze scenarios and suggest new ones."""
    suggestions = []

    scenario_names = [s.name.lower() for s in scenarios]

    # Suggest pessimistic scenario if not present
    if not any('pessimiste' in name or 'worst' in name or 'pire' in name for name in scenario_names):
        suggestions.append(Suggestion(
            id="scenario_pessimistic",
            type=SuggestionType.ADD_SCENARIO,
            title="Créer un scénario pessimiste",
            description="Testez la résilience de votre modèle avec des hypothèses défavorables.",
            prompt="Crée un scénario 'Pessimiste' qui réduit les revenus de 20% et augmente les coûts de 15%. Applique ces modifications aux paramètres appropriés.",
            priority=SuggestionPriority.HIGH,
        ))

    # Suggest optimistic scenario if not present
    if not any('optimiste' in name or 'best' in name or 'meilleur' in name for name in scenario_names):
        suggestions.append(Suggestion(
            id="scenario_optimistic",
            type=SuggestionType.ADD_SCENARIO,
            title="Créer un scénario optimiste",
            description="Explorez le potentiel de croissance avec des hypothèses favorables.",
            prompt="Crée un scénario 'Optimiste' qui augmente les revenus de 30% et réduit les coûts variables de 10%.",
            priority=SuggestionPriority.MEDIUM,
        ))

    return suggestions


def _analyze_complexity(nodes: List[Node], edges: List[Edge]) -> List[Suggestion]:
    """Analyze model complexity and suggest decomposition."""
    suggestions = []

    # Find nodes with many dependencies (complex calculations)
    for node in nodes:
        incoming = [e for e in edges if e.target == node.id]
        if len(incoming) >= 4 and node.computation_definition:
            suggestions.append(Suggestion(
                id=f"decompose_{node.id}",
                type=SuggestionType.DECOMPOSE_CALCULATION,
                title=f"Simplifier le calcul",
                description=f"'{node.label}' dépend de {len(incoming)} variables. Décomposer ce calcul en étapes intermédiaires améliorerait la lisibilité.",
                prompt=f"Le calcul de '{node.label}' est complexe avec {len(incoming)} entrées. Décompose ce calcul en 2-3 étapes intermédiaires pour améliorer la lisibilité et faciliter le débogage.",
                priority=SuggestionPriority.LOW,
                node_id=node.id,
                node_label=node.label
            ))
            break  # Only one decomposition suggestion at a time

    return suggestions


def _analyze_results(nodes: List[Node], edges: List[Edge]) -> List[Suggestion]:
    """Analyze results and suggest sensitivity analysis."""
    suggestions = []

    # Find leaf nodes (results)
    outgoing_sources = {e.source for e in edges}
    results = [n for n in nodes if n.id not in outgoing_sources and n.computation_definition]

    if results:
        # Suggest sensitivity analysis for main result
        main_result = results[0]
        suggestions.append(Suggestion(
            id=f"sensitivity_{main_result.id}",
            type=SuggestionType.ADD_SENSITIVITY,
            title="Analyse de sensibilité",
            description=f"Identifiez quels paramètres impactent le plus '{main_result.label}'.",
            prompt=f"Crée une analyse de sensibilité pour '{main_result.label}'. Ajoute des calculs montrant l'impact d'une variation de +/-10% de chaque paramètre d'entrée sur ce résultat final.",
            priority=SuggestionPriority.MEDIUM,
            node_id=main_result.id,
            node_label=main_result.label
        ))

    return suggestions


def _analyze_formulas(nodes: List[Node]) -> List[Suggestion]:
    """Analyze formulas and suggest improvements."""
    suggestions = []

    for node in nodes:
        if not node.computation_definition:
            continue

        formula = node.computation_definition.lower()

        # Check for potential improvements
        if 'return' in formula and '/' in formula and 'if' not in formula:
            # Division without zero check
            suggestions.append(Suggestion(
                id=f"improve_{node.id}",
                type=SuggestionType.IMPROVE_FORMULA,
                title="Protéger contre la division par zéro",
                description=f"Le calcul de '{node.label}' contient une division. Ajouter une protection éviterait des erreurs.",
                prompt=f"Améliore la formule de '{node.label}' pour éviter les divisions par zéro. Ajoute une condition qui retourne 0 si le diviseur est nul.",
                priority=SuggestionPriority.LOW,
                node_id=node.id,
                node_label=node.label
            ))
            break  # One formula suggestion at a time

    return suggestions


def get_suggestions_for_project(
    db: Session,
    project_id: str,
    max_suggestions: int = 3
) -> List[Suggestion]:
    """
    Analyze a project and generate improvement suggestions.

    Args:
        db: Database session
        project_id: ID of the project to analyze
        max_suggestions: Maximum number of suggestions to return

    Returns:
        List of suggestions, prioritized by importance
    """
    # Load project data
    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    edges = db.query(Edge).filter(Edge.project_id == project_id).all()
    scenarios = db.query(Scenario).filter(Scenario.project_id == project_id).all()

    if not nodes:
        return []

    # Collect all suggestions
    all_suggestions: List[Suggestion] = []

    all_suggestions.extend(_analyze_parameters(nodes, edges))
    all_suggestions.extend(_analyze_scenarios(scenarios, nodes))
    all_suggestions.extend(_analyze_complexity(nodes, edges))
    all_suggestions.extend(_analyze_results(nodes, edges))
    all_suggestions.extend(_analyze_formulas(nodes))

    # Sort by priority
    priority_order = {
        SuggestionPriority.HIGH: 0,
        SuggestionPriority.MEDIUM: 1,
        SuggestionPriority.LOW: 2,
    }

    all_suggestions.sort(key=lambda s: priority_order[s.priority])

    # Return limited suggestions
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
    }
