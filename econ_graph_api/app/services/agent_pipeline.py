"""
Pipeline multi-agents OPTIMISÉ pour la création automatique de projets économiques.

Architecture OPTIMISÉE (v2):
1. Agent Analyste: UN SEUL appel LLM - extrait structure complète
2. Exécuteur: Crée en BDD (edges et positions calculés en Python)
3. Validateur: Vérifie l'exécution Python
4. Correcteur: Corrige SEULEMENT les nœuds en erreur (pas tout le projet)

OPTIMISATIONS:
- 1 appel LLM au lieu de 2 (fusion analyste + planificateur)
- Edges déduits automatiquement des inputs (pas besoin de l'IA)
- Positions calculées par algorithme de layout (pas besoin de l'IA)
- Correcteur chirurgical (ne touche que les nœuds cassés)
- Prompt 50% plus court (moins de tokens)
"""

import json
import uuid
import asyncio
import threading
from typing import TypedDict, Literal
from datetime import datetime

from langgraph.graph import StateGraph, END
import google.generativeai as genai

from app.core.config import settings
from app.core.db import SessionLocal
from app.models import Project, Node, Edge, Scenario, ScenarioNodeOverride
from app.services.computation import compute_all_nodes, validate_algorithm
from app.services.layout import apply_layout
from app.services.project_insights import run_insights_task
from app.api.ai.dashboard_generator import generate_dashboard_for_project


# Configuration Gemini - Modèle STABLE
genai.configure(api_key=settings.GOOGLE_GENERATIVE_AI_API_KEY)
GEMINI_MODEL = settings.GEMINI_MODEL  # Stable, pas exp


class PipelineState(TypedDict):
    """État partagé entre tous les agents"""
    # Input
    prompt: str
    user_id: str

    # Résultats intermédiaires
    analyzed_structure: dict | None
    project_id: str | None
    created_nodes: dict  # {slug: node_id}

    # Gestion d'erreurs
    errors: list[dict]
    retry_count: int

    # Logs pour streaming
    logs: list[dict]

    # Statut
    status: Literal["initializing", "analyzing", "executing", "validating", "correcting", "success", "error"]

    # Token usage tracking
    total_prompt_tokens: int
    total_completion_tokens: int

    # Demo mode
    demo_token: str | None


def emit_log(state: PipelineState, level: str, message: str, step: str = None) -> dict:
    """Émet un log structuré"""
    log_entry = {
        "type": "log",
        "level": level,
        "message": message,
        "step": step,
        "timestamp": datetime.utcnow().isoformat()
    }
    state["logs"].append(log_entry)
    return log_entry


async def call_gemini(prompt: str, temperature: float = 0.2) -> tuple[str, int, int]:
    """
    Appelle Gemini avec gestion d'erreur.
    
    Returns:
        Tuple of (response_text, prompt_tokens, completion_tokens)
    """
    try:
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": temperature,
                "response_mime_type": "application/json"
            }
        )
        
        # Extract usage metadata
        prompt_tokens = 0
        completion_tokens = 0
        try:
            usage_metadata = getattr(response, 'usage_metadata', None)
            if usage_metadata:
                prompt_tokens = getattr(usage_metadata, 'prompt_token_count', 0) or 0
                completion_tokens = getattr(usage_metadata, 'candidates_token_count', 0) or 0
        except Exception:
            pass
        
        return response.text, prompt_tokens, completion_tokens
    except Exception as e:
        raise Exception(f"Erreur Gemini API: {str(e)}")


# ==================== PROMPT EXPERT (Compréhension profonde) ====================

