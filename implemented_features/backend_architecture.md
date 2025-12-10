# Architecture Backend Econ Graph

## Vue d'ensemble
Le backend est une API RESTful construite avec **FastAPI**, conçue pour être performante, typée et asynchrone. Elle sert de cerveau à l'application, gérant la persistance des données, la logique métier et l'orchestration des agents IA.

## Stack Technique
*   **Framework :** FastAPI (Python 3.11+)
*   **Base de Données :** PostgreSQL (via SQLAlchemy ORM)
*   **IA & Agents :** LangGraph + Google Gemini Pro 1.5/Flash
*   **Validation :** Pydantic v2
*   **Streaming :** SSE (Server-Sent Events) pour les logs agents
*   **Observabilité :** Prometheus (via `prometheus-fastapi-instrumentator`)
*   **Migrations :** Alembic (avec fallback manuel `ensure_node_columns` au démarrage)

## Structure du Code (`econ_graph_api/`)

### 1. Core (`app/core/`)
*   **Config :** Gestion des variables d'environnement (`.env`) via Pydantic Settings.
*   **Database :** Configuration de la session SQLAlchemy et du moteur de base de données.
*   **Security :** Gestion de l'authentification complète via JWT (Bearer Token).
    *   Dépendances : `get_current_user` vérifie la validité du token et le statut de l'utilisateur.
    *   Rôles : Support des superusers (`get_current_superuser`).
*   **Middleware :**
    *   `CORSMiddleware` : Configuration permissive pour le développement.
    *   `Instrumentator` : Exposition des métriques Prometheus sur `/metrics`.

### 2. Modèles de Données (`app/models/`)
Les modèles SQLAlchemy définissent le schéma de la base de données :
*   **User :** Utilisateurs de l'application.
*   **Project :** Conteneur principal pour un graphe économique.
*   **Node :** Les entités du graphe (Paramètres, Calculs, Composites).
    *   *Attributs clés :* `slug`, `computation_definition` (code Python), `pos_x`, `pos_y`.
*   **Edge :** Les relations de dépendance entre les nœuds.
*   **Scenario :** Variantes de simulation avec des overrides de valeurs.

### 3. API Routes (`app/api/`)
*   **`auth.py` :** Endpoints d'authentification.
*   **`projects.py` :** CRUD complet des projets.
*   **`nodes.py` :** Gestion des nœuds (création, modification, suppression).
*   **`edges.py` :** Gestion des liens.
*   **`scenarios.py` :** Gestion des scénarios et des overrides.
*   **`ai.py` :** Points d'entrée pour les fonctionnalités IA (Génération de code, Actions sur le graphe, Pipeline Agent).

### 4. Services (`app/services/`)
*   **`computation.py` :** Moteur de calcul du graphe.
    *   Analyse topologique pour déterminer l'ordre de calcul.
    *   Exécution sécurisée du code Python des nœuds.
    *   Détection de cycles.
*   **`agent_pipeline.py` :** Orchestration du système multi-agents (voir `agent_system.md`).

## Flux de Données IA
1.  **Requête :** Le frontend envoie un prompt utilisateur.
2.  **Traitement :**
    *   Pour les actions simples (ex: "Corrige ce nœud"), un appel direct à Gemini est fait.
    *   Pour la création de projet, le **Pipeline Multi-Agents** est déclenché en tâche de fond (`BackgroundTasks`).
3.  **Streaming :** Le frontend s'abonne à un flux SSE (`/ai/agent-status/{task_id}`) pour recevoir les logs en temps réel.

## Sécurité & Performance
*   **Exécution de Code :** Le code Python des nœuds est exécuté dans un environnement contrôlé (bien que nécessitant une sandbox plus stricte pour la prod).
*   **Async :** Utilisation intensive de `async/await` pour ne pas bloquer le serveur lors des appels LLM ou DB.
