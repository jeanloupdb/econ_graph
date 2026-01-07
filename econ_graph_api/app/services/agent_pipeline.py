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
from typing import TypedDict, Literal
from datetime import datetime

from langgraph.graph import StateGraph, END
import google.generativeai as genai

from app.core.config import settings
from app.core.db import SessionLocal
from app.models import Project, Node, Edge, Scenario, ScenarioNodeOverride
from app.services.computation import compute_all_nodes, validate_algorithm
from app.services.layout import apply_layout


# Configuration Gemini - Modèle STABLE
genai.configure(api_key=settings.GOOGLE_GENERATIVE_AI_API_KEY)
GEMINI_MODEL = 'gemini-2.0-flash'  # Stable, pas exp


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
Tu es aussi un CONSEILLER qui comprend ce que l'utilisateur veut VRAIMENT accomplir.

## TA MISSION

L'utilisateur décrit un besoin, parfois vague. Tu dois :
1. **COMPRENDRE L'OBJECTIF RÉEL** : Quel problème l'utilisateur essaie-t-il de résoudre ?
2. **CONCEVOIR UN MODÈLE UTILE** : Qui l'aidera VRAIMENT à prendre des décisions
3. **ANTICIPER SES BESOINS** : Inclure les variables auxquelles il n'a pas pensé

## EXEMPLES DE MODÈLES CONVERGENTS

**Demande** : "gérer mon temps"
**Objectif réel** : Savoir si j'ai assez de temps libre
**Structure** :
- PARAMÈTRES (7) : Sommeil, Travail, Transport, Repas, Loisirs, Tâches ménagères, Objectif temps libre
- INTERMÉDIAIRES (2) : Total obligations, Heures disponibles
- **NŒUD FINAL (1)** : Écart temps libre vs objectif ← LA RÉPONSE
- Scénarios : "Semaine 4 jours", "Télétravail"

**Demande** : "économiser de l'argent"
**Objectif réel** : Voir ma capacité d'épargne
**Structure** :
- PARAMÈTRES (5) : Salaire, Loyer, Factures, Courses, Loisirs
- INTERMÉDIAIRES (2) : Total dépenses fixes, Total dépenses
- **NŒUD FINAL (1)** : Capacité d'épargne mensuelle ← LA RÉPONSE
- Scénarios : "Réduction loisirs 50%", "Augmentation salaire"

**Demande** : "rentabilité de mon activité"
**Objectif réel** : Connaître mon profit et ma marge
**Structure** :
- PARAMÈTRES (4) : Prix unitaire, Volume ventes, Coûts fixes, Coûts variables
- INTERMÉDIAIRES (2) : Chiffre d'affaires, Coûts totaux
- **NŒUDS FINAUX (2)** : Profit net, Marge en % ← LES RÉPONSES
- Scénarios : "Croissance volume 20%", "Hausse prix 10%"

## TEXTE UTILISATEUR

{user_prompt}

## ÉTAPE 1 : ANALYSE (réfléchis avant de répondre)

Avant de créer le modèle, demande-toi :
- Quel est le VRAI problème que l'utilisateur veut résoudre ?
- Quelles DÉCISIONS ce modèle va-t-il l'aider à prendre ?
- Quelles variables MANQUENT dans sa demande mais sont ESSENTIELLES ?
- Le modèle sera-t-il ACTIONNABLE (peut-il modifier les paramètres facilement) ?

## ÉTAPE 2 : CONCEPTION DU MODÈLE

Crée un modèle COMPLET et UTILE avec :

### PARAMÈTRES (ce que l'utilisateur peut modifier)
- type: "parameter"
- default_value: une valeur RÉALISTE et TYPIQUE
- description: explication claire de ce que représente ce paramètre

### CALCULS (les insights automatiques)
- type: "computed"  
- formula: expression Python (a + b, a * b / 100, etc.)
- inputs: liste des slugs utilisés dans la formule
- Les arguments de la formule DOIVENT correspondre aux slugs des inputs

### SCÉNARIOS (pour explorer les possibilités)
- Au moins 2-3 scénarios pertinents
- Chaque scénario = set d'overrides réalistes

## RÈGLES TECHNIQUES