ANALYSIS_PROMPT = """Tu es un EXPERT en modélisation économique et financière pour "SmartGraph".
Tu es aussi un CONSEILLER qui comprend l'objectif réel de l'utilisateur.

## CONTEXTE D'INTERFACE (IMPORTANT)
L'interface a deux modes :
- **Mode Insights (par défaut)** : GAUCHE (1/3) Paramètres modifiables | DROITE (2/3) Tableau de bord Insights avec visualisations IA des résultats clés.
- **Mode Détails (3 colonnes)** : Paramètres | Calculs intermédiaires | Résultats finaux.
Conçois le modèle pour que les résultats finaux soient clairs et utiles, et que les données key soient bien identifiées.

## TA MISSION
1. **FIDÉLITÉ** : Si l'utilisateur liste des paramètres ou calculs → crée-les TOUS.
2. **COMPRÉHENSION** : Déduis l'objectif réel (1-2 phrases).
3. **COMPLÉTION** : Ajoute seulement les variables essentielles manquantes.

## TEXTE UTILISATEUR
{user_prompt}

## CONTRAINTES STRICTES
1. **Pas de listes d'objets** : agrégats uniquement.
2. **Pas de séries temporelles** : une photo à l'instant T, calcule des ratios/sommes sur période si besoin.
3. **Sorties numériques uniquement** : unités réelles (€, %, mois, ratio, heures), pourcentages, décisions 0/1. JAMAIS de scores arbitraires (/10, /100).

## CONCEPTION DU MODÈLE
- **Paramètres** (type="parameter") : valeurs réalistes, actionnables, décrites clairement.
- **Calculs** (type="computed") : formules Python simples, inputs cohérents.
- **Résultats** : prévois 2-5 nœuds calculés finaux (sans dépendants), TOUJOURS en unités réelles (€, %, mois, ratio). JAMAIS de score arbitraire comme "Score de X = 7/10".
- **Scénarios** : 2-3 scénarios pertinents avec overrides réalistes.

## RÈGLES TECHNIQUES
1. Slugs en snake_case, uniques.
2. Pourcentages : unit="%" et valeur=20 pour 20%. Formules : x / 100.
3. Formules simples, pas de `None`/`null`.
4. Pas d'auto-référence.
5. Chaque nœud a une description pédagogique.

## RÈGLES ABSOLUES SUR LES FORMULES (VIOLATIONS = ERREUR D'EXÉCUTION)
- **INTERDIT** : list comprehensions `[x for x in range(n)]` — retourne une liste, NON SUPPORTÉ.
- **INTERDIT** : indexing `[i]` sur une variable-nœud — chaque nœud est un SCALAIRE (float), pas une liste.
- **INTERDIT** : `for`, `while`, boucles de toute forme dans une formule.
- **INTERDIT** : retourner un dict, tuple, list, None, ou tout objet non-numérique.
- **INTERDIT** : retourner une chaîne de caractères (`'lineaire'`, `'degressive'`, `'methodeA'`, etc.) — CRASH GARANTI.
- **INTERDIT** : `default_value` de type string (ex: `"default_value": "lineaire"`) — utilise un entier (0, 1, 2…).
- **OBLIGATOIRE** : chaque formule retourne UN SEUL nombre (float ou int).
- **CATÉGORIES / MÉTHODES** : encode toujours en entier. Ex: méthode de dépréciation → paramètre `methode` avec `default_value: 0` (0=linéaire, 1=dégressif). Le label/description explique la correspondance.
- Si le modèle a N niveaux/catégories, crée N nœuds séparés (un par niveau) ou un nœud agrégat avec `sum()` sur des scalaires. Ne crée JAMAIS un nœud "liste par niveau".

## SCORES : INTERDITS PAR DÉFAUT
- Les résultats finaux DOIVENT être en unités réelles (€, %, mois, ratio, heures, unités/jour).
  ✅ "Bénéfice net mensuel", "Marge nette", "Point mort", "Coût total", "ROI"
  ❌ "Score de rentabilité", "Indice de performance", "Score financier"
- Les scores (/10, /100) sont INTERDITS sauf méthodologie reconnue et publiée (NPS, IMC, score FICO). Si tu ne peux pas citer la source de la méthodologie → c'est arbitraire → INTERDIT.
- INTERDIT : résumer tout un modèle dans un seul nœud "score" synthétique. Crée plutôt 2-4 résultats concrets et complémentaires qui répondent directement à la question de l'utilisateur.

## FORMAT DE SORTIE (JSON)
{{
  "user_intent": "Objectif réel (1-2 phrases)",
  "project_name": "Nom clair et descriptif",
  "description": "Description du modèle et de son utilité",
  "entities": [
    {{
      "id": "slug_unique",
      "label": "Label lisible",
      "type": "parameter",
      "unit": "EUR",
      "default_value": 1000,
      "description": "Explication claire de ce paramètre"
    }},
    {{
      "id": "resultat_calcule",
      "label": "Résultat calculé",
      "type": "computed",
      "unit": "EUR",
      "formula": "revenu - depenses",
      "inputs": ["revenu", "depenses"],
      "description": "Ce que ce calcul révèle"
    }}
  ],
  "scenarios": [
    {{
      "name": "Scénario réaliste",
      "description": "Ce que ce scénario explore",
      "overrides": [{{"entity_id": "slug", "value": 1200}}]
    }}
  ]
}}

## CHECKLIST AVANT RÉPONSE
✓ Tous les paramètres/calculs explicitement demandés sont présents.
✓ Chaque paramètre est utilisé dans au moins un calcul.
✓ Les résultats finaux sont clairs (nœuds calculés sans dépendants).
✓ Les scénarios sont réalistes et utiles."""


