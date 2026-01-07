# syntax=docker/dockerfile:1.4

# =============================================================================
# Stage 1: Builder - Compile dependencies and prepare wheels
# =============================================================================
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

# Install build dependencies (only needed for building, not runtime)
# Using cache mount for apt to speed up rebuilds
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy only dependency files first (maximize cache hit rate)
COPY requirements.txt /build/

# Install dependencies with pip cache mount
# Build wheels for all dependencies INCLUDING transitive dependencies
RUN --mount=type=cache,target=/root/.cache/pip \
    pip wheel --wheel-dir /build/wheels -r requirements.txt

# =============================================================================
# Stage 2: Runtime - Minimal production image
# =============================================================================
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install only runtime dependencies (no build tools)
# psycopg[binary] doesn't need libpq-dev, only libpq5 runtime library
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements.txt for installation
COPY requirements.txt /app/

# Copy pre-built wheels from builder stage
COPY --from=builder /build/wheels /tmp/wheels

# Install Python packages using wheels (very fast, no compilation)
# --find-links tells pip to look for wheels in /tmp/wheels first
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --find-links=/tmp/wheels -r requirements.txt \
    && rm -rf /tmp/wheels

# Copy application code LAST to maximize cache hits on code changes
# Thanks to .dockerignore, only necessary files are copied
COPY alembic/ /app/alembic/
COPY alembic.ini /app/
COPY app/ /app/app/
COPY infra/ /app/infra/

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["/app/start.sh"]
