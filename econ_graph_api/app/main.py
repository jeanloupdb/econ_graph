from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.nodes import router as nodes_router
from app.api.projects import router as projects_router
from app.api.composites import router as composites_router
from app.api.compute import router as compute_router
from app.api.ui import router as ui_router
from app.api.providers import router as providers_router
from app.api.scenarios import router as scenarios_router
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.db import SessionLocal, Base, engine
from sqlalchemy import text
from app.models.project import Project

# Configure structured logging
configure_logging()
logger = get_logger(__name__)

app = FastAPI(
    title="Econ Graph API",
    version="0.4.0",
    description="Economic Graph API with coherence checking engine",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",  # Alternative port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(nodes_router)
# Rules router disabled: focusing API on graph CRUD only
app.include_router(compute_router)
app.include_router(projects_router)
app.include_router(ui_router)
app.include_router(providers_router)
app.include_router(scenarios_router)
app.include_router(composites_router)


# Configure Prometheus metrics
if settings.ENABLE_METRICS:
    instrumentator = Instrumentator()
    instrumentator.instrument(app).expose(app)
    logger.info("Prometheus metrics enabled", endpoint="/metrics")


@app.on_event("startup")
async def startup_event():
    """Application startup event."""
    logger.info(
        "Application starting",
        version="0.3.0",
        environment=settings.APP_ENV,
        metrics_enabled=settings.ENABLE_METRICS,
    )
    # Ensure DB schema exists (no Alembic required for fresh start)
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("DB schema ensured via create_all()")
        # Ensure required node columns exist for legacy databases
        def ensure_node_columns():
            column_statements = [
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS slug VARCHAR(128)",
                "UPDATE node SET slug = id WHERE slug IS NULL OR slug = ''",
                "ALTER TABLE node ALTER COLUMN slug SET NOT NULL",
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_node_project_slug ON node (project_id, slug)",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS composite_id VARCHAR(64)",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS unit VARCHAR(100)",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS plausible_min DOUBLE PRECISION",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS plausible_max DOUBLE PRECISION",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'unknown'",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION DEFAULT 1.0",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS value_computed DOUBLE PRECISION",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS computation_definition VARCHAR(2000)",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS last_computed_at TIMESTAMP",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS computation_error TEXT",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS notes TEXT",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS pos_x DOUBLE PRECISION",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS pos_y DOUBLE PRECISION",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS provider_enabled BOOLEAN DEFAULT FALSE",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS provider_type VARCHAR(32)",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS provider_url VARCHAR(500)",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS provider_json_path VARCHAR(200)",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS provider_timeout DOUBLE PRECISION",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS provider_cache_ttl DOUBLE PRECISION",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS provider_last_fetched_at TIMESTAMP",
                "ALTER TABLE node ADD COLUMN IF NOT EXISTS provider_last_error TEXT",
            ]
            db = SessionLocal()
            try:
                for stmt in column_statements:
                    db.execute(text(stmt))
                db.commit()
                logger.info("Node columns ensured")
            finally:
                db.close()

        try:
            ensure_node_columns()
        except Exception as e:
            logger.warning("ensure node columns failed", error=str(e))
    except Exception as e:
        logger.warning("create_all failed", error=str(e))
    # Ensure default project exists so the UI lists at least one project
    try:
        db = SessionLocal()
        try:
            existing = db.query(Project).filter(Project.id == 'default').first()
            if not existing:
                db.add(Project(id='default', name='Default Graph'))
                db.commit()
                logger.info("Created default project", project_id='default')
        finally:
            db.close()
    except Exception as e:
        logger.warning("Could not ensure default project", error=str(e))


@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event."""
    logger.info("Application shutting down")


@app.get("/health")
def health():
    """Health check endpoint."""
    logger.debug("Health check requested")
    return {"status": "ok", "version": "0.3.0"}
