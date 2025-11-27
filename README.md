# Econ Graph

Economic graph visualization platform with FastAPI backend and Next.js frontend.

## Project Structure

```
econ_graph/
├── econ_graph_api/           # FastAPI backend
│   ├── app/                  # Application code
│   ├── alembic/              # Database migrations
│   ├── infra/                # Infrastructure (Docker, SQL scripts)
│   ├── Dockerfile            # API Docker configuration
│   └── requirements.txt      # Python dependencies
│
├── econ_graph_web/           # Next.js frontend
│   ├── src/                  # Source code
│   │   ├── app/              # Next.js App Router
│   │   └── styles/           # Global styles
│   ├── public/               # Static assets
│   ├── Dockerfile            # Web Docker configuration
│   └── package.json          # Node dependencies
│
├── docker-compose.yml        # Orchestrates all services
├── .env                      # Environment variables
├── .env.example              # Environment template
├── Makefile                  # Convenience commands
└── README.md                 # This file
```

## Services

The application consists of three main services:

1. **db** - PostgreSQL 16 database
2. **api** - FastAPI backend (Python 3.11)
3. **web** - Next.js frontend (Node 22)

## Quick Start

### Prerequisites

- Docker
- Docker Compose

### First Time Setup

1. Clone the repository and navigate to the project root:

```bash
cd econ_graph
```

2. Copy the environment template:

```bash
cp .env.example .env
```

3. Start all services:

```bash
docker compose up --build -d
```

Or using Make:

```bash
make up
```

### Accessing the Application

Once started, the services will be available at:

- **Web Frontend**: [http://localhost:3000](http://localhost:3000)
- **API Backend**: [http://localhost:8000](http://localhost:8000)
- **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Database**: `localhost:5432`

## Development

### Using Make Commands

The project includes a Makefile with convenient commands:

```bash
make up          # Start all services (with build)
make down        # Stop all services and remove volumes
make logs        # View logs from all services
make ps          # Show status of all services
make rebuild     # Rebuild all services without cache
make shell-api   # Open bash shell in API container
make shell-web   # Open shell in web container
make shell-db    # Open psql shell in database
make restart     # Restart all services
make logs-api    # View API logs only
make logs-web    # View web logs only
make logs-db     # View database logs only
make migrate     # Run migrations manually
make clean       # Clean everything
make help        # Show all available commands
```

### Using Docker Compose Directly

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild a specific service
docker compose build api
docker compose up -d api
```

### Hot Reload

Both the API and web services are configured for hot reload in development:

- **API**: Mounted volume at `./econ_graph_api/app` with `--reload` flag
- **Web**: Mounted volumes at `./econ_graph_web/src` and `./econ_graph_web/public`

Changes to source code will automatically trigger reloads.

### Database Migrations

Migrations run automatically when starting the services via the `migrate` service.

To run migrations manually:

```bash
make migrate
# or
docker compose exec api alembic upgrade head
```

To create a new migration:

```bash
docker compose exec api alembic revision --autogenerate -m "description"
```

## Environment Variables

The application uses the following environment variables (see [.env.example](.env.example)):

### API Configuration

- `APP_ENV` - Application environment (local, dev, prod)
- `APP_HOST` - API host (default: 0.0.0.0)
- `APP_PORT` - API port (default: 8000)

### Database Configuration

- `DB_HOST` - Database host (default: db)
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name (default: econ)
- `DB_USER` - Database user (default: econ_user)
- `DB_PASSWORD` - Database password
- `DATABASE_URL` - Full database connection string

### Web Configuration

- `NEXT_PUBLIC_API_BASE_URL` - API base URL for browser (default: http://localhost:8000)
- `WEB_PORT` - Web server port (default: 3000)

## CORS Configuration

If you need to access the API from the frontend, ensure CORS is properly configured in the FastAPI application to allow requests from `http://localhost:3000`.

## Troubleshooting

### Port Conflicts

If you have port conflicts, modify the port mappings in [.env](.env):

```bash
APP_PORT=8001    # Change API port
WEB_PORT=3001    # Change web port
DB_PORT=5433     # Change database port
```

### Database Connection Issues

If the API can't connect to the database:

1. Check database is healthy: `docker compose ps`
2. View database logs: `make logs-db`
3. Restart services: `make restart`

### Container Build Issues

To rebuild from scratch:

```bash
make clean
make rebuild
make up
```

## Production Notes

This setup is optimized for development with hot reload and mounted volumes.

For production deployment:

1. Remove volume mounts from [docker-compose.yml](docker-compose.yml)
2. Remove `--reload` flag from API command
3. Set `NODE_ENV=production` for web service
4. Use proper secrets management for environment variables
5. Configure proper reverse proxy (nginx, traefik)
6. Enable HTTPS/SSL
7. Update CORS settings for production domain

## License

[Add your license information here]
