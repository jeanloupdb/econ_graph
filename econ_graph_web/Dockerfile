# syntax=docker/dockerfile:1.4

# =============================================================================
# Development Dockerfile for Next.js
# =============================================================================
FROM node:22-slim

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./

RUN --mount=type=cache,target=/root/.npm \
    npm install

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 3000

# Default command (can be overridden in docker-compose.yml)
CMD ["npm", "run", "dev"]
