import re
from typing import Optional

from app.models import Node, Scenario, Edge
from app.models.project_conversation import ConversationMessage
from app.models.scenario import ScenarioNodeOverride

from .project_chat_constants import MAX_CONTEXT_MESSAGES, MAX_NODES_IN_CONTEXT


def _extract_formula_expression(code: str) -> str:
    """Extract just the return expression from a compute definition."""
    if not code:
        return ""
    match = re.search(r"return\s+(.+)", code)
    return match.group(1).strip() if match else ""


def _humanize_formula(formula_expr: str, slug_to_label: dict[str, str]) -> str:
    """Convert a Python formula expression to human-readable French.

    Replaces slugs with labels and Python operators with readable symbols.
    """
    if not formula_expr:
        return ""
    result = formula_expr
    # Replace slugs with labels (longest first to avoid partial matches)
    for slug, label in sorted(slug_to_label.items(), key=lambda x: -len(x[0])):
        result = result.replace(slug, f'"{label}"')
    # Clean up Python syntax for readability
    result = result.replace(" * ", " × ")
    result = result.replace(" / ", " ÷ ")
    result = result.replace(" + ", " + ")
    result = result.replace(" - ", " − ")
    result = result.replace("max(", "maximum(")
    result = result.replace("min(", "minimum(")
    return result


def build_nodes_context(nodes: list[Node], edges: list[Edge]) -> str:
    """Build a human-readable text representation of nodes for the AI context."""
    if not nodes:
        return "(Aucun élément)"

    # Build dependency map: target_slug -> [source labels]
    id_to_node = {n.id: n for n in nodes}
    slug_to_label = {n.slug: (n.label or n.slug) for n in nodes}
    deps_map: dict[str, list[str]] = {}
    for edge in edges:
        if edge.edge_type == "dependency":
            target_node = id_to_node.get(edge.target)
            source_node = id_to_node.get(edge.source)
            if target_node and source_node:
                deps_map.setdefault(target_node.slug, []).append(
                    source_node.label or source_node.slug
                )

    # Group by type for clarity
    params = []
    calcs = []
    for node in nodes[:MAX_NODES_IN_CONTEXT]:
        is_param = node.status == "imposed"
        label = node.label or node.slug
        unit = f" {node.unit}" if node.unit else ""
        val = f" = {node.value_computed:,.2f}{unit}" if node.value_computed is not None else ""
        err = " ⚠️ ERREUR DE CALCUL" if node.computation_error else ""

        if is_param:
            params.append(f"  • {label} (node_slug: {node.slug}){val}{err}")
        else:
            deps = deps_map.get(node.slug, [])
            deps_str = f" — dépend de : {', '.join(deps)}" if deps else ""
            formula_expr = _extract_formula_expression(node.computation_definition)
            formula_human = _humanize_formula(formula_expr, slug_to_label)
            formula_str = f" — logique : {formula_human}" if formula_human else ""
            calcs.append(f"  • {label} (node_slug: {node.slug}){val}{deps_str}{formula_str}{err}")

    lines = []
    if params:
        lines.append("Paramètres (colonne gauche) :")
        lines.extend(params)
    if calcs:
        lines.append("Calculs et résultats (colonnes centre et droite) :")
        lines.extend(calcs)

    return "\n".join(lines)


def build_scenarios_context(
    scenarios: list[Scenario],
    overrides: list[ScenarioNodeOverride],
    nodes_by_id: dict,
) -> str:
    if not scenarios:
        return "(Aucun scénario)"

    overrides_by_scenario: dict[str, list[ScenarioNodeOverride]] = {}
    for ov in overrides:
        overrides_by_scenario.setdefault(ov.scenario_id, []).append(ov)

    lines = []
    for sc in scenarios:
        lines.append(f"- {sc.name} ({sc.id})")
        for ov in overrides_by_scenario.get(sc.id, []):
            node = nodes_by_id.get(ov.node_id) or None
            label = node.label if node else ov.node_id
            if ov.mode == "value":
                lines.append(f"  • {label}: value={ov.override_value}")
            else:
                lines.append(f"  • {label}: formula")
    return "\n".join(lines)


