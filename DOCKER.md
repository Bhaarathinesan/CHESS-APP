# Docker Development Environment

This document describes how to use Docker for local development of the ChessArena platform.

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Docker Compose v2.0+

## Services

The development environment includes the following services:

- **PostgreSQL** (port 5432): Primary database
- **Redis** (port 6379): Cache and session storage
- **Backend** (port 3001): NestJS API server with hot-reload
- **Frontend** (port 3000): Next.js application with hot-reload

## Quick Start

### 1. Start all services

```bash
docker-compose up
```

Or run in detached mode:

```bash
docker-compose up -d
```

### 2. View logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 3. Stop services

```bash
docker-compose down
```

To also remove volumes (database data):

```bash
docker-compose down -v
```

## Development Workflow

### Hot Reload

Both frontend and backend services are configured with hot-reload:

- **Backend**: Changes to TypeScript files in `backend/src/` will automatically restart the NestJS server
- **Frontend**: Changes to files in `frontend/` will trigger Next.js fast refresh

### Accessing Services

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432
  - Database: `chess_arena`
  - User: `chess_admin`
  - Password: `chess_dev_password`
- Redis: localhost:6379

### Database Management

#### Connect to PostgreSQL

```bash
docker-compose exec postgres psql -U chess_admin -d chess_arena
```

#### Run Prisma migrations (when implemented)

```bash
docker-compose exec backend npx prisma migrate dev
```

#### Reset database

```bash
docker-compose down -v
docker-compose up -d postgres
```

### Running Commands in Containers

#### Backend commands

```bash
# Install new package
docker-compose exec backend npm install <package-name>

# Run tests
docker-compose exec backend npm test

# Run linter
docker-compose exec backend npm run lint
```

#### Frontend commands

```bash
# Install new package
docker-compose exec frontend npm install <package-name>

# Run linter
docker-compose exec frontend npm run lint
```

## Troubleshooting

### Port conflicts

If ports 3000, 3001, 5432, or 6379 are already in use, you can modify the port mappings in `docker-compose.yml`:

```yaml
ports:
  - "3002:3001"  # Map to different host port
```

### Rebuild containers

If you modify Dockerfile or package.json:

```bash
docker-compose up --build
```

### Clear everything and start fresh

```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### View container status

```bash
docker-compose ps
```

### Access container shell

```bash
# Backend
docker-compose exec backend sh

# Frontend
docker-compose exec frontend sh

# PostgreSQL
docker-compose exec postgres sh
```

## Environment Variables

Development environment variables are defined in `docker-compose.yml`. For production or custom configurations, create a `.env` file in the root directory.

Example `.env` file:

```env
# Database
POSTGRES_USER=chess_admin
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=chess_arena

# Backend
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=24h

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

## Production Deployment

The Dockerfiles in this repository are optimized for development with hot-reload. For production deployment, you should:

1. Create separate `Dockerfile.prod` files with multi-stage builds
2. Use production-ready base images
3. Set `NODE_ENV=production`
4. Use proper secrets management
5. Configure reverse proxy (nginx)
6. Set up SSL/TLS certificates

## Health Checks

Both PostgreSQL and Redis include health checks. Services will wait for dependencies to be healthy before starting:

- Backend waits for PostgreSQL and Redis
- Frontend waits for Backend

## Volumes

Persistent data is stored in Docker volumes:

- `postgres_data`: PostgreSQL database files
- `redis_data`: Redis persistence files

Application code is mounted as bind mounts for hot-reload during development.

## Network

All services run on a custom bridge network named `chess-arena-network`, allowing them to communicate using service names as hostnames.
