# Copilot Instructions

**Smart Graph** converts natural language descriptions into interactive visual economic models. Users describe a model, and AI generates a dependency graph with formulas, scenarios, and economic validation.

- **Frontend**: `econ_graph_web/` — Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui + React Flow + Zustand
- **Backend**: `econ_graph_api/` — FastAPI + SQLAlchemy 2.0 + Alembic + Google Gemini 2.0 (gemini-2.0-flash)
- **Database**: PostgreSQL 16
- **Deployment**: Vercel (frontend) + Fly.io (backend)

## Commands

### Docker (full stack)
```bash
docker-compose up -d                            # Start all services
make up                                         # Same with optimized BuildKit build
docker-compose exec api pytest -v --cov=app     # Run all backend tests
docker-compose exec api pytest -v tests/test_alerts.py  # Run a single test file
```

### Backend (`econ_graph_api/`)
```bash
python -m uvicorn app.main:app --reload         # Dev server at http://localhost:8000
pytest -v --cov=app                             # All tests
pytest -v tests/test_alerts.py                  # Single test file
alembic upgrade head                            # Apply migrations
alembic revision --autogenerate -m "..."        # New migration
```

### Frontend (`econ_graph_web/`)
```bash
npm run dev         # Dev server at http://localhost:3000
npm run build       # Production build
npm run lint        # ESLint
npm run gen:api     # Regenerate TypeScript types from backend OpenAPI spec
```

## Architecture

### Request Flow
```
Browser → Next.js → FastAPI → PostgreSQL
                            → Google Gemini 2.0 (AI generation & chat)
                            → RestrictedPython (formula execution)
```

### Key Frontend Routes
- `/(protected)/dashboard` — Project list + AI wizard + Excel import
- `/(protected)/graph?projectId=...` — Graph editor: React Flow canvas + column panels + AI chat
- `/viewer/[token]` — Public read-only share

### Core Data Model
- **Project** — Container with `status` (draft/completed), `wizard_state` (JSONB)
- **Node** — Has `slug`, `computation_definition` (Python formula), `value_computed`, `status` enum (`unknown/observed/imposed/implied/invalid`)
- **Edge** — Directed dependency (`source_id → target_id`)
- **Scenario** — Stores `formula_overrides` (JSONB) on top of the base model
- **Composite** — Reusable node group template
- **ProjectNotification** — AI alerts; if has `action_prompt`, it auto-sends to AI after display

### AI Pipeline
Located in `econ_graph_api/app/api/ai/` and `app/services/agent_pipeline.py`:
1. **Wizard** (`wizard.py`) — Multi-turn conversation gathering requirements
2. **Graph Generator** — Creates node/edge structure from description
3. **Formula Creator** (`code_generation.py`) — Writes Python formulas per node
4. **Project Chat** (`project_chat_streaming.py`) — Q&A + graph modification via Gemini tool calls

**Critical Gemini pattern**: System prompts must be passed via `system_instruction=` on the `GenerativeModel` constructor — NOT as a user message in chat history. Passing it as a user message causes tool calls to silently fail.

### Computation Engine (`app/services/computation.py`)
- Executes node formulas using **RestrictedPython** with a 5-second timeout
- Formulas reference other nodes **by slug** (e.g., `gdp`, `inflation_rate`)
- Execution order is topologically sorted from the dependency DAG
- `import` statements are stripped from AI-generated code before execution

### State Management (Frontend — `econ_graph_web/src/store/`)
- `projectState` — Projects list, current project, CRUD, permission helpers (`canEdit`, `isOwner`)
- `graphState` — Nodes, edges, dirty tracking for the active graph
- `uiState` — Panel visibility, selected node, sidebar
- `agentState` — AI streaming state, agent mode
- `scenarioState` — Active scenario and formula overrides
- `excelImportState` — Excel import wizard flow

## Conventions

### Language
- **UI labels**: French
- **Code, variables, API names, comments**: English

### TypeScript
`ignoreBuildErrors: true` is set in `next.config.ts`. Pre-existing TS errors exist in `composites/page.tsx`, `public/[token]/page.tsx`, `CommandPalette.tsx`, `GraphCanvas.tsx`, `ProjectChatPanel.tsx`, `HeroMobile.tsx`. **Do not fix these unless explicitly asked.**

### Styling
- Tailwind utility classes only — no CSS modules
- Dark theme: sidebar `#0c0c0e`, main bg `#0e0e11`, zinc palette
- Primary buttons: `bg-zinc-200 hover:bg-white text-zinc-900`

### Database Migrations
- Migrations in `alembic/versions/` are numbered 001–016 sequentially
- Migration 007 depends on `4c81d9590bc6` (collaborators), not 006
- Migrations run automatically on container start via `start.sh`

### Node Formulas
- Written in Python, stored in `computation_definition`
- Reference other nodes by their `slug` field
- Must not use `import` statements (stripped before RestrictedPython execution)

### Notification System
- Max 3 notifications displayed per project at once
- Rule `missing_critical_data` is checked internally but never surfaced to users
- Transient notifications show for 8 seconds with progress bar, replacing the bell icon

### API Client (Frontend)
- `econ_graph_web/src/lib/api/client.ts` — handles base URL resolution for Docker/local/prod environments
- Internal DNS aliases (`api`, `backend`, `web`) are rewritten to the window hostname in the browser