def build_agent_snapshot(
    db,
    project_id: str,
    node_count: int,
    max_nodes_in_context: int,
) -> str:
    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    params_count = len([n for n in nodes if n.status == "imposed"])
    calcs_count = node_count - params_count
    scenarios = db.query(Scenario).filter(Scenario.project_id == project_id).all()
    errors = [n for n in nodes if n.computation_error]
    missing_in_context = max(0, node_count - max_nodes_in_context)

    parts = [
        f"- {params_count} paramètres, {calcs_count} calculs/résultats",
        f"- {len(scenarios)} scénarios",
        f"- {len(errors)} erreurs de calcul",
    ]
    if missing_in_context > 0:
        parts.append(f"- {missing_in_context} éléments non listés ci-dessus (utilise list_nodes pour voir tout)")
    if errors:
        parts.append("  Éléments en erreur :")
        for n in errors[:5]:
            parts.append(f"  • {n.label} ({n.slug})")
    if scenarios:
        parts.append("  Scénarios disponibles :")
        for s in scenarios[:5]:
            parts.append(f"  • {s.name} (id: {s.id})")
    return "\n".join(parts)


def build_dashboard_context(project) -> str:
    """Build a concise summary of the current V2 dashboard config for the AI."""
    config = getattr(project, "dashboard_config", None)
    if not config or not isinstance(config, dict) or config.get("version") != 2:
        return "(Aucun tableau de bord configuré — utilise regenerate_dashboard pour en créer un)"

    groups = config.get("parameter_groups", [])
    widgets = config.get("kpi_widgets", [])

    lines = []
    if widgets:
        lines.append(f"Widgets KPI affichés ({len(widgets)}) :")
        for w in widgets:
            viz = w.get("viz_type", "big_number")
            slug = w.get("node_slug", "")
            node_slugs = w.get("node_slugs", [])
            breakdown = w.get("breakdown_slugs", [])
            if node_slugs:
                lines.append(f"  • \"{w.get('title')}\" → {viz} sur [{', '.join(node_slugs)}]")
            elif breakdown:
                lines.append(f"  • \"{w.get('title')}\" → {viz} sur {slug} (breakdown: {', '.join(breakdown)})")
            else:
                lines.append(f"  • \"{w.get('title')}\" → {viz} sur {slug}")
    if groups:
        lines.append(f"Groupes de paramètres ({len(groups)}) :")
        for g in groups:
            slugs = [c.get("node_slug", "") for c in g.get("controls", [])]
            lines.append(f"  • {g.get('title', '?')} : {', '.join(slugs)}")

    return "\n".join(lines) if lines else "(Tableau de bord vide)"


def build_conversation_context(messages: list[ConversationMessage], limit: int = MAX_CONTEXT_MESSAGES) -> list[dict]:
    """Build conversation history for the AI context."""
    recent_messages = messages[-limit:] if len(messages) > limit else messages
    context = []
    for msg in recent_messages:
        context.append({
            "role": "user" if msg.role == "user" else "model",
            "parts": [msg.content]
        })
    return context


def enrich_message_with_context(content: str, context_data: Optional[dict], nodes_map: dict) -> str:
    """Enrich the user message with structured context when they clicked on a specific element."""
    if not context_data:
        return content

    label = context_data.get("label", "")
    ctx_type = context_data.get("type", "")
    target = context_data.get("target", {})
    target_id = target.get("id", "") if target else ""
    target_field = target.get("field", "") if target else ""

    # Try to resolve more info from the node
    node = None
    if target_id:
        node = next((n for n in nodes_map.values() if n.id == target_id), None)

    parts = []
    if node:
        type_label = "paramètre" if node.status == "imposed" else "calcul"
        parts.append(f'[L\'utilisateur pointe sur l\'élément "{node.label or node.slug}" ({type_label})')
        if target_field:
            field_names = {"formula": "sa formule", "value": "sa valeur", "notes": "ses notes"}
            parts.append(f", plus précisément {field_names.get(target_field, target_field)}")
        if node.value_computed is not None:
            unit = f" {node.unit}" if node.unit else ""
            parts.append(f", valeur actuelle : {node.value_computed:,.2f}{unit}")
        parts.append("]")
    elif label:
        parts.append(f'[L\'utilisateur pointe sur "{label}" (type : {ctx_type})]')

    context_hint = "".join(parts)
    if context_hint:
        return f"{context_hint}\n{content}"
    return content
