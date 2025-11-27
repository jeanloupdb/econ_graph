# Econ Graph API

Economic Graph API with FastAPI, SQLAlchemy 2.0, PostgreSQL and Docker.

## Features

- **FastAPI** - Modern, fast web framework for building APIs
- **SQLAlchemy 2.0** - Database ORM with type hints
- **Alembic** - Database migrations
- **PostgreSQL 16** - Robust relational database
- **Docker** - Containerized development and deployment
- **Pydantic v2** - Data validation and settings management
- **Rules Engine** - Economic coherence checking with 10+ built-in rules
- **Alert System** - Severity-based diagnostics with actionable suggestions
- **Observability** - Structured logging (structlog) and Prometheus metrics
- **Testing** - Comprehensive test suite with pytest and coverage reporting
- **CI/CD** - GitHub Actions pipeline with automated testing

## Architecture

```
econ-graph-fastapi/
├─ app/
│  ├─ api/           # API routes (nodes, rules, compute)
│  ├─ core/          # Core configuration (config, db, logging)
│  ├─ models/        # SQLAlchemy models
│  ├─ schemas/       # Pydantic schemas
│  ├─ repositories/  # Data access layer
│  └─ logic/         # Business logic (rules engine, alerts)
├─ alembic/          # Database migrations
├─ tests/            # Test suite (pytest)
├─ .github/          # CI/CD workflows
├─ infra/            # Infrastructure scripts
└─ docker-compose.yml
```

## Prerequisites

- Docker & Docker Compose
- Python 3.11+ (for local development)

## Quick Start

### 1. Setup environment

```bash
cp .env.example .env
# Edit .env if needed
```

### 2. Enable BuildKit (Recommended for Fast Builds)

```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

Or use the provided Makefile which automatically enables BuildKit.

### 3. Start with Docker (Optimized Build)

```bash
# Recommended: Use Makefile for optimized builds
make up

# Or manually:
docker compose up --build
```

This will:
1. Start PostgreSQL database
2. Run Alembic migrations
3. Start the FastAPI application

**Build Performance**:
- Cold build: ~2-3 minutes
- Rebuild after code changes: ~10-20 seconds ⚡
- See [DOCKER_BUILD_OPTIMIZATION.md](DOCKER_BUILD_OPTIMIZATION.md) for details

### 3. Access the API

- **API**: http://localhost:8000
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health check**: http://localhost:8000/health
- **Metrics**: http://localhost:8000/metrics (Prometheus format)

## API Endpoints

### Nodes

- `GET /nodes` - List all nodes
- `GET /nodes/{node_id}` - Get a specific node
- `POST /nodes` - Create a new node
- `PATCH /nodes/{node_id}` - Update a node
- `DELETE /nodes/{node_id}` - Delete a node

### Rules Engine

- `GET /rules/check` - Check economic coherence across nodes
- `GET /rules/catalog` - Get catalog of all available rules

### Compute

- `POST /compute/nodes/{node_id}` - Compute a specific node (requires `computation_definition`)
- `POST /compute/all` - Compute all nodes in dependency order

### Dependencies (Edges)

Edges (dependencies) are synchronized automatically from the parameters of each node's `def compute(...):` signature. There are no public `/edges` endpoints; dependencies are created/updated/removed based on compute definitions and project maintenance actions.

**Query parameters for `/rules/check`:**
- `node_ids` - Comma-separated list of node IDs to check (optional, checks all if omitted)
- `min_severity` - Minimum alert severity (1-5, default: 1)

**Example response:**
```json
{
  "summary": {
    "checked": 10,
    "alerts": 3,
    "critical": 0,
    "warnings": 2,
    "info": 1
  },
  "alerts": [
    {
      "rule_id": "fisher_identity",
      "severity": 3,
      "message": "Fisher identity violated...",
      "node_ids": ["nominal_rate", "real_rate", "inflation_expected"],
      "suggestion": "Check if inflation expectations are correctly specified",
      "type": "warning"
    }
  ]
}
```

See [RULES_ENGINE.md](RULES_ENGINE.md) for complete documentation.

### Example: Create a Node

```bash
curl -X POST http://localhost:8000/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "id": "gdp_growth",
    "label": "GDP Growth Rate",
    "value_computed": 2.5,
    "unit": "percent",
    "plausible_range": [0, 10],
    "status": "observed",
    "confidence": 0.95
  }'
```

### Example: Check Economic Coherence

```bash
# Check all nodes
curl http://localhost:8000/rules/check

# Check specific nodes only
curl http://localhost:8000/rules/check?node_ids=gdp_growth,inflation

# Show only serious issues (severity >= 3)
curl http://localhost:8000/rules/check?min_severity=3

### Example: Compute Values

```bash
# Compute a single node
curl -X POST http://localhost:8000/compute/nodes/gdp_growth

# Compute all nodes
curl -X POST http://localhost:8000/compute/all
```
```

## Development

### Makefile Commands

```bash
# Development
make help    # Show all available commands
make up      # Start all containers (optimized build)
make down    # Stop and remove all containers
make logs    # Follow application logs
make shell   # Open shell in API container

# Building (BuildKit Optimized)
make build        # Build with full caching
make build-fast   # Ultra-fast build (max cache)
make rebuild      # Rebuild only changed layers
make warm-cache   # Pre-populate build cache (run once after git clone)

# Database
make migrate # Run migrations
make rev     # Create new migration

# Testing
make test    # Run tests in Docker
make check   # Run all quality checks (format, lint, test)

