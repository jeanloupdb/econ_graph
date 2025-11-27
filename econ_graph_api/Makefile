.PHONY: help up down logs shell migrate rev api fmt clean build build-fast rebuild warm-cache test prune

# Enable BuildKit for all Docker commands
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

##@ General

help: ## Display this help message
	@awk 'BEGIN {FS = ":.*##"; printf "\n$(BLUE)Usage:$(NC)\n  make $(GREEN)<target>$(NC)\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development

up: ## Start all services (with optimized build)
	@echo "$(BLUE)Starting services with BuildKit...$(NC)"
	docker compose up -d --build

down: ## Stop and remove all containers and volumes
	@echo "$(BLUE)Stopping services...$(NC)"
	docker compose down -v

logs: ## Follow application logs
	docker compose logs -f api

shell: ## Open shell in API container
	docker compose exec api bash

api: ## Run API locally (without Docker)
	uvicorn app.main:app --reload

##@ Database

migrate: ## Run database migrations
	docker compose run --rm migrate

rev: ## Create a new Alembic migration
	@read -p "Migration message: " msg; \
	docker compose run --rm api alembic revision --autogenerate -m "$$msg"

db-reset-simple: ## Reset DB and seed a simple demo project with short IDs
	@echo "$(YELLOW)Resetting DB and seeding demo project 'p'...$(NC)"
	docker compose run --rm api python scripts/reset_and_seed.py

##@ Building (Optimized)

build: ## Build Docker image with BuildKit and full caching
	@echo "$(BLUE)Building with BuildKit (cache enabled)...$(NC)"
	DOCKER_BUILDKIT=1 docker compose build --progress=plain

build-fast: ## Ultra-fast build using all cache layers
	@echo "$(GREEN)Fast build (maximum cache usage)...$(NC)"
	DOCKER_BUILDKIT=1 docker compose build

rebuild: ## Rebuild only changed layers (code changes)
	@echo "$(GREEN)Rebuilding changed layers...$(NC)"
	docker compose build api

warm-cache: ## Pre-build and cache all layers
	@echo "$(BLUE)Warming up build cache...$(NC)"
	DOCKER_BUILDKIT=1 docker build \
		--target builder \
		--cache-from econ-api:builder \
		-t econ-api:builder \
		.
	DOCKER_BUILDKIT=1 docker build \
		--cache-from econ-api:builder \
		--cache-from econ-api:latest \
		-t econ-api:latest \
		.
	@echo "$(GREEN)Cache warmed! Future builds will be much faster.$(NC)"

build-no-cache: ## Build without any cache (clean build)
	@echo "$(YELLOW)Building without cache (slow)...$(NC)"
	docker compose build --no-cache --progress=plain

##@ Testing

test: ## Run tests in Docker container
	@echo "$(BLUE)Running tests...$(NC)"
	docker compose run --rm api pytest -v --cov=app --cov-report=term-missing

test-local: ## Run tests locally (requires local Python setup)
	pytest -v --cov=app --cov-report=term-missing

test-watch: ## Run tests in watch mode
	docker compose run --rm api pytest-watch

##@ Code Quality

fmt: ## Format code with black and ruff
	@echo "$(BLUE)Formatting code...$(NC)"
	docker compose run --rm api bash -c "pip install -q black ruff && black app/ tests/ && ruff check --fix app/ tests/"

lint: ## Lint code with ruff
	docker compose run --rm api bash -c "pip install -q ruff && ruff check app/ tests/"

check: fmt lint test ## Run all quality checks (format, lint, test)

##@ Cleanup

clean: ## Clean Python cache files
	@echo "$(BLUE)Cleaning Python cache...$(NC)"
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true

prune: ## Remove unused Docker resources (images, containers, volumes)
	@echo "$(YELLOW)Pruning Docker resources...$(NC)"
	docker system prune -af --volumes
	@echo "$(GREEN)Docker resources cleaned!$(NC)"

prune-cache: ## Clear Docker build cache
	@echo "$(YELLOW)Clearing Docker build cache...$(NC)"
	docker builder prune -af
	@echo "$(GREEN)Build cache cleared!$(NC)"

##@ Monitoring

ps: ## Show running containers
	docker compose ps

stats: ## Show container resource usage
	docker stats --no-stream

health: ## Check API health endpoint
	@echo "$(BLUE)Checking API health...$(NC)"
	@curl -sf http://localhost:8000/health | jq . || echo "$(YELLOW)API not responding$(NC)"

metrics: ## Show Prometheus metrics
	@curl -s http://localhost:8000/metrics | head -20

##@ Benchmarking

benchmark-build: ## Benchmark build times (cold and warm)
	@echo "$(BLUE)Benchmarking build performance...$(NC)"
	@echo "\n$(YELLOW)Cold build (no cache):$(NC)"
	@time docker compose build --no-cache --progress=plain 2>&1 | tail -1
	@echo "\n$(YELLOW)Warm build (with cache):$(NC)"
	@time docker compose build --progress=plain 2>&1 | tail -1
	@echo "\n$(YELLOW)Code-only rebuild:$(NC)"
	@touch app/main.py
	@time docker compose build --progress=plain 2>&1 | tail -1

.DEFAULT_GOAL := help