# ==================== AGENT ANALYSTE (UNIQUE APPEL LLM) ====================

def break_cycles(entities: list[dict]) -> tuple[list[dict], list[str]]:
    """
    Détecte les cycles et supprime les inputs qui bouclent pour garantir un DAG.
    Retourne (entities_corrigées, warnings).
    """
    warnings = []
    
    # Map slug -> entity
    entity_map = {e['id']: e for e in entities}
    
    # État DFS : 0=Unvisited, 1=Visiting, 2=Visited
    visit_state = {e['id']: 0 for e in entities}
    
    def dfs(u_id, path):
        visit_state[u_id] = 1 # Visiting
        
        entity = entity_map.get(u_id)
        if not entity or entity.get('type') != 'computed':
            visit_state[u_id] = 2
            return

        # Copie pour pouvoir modifier safe
        inputs = list(entity.get('inputs', []))
        
        for v_id in inputs:
            if v_id not in entity_map:
                continue 
                
            if visit_state.get(v_id, 0) == 1:
                # CYCLE DÉTECTÉ ! v_id est en cours de visite => Back edge
                warnings.append(f"🔄 Cycle rompu : {u_id} dépendait de {v_id} qui dépend de lui.")
                # On retire v_id des inputs de u_id
                if v_id in entity['inputs']:
                    entity['inputs'].remove(v_id)
            elif visit_state.get(v_id, 0) == 0:
                dfs(v_id, path + [v_id])
        
        visit_state[u_id] = 2 # Visited

    for e in entities:
        if visit_state.get(e['id'], 0) == 0:
            dfs(e['id'], [e['id']])
            
    return entities, warnings