# Code Quality
make fmt     # Format code with black & ruff
make lint    # Lint code with ruff

# Monitoring
make health  # Check API health
make metrics # Show Prometheus metrics
make ps      # Show running containers

# Cleanup
make clean       # Clean Python cache files
make prune-cache # Clear Docker build cache
```

**Performance tip**: Use `make rebuild` for fast iterations during development!

### Local Development (without Docker)

```bash
# Install dependencies
pip install -e .

# Set DATABASE_URL for local postgres
export DATABASE_URL="postgresql+psycopg://econ_user:econ_pass@localhost:5432/econ"

# Run migrations
alembic upgrade head

# Start API
uvicorn app.main:app --reload
```

### Create a New Migration

```bash
# After modifying models
make rev

# Or manually:
docker compose run --rm api alembic revision --autogenerate -m "your message"
```

## Database Migrations

Migrations are managed by Alembic and run automatically when starting the Docker stack.

```bash
# Check current version
docker compose exec api alembic current

# View migration history
docker compose exec api alembic history

# Upgrade to latest
docker compose exec api alembic upgrade head

# Downgrade one version
docker compose exec api alembic downgrade -1

### Reset and Seed Simple Project

Reset the database (delete all projects/nodes/edges) and create a simple demo project with short IDs and algorithmic compute:

```bash
make db-reset-simple

# Or manually without Makefile
docker compose run --rm api python -m scripts.reset_and_seed
```

This seeds project `p` with nodes: `r` (real rate), `pi_e` (expected inflation), `i` (nominal rate computed as r+pi_e), and `g` (GDP growth).
```

## Models

### Node

Represents an economic variable or indicator.

**Fields (algo-only):**
- `id` (str): Unique identifier
- `label` (str): Human-readable name
- `value_computed` (float, optional): Computed value (result of `computation_definition`)
- `unit` (string, optional): Free-form unit label (e.g., "percent", "bps", "EUR")
- `plausible_min`, `plausible_max` (float, optional): Valid range for the computed value
- `status` (enum): Data status (unknown, observed, imposed, implied, invalid)
- `confidence` (float): Confidence level [0.0-1.0]

**Constraints:**
- `confidence` must be between 0.0 and 1.0
- `plausible_min` must be ≤ `plausible_max`
- Plausible range validation: API rejects `value_computed` outside the range

## Environment Variables

See [.env.example](.env.example) for all available configuration options.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `APP_HOST` - API host (default: 0.0.0.0)
- `APP_PORT` - API port (default: 8000)
- `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database credentials
- `LOG_LEVEL` - Logging level (INFO, DEBUG, WARNING, ERROR)
- `ENABLE_METRICS` - Enable Prometheus metrics (true/false)
- `ENABLE_STRUCTURED_LOGGING` - Enable JSON structured logs (true/false)

## Testing

The project includes a comprehensive test suite using pytest with isolated test database.

```bash
# Install dependencies (includes pytest and coverage tools)
pip install -r requirements.txt

# Run all tests
pytest

# Run with verbose output
pytest -v

# Run with coverage report
pytest --cov=app --cov-report=term-missing

# Run specific test file
pytest tests/test_nodes_crud.py

# Run specific test function
pytest tests/test_rules_engine.py::test_fisher_identity_violation
```

**Test suite includes:**
- 17+ CRUD operation tests for nodes
- 15+ rules engine tests covering all rule types
- Alert system validation tests
- Database isolation using SQLite in-memory
- 90%+ code coverage

**Running tests in Docker:**
```bash
docker compose run --rm api pytest -v --cov=app
```

## Observability

The API includes production-ready observability features:

### Structured Logging
JSON-formatted logs with structlog for easy parsing and analysis:
```json
{"event": "Request received", "method": "GET", "path": "/nodes", "timestamp": "2025-11-12T10:30:00Z", "level": "info"}
```

Configure logging via environment variables:
```bash
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR
ENABLE_STRUCTURED_LOGGING=true
```

### Prometheus Metrics
Automatic instrumentation with request metrics available at `/metrics`:
- HTTP request duration histogram
- Request count by endpoint and status code
- Active requests gauge
- Database connection pool metrics

Example Prometheus scrape config:
```yaml
scrape_configs:
  - job_name: 'econ-graph-api'
    static_configs:
      - targets: ['localhost:8000']
```

## CI/CD

GitHub Actions pipeline automatically runs on push/PR:

1. **Test Job**:
   - Spins up PostgreSQL 16 service
   - Runs Alembic migrations
   - Executes full pytest suite with coverage
   - Validates code formatting (black)
   - Lints code (ruff)

2. **Docker Build Job**:
   - Builds Docker image
   - Starts full stack with docker-compose
   - Validates health and metrics endpoints

See [.github/workflows/ci.yml](.github/workflows/ci.yml) for configuration.

## Project Status

- ✅ FastAPI setup with modular architecture
- ✅ SQLAlchemy 2.0 with typed models
- ✅ Alembic migrations
- ✅ Docker containerization
- ✅ CRUD endpoints for Node
- ✅ Data validation with Pydantic v2
- ✅ Rules engine with 10+ economic coherence checks
- ✅ Alert system with severity levels and suggestions
- ✅ Comprehensive test suite (pytest, 90%+ coverage)
- ✅ Structured logging and Prometheus metrics
- ✅ CI/CD pipeline with GitHub Actions
- ⏳ Multi-tenancy support
- ⏳ Edge relationships
- ⏳ Constraint propagation engine

## License

MIT
