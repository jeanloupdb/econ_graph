"""
Pipeline multi-agents pour la création automatique de projets économiques.

Architecture:
1. Agent Analyste: Analyse le prompt et extrait une structure JSON
2. Agent Planificateur: Génère le plan d'exécution (séquence d'API calls)
3. Exécuteur: Exécute le plan (création nœuds, edges, scénarios)
4. Validateur: Vérifie l'exécution Python du graphe
5. Agent Correcteur: Corrige les erreurs (max 3 tentatives)
"""

import json
import uuid
import asyncio
from typing import TypedDict, Annotated, Literal, Any
from datetime import datetime
import operator

from langgraph.graph import StateGraph, END
import google.generativeai as genai

from app.core.config import settings
from app.core.db import SessionLocal
from app.models import Project, Node, Edge, Scenario, ScenarioNodeOverride
from app.services.computation import compute_all_nodes, validate_algorithm
from app.services.layout import apply_layout


# Configuration Gemini
genai.configure(api_key=settings.GOOGLE_GENERATIVE_AI_API_KEY)


class PipelineState(TypedDict):
    """État partagé entre tous les agents"""
    # Input
    prompt: str
    user_id: str

    # Résultats intermédiaires
    analyzed_structure: dict | None
    execution_plan: dict | None
    project_id: str | None
    created_nodes: dict  # {slug: node_id}

    # Gestion d'erreurs
    errors: list[dict]
    retry_count: int

    # Logs pour streaming
    logs: list[dict]

    # Statut
    status: Literal["initializing", "analyzing", "planning", "executing", "validating", "correcting", "success", "error"]


def emit_log(state: PipelineState, level: str, message: str, step: str = None) -> dict:
    """Émet un log structuré"""
    log_entry = {
        "type": "log",
        "level": level,  # info, success, warning, error
        "message": message,
        "step": step,
        "timestamp": datetime.utcnow().isoformat()
    }
    state["logs"].append(log_entry)
    return log_entry


async def call_gemini(prompt: str, temperature: float = 0.3, json_mode: bool = True) -> str:
    """Appelle Gemini avec gestion d'erreur"""
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-exp')

        generation_config = {
            "temperature": temperature,
            "response_mime_type": "application/json" if json_mode else "text/plain"
        }

        response = model.generate_content(
            prompt,
            generation_config=generation_config
        )

        return response.text
    except Exception as e:
        raise Exception(f"Erreur Gemini API: {str(e)}")


# ==================== AGENT 1: ANALYSTE ====================

