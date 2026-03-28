# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Smart Graph** converts natural language descriptions into interactive visual economic models. Users describe a model (e.g., "inflation dynamics with Taylor rule"), and AI generates a dependency graph with formulas, scenarios, and economic validation.

- **Frontend**: `econ_graph_web/` — Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui + React Flow + Zustand
- **Backend**: `econ_graph_api/` — FastAPI + SQLAlchemy 2.0 + Alembic + Google Gemini 2.0 + LangGraph
- **Database**: PostgreSQL 16
- **Deployment**: Vercel (frontend) + Fly.io (backend)

## Development Commands

### Docker (recommended for full stack)
```bash
docker-compose up -d          # Start all services (db, api, web)
docker-compose down
docker-compose logs -f api    # Follow API logs
docker-compose logs -f web
docker-compose exec api pytest -v --cov=app   # Run backend tests
```

### Frontend only (`econ_graph_web/`)
```bash
npm run dev          # Dev server on http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run gen:api      # Regenerate OpenAPI TypeScript types from backend
```

### Backend only (`econ_graph_api/`)
```bash
python -m uvicorn app.main:app --reload   # Dev server on http://localhost:8000
pytest -v --cov=app                        # Run all tests
pytest -v tests/test_computation.py       # Run a single test file
alembic upgrade head                       # Apply migrations
alembic revision --autogenerate -m "..."  # Create new migration
alembic downgrade -1                       # Rollback last migration
```

### Environment Setup
```bash
cp .env.example .env
# Set GOOGLE_GENERATIVE_AI_API_KEY in .env (required for AI features)
# DB defaults work with docker-compose as-is
```

## Architecture

### Request Flow
```
Browser → Next.js (App Router) → FastAPI → PostgreSQL
                                         → Google Gemini 2.0 (AI)
                                         → RestrictedPython (formula eval)
```

### Key Frontend Routes
- `/` — Landing page
- `/(protected)/dashboard` — Main hub: project list + conversational wizard + Excel import
- `/(protected)/graph?projectId=...` — Graph editor: React Flow canvas + column panels (Parameters, Calculations, Results) + AI chat panel
- `/viewer/[token]` — Public read-only share

### Core Data Model
- **Project** — Container with status (draft/completed), wizard_state (JSONB), generation_prompt
- **Node** — Graph node with formula (Python expression), computed value, unit, display type
- **Edge** — Directed dependency (source → target)
- **Scenario** — Alternative what-if analysis; stores formula_overrides (JSONB) on top of base model
- **Composite** — Reusable node group template
- **ProjectNotification** — AI-generated alerts with action_prompt for auto-send
- **dashboard_config** — JSONB field on Project storing AI-generated widget layout (kpi, bar_chart, comparison, explanation widgets)

### AI Pipeline (LangGraph multi-agent)
Located in `econ_graph_api/app/api/ai/` and `app/services/agent_pipeline.py`:
1. **Wizard** — Multi-turn conversation gathering model requirements
2. **Graph Generator** — Creates node/edge structure from description
3. **Formula Creator** — Writes Python formulas for each node
4. **Project Chat** — Ongoing Q&A + graph modification via tool calls (`project_chat_streaming.py`)
5. **Dashboard Generator** — `POST /ai/dashboard/{project_id}/generate` — generates widget layout JSON persisted in `project.dashboard_config`; widgets rendered in `DashboardView.tsx` (tabs: Graph / Dashboard on graph page)

**Critical**: Gemini system prompts must be passed via `system_instruction=` on the `GenerativeModel` constructor, NOT as a user message in chat history. Passing it as a user message causes tool calls to silently fail.

### Computation Engine
`app/services/computation.py` — Executes node formulas using RestrictedPython with a 5-second timeout. Formulas reference other nodes by slug. Computation is topologically sorted by dependency graph.

### State Management (Frontend)
All Zustand stores in `econ_graph_web/src/store/`:
- `projectState` — Active project, nodes, edges, dirty tracking
- `uiState` — Panel visibility, selected node, sidebar state
- `agentState` — AI streaming state, agent mode
- `scenarioState` — Active scenario, overrides
- `excelImportState` — Excel import flow

### Notification System
- Max 3 notifications displayed per project at once
- Rule `missing_critical_data` is checked internally but never displayed to users
- Transient notifications replace the bell icon for 8 seconds with progress bar
- If notification has `action_prompt`, it auto-sends to AI after display

## Code Conventions

- **Language**: UI labels in French; code, variables, and APIs in English
- **Design**: Dark theme, zinc palette, Linear.app-inspired minimal UI
- **TypeScript**: Build errors are intentionally ignored (`ignoreBuildErrors: true` in next.config.ts) — there are pre-existing TS errors in `composites/page.tsx`, `public/[token]/page.tsx`, `CommandPalette.tsx`, `GraphCanvas.tsx`, `ProjectChatPanel.tsx`, `HeroMobile.tsx`. Do not fix these unless specifically asked.
- **Styling**: Tailwind utility classes, no CSS modules. Dark bg palette: `#0c0c0e` (sidebar), `#0e0e11` (main). Primary buttons: `bg-zinc-200 hover:bg-white text-zinc-900`.

## Database Migrations

Migrations in `econ_graph_api/alembic/versions/` are numbered sequentially (001–017). Migration 007 depends on revision `4c81d9590bc6` (collaborators migration), not 006. Run `alembic upgrade head` — this runs automatically on container startup via `start.sh`.

## API Documentation

FastAPI auto-generates interactive docs at `http://localhost:8000/docs` (Swagger UI).
