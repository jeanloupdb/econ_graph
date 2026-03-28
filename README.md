# Smart Graph

**L'IA qui transforme vos idées en modèles économiques visuels.**

Décrivez votre problème en langage naturel. Smart Graph génère automatiquement un modèle de calcul interactif, vous permettant de simuler des scénarios et de prendre des décisions éclairées.

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/AI-Gemini_2.0-4285F4?logo=google" alt="Gemini AI" />
</p>

---

## ✨ Pourquoi Smart Graph ?

### Le problème

- **Excel** : Puissant mais opaque. Les formules sont cachées dans des cellules. Impossible de voir la logique d'un modèle.
- **Python/Notebooks** : Flexibles mais techniques. Inaccessibles aux non-développeurs.
- **Outils No-Code** : Simples mais limités. Pas de vrais calculs, pas de scénarios.

### La solution

Smart Graph combine le meilleur des trois mondes :

| Aspect        | Smart Graph                                 |
| ------------- | ------------------------------------------- |
| **Interface** | Graphe visuel où chaque nœud = une variable |
| **Calculs**   | Python sécurisé sous le capot               |
| **Création**  | IA générative : décrivez, c'est construit   |
| **Analyse**   | Scénarios comparables visuellement          |

---

## 🎯 Fonctionnalités Clés

### 1. Génération IA de Modèles

```
"Crée un modèle de rentabilité pour un e-commerce avec
panier moyen, taux de conversion, coût d'acquisition"
```

→ Smart Graph génère automatiquement les nœuds, les relations et les formules.

### 2. Graphe de Calcul Visuel

- Chaque **nœud** représente une variable (CA, marge, coûts...)
- Chaque **arête** représente une dépendance
- Les valeurs se **propagent** automatiquement quand vous modifiez un paramètre

### 3. Scénarios & Comparaison

- Créez des scénarios alternatifs ("Optimiste", "Pessimiste", "Base")
- **Comparez** deux scénarios côte à côte
- Visualisez les **différences** en un coup d'œil (🟢 hausse, 🔴 baisse)

### 4. Composites (Templates Réutilisables)

- Encapsulez un groupe de calculs en un **composite**
- Réutilisez-le dans d'autres projets
- Comme des **fonctions** pour vos modèles économiques

### 5. Intelligence Économique (Règles Engine)

Le moteur de règles vérifie automatiquement la **cohérence économique** :

- Identité de Fisher (taux nominal = taux réel + inflation)
- Règle de Taylor (politique monétaire)
- Courbe de taux (normalité/inversion)
- Et 10+ autres règles macroéconomiques

---

## 🚀 Cas d'Usage

| Utilisateur            | Cas d'usage                                | Valeur                                            |
| ---------------------- | ------------------------------------------ | ------------------------------------------------- |
| **Analyste Financier** | Modèle DCF, valorisation, P&L prévisionnel | Visualiser les dépendances, tester des hypothèses |
| **Économiste**         | Modèle macro (PIB, inflation, emploi)      | Cohérence automatique, scénarios politiques       |
| **Entrepreneur**       | Business plan, unit economics              | Générer rapidement un modèle avec l'IA            |
| **Consultant**         | Templates réutilisables pour clients       | Composites exportables, gain de temps             |
| **Enseignant**         | Démontrer des relations économiques        | Interface visuelle pédagogique                    |

---

## 🔧 Architecture Technique

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ React Flow   │  │ Zustand      │  │ TanStack Query       │  │
│  │ (Graphe)     │  │ (State)      │  │ (Cache & Mutations)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (FastAPI)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ AI Engine    │  │ Computation  │  │ Rules Engine         │  │
│  │ (Gemini 2.0) │  │ (Restricted  │  │ (Coherence Checks)   │  │
│  │              │  │  Python)     │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Scenarios    │  │ Composites   │  │ Multi-Agent Pipeline │  │
│  │ & Overrides  │  │ & Templates  │  │ (LangGraph)          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE (PostgreSQL)                      │
│  Projects │ Nodes │ Edges │ Scenarios │ Composites │ Users     │
└─────────────────────────────────────────────────────────────────┘
```

### Stack Technique

**Frontend**

- Next.js 16 (App Router)
- React Flow (graphe interactif)
- Tailwind CSS + shadcn/ui
- Zustand (state management)
- TanStack Query (data fetching)

**Backend**

- FastAPI (Python 3.11)
- SQLAlchemy 2.0 (ORM)
- Alembic (migrations)
- RestrictedPython (exécution sécurisée)
- Google Gemini 2.0 Flash (IA)
- LangGraph (pipeline multi-agents)

**Infrastructure**

- PostgreSQL 16 (Neon)
- Vercel (frontend)
- Fly.io (backend)
- Docker (dev local)

---

## 📦 Structure du Projet

```
econ_graph/
├── econ_graph_api/           # Backend FastAPI
│   ├── app/
│   │   ├── api/              # Routes (nodes, scenarios, ai, compute...)
│   │   ├── models/           # Modèles SQLAlchemy
│   │   ├── schemas/          # Schémas Pydantic
│   │   ├── services/         # Logique métier
│   │   │   ├── computation.py      # Moteur de calcul
│   │   │   ├── agent_pipeline.py   # Pipeline IA multi-agents
│   │   │   └── ...
│   │   └── logic/            # Rules engine
│   ├── alembic/              # Migrations DB
│   └── tests/                # Tests pytest
│
├── econ_graph_web/           # Frontend Next.js
│   ├── src/
│   │   ├── app/              # Routes (App Router)
│   │   ├── components/       # Composants React
│   │   │   ├── graph/        # Canvas, nœuds, edges
│   │   │   ├── panels/       # Inspector, Scenario, Algorithm
│   │   │   └── ...
│   │   ├── store/            # Zustand stores
│   │   └── lib/              # Utilitaires, hooks, API client
│   └── public/               # Assets statiques
│
├── docker-compose.yml        # Orchestration dev
└── Makefile                  # Commandes pratiques
```

---

## 🛠 Installation & Développement

### Prérequis

- Docker & Docker Compose
- Node.js 20+ (pour dev frontend local)
- Python 3.11+ (pour dev backend local)

### Démarrage Rapide (Docker)

```bash
# 1. Cloner le repo
git clone https://github.com/jeanloupdb/econ_graph.git
cd econ_graph