async def agent_analyste(state: PipelineState) -> PipelineState:
    """
    UN SEUL appel LLM : extrait la structure complète.
    Les edges et positions sont calculés en Python ensuite.
    """
    emit_log(state, "info", "🔍 Analyse du prompt utilisateur...", "analyste")
    state["status"] = "analyzing"

    prompt = ANALYSIS_PROMPT.format(user_prompt=state['prompt'])

    try:
        response_text, prompt_tokens, completion_tokens = await call_gemini(prompt, temperature=0.2)
        
        # Track token usage
        state["total_prompt_tokens"] = state.get("total_prompt_tokens", 0) + prompt_tokens
        state["total_completion_tokens"] = state.get("total_completion_tokens", 0) + completion_tokens
        
        structure = json.loads(response_text)

        # Validation basique avant d'accepter
        entities = structure.get('entities', [])
        if not entities:
            raise ValueError("Aucune entité extraite par l'IA")
        
        # Vérifier que chaque computed a des inputs valides
        entity_ids = {e['id'] for e in entities}
        inputs_references = set()
        
        # 1. Collecter toutes les références
        for entity in entities:
            if entity.get('type') == 'computed':
                inputs = entity.get('inputs', [])
                for inp in inputs:
                    inputs_references.add(inp)
                    # Validation d'existence
                    if inp not in entity_ids:
                        emit_log(state, "warning", f"⚠️ Input '{inp}' manquant pour {entity['id']}", "analyste")
                    if inp == entity['id']:
                        raise ValueError(f"Auto-référence détectée: {entity['id']}")

        # 2. Filtrer les paramètres orphelins (Garbage Collector)
        valid_entities = []
        for entity in entities:
            # Si c'est un paramètre et qu'il n'est JAMAIS utilisé comme input -> poubelle
            if entity.get('type') == 'parameter' and entity['id'] not in inputs_references:
                emit_log(state, "warning", f"🗑️ Suppression paramètre orphelin: {entity['label']} ({entity['id']})", "analyste")
                continue
            
            valid_entities.append(entity)
            
        structure['entities'] = valid_entities
        
        if not valid_entities:
            raise ValueError("Plus aucun nœud valide après nettoyage !")

        # 3. Validation et cassage des cycles (DAG)
        valid_entities, cycle_warnings = break_cycles(valid_entities)
        for warning in cycle_warnings:
             emit_log(state, "warning", warning, "analyste")
             
        structure['entities'] = valid_entities

        state["analyzed_structure"] = structure
        
        # Log ce qui a été compris
        user_intent = structure.get('user_intent', '')
        scenarios_count = len(structure.get('scenarios', []))
        
        emit_log(state, "success", f"✓ {len(entities)} nœuds, {scenarios_count} scénarios", "analyste")
        if user_intent:
            emit_log(state, "info", f"💡 {user_intent}", "analyste")

        return state

    except json.JSONDecodeError as e:
        emit_log(state, "error", f"✗ JSON invalide: {str(e)}", "analyste")
        state["errors"].append({"step": "analyste", "error": f"JSON invalide: {str(e)}"})
        state["status"] = "error"
        return state
    except Exception as e:
        emit_log(state, "error", f"✗ Erreur: {str(e)}", "analyste")
        state["errors"].append({"step": "analyste", "error": str(e)})
        state["status"] = "error"
        return state


# ==================== EXÉCUTEUR OPTIMISÉ ====================

def generate_computation_definition(entity: dict) -> str:
    """Génère le code Python à partir de la structure analysée (PAS BESOIN DE LLM)"""
    if entity.get('type') == 'parameter':
        value = entity.get('default_value', 0)
        # String default_values cannot be stored as floats — default to 0
        if isinstance(value, str):
            value = 0
        return f"def compute():\n    return {value}"
    elif entity.get('type') == 'computed':
        inputs = entity.get('inputs', [])
        formula = entity.get('formula', '0')
        args = ', '.join(inputs) if inputs else ''
        return f"def compute({args}):\n    return {formula}"
    return "def compute():\n    return 0"