async def agent_analyste(state: PipelineState) -> PipelineState:
    """
    Analyse le prompt brut et extrait une structure JSON formelle.
    """
    emit_log(state, "info", "🔍 Analyse du prompt utilisateur...", "analyste")
    state["status"] = "analyzing"

    prompt = f"""Tu es un expert en modélisation économique et financière pour l'application "Econ Graph".

À partir du texte brut suivant, extrait une structure formelle pour construire un graphe de calcul.

TEXTE UTILISATEUR:
{state['prompt']}

RÈGLES D'EXTRACTION CRITIQUES:

1. **PARAMÈTRES** (valeurs fixes):
   - Type: "parameter"
   - OBLIGATOIRE: Fournir "default_value" (nombre)
   - Exemples: Budget (10000 EUR), Prix unitaire (50 EUR), Taux de conversion (2.5%)

2. **VARIABLES CALCULÉES**:
   - Type: "computed"
   - OBLIGATOIRE: Fournir "formula" (expression Python simple)
   - OBLIGATOIRE: Fournir "inputs" (liste des slugs utilisés dans la formule)
   - Les arguments de la formule doivent EXACTEMENT matcher les slugs des inputs
   - Exemple: formula="budget / cpc", inputs=["budget", "cpc"]

3. **POURCENTAGES** (TRÈS IMPORTANT):
   - Si le nœud est un %, utiliser unit="%"
   - La "default_value" est le nombre lisible (ex: 20 pour 20%, pas 0.2)
   - DANS LES FORMULES: Diviser par 100 (ex: "revenue * (tax_rate / 100)")

4. **FORMULES PYTHON**:
   - Format: Expressions simples comme "a + b", "a * b / 100", "a - b"
   - PAS de `def compute():`, juste l'expression
   - INTERDIT: return None, return null
   - Si incertain, retourner un nombre (ex: "100")

6. **SCÉNARIOS**:
   - Identifier les variations possibles (pessimiste, optimiste, etc.)
   - Les overrides utilisent les entity_id (slugs)

FORMAT DE SORTIE (JSON strict):
{{
  "project_name": "Nom du projet",
  "description": "Description courte",
  "complexity_score": 1-10,
  "entities": [
    {{
      "id": "budget",  // slug en snake_case
      "label": "Budget Marketing",
      "type": "parameter",
      "unit": "EUR",
      "default_value": 10000,
      "description": "Budget mensuel alloué au marketing"
    }},
    {{
      "id": "roi",
      "label": "ROI",
      "type": "computed",
      "unit": "%",
      "formula": "(revenue - budget) / budget * 100",
      "inputs": ["revenue", "budget"],
      "description": "Retour sur investissement en pourcentage"
    }}
  ],
  "scenarios": [
    {{
      "name": "Scénario optimiste",
      "overrides": [{{"entity_id": "tax_rate", "value": 15}}]
    }}
  ]
}}

VÉRIFICATIONS AVANT D'ENVOYER:
- Chaque nœud "parameter" a une "default_value"
- Chaque nœud "computed" a une "formula" ET une liste "inputs"
- Les slugs dans "inputs" matchent exactement les slugs dans "formula"
- Les pourcentages sont divisés par 100 dans les formules
- Pas de dépendances circulaires (A dépend de B, B dépend de A)
- INTERDIT: Un nœud ne peut pas dépendre de lui-même (inputs ne doit pas contenir l'id du nœud)
"""

    try:
        response = await call_gemini(prompt, temperature=0.3, json_mode=True)
        structure = json.loads(response)

        state["analyzed_structure"] = structure
        emit_log(state, "success", f"✓ Structure extraite: {len(structure.get('entities', []))} nœuds identifiés", "analyste")

        return state

    except Exception as e:
        emit_log(state, "error", f"✗ Erreur lors de l'analyse: {str(e)}", "analyste")
        state["errors"].append({"step": "analyste", "error": str(e)})
        state["status"] = "error"
        return state


# ==================== AGENT 2: PLANIFICATEUR ====================

