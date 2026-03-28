from google.generativeai.types import FunctionDeclaration, Tool

GRAPH_TOOLS = Tool(function_declarations=[
    FunctionDeclaration(
        name="update_node_formula",
        description="Modifie la logique de calcul d'un élément. Utilise quand l'utilisateur veut changer comment un résultat ou calcul est déterminé.",
        parameters={
            "type": "object",
            "properties": {
                "node_slug": {
                    "type": "string",
                    "description": "Identifiant de l'élément à modifier"
                },
                "new_inputs": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Liste des identifiants des éléments utilisés dans la formule"
                },
                "new_formula": {
                    "type": "string",
                    "description": "Nouvelle expression de calcul (ex: 'budget * taux' ou 'max(0, revenu - cout)')"
                }
            },
            "required": ["node_slug", "new_inputs", "new_formula"]
        }
    ),
    FunctionDeclaration(
        name="convert_to_parameter",
        description="Transforme un calcul automatique en paramètre modifiable avec une valeur fixe.",
        parameters={
            "type": "object",
            "properties": {
                "node_slug": {
                    "type": "string",
                    "description": "Identifiant de l'élément à transformer"
                },
                "fixed_value": {
                    "type": "number",
                    "description": "La valeur fixe à assigner"
                }
            },
            "required": ["node_slug", "fixed_value"]
        }
    ),
    FunctionDeclaration(
        name="delete_edge",
        description="Retire un élément de la formule d'un autre (supprime une relation de calcul). Préfère update_node_formula quand possible.",
        parameters={
            "type": "object",
            "properties": {
                "source_slug": {
                    "type": "string",
                    "description": "Identifiant de l'élément à retirer de la formule"
                },
                "target_slug": {
                    "type": "string",
                    "description": "Identifiant de l'élément dont on modifie la formule"
                }
            },
            "required": ["source_slug", "target_slug"]
        }
    ),
    FunctionDeclaration(
        name="get_node_details",
        description="Récupère les détails complets d'un élément : sa formule, sa valeur et les éléments dont il dépend.",
        parameters={
            "type": "object",
            "properties": {
                "node_slug": {
                    "type": "string",
                    "description": "Identifiant de l'élément à examiner"
                }
            },
            "required": ["node_slug"]
        }
    ),
    FunctionDeclaration(
        name="detect_cycles",
        description="Vérifie la cohérence du modèle et détecte les références circulaires.",
        parameters={
            "type": "object",
            "properties": {},
            "required": []
        }
    ),
    FunctionDeclaration(
        name="create_node",
        description="Crée un nouvel élément dans le modèle : un paramètre (valeur modifiable) ou un calcul (formule automatique).",
        parameters={
            "type": "object",
            "properties": {
                "label": {"type": "string", "description": "Nom affiché de l'élément"},
                "slug": {"type": "string", "description": "Identifiant unique (snake_case). Généré automatiquement si absent."},
                "node_type": {"type": "string", "enum": ["parameter", "computed"], "description": "'parameter' pour un paramètre modifiable, 'computed' pour un calcul automatique"},
                "unit": {"type": "string", "description": "Unité (ex: EUR, %, années)"},
                "notes": {"type": "string", "description": "Description explicative"},
                "default_value": {"type": "number", "description": "Valeur initiale (pour les paramètres)"},
                "formula": {"type": "string", "description": "Expression de calcul (pour les calculs)"},
                "inputs": {"type": "array", "items": {"type": "string"}, "description": "Identifiants des éléments utilisés dans la formule"},
            },
            "required": ["label", "node_type"]
        }
    ),
    FunctionDeclaration(
        name="update_node_fields",
        description="Met à jour les propriétés d'un élément : nom, unité, description, valeur ou formule.",
        parameters={
            "type": "object",
            "properties": {
                "node_slug": {"type": "string", "description": "Identifiant de l'élément"},
                "label": {"type": "string"},
                "unit": {"type": "string"},
                "notes": {"type": "string"},
                "status": {"type": "string", "enum": ["observed", "imposed", "implied", "unknown", "invalid"]},
                "value": {"type": "number", "description": "Nouvelle valeur (pour les paramètres)"},
                "formula": {"type": "string", "description": "Nouvelle expression de calcul"},
                "inputs": {"type": "array", "items": {"type": "string"}, "description": "Éléments utilisés dans la formule"},
            },
            "required": ["node_slug"]
        }
    ),
    FunctionDeclaration(
        name="delete_node",
        description="Supprime un élément du modèle. ATTENTION : demande toujours confirmation à l'utilisateur avant d'utiliser cet outil.",
        parameters={
            "type": "object",
            "properties": {
                "node_slug": {"type": "string", "description": "Identifiant de l'élément à supprimer"}
            },
            "required": ["node_slug"]
        }
    ),
    FunctionDeclaration(
        name="create_scenario",
        description="Crée un nouveau scénario (visible dans les onglets de la colonne Paramètres).",
        parameters={
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "color": {"type": "string", "description": "Couleur hex (ex: #22c55e)"}
            },
            "required": ["name"]
        }
    ),
    FunctionDeclaration(
        name="update_scenario",
        description="Renomme ou modifie un scénario existant.",
        parameters={
            "type": "object",
            "properties": {
                "scenario_id": {"type": "string"},
                "name": {"type": "string"},
                "color": {"type": "string"}
            },
            "required": ["scenario_id"]
        }
    ),
    FunctionDeclaration(
        name="delete_scenario",
        description="Supprime un scénario.",
        parameters={
            "type": "object",
            "properties": {
                "scenario_id": {"type": "string"}
            },
            "required": ["scenario_id"]
        }
    ),
    FunctionDeclaration(
        name="set_scenario_override",
        description="Définit la valeur d'un paramètre dans un scénario spécifique (ex: 'dans le scénario Croissance, le Prix passe à 150').",
        parameters={
            "type": "object",
            "properties": {
                "scenario_id": {"type": "string"},
                "node_slug": {"type": "string"},
                "mode": {"type": "string", "enum": ["value", "formula"]},
                "value": {"type": "number"},
                "code": {"type": "string", "description": "Expression de calcul si mode=formula"}
            },
            "required": ["scenario_id", "node_slug", "mode"]
        }
    ),
    FunctionDeclaration(
        name="delete_scenario_override",
        description="Retire la valeur spécifique d'un paramètre dans un scénario (revient à la valeur de base).",
        parameters={
            "type": "object",
            "properties": {
                "scenario_id": {"type": "string"},
                "node_slug": {"type": "string"}
            },
            "required": ["scenario_id", "node_slug"]
        }
    ),
    FunctionDeclaration(
        name="recompute_project",
        description="Relance tous les calculs du modèle pour mettre à jour les résultats.",
        parameters={
            "type": "object",
            "properties": {
                "scenario_id": {"type": "string", "description": "Optionnel : recalculer avec un scénario spécifique"}
            },
            "required": []
        }
    ),
    FunctionDeclaration(
        name="list_computation_errors",
        description="Liste les éléments qui ont des erreurs de calcul.",
        parameters={
            "type": "object",
            "properties": {},
            "required": []
        }
    ),
    FunctionDeclaration(
        name="create_sensitivity_analysis",
        description="Crée automatiquement des scénarios de variation (+/- X%) pour analyser l'impact de chaque paramètre sur un résultat.",
        parameters={
            "type": "object",
            "properties": {
                "target_slug": {"type": "string", "description": "Identifiant du résultat à analyser"},
                "delta_percent": {"type": "number", "description": "Variation en % (ex: 10 pour +/-10%)"},
                "prefix": {"type": "string", "description": "Préfixe optionnel des noms de scénarios"}
            },
            "required": ["target_slug"]
        }
    ),
    FunctionDeclaration(
        name="search_nodes",
        description="Recherche un élément par nom ou identifiant.",
        parameters={
            "type": "object",
            "properties": {
                "query": {"type": "string"}
            },
            "required": ["query"]
        }
    ),
    FunctionDeclaration(
        name="list_parameters",
        description="Liste tous les paramètres modifiables du modèle (colonne gauche).",
        parameters={
            "type": "object",
            "properties": {},
            "required": []
        }
    ),
    FunctionDeclaration(
        name="list_nodes",
        description="Liste tous les éléments du modèle avec filtres optionnels.",
        parameters={
            "type": "object",
            "properties": {
                "limit": {"type": "number"},
                "offset": {"type": "number"},
                "status": {"type": "string", "enum": ["observed", "imposed", "implied", "unknown", "invalid"]},
                "query": {"type": "string"}
            },
            "required": []
        }
    ),
    FunctionDeclaration(
        name="list_edges",
        description="Liste les relations de calcul entre éléments (usage interne, ne pas mentionner à l'utilisateur).",
        parameters={
            "type": "object",
            "properties": {
                "limit": {"type": "number"},
                "offset": {"type": "number"}
            },
            "required": []
        }
    ),
    FunctionDeclaration(
        name="list_scenarios",
        description="Liste les scénarios du modèle et le nombre de paramètres modifiés dans chacun.",
        parameters={
            "type": "object",
            "properties": {},
            "required": []
        }
    ),
    FunctionDeclaration(
        name="list_overrides",
        description="Liste les valeurs modifiées dans un scénario spécifique.",
        parameters={
            "type": "object",
            "properties": {
                "scenario_id": {"type": "string"}
            },
            "required": ["scenario_id"]
        }
    ),
    FunctionDeclaration(
        name="list_providers",
        description="Liste les éléments connectés à des sources de données externes.",
        parameters={
            "type": "object",
            "properties": {},
            "required": []
        }
    ),
    FunctionDeclaration(
        name="get_project_summary",
        description="Retourne un résumé global du modèle : nombre d'éléments, erreurs, scénarios.",
        parameters={
            "type": "object",
            "properties": {},
            "required": []
        }
    ),
    FunctionDeclaration(
        name="regenerate_dashboard",
        description="Régénère le tableau de bord Insights (widgets KPI et groupes de paramètres) en tenant compte de l'état actuel du modèle. À utiliser après avoir créé ou modifié des nœuds importants, ou quand l'utilisateur demande de mettre à jour les visualisations.",
        parameters={
            "type": "object",
            "properties": {},
            "required": []
        }
    ),
])