1. SLUGS: snake_case, uniques (ex: "chiffre_affaires", "marge_nette")
2. POURCENTAGES: unit="%" et valeur=20 pour 20%. Dans formules: x / 100
3. FORMULES: Expressions simples. INTERDIT: return None/null
4. COHÉRENCE: Les inputs d'un nœud doivent exister comme autres nœuds
5. PAS D'AUTO-RÉFÉRENCE: Un nœud ne peut pas dépendre de lui-même
6. DESCRIPTIONS: Chaque nœud DOIT avoir une description claire et pédagogique

## FORMAT DE SORTIE (JSON)

{{
  "user_intent": "Ce que l'utilisateur veut vraiment accomplir (1-2 phrases)",
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

## RÈGLE D'OR : STRUCTURE EN ENTONNOIR

⚠️ **PEU DE NŒUDS FINAUX = BON MODÈLE**

Tu peux créer autant de nœuds intermédiaires que nécessaire, MAIS :
- **1 à 3 nœuds finaux MAXIMUM** (les métriques clés qui répondent à la question)
- Le graphe doit **CONVERGER** vers ces nœuds finaux
- Les nœuds finaux sont ceux qui n'ont PAS d'autres nœuds qui en dépendent

### Structure idéale :
```
[Paramètre 1]  [Paramètre 2]  [Paramètre 3]  [Paramètre 4]  ← Beaucoup d'entrées OK
       \            |              |            /
        \           |              |           /
         [Calcul intermédiaire 1]  [Calcul intermédiaire 2]  ← Intermédiaires OK
                    \                    /
                     \                  /
                      [MÉTRIQUE FINALE]  ← 1-3 SORTIES MAX
```

### Exemple MAUVAIS (trop de nœuds finaux) :
Demande : "gérer mon temps"
❌ Nœuds finaux multiples : Pourcentage Sommeil, Pourcentage Travail, Pourcentage Loisirs, Temps Libre, Total Heures...
→ L'utilisateur ne sait pas où regarder !

### Exemple BON (convergent) :
Demande : "gérer mon temps"
✅ Paramètres : Sommeil, Travail, Transport, Repas, Loisirs, Tâches (6 entrées OK)
✅ Intermédiaires : Total Obligations, Total Heures
✅ **1 SEUL nœud final** : "Temps Libre Disponible" ou "Écart vs Objectif"
→ L'utilisateur sait exactement quelle métrique suivre

### Question à te poser :
"Quelle est LA métrique (ou les 2-3 métriques) qui répond directement à ce que l'utilisateur veut savoir ?"
→ C'est ça ton/tes nœud(s) final(aux). Tout le reste doit y mener.

## CRITÈRES DE QUALITÉ (vérifie avant de répondre)

✓ **CONVERGENCE** : Y a-t-il 1-3 nœuds finaux maximum ?
✓ **CLARTÉ** : L'utilisateur saura-t-il immédiatement quelle métrique regarder ?
✓ **STRUCTURE** : Le graphe forme-t-il un entonnoir (beaucoup d'entrées → peu de sorties) ?
✓ Les paramètres sont-ils ACTIONNABLES ?
✓ Les scénarios sont-ils RÉALISTES et UTILES ?"""


# ==================== AGENT ANALYSTE (UNIQUE APPEL LLM) ====================

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
        for entity in entities:
            if entity.get('type') == 'computed':
                inputs = entity.get('inputs', [])
                for inp in inputs:
                    if inp not in entity_ids:
                        emit_log(state, "warning", f"⚠️ Input '{inp}' non trouvé pour {entity['id']}", "analyste")
                    if inp == entity['id']:
                        raise ValueError(f"Auto-référence détectée: {entity['id']}")

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
        
        project = Project(
            id=project_id,
            name=structure.get('project_name', 'Nouveau projet'),
            user_id=state["user_id"],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
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
- Ne retourne JAMAIS None/null
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
        "status": "initializing"
    }

    final_state = None
    async for state in agent_graph.astream(initial_state):
        final_state = state

    if final_state:
        last_node_key = list(final_state.keys())[-1]
        last_state = final_state[last_node_key]
        return last_state.get("project_id"), last_state.get("logs", [])

    return None, []
