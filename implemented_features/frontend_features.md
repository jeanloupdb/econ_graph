# Fonctionnalités Frontend Smart Graph

## Vue d'ensemble

Le frontend est une Single Page Application (SPA) construite avec **Next.js 16 (App Router)** et **React 19**, offrant une interface riche pour la modélisation économique.

## Stack Technique

- **Framework :** Next.js 16 (App Router)
- **Langage :** TypeScript
- **Styling :** Tailwind CSS + Shadcn/UI (Radix Primitives)
- **État :** Zustand (Global Store) + React Query (Server State)
- **Visualisation :** React Flow (Rendu) + elkjs (Layout automatique)
- **Animations :** Framer Motion (Transitions, Zen Mode)
- **Formulaires :** React Hook Form + Zod

## Structure de l'Application (`src/app`)

### 1. Authentification (`/login`, `/register`)

- Pages dédiées avec formulaires validés par Zod.
- Composant `RegisterVisualization` pour une expérience d'onboarding visuelle.

### 2. Dashboard (`/dashboard` - Protected)

Le centre de contrôle principal.

- **Liste des Projets :** Vue Grille (`AgentProjectCard`) ou Liste (`AgentProjectRow`).
- **Integrated Agent Builder :**
  - Visualisation temps réel de la création par l'IA.
  - **Candy Cane Progress :** Barre de progression animée et lissée (`useSmoothedProgress`).
  - **Live Subtitle :** Logs en direct avec pulsation.
  - **Mini-Graph :** Compteur de nœuds animé.
- **AiMagicBar :** Barre d'input flottante ("Intelligent Canvas").
  - **Elastic Pill :** Input auto-extensible.
  - **Zen Mode :** Éditeur plein écran pour les prompts complexes.

### 3. Éditeur de Graphe (`/project/[id]` - Protected)

L'espace de travail de modélisation.

- **Canvas Infini :** Basé sur React Flow, avec support du zoom et du pan.
- **Nœuds Personnalisés (`src/components/graph/nodes`) :**
  - `BaseNode` : Structure commune.
  - `ParameterNode` : Pour les valeurs fixes (Input).
  - `ComputedNode` : Pour les formules (Output).
  - `CompositeNode` : Pour les groupes logiques.
- **Panneaux Latéraux (`src/components/panels`) :**
  - `InspectorPanel` : Édition des propriétés du nœud sélectionné.
  - `CodeEditor` : Éditeur Monaco pour les formules Python.
  - `SmartFixDialog` : Assistant IA pour corriger les erreurs de syntaxe.
  - `ScenarioPanel` : Gestion des scénarios et overrides.

### 4. Viewer Public (`/viewer/[token]`)

- Interface en lecture seule pour partager des graphes publiquement.
- Accès sécurisé via `public_view_token`.

## Gestion de l'État (`src/store`)

L'application utilise **Zustand** pour un état global performant, divisé en plusieurs "slices" :

- **`agentState.ts` :** État du pipeline de création IA (logs, étape courante, erreurs).
- **`graphState.ts` :** Données du graphe actif (nœuds, edges, sélection, viewport).
- **`projectState.ts` :** Métadonnées du projet et liste des projets.
- **`scenarioState.ts` :** Scénario actif et overrides appliqués.
- **`uiState.ts` :** État de l'interface (panneaux ouverts, thème, modales).

## Composants Clés (`src/components`)

- **`agent/` :** Composants liés à l'IA (Status, Logs, Progress).
- **`ui/` :** Bibliothèque de composants atomiques (Boutons, Inputs, Dialogues) basée sur Shadcn.
- **`landing/` :** Composants de la page d'accueil (Hero, Features).
- **`modals/` :** Modales globales (ShareProject, Settings).

## Logique Graphique (`src/graph`)

- **`hooks/` :** Hooks spécialisés pour React Flow (`useGraphLayout`, `useNodeOperations`).
- **`context/` :** Contextes React pour partager l'état du graphe sans prop drilling.
- **`providers/` :** Wrappers pour initialiser React Flow et React Query.

## Performance & UX

- **Optimistic Updates :** Feedback immédiat lors des actions utilisateur.
- **Streaming SSE :** Connexion temps réel au backend pour les logs IA.
- **Lissage (Smoothing) :** Algorithmes pour fluidifier les barres de progression.