async def agent_planificateur(state: PipelineState) -> PipelineState:
    """
    Génère le plan d'exécution séquentiel (API calls).
    """
    emit_log(state, "info", "📋 Génération du plan d'exécution...", "planificateur")
    state["status"] = "planning"

    structure = state["analyzed_structure"]

    prompt = f"""Tu es un planificateur d'API pour un système de graphes économiques.

À partir de cette STRUCTURE ANALYSÉE:
{json.dumps(structure, indent=2, ensure_ascii=False)}

Génère un PLAN D'EXÉCUTION séquentiel qui créera EXACTEMENT ce graphe en base de données.

RÈGLES D'ORDRE:
1. Créer le projet en premier
2. Créer TOUS les nœuds PARAMÈTRES ("type": "parameter") en premier
3. Créer TOUS les nœuds CALCULÉS ("type": "computed") après
4. Créer les edges après tous les nœuds
5. Créer les scénarios en dernier

CONVERSION STRUCTURE → API:

**Pour les nœuds de type "parameter":**
{{
  "action": "create_node",
  "payload": {{
    "slug": entity["id"],
    "label": entity["label"],
    "unit": entity["unit"],
    "notes": entity.get("description"), // Mapper description vers notes
    "status": "imposed",  // TOUJOURS "imposed" pour les paramètres
    "computation_definition": "def compute(): return " + str(entity["default_value"]),  // CODE FIRST: Fonction constante
    "value_computed": null  // Laisser le système calculer
  }}
}}

**Pour les nœuds de type "computed":**
{{
  "action": "create_node",
  "payload": {{
    "slug": entity["id"],
    "label": entity["label"],
    "unit": entity["unit"],
    "notes": entity.get("description"), // Mapper description vers notes
    "status": "implied",  // TOUJOURS "implied" pour les calculs
    "computation_definition": "def compute(arg1, arg2, ...): return expression",
    // ☝️ Les arguments sont les slugs de entity["inputs"] dans le même ordre
    // ☝️ L'expression est entity["formula"]
    "value_computed": null
  }}
}}

ATTENTION CRITIQUE SUR "computation_definition":
- Si entity["inputs"] = ["budget", "cpc"] et entity["formula"] = "budget / cpc"
- Alors "computation_definition" = "def compute(budget, cpc): return budget / cpc"
- Les noms des arguments DOIVENT être EXACTEMENT les slugs dans "inputs"
- Alors "computation_definition" = "def compute(budget, cpc): return budget / cpc"
- Les noms des arguments DOIVENT être EXACTEMENT les slugs dans "inputs"
- Ne PAS utiliser des noms génériques comme "arg1", "arg2", "args", etc.
- IMPORTANT: Utiliser des sauts de ligne explicites "\\n" pour le code Python.
  Exemple: "def compute(a, b):\\n    return a + b"

**EXEMPLE CONCRET:**
Structure entity:
{{
  "id": "roi",
  "type": "computed",
  "formula": "(revenue - cost) / cost * 100",
  "inputs": ["revenue", "cost"]
}}

Devient:
{{
  "action": "create_node",
  "payload": {{
    "slug": "roi",
    "computation_definition": "def compute(revenue, cost): return (revenue - cost) / cost * 100"
  }}
}}

**Pour les edges:**
- Créer UN edge par élément dans entity["inputs"]
- source = input_slug, target = entity["id"]

**Pour les scénarios:**
- Utiliser l'entity_id comme node_id

FORMAT DE SORTIE (JSON strict):
{{
  "api_calls": [
    {{
      "step": 1,
      "action": "create_project",
      "payload": {{"id": "proj_{{random}}", "name": "..."}}
    }},
    {{
      "step": 2,
      "action": "create_node",
      "payload": {{
        "slug": "budget",
        "label": "Budget",
        "status": "imposed",
        "value_computed": null,
        "computation_definition": "def compute(): return 10000",
        ...
      }}
    }},
    ...
  ]
}}

VÉRIFICATIONS CRITIQUES:
- TOUS les nœuds (même paramètres) ont "computation_definition"
- Les arguments de compute() matchent EXACTEMENT les slugs dans "inputs"
- Les edges sont créés APRÈS tous les nœuds
- JAMAIS de lien où source == target (auto-référence interdite)
"""

    try:
        response = await call_gemini(prompt, temperature=0.1, json_mode=True)
        plan = json.loads(response)

        state["execution_plan"] = plan
        emit_log(state, "success", f"✓ Plan généré: {len(plan.get('api_calls', []))} étapes", "planificateur")

        return state

    except Exception as e:
        emit_log(state, "error", f"✗ Erreur lors de la planification: {str(e)}", "planificateur")
        state["errors"].append({"step": "planificateur", "error": str(e)})
        state["status"] = "error"
        return state


# ==================== EXÉCUTEUR ====================

