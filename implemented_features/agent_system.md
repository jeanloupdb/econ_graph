# Système Multi-Agents (The Architect)

## Vue d'ensemble

Le cœur de l'automatisation d'Smart Graph est un pipeline séquentiel d'agents spécialisés, orchestré par **LangGraph**. Cette architecture permet de décomposer la tâche complexe de "création de modèle économique" en sous-tâches gérables et vérifiables.

## Architecture du Pipeline

Le graphe d'exécution suit ce flux :
`Analyste` -> `Planificateur` -> `Exécuteur` -> `Validateur` -> (si erreur) `Correcteur` -> `Exécuteur`

### 1. Agent Analyste (`agent_analyste`)

- **Rôle :** Comprendre le besoin métier.
- **Input :** Prompt utilisateur brut (ex: "Modèle SaaS B2B...").
- **Tâche :** Extrait une structure JSON formelle contenant les entités (Paramètres, Calculs), leurs unités, et leurs relations logiques.
- **Intelligence :** Détecte les variables implicites et propose des formules mathématiques cohérentes.

### 2. Agent Planificateur (`agent_planificateur`)

- **Rôle :** Traduire la structure en actions techniques.
- **Input :** JSON structuré de l'Analyste.
- **Tâche :** Génère une liste séquentielle d'appels API (`create_node`, `create_edge`).
- **Règles Critiques :**
  - Ordonnancement topologique (créer les dépendances avant les dépendants).
  - Génération du code Python pour chaque nœud (`def compute(...)`).

### 3. Agent Exécuteur (`executeur`)

- **Rôle :** Appliquer les changements.
- **Input :** Plan d'exécution.
- **Tâche :** Interagit avec la base de données pour créer concrètement les enregistrements.
- **Sécurité :** Vérifie les contraintes d'intégrité (pas de cycles, slugs uniques).

### 4. Agent Validateur (`validateur`)

- **Rôle :** Assurance Qualité (QA).
- **Tâche :**
  - Vérifie la syntaxe du code Python généré.
  - Tente d'exécuter le graphe complet pour détecter les erreurs de runtime (ex: division par zéro).
  - Détecte les cycles de dépendance.

### 5. Agent Correcteur (`agent_correcteur`)

- **Rôle :** Self-Healing.
- **Déclencheur :** Activé si le Validateur trouve des erreurs.
- **Tâche :** Analyse l'erreur et le plan original, puis propose un **Plan Corrigé**.
- **Limite :** Max 3 tentatives de correction avant échec (géré par `should_retry`).
- **Action :** Supprime le projet défectueux et relance l'exécution avec un plan corrigé.

## Configuration IA

- **Modèle :** `gemini-2.0-flash-exp` (rapide et efficace pour le JSON).
- **Mode JSON :** Activé (`response_mime_type: "application/json"`) pour garantir la structure.
- **Température :**
  - Analyste : 0.3 (Créativité modérée)
  - Planificateur : 0.1 (Rigueur stricte)
  - Correcteur : 0.2 (Analyse précise)

## Gestion des Logs & Streaming

- Chaque agent émet des logs structurés (Info, Success, Warning, Error).
- Ces logs sont poussés dans une `asyncio.Queue` dédiée à la tâche.
- Le frontend consomme ces logs via SSE pour afficher la progression en temps réel ("Live Subtitle").

## Robustesse

- **Prompt Engineering :** Utilisation de prompts très stricts (JSON Mode) pour garantir des sorties parsables.
- **Validation Code-Level :** Le backend ne fait pas aveuglément confiance à l'IA ; il re-valide les données avant insertion.
- **Gestion des Cycles :** Interdiction explicite des boucles (A->B->A) à la fois dans le prompt et dans le code d'exécution.