# 2. Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos clés (GOOGLE_GENERATIVE_AI_API_KEY, etc.)

# 3. Lancer tous les services
make up

# 4. Accéder à l'application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Commandes Make

```bash
make up          # Démarrer tous les services
make down        # Arrêter les services
make logs        # Voir les logs
make logs-api    # Logs backend uniquement
make logs-web    # Logs frontend uniquement
make shell-api   # Shell dans le container API
make migrate     # Appliquer les migrations
make rebuild     # Rebuild complet
```

---

## 🌐 Déploiement Production

| Service  | Plateforme | URL                                 |
| -------- | ---------- | ----------------------------------- |
| Frontend | Vercel     | Auto-deploy sur push `main`         |
| Backend  | Fly.io     | `fly deploy` dans `econ_graph_api/` |
| Database | Neon       | PostgreSQL serverless               |

```bash
# Déployer le backend
cd econ_graph_api
fly deploy

# Le frontend se déploie automatiquement via Vercel
git push origin main
```

---

## 🔐 Sécurité

- **Exécution Sandboxée** : Le code Python utilisateur est exécuté via RestrictedPython avec :
  - Aucun import autorisé
  - Timeout de 5 secondes
  - Accès limité aux fonctions mathématiques
- **Authentification** : JWT avec refresh tokens
- **CORS** : Configuration stricte par environnement
- **Variables sensibles** : Gérées via secrets Fly.io / Vercel

---

## 📊 API Endpoints Principaux

### Nœuds

```http
GET    /nodes              # Liste des nœuds
POST   /nodes              # Créer un nœud
PATCH  /nodes/{id}         # Modifier un nœud
DELETE /nodes/{id}         # Supprimer un nœud
```

### Calculs

```http
POST   /compute/all        # Recalculer tout le projet
POST   /compute/nodes/{id} # Recalculer un nœud
```

### Scénarios

```http
GET    /projects/{id}/scenarios           # Liste des scénarios
POST   /projects/{id}/scenarios           # Créer un scénario
POST   /scenarios/{id}/compute            # Calculer avec scénario
POST   /scenarios/compare                 # Comparer deux scénarios
```

### IA

```http
POST   /ai/generate          # Générer du code Python
POST   /ai/graph-action      # Générer des nœuds/scénarios
POST   /ai/smart-fix         # Corriger une erreur de code
POST   /ai/agent-project-create  # Créer un projet complet (multi-agents)
GET    /ai/agent-status/{id}     # Stream SSE du pipeline
```

### Règles Économiques

```http
GET    /rules/check         # Vérifier la cohérence
GET    /rules/catalog       # Catalogue des règles
```

---

## 🧪 Tests

```bash
# Backend
cd econ_graph_api
pytest -v --cov=app

# Avec Docker
make test
```

---

## 📈 Roadmap

- [x] Génération IA de modèles
- [x] Scénarios avec comparaison visuelle
- [x] Composites réutilisables
- [x] Rules Engine (cohérence économique)
- [x] Pipeline multi-agents (LangGraph)
- [ ] Export Excel/PDF
- [ ] Collaboration temps réel
- [ ] Marketplace de composites
- [ ] Intégrations API externes (Bloomberg, INSEE...)

---

## 🤝 Contribution

Les contributions sont bienvenues ! Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour les guidelines.

---

## 📄 Licence

MIT © 2026 Jean-Loup

---

<p align="center">
  <strong>Smart Graph</strong> — Simulez vos décisions avant de les prendre.
</p>