def calculate_layout_positions(entities: list[dict]) -> dict[str, tuple[float, float]]:
    """
    Calcule les positions des nœuds en Python (PAS BESOIN DE LLM).
    Layout simple: paramètres en haut, calculés en bas, triés par dépendances.
    """
    positions = {}
    
    # Séparer paramètres et calculés
    parameters = [e for e in entities if e.get('type') == 'parameter']
    computed = [e for e in entities if e.get('type') == 'computed']
    
    # Paramètres: ligne 0
    for i, entity in enumerate(parameters):
        positions[entity['id']] = (i * 300.0, 0.0)
    
    # Calculés: triés par niveau de dépendance
    # Niveau = max(niveau des inputs) + 1
    levels = {}
    for entity in computed:
        entity_id = entity['id']
        inputs = entity.get('inputs', [])
        if not inputs:
            levels[entity_id] = 1
        else:
            # Calculer le niveau basé sur les dépendances
            max_level = 0
            for inp in inputs:
                if inp in levels:
                    max_level = max(max_level, levels[inp])
                elif any(e['id'] == inp and e.get('type') == 'parameter' for e in entities):
                    max_level = max(max_level, 0)
            levels[entity_id] = max_level + 1
    
    # Grouper par niveau
    level_groups: dict[int, list] = {}
    for entity in computed:
        level = levels.get(entity['id'], 1)
        if level not in level_groups:
            level_groups[level] = []
        level_groups[level].append(entity)
    
    # Positionner par niveau
    for level, group in sorted(level_groups.items()):
        for i, entity in enumerate(group):
            positions[entity['id']] = (i * 300.0, level * 250.0)
    
    return positions


