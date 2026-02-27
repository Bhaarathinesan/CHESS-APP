# ChessArena

ChessArena is a production-ready online chess tournament platform designed for college environments. The platform enables students and faculty to participate in real-time chess matches, join competitive tournaments, and track their progress through ELO ratings.

## Project Structure

This is a monorepo containing three main packages:

```
chess-arena/
├── frontend/          # Next.js 14 frontend application
├── backend/           # NestJS backend API
├── shared/            # Shared TypeScript types and utilities
└── package.json       # Root package.json for monorepo scripts
```

### Frontend (`/frontend`)

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Port**: 3000 (development)

### Backend (`/backend`)

- **Framework**: NestJS
- **Language**: TypeScript
- **Port**: 3001 (development)

### Shared (`/shared`)

- **Purpose**: Shared TypeScript types and utilities
- **Language**: TypeScript
- **Exports**: Common types for User, Game, Tournament, etc.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker and Docker Compose (for containerized development)

### Option 1: Docker Development (Recommended)

The easiest way to get started is using Docker, which sets up PostgreSQL, Redis, backend, and frontend automatically.

```bash
# Start all services
npm run docker:up

# Or with rebuild
npm run docker:up:build
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379

See [DOCKER.md](./DOCKER.md) for detailed Docker documentation.

### Option 2: Local Development

#### Environment Variables

Before running the application, you need to configure environment variables:

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your configuration

# Frontend
cd frontend
cp .env.example .env.local
# Edit .env.local with your configuration
```

See [ENV_SETUP.md](./ENV_SETUP.md) for detailed environment variable documentation.

#### Installation

Install dependencies for all packages:

```bash
npm run install:all
```

Or install individually:

```bash
# Root dependencies
npm install

# Frontend dependencies
cd frontend && npm install

# Backend dependencies
cd backend && npm install

# Shared package dependencies
cd shared && npm install
```

#### Setup Services

You'll need to run PostgreSQL and Redis locally:

```bash
# Using Homebrew (macOS)
brew install postgresql redis
brew services start postgresql
brew services start redis

# Or using Docker for just the databases
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=chess_dev_password postgres:16-alpine
docker run -d -p 6379:6379 redis:7-alpine
```

### Development

Run both frontend and backend concurrently:

```bash
npm run dev
```

Or run individually:

```bash
# Frontend only (http://localhost:3000)
npm run dev:frontend

# Backend only (http://localhost:3001)
npm run dev:backend
```

### Building

Build all packages:

```bash
npm run build
```

Or build individually:

```bash
npm run build:frontend
npm run build:backend
npm run build:shared
```

### Linting

Lint all packages:

```bash
npm run lint
```

Or lint individually:

```bash
npm run lint:frontend
npm run lint:backend
npm run lint:shared
```

## Docker Commands

Quick reference for Docker development:

```bash
# Start services
npm run docker:up              # Start all services
npm run docker:up:build        # Rebuild and start

# View logs
npm run docker:logs            # All services
npm run docker:logs:backend    # Backend only
npm run docker:logs:frontend   # Frontend only

# Stop services
npm run docker:down            # Stop services
npm run docker:down:volumes    # Stop and remove data

# Other commands
npm run docker:ps              # View running containers
npm run docker:restart         # Restart all services
```

See [DOCKER.md](./DOCKER.md) for comprehensive Docker documentation.

## Technology Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Zustand (state management)
- Socket.IO Client (real-time)
- chess.js (chess logic)
- react-chessboard (UI)

### Backend
- NestJS
- TypeScript
- Prisma (ORM)
- PostgreSQL (database)
- Redis (caching)
- Socket.IO (WebSocket)
- JWT (authentication)

## Features

- Real-time chess gameplay with WebSocket
- Tournament management (Swiss, Round Robin, Elimination, Arena)
- ELO rating system
- User authentication and authorization
- Spectator mode
- Post-game analysis with Stockfish
- Achievement system
- Mobile responsive PWA

## License

UNLICENSED - Private project
