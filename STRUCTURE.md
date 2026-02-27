# ChessArena Project Structure

## Overview

This document describes the complete monorepo structure for the ChessArena platform.

## Directory Structure

```
chess-arena/
│
├── frontend/                      # Next.js 14 Frontend Application
│   ├── app/                       # Next.js App Router
│   │   ├── page.tsx              # Home page
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Global styles
│   ├── public/                    # Static assets
│   │   ├── next.svg
│   │   └── vercel.svg
│   ├── .eslintrc.json            # ESLint configuration
│   ├── .gitignore                # Git ignore rules
│   ├── .prettierrc               # Prettier configuration
│   ├── next.config.js            # Next.js configuration
│   ├── package.json              # Frontend dependencies
│   ├── postcss.config.mjs        # PostCSS configuration
│   ├── tailwind.config.ts        # Tailwind CSS configuration
│   └── tsconfig.json             # TypeScript configuration
│
├── backend/                       # NestJS Backend Application
│   ├── src/                       # Source code
│   │   ├── app.controller.spec.ts # Controller tests
│   │   ├── app.controller.ts     # Main controller
│   │   ├── app.module.ts         # Root module
│   │   ├── app.service.ts        # Main service
│   │   └── main.ts               # Application entry point
│   ├── test/                      # E2E tests
│   │   ├── app.e2e-spec.ts       # E2E test suite
│   │   └── jest-e2e.json         # Jest E2E configuration
│   ├── .eslintrc.js              # ESLint configuration
│   ├── .gitignore                # Git ignore rules
│   ├── .prettierrc               # Prettier configuration
│   ├── nest-cli.json             # NestJS CLI configuration
│   ├── package.json              # Backend dependencies
│   ├── tsconfig.build.json       # TypeScript build configuration
│   └── tsconfig.json             # TypeScript configuration
│
├── shared/                        # Shared Types Package
│   ├── src/                       # Source code
│   │   ├── types/                # Type definitions
│   │   │   ├── common.types.ts   # Common types (TimeControl, UserRole, etc.)
│   │   │   ├── game.types.ts     # Game-related types
│   │   │   ├── tournament.types.ts # Tournament-related types
│   │   │   └── user.types.ts     # User-related types
│   │   └── index.ts              # Package exports
│   ├── .eslintrc.js              # ESLint configuration
│   ├── .gitignore                # Git ignore rules
│   ├── .prettierrc               # Prettier configuration
│   ├── package.json              # Shared package dependencies
│   └── tsconfig.json             # TypeScript configuration
│
├── .gitignore                     # Root git ignore
├── package.json                   # Root package.json with monorepo scripts
├── README.md                      # Project documentation
└── STRUCTURE.md                   # This file

```

## Package Details

### Frontend (`/frontend`)

**Purpose**: User-facing web application built with Next.js 14

**Key Technologies**:
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- ESLint + Prettier

**Scripts**:
- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Backend (`/backend`)

**Purpose**: RESTful API and WebSocket server built with NestJS

**Key Technologies**:
- NestJS
- TypeScript
- Jest for testing
- ESLint + Prettier

**Scripts**:
- `npm run start:dev` - Start development server with watch mode (port 3001)
- `npm run build` - Build for production
- `npm run start:prod` - Start production server
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run E2E tests
- `npm run lint` - Run ESLint

### Shared (`/shared`)

**Purpose**: Shared TypeScript types and utilities used by both frontend and backend

**Key Technologies**:
- TypeScript
- ESLint

**Exports**:
- Common types (TimeControl, UserRole, GameStatus, etc.)
- User types (User, UserProfile)
- Game types (Game, GameMove)
- Tournament types (Tournament, TournamentPlayer)

**Scripts**:
- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode for development
- `npm run lint` - Run ESLint

## Monorepo Scripts

From the root directory, you can run:

- `npm run install:all` - Install dependencies for all packages
- `npm run dev` - Run both frontend and backend in development mode
- `npm run dev:frontend` - Run only frontend
- `npm run dev:backend` - Run only backend
- `npm run build` - Build all packages
- `npm run lint` - Lint all packages

## Configuration Files

### ESLint
- Frontend: `.eslintrc.json` (Next.js config)
- Backend: `.eslintrc.js` (NestJS + Prettier)
- Shared: `.eslintrc.js` (TypeScript)

### Prettier
- All packages have `.prettierrc` for consistent code formatting
- Frontend uses double quotes
- Backend and Shared use single quotes

### TypeScript
- All packages use TypeScript with strict type checking
- Shared types are compiled to `dist/` for consumption by other packages

## Next Steps

After setting up the structure, the next tasks will include:

1. Setting up Prisma ORM and PostgreSQL database
2. Implementing authentication module
3. Creating chess engine service
4. Setting up WebSocket gateways
5. Building frontend components and pages
6. Implementing tournament management
7. Adding ELO rating system

## Development Workflow

1. Install all dependencies: `npm run install:all`
2. Start development servers: `npm run dev`
3. Frontend will be available at http://localhost:3000
4. Backend API will be available at http://localhost:3001
5. Make changes to code - both servers will hot-reload
6. Run linting before committing: `npm run lint`