async def executeur(state: PipelineState) -> PipelineState:
    """
    Crée le projet en BDD à partir de la structure analysée.
    - Génère le code Python en Python (pas de LLM)
    - Calcule les positions en Python (pas de LLM)
    - Déduit les edges des inputs (pas de LLM)
    """
    emit_log(state, "info", "⚙️ Création du projet...", "executeur")
    state["status"] = "executing"

    structure = state["analyzed_structure"]
    if not structure:
        emit_log(state, "error", "✗ Structure manquante", "executeur")
        state["status"] = "error"
        return state

    entities = structure.get('entities', [])
    scenarios = structure.get('scenarios', [])
    
    # Calculer les positions en Python
    positions = calculate_layout_positions(entities)
    
    db = SessionLocal()
    try:
        # 1. Créer le projet
        project_id = f"proj_{uuid.uuid4().hex[:8]}"
        
        # Construire la description enrichie avec l'intent compris
        user_intent = structure.get('user_intent', '')
        base_description = structure.get('description', '')
        full_description = base_description
        if user_intent:
            full_description = f"{user_intent}\n\n{base_description}" if base_description else user_intent
            emit_log(state, "info", f"💡 Objectif compris: {user_intent}", "executeur")
        
        user_id = state["user_id"] if state["user_id"] else None
        demo_token = state.get("demo_token")

        project = Project(
            id=project_id,
            name=structure.get('project_name', 'Nouveau projet'),
            user_id=user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            generation_prompt=state["prompt"],
            description=full_description if full_description else None,
            public_view_token=demo_token,  # Set for demo projects
        )
        db.add(project)
        db.flush()
        state["project_id"] = project_id
        emit_log(state, "success", f"✓ Projet créé: {project_id}", "executeur")

        # 2. Créer les nœuds (paramètres d'abord, puis calculés)
        created_nodes = {}
        
        # Trier: paramètres first
        sorted_entities = sorted(entities, key=lambda e: 0 if e.get('type') == 'parameter' else 1)
        
        for entity in sorted_entities:
            node_id = str(uuid.uuid4())
            slug = entity['id']
            pos_x, pos_y = positions.get(slug, (0.0, 0.0))
            
            # Générer le code en Python (PAS DE LLM)
            computation_definition = generate_computation_definition(entity)
            
            node = Node(
                id=node_id,
                slug=slug,
                project_id=project_id,
                label=entity.get('label', slug),
                unit=entity.get('unit', ''),
                status='imposed' if entity.get('type') == 'parameter' else 'implied',
                computation_definition=computation_definition,
                value_computed=None,
                notes=entity.get('description'),
                pos_x=pos_x,
                pos_y=pos_y,
                confidence=1.0
            )
            db.add(node)
            db.flush()
            created_nodes[slug] = node_id
            emit_log(state, "success", f"  ✓ Nœud: {entity.get('label', slug)}", "executeur")

        # 3. Créer les edges (DÉDUITS des inputs, PAS DE LLM)
        for entity in entities:
            if entity.get('type') == 'computed':
                target_slug = entity['id']
                for input_slug in entity.get('inputs', []):
                    if input_slug in created_nodes and target_slug in created_nodes:
                        if input_slug != target_slug:  # Éviter auto-référence
                            edge = Edge(
                                id=str(uuid.uuid4()),
                                project_id=project_id,
                                source=created_nodes[input_slug],
                                target=created_nodes[target_slug],
                                edge_type="dependency"
                            )
                            db.add(edge)
                            emit_log(state, "info", f"  → {input_slug} → {target_slug}", "executeur")

        db.flush()

        # 4. Créer les scénarios
        for scenario_def in scenarios:
            scenario_id = str(uuid.uuid4())
            scenario = Scenario(
                id=scenario_id,
                project_id=project_id,
                name=scenario_def.get('name', 'Scénario'),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(scenario)
            db.flush()

            for override in scenario_def.get('overrides', []):
                entity_slug = override.get('entity_id')
                if entity_slug and entity_slug in created_nodes:
                    override_obj = ScenarioNodeOverride(
                        id=str(uuid.uuid4()),
                        scenario_id=scenario_id,
                        node_id=created_nodes[entity_slug],
                        mode="value",
                        override_value=override.get('value')
                    )
                    db.add(override_obj)

            emit_log(state, "success", f"  ✓ Scénario: {scenario_def.get('name')}", "executeur")

        # 5. Appliquer le layout final (optionnel, les positions sont déjà calculées)
        try:
            all_nodes = db.query(Node).filter(Node.project_id == project_id).all()
            all_edges = db.query(Edge).filter(Edge.project_id == project_id).all()
            apply_layout(all_nodes, all_edges)
            db.flush()
        except Exception:
            pass  # Layout optionnel

        db.commit()
        state["created_nodes"] = created_nodes
        emit_log(state, "success", f"✓ {len(created_nodes)} nœuds créés", "executeur")

        if settings.INSIGHTS_ENABLED:
            threading.Thread(
                target=run_insights_task,
                args=(project_id, state["user_id"], settings.INSIGHTS_AI_ENABLED),
                daemon=True,
            ).start()

        return state

    except Exception as e:
        db.rollback()
        emit_log(state, "error", f"✗ Erreur: {str(e)}", "executeur")
        state["errors"].append({"step": "executeur", "error": str(e)})
        state["status"] = "error"
        return state

    finally:
        db.close()


# ==================== VALIDATEUR ====================

async def validateur(state: PipelineState) -> PipelineState:
    """Valide que tous les nœuds s'exécutent correctement."""
    if state["status"] == "error":
        return state

    emit_log(state, "info", "✅ Validation...", "validateur")
    state["status"] = "validating"

    project_id = state["project_id"]
    if not project_id:
        emit_log(state, "error", "✗ project_id manquant", "validateur")
        state["status"] = "error"
        return state

    db = SessionLocal()
    try:
        nodes = db.query(Node).filter(Node.project_id == project_id).all()

        # 1. Validation syntaxique
        syntax_errors = []
        for node in nodes:
            if node.computation_definition:
                err = validate_algorithm(node.computation_definition)
                if err:
                    syntax_errors.append({
                        "node_id": node.id,
                        "slug": node.slug,
                        "label": node.label,
                        "code": node.computation_definition,
                        "error": f"Syntaxe: {err}"
                    })

        if syntax_errors:
            emit_log(state, "error", f"✗ {len(syntax_errors)} erreurs de syntaxe", "validateur")
            state["errors"].extend(syntax_errors)
            return state

        # 2. Exécution
        computed_values = compute_all_nodes(db, project_id)

        if "_error" in computed_values:
            emit_log(state, "error", f"✗ {computed_values['_error']['error']}", "validateur")
            state["errors"].append({"step": "validateur", "error": computed_values["_error"]["error"]})
            return state

        # 3. Vérifier les erreurs individuelles
        nodes = db.query(Node).filter(Node.project_id == project_id).all()
        nodes_with_errors = []
        
        for node in nodes:
            if node.computation_error:
                nodes_with_errors.append({
                    "node_id": node.id,
                    "slug": node.slug,
                    "label": node.label,
                    "code": node.computation_definition,
                    "error": node.computation_error
                })

        if nodes_with_errors:
            emit_log(state, "error", f"✗ {len(nodes_with_errors)} nœuds en erreur", "validateur")
            state["errors"].extend(nodes_with_errors)
            return state

        emit_log(state, "success", "✓ Tous les calculs OK", "validateur")
        state["status"] = "success"

        # Auto-generate dashboard v2 in background
        threading.Thread(
            target=generate_dashboard_for_project,
            args=(project_id,),
            daemon=True,
        ).start()

        return state

    except Exception as e:
        emit_log(state, "error", f"✗ Erreur: {str(e)}", "validateur")
        state["errors"].append({"step": "validateur", "error": str(e)})
        return state

    finally:
        db.close()


# ==================== CORRECTEUR CHIRURGICAL ====================

CORRECTION_PROMPT = """Tu es un expert Python pour "SmartGraph".

ERREUR dans le nœud "{slug}" (label: "{label}"):
Code actuel:
```python
{code}
```
Erreur: {error}

Inputs disponibles (slugs): {available_inputs}

Corrige le code. Règles:
- def compute({args}): return expression
- Ne retourne JAMAIS None/null, ni une liste, ni un dict, ni un tuple
- INTERDIT : list comprehensions `[x for x in ...]`, boucles `for`/`while`, indexing `variable[i]`
- Chaque input est un SCALAIRE (float) — ne l'indexe pas
- Si la formule tente de calculer "par niveau/catégorie", remplace par un agrégat scalaire (somme, moyenne, etc.)
- Utilise UNIQUEMENT les inputs listés

Retourne UNIQUEMENT le JSON:
{{"corrected_code": "def compute(...): return ..."}}"""


async def agent_correcteur(state: PipelineState) -> PipelineState:
    """
    Correcteur CHIRURGICAL: corrige seulement les nœuds en erreur.
    Ne recrée PAS tout le projet.
    """
    state["retry_count"] += 1
    emit_log(state, "info", f"🔧 Correction #{state['retry_count']}...", "correcteur")
    state["status"] = "correcting"

    if state["retry_count"] > 3:
        emit_log(state, "error", "✗ Max tentatives atteint", "correcteur")
        state["status"] = "error"
        return state

    errors = state["errors"]
    if not errors:
        state["status"] = "success"
        return state

    db = SessionLocal()
    try:
        project_id = state["project_id"]
        all_nodes = db.query(Node).filter(Node.project_id == project_id).all()
        all_slugs = [n.slug for n in all_nodes]

        # Corriger chaque nœud en erreur
        corrected_count = 0
        remaining_errors = []

        for error in errors:
            if "node_id" not in error:
                remaining_errors.append(error)
                continue

            node = db.query(Node).filter(Node.id == error["node_id"]).first()
            if not node:
                remaining_errors.append(error)
                continue

            # Récupérer les inputs de ce nœud
            edges = db.query(Edge).filter(Edge.target == node.id).all()
            input_node_ids = [e.source for e in edges]
            input_nodes = db.query(Node).filter(Node.id.in_(input_node_ids)).all() if input_node_ids else []
            input_slugs = [n.slug for n in input_nodes]

            prompt = CORRECTION_PROMPT.format(
                slug=node.slug,
                label=node.label,
                code=error.get("code", node.computation_definition),
                error=error.get("error", "Unknown"),
                available_inputs=input_slugs or ["(aucun - c'est un paramètre)"],
                args=", ".join(input_slugs) if input_slugs else ""
            )

            try:
                response_text, prompt_tokens, completion_tokens = await call_gemini(prompt, temperature=0.1)
                
                # Track token usage
                state["total_prompt_tokens"] = state.get("total_prompt_tokens", 0) + prompt_tokens
                state["total_completion_tokens"] = state.get("total_completion_tokens", 0) + completion_tokens
                
                correction = json.loads(response_text)
                corrected_code = correction.get("corrected_code", "")

                if corrected_code and "def compute" in corrected_code:
                    node.computation_definition = corrected_code
                    node.computation_error = None
                    db.add(node)
                    corrected_count += 1
                    emit_log(state, "success", f"  ✓ {node.slug} corrigé", "correcteur")
                else:
                    remaining_errors.append(error)
            except Exception as e:
                emit_log(state, "warning", f"  ⚠️ Échec correction {node.slug}: {e}", "correcteur")
                remaining_errors.append(error)

        db.commit()
        state["errors"] = remaining_errors
        
        if corrected_count > 0:
            emit_log(state, "info", f"✓ {corrected_count} nœuds corrigés, revalidation...", "correcteur")
        
        return state

    except Exception as e:
        emit_log(state, "error", f"✗ Erreur correction: {str(e)}", "correcteur")
        state["errors"].append({"step": "correcteur", "error": str(e)})
        state["status"] = "error"
        return state

    finally:
        db.close()


# ==================== DÉCISION DE RETRY ====================

def should_retry(state: PipelineState) -> Literal["correcteur", "success", "error"]:
    """Décision: retry, succès ou erreur finale"""
    if state["status"] == "success":
        return "success"
    
    # Seulement les erreurs avec node_id sont corrigeables
    correctable_errors = [e for e in state["errors"] if "node_id" in e]
    
    if correctable_errors and state["retry_count"] < 3:
        return "correcteur"

    return "error"


# ==================== CONSTRUCTION DU GRAPHE LANGGRAPH ====================

workflow = StateGraph(PipelineState)

# Ajouter les nœuds (PLUS de planificateur !)
workflow.add_node("analyste", agent_analyste)
workflow.add_node("executeur", executeur)
workflow.add_node("validateur", validateur)
workflow.add_node("correcteur", agent_correcteur)

# Définir les transitions
workflow.set_entry_point("analyste")
workflow.add_edge("analyste", "executeur")  # Direct ! Pas de planificateur
workflow.add_edge("executeur", "validateur")

# Branchement conditionnel
workflow.add_conditional_edges(
    "validateur",
    should_retry,
    {
        "correcteur": "correcteur",
        "success": END,
        "error": END
    }
)

# Le correcteur retourne au validateur (pas à l'exécuteur !)
workflow.add_edge("correcteur", "validateur")

# Compiler
agent_graph = workflow.compile()


# ==================== POINT D'ENTRÉE PUBLIC ====================

async def run_agent_pipeline(prompt: str, user_id: str) -> tuple[str | None, list[dict]]:
    """
    Point d'entrée principal du pipeline multi-agents OPTIMISÉ.
    
    Optimisations:
    - 1 appel LLM au lieu de 2
    - Edges et positions calculés en Python
    - Correcteur chirurgical (pas de recréation totale)
    """
    initial_state: PipelineState = {
        "prompt": prompt,
        "user_id": user_id,
        "analyzed_structure": None,
        "project_id": None,
        "created_nodes": {},
        "errors": [],
        "retry_count": 0,
        "logs": [],
        "status": "initializing",
        "total_prompt_tokens": 0,
        "total_completion_tokens": 0,
    }

    final_state = None
    async for state in agent_graph.astream(initial_state):
        final_state = state

    if final_state:
        last_node_key = list(final_state.keys())[-1]
        last_state = final_state[last_node_key]
        return last_state.get("project_id"), last_state.get("logs", [])

    return None, []