async def executeur(state: PipelineState) -> PipelineState:
    """
    Exécute le plan d'API calls (création réelle en BDD).
    """
    emit_log(state, "info", "⚙️ Exécution du plan...", "executeur")
    state["status"] = "executing"

    plan = state["execution_plan"]
    db = SessionLocal()

    try:
        project_id = None
        created_nodes = {}

        for api_call in plan.get("api_calls", []):
            step = api_call["step"]
            action = api_call.get("action", "unknown")

            emit_log(state, "info", f"  [{step}] {action}...", "executeur")

            # === Créer le projet ===
            if action == "create_project":
                payload = api_call["payload"]
                project_id = f"proj_{uuid.uuid4().hex[:8]}"

                project = Project(
                    id=project_id,
                    name=payload["name"],
                    user_id=state["user_id"],
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(project)
                db.flush()

                state["project_id"] = project_id
                emit_log(state, "success", f"    ✓ Projet créé: {project_id}", "executeur")

            # === Créer un nœud ===
            elif action == "create_node":
                if not project_id:
                    raise Exception("project_id non défini")

                payload = api_call["payload"]
                node_id = str(uuid.uuid4())

                # CODE FIRST: On ne force plus value_computed manuellement
                # On fait confiance à la computation_definition générée par le planificateur
                status = payload.get("status", "unknown")
                computation_definition = payload.get("computation_definition", "")
                # FIX: Unescape literal \n to real newline for valid Python execution
                if computation_definition:
                    computation_definition = computation_definition.replace("\\n", "\n")
                
                node = Node(
                    id=node_id,
                    slug=payload["slug"],
                    project_id=project_id,
                    label=payload["label"],
                    unit=payload.get("unit", ""),
                    status=status,
                    computation_definition=computation_definition,
                    value_computed=None,  # Sera calculé par le validateur
                    notes=payload.get("notes"),
                    pos_x=0,
                    pos_y=0,
                    confidence=1.0
                )
                db.add(node)
                db.flush()

                created_nodes[payload["slug"]] = node_id
                emit_log(state, "success", f"    ✓ Nœud créé: {payload['label']}", "executeur")

            # === Créer un edge ===
            elif action == "create_edge":
                if not project_id:
                    raise Exception("project_id non défini")

                payload = api_call["payload"]
                source_slug = payload["source"]
                target_slug = payload["target"]

                if source_slug not in created_nodes or target_slug not in created_nodes:
                    emit_log(state, "warning", f"    ⚠ Edge ignoré: nœuds source/target introuvables", "executeur")
                    continue

                # FIX: Prevent self-loops (cycles of length 1)
                if source_slug == target_slug:
                    emit_log(state, "warning", f"    ⚠ Edge ignoré: auto-référence interdite ({source_slug} → {target_slug})", "executeur")
                    continue

                edge = Edge(
                    id=str(uuid.uuid4()),
                    project_id=project_id,
                    source=created_nodes[source_slug],
                    target=created_nodes[target_slug],
                    edge_type=payload.get("edge_type", "dependency")
                )
                db.add(edge)
                db.flush()

                emit_log(state, "success", f"    ✓ Lien créé: {source_slug} → {target_slug}", "executeur")

            # === Créer un scénario ===
            elif action == "create_scenario":
                if not project_id:
                    raise Exception("project_id non défini")

                payload = api_call["payload"]
                scenario_id = str(uuid.uuid4())

                scenario = Scenario(
                    id=scenario_id,
                    project_id=project_id,
                    name=payload["name"],
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(scenario)
                db.flush()

                # Ajouter les overrides
                for override in payload.get("overrides", []):
                    # Robustesse: chercher l'ID sous plusieurs clés possibles
                    entity_slug = override.get("entity_id") or override.get("node_id") or override.get("id")
                    
                    if not entity_slug:
                        emit_log(state, "warning", f"    ⚠ Override ignoré (ID manquant): {override}", "executeur")
                        continue

                    if entity_slug in created_nodes:
                        override_obj = ScenarioNodeOverride(
                            id=str(uuid.uuid4()),
                            scenario_id=scenario_id,
                            node_id=created_nodes[entity_slug],
                            mode="value",
                            override_value=override["value"]
                        )
                        db.add(override_obj)
                    else:
                         emit_log(state, "warning", f"    ⚠ Override ignoré (Nœud introuvable): {entity_slug}", "executeur")

                db.flush()
                emit_log(state, "success", f"    ✓ Scénario créé: {payload['name']}", "executeur")

        # === APPLICATION DU LAYOUT AUTOMATIQUE ===
        if project_id:
            try:
                emit_log(state, "info", "📐 Calcul du layout automatique...", "executeur")
                all_nodes = db.query(Node).filter(Node.project_id == project_id).all()
                all_edges = db.query(Edge).filter(Edge.project_id == project_id).all()
                
                apply_layout(all_nodes, all_edges)
                db.flush()
                emit_log(state, "success", "✓ Layout appliqué", "executeur")
            except Exception as e:
                emit_log(state, "warning", f"⚠️ Erreur lors du layout (ignorée): {str(e)}", "executeur")
                # On continue quand même pour ne pas échouer la création du projet


        db.commit()
        state["created_nodes"] = created_nodes
        emit_log(state, "success", "✓ Exécution terminée avec succès", "executeur")

        return state

    except Exception as e:
        db.rollback()
        emit_log(state, "error", f"✗ Erreur lors de l'exécution: {str(e)}", "executeur")
        state["errors"].append({"step": "executeur", "error": str(e)})
        state["status"] = "error"
        return state

    finally:
        db.close()


# ==================== VALIDATEUR ====================

async def validateur(state: PipelineState) -> PipelineState:
    """
    Valide que tout le graphe s'exécute sans erreur Python.
    """
    # Si l'étape précédente a échoué, on ne valide pas
    if state["status"] == "error":
        return state

    emit_log(state, "info", "✅ Validation de l'exécution Python...", "validateur")
    state["status"] = "validating"

    project_id = state["project_id"]
    if not project_id:
        emit_log(state, "error", "✗ project_id manquant", "validateur")
        state["status"] = "error"
        return state

    db = SessionLocal()

    try:
        # Récupérer tous les nœuds du projet
        nodes = db.query(Node).filter(Node.project_id == project_id).all()

        # 1. Validation statique du code Python
        syntax_errors = []
        for node in nodes:
            if node.computation_definition:
                # Vérifier les sauts de ligne (vrais sauts de ligne)
                if "\n" not in node.computation_definition and "return" in node.computation_definition:
                     # Tentative de correction automatique si tout est sur une ligne
                     if "def compute" in node.computation_definition and ":" in node.computation_definition:
                         parts = node.computation_definition.split(":", 1)
                         # Utiliser un vrai saut de ligne \n
                         node.computation_definition = f"{parts[0]}:\n    {parts[1].strip()}"
                         db.add(node)
                         emit_log(state, "warning", f"  ⚠️ Correction auto saut de ligne pour {node.slug}", "validateur")

                err = validate_algorithm(node.computation_definition)
                if err:
                    syntax_errors.append({
                        "node_id": node.id,
                        "slug": node.slug,
                        "label": node.label,
                        "error": f"Syntaxe invalide: {err}"
                    })

        if syntax_errors:
            emit_log(state, "error", f"✗ {len(syntax_errors)} erreurs de syntaxe détectées", "validateur")
            for err in syntax_errors:
                emit_log(state, "error", f"  - {err['slug']}: {err['error']}", "validateur")
            state["errors"].extend(syntax_errors)
            # On arrête ici si la syntaxe est invalide, pas la peine d'exécuter
            return state

        db.commit() # Sauvegarder les corrections potentielles

        # 2. Exécution et détection de cycles
        computed_values = compute_all_nodes(db, project_id)

        # Vérifier erreur globale (ex: cycle)
        if "_error" in computed_values:
            global_error = computed_values["_error"]["error"]
            emit_log(state, "error", f"✗ Erreur critique d'exécution: {global_error}", "validateur")
            state["errors"].append({"step": "validateur", "error": global_error})
            return state

        # 3. Vérifier les erreurs individuelles de calcul
        nodes_with_errors = []
        # Re-fetch nodes to get updated status
        nodes = db.query(Node).filter(Node.project_id == project_id).all()
        
        for node in nodes:
            if node.computation_error:
                nodes_with_errors.append({
                    "node_id": node.id,
                    "slug": node.slug,
                    "label": node.label,
                    "error": node.computation_error
                })

        if nodes_with_errors:
            emit_log(state, "error", f"✗ {len(nodes_with_errors)} nœuds en erreur d'exécution", "validateur")
            for err_node in nodes_with_errors:
                emit_log(state, "error", f"  - {err_node['label']}: {err_node['error']}", "validateur")

            state["errors"].extend(nodes_with_errors)
            # Ne pas marquer comme error ici, on va tenter la correction
            return state

        emit_log(state, "success", "✓ Tous les nœuds s'exécutent correctement", "validateur")
        state["status"] = "success"
        return state

    except Exception as e:
        emit_log(state, "error", f"✗ Erreur lors de la validation: {str(e)}", "validateur")
        state["errors"].append({"step": "validateur", "error": str(e)})
        return state

    finally:
        db.close()


# ==================== AGENT CORRECTEUR ====================

async def agent_correcteur(state: PipelineState) -> PipelineState:
    """
    Corrige les erreurs détectées (max 3 tentatives).
    """
    state["retry_count"] += 1
    emit_log(state, "info", f"🔧 Tentative de correction #{state['retry_count']}...", "correcteur")
    state["status"] = "correcting"

    if state["retry_count"] > 3:
        emit_log(state, "error", "✗ Nombre maximum de tentatives atteint (3)", "correcteur")
        state["status"] = "error"
        return state

    original_plan = state["execution_plan"]
    errors = state["errors"]

    prompt = f"""Tu es un expert en debugging de modèles économiques.

Le graphe généré a rencontré des erreurs lors de l'exécution.

PLAN ORIGINAL:
{json.dumps(original_plan, indent=2, ensure_ascii=False)}

ERREURS DÉTECTÉES:
{json.dumps(errors, indent=2, ensure_ascii=False)}

ANALYSE ET CORRECTION:
1. Identifie la cause racine des erreurs
2. Propose un plan corrigé

ERREURS FRÉQUENTES:
- Mauvais noms de variables dans les formules (doit correspondre aux slugs)
- Dépendances manquantes ou mal ordonnées
- Syntaxe Python incorrecte dans les formules

FORMAT DE SORTIE (JSON strict):
{{
  "diagnosis": "Explication de l'erreur",
  "corrected_plan": {{
    "api_calls": [...]
  }}
}}
"""

    try:
        response = await call_gemini(prompt, temperature=0.2, json_mode=True)
        correction = json.loads(response)

        emit_log(state, "info", f"  Diagnostic: {correction.get('diagnosis', 'N/A')}", "correcteur")

        # Détruire le projet défectueux
        db = SessionLocal()
        try:
            project = db.query(Project).filter(Project.id == state["project_id"]).first()
            if project:
                db.delete(project)
                db.commit()
                emit_log(state, "info", "  🗑️ Projet défectueux supprimé", "correcteur")
        finally:
            db.close()

        # Réinitialiser l'état pour retry
        state["execution_plan"] = correction["corrected_plan"]
        state["project_id"] = None
        state["created_nodes"] = {}
        state["errors"] = []

        emit_log(state, "success", "✓ Plan corrigé, relance de l'exécution...", "correcteur")

        return state

    except Exception as e:
        emit_log(state, "error", f"✗ Erreur lors de la correction: {str(e)}", "correcteur")
        state["errors"].append({"step": "correcteur", "error": str(e)})
        state["status"] = "error"
        return state


# ==================== DÉCISION DE RETRY ====================

def should_retry(state: PipelineState) -> Literal["correcteur", "success", "error"]:
    """Décision: retry, succès ou erreur finale"""
    if state["status"] == "success":
        return "success"

    if state["errors"] and state["retry_count"] < 3:
        return "correcteur"

    return "error"


# ==================== CONSTRUCTION DU GRAPHE LANGGRAPH ====================

workflow = StateGraph(PipelineState)

# Ajouter les nœuds
workflow.add_node("analyste", agent_analyste)
workflow.add_node("planificateur", agent_planificateur)
workflow.add_node("executeur", executeur)
workflow.add_node("validateur", validateur)
workflow.add_node("correcteur", agent_correcteur)

# Définir les transitions
workflow.set_entry_point("analyste")
workflow.add_edge("analyste", "planificateur")
workflow.add_edge("planificateur", "executeur")
workflow.add_edge("executeur", "validateur")

# Branchement conditionnel après validation
workflow.add_conditional_edges(
    "validateur",
    should_retry,
    {
        "correcteur": "correcteur",
        "success": END,
        "error": END
    }
)

# Le correcteur retourne à l'exécuteur
workflow.add_edge("correcteur", "executeur")

# Compiler le graphe
agent_graph = workflow.compile()


# ==================== POINT D'ENTRÉE PUBLIC ====================

async def run_agent_pipeline(prompt: str, user_id: str) -> tuple[str | None, list[dict]]:
    """
    Point d'entrée principal du pipeline multi-agents.

    Returns:
        (project_id, logs)
    """
    initial_state: PipelineState = {
        "prompt": prompt,
        "user_id": user_id,
        "analyzed_structure": None,
        "execution_plan": None,
        "project_id": None,
        "created_nodes": {},
        "errors": [],
        "retry_count": 0,
        "logs": [],
        "status": "initializing"
    }

    # Exécuter le graphe
    final_state = None
    async for state in agent_graph.astream(initial_state):
        final_state = state

    # Extraire les valeurs du dernier état
    if final_state:
        # LangGraph retourne un dict avec les noms de nœuds comme clés
        # On doit extraire le dernier état
        last_node_key = list(final_state.keys())[-1]
        last_state = final_state[last_node_key]

        return last_state.get("project_id"), last_state.get("logs", [])

    return None, []
