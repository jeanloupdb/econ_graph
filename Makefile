.PHONY: up down logs ps rebuild shell-api shell-web shell-db clean restart

# Start all services (with build)
up:
	docker compose up --build -d

# Stop all services and remove volumes
down:
	docker compose down -v

# View logs from all services
logs:
	docker compose logs -f

# Show status of all services
ps:
	docker compose ps

# Rebuild all services without cache
rebuild:
	docker compose build --no-cache

# Open a bash shell in the API container
shell-api:
	docker compose exec api bash

# Open a shell in the web container
shell-web:
	docker compose exec web sh

# Open a psql shell in the database
shell-db:
	docker compose exec db psql -U econ_user -d econ

# Clean everything (containers, volumes, images)
clean:
	docker compose down -v --rmi all

# Restart all services
restart:
	docker compose restart

# View API logs only
logs-api:
	docker compose logs -f api

# View web logs only
logs-web:
	docker compose logs -f web

# View database logs only
logs-db:
	docker compose logs -f db

# Run migrations manually
migrate:
	docker compose exec api alembic upgrade head

# Reset DB and seed a simple demo project with short IDs
.PHONY: db-reset-simple
db-reset-simple:
	@echo "Resetting DB and seeding demo project 'p'..."
	docker compose run --rm api python -m scripts.reset_and_seed

# Hard reset: drop all data and start with empty schema (no Alembic)
.PHONY: db-reset-empty
db-reset-empty:
	@echo "Dropping containers and volumes..."
	docker compose down -v || true
	@echo "Recreating fresh services..."
	docker compose up -d
	@echo "Ensuring API created schema on startup (wait few seconds)"
	sleep 3

# Help
help:
	@echo "Available commands:"
	@echo "  make up          - Start all services (with build)"
	@echo "  make down        - Stop all services and remove volumes"
	@echo "  make logs        - View logs from all services"
	@echo "  make ps          - Show status of all services"
	@echo "  make rebuild     - Rebuild all services without cache"
	@echo "  make shell-api   - Open bash shell in API container"
	@echo "  make shell-web   - Open shell in web container"
	@echo "  make shell-db    - Open psql shell in database"
	@echo "  make clean       - Clean everything (containers, volumes, images)"
	@echo "  make restart     - Restart all services"
	@echo "  make logs-api    - View API logs only"
	@echo "  make logs-web    - View web logs only"
	@echo "  make logs-db     - View database logs only"
	@echo "  make migrate     - Run migrations manually"
	@echo "  make db-reset-simple - Reset DB and seed a simple demo project"
	@echo "  make db-reset-empty  - Drop all data/volumes and recreate empty schema"
	@echo "  make db-seed-bonds  - Seed 'b' project (Bonds Decision)"
	@echo "  make db-seed-api   - Seed 'api' project (API Demo)"

.PHONY: db-seed-bonds
db-seed-bonds:
	@echo "Seeding project 'b' (Bonds Decision)..."
	docker compose run --rm api python -m scripts.seed_bonds

.PHONY: db-seed-api
db-seed-api:
	@echo "Seeding project 'api' (API Demo)..."
	docker compose run --rm api python -m scripts.seed_api_demo
