# Prisma Database Schema

This directory contains the Prisma ORM configuration and database schema for the ChessArena platform.

## Overview

The database schema includes the following main entities:

### User Management
- **users**: User accounts with authentication, profile data, and preferences
- **ratings**: ELO ratings for each user across different time controls (Bullet, Blitz, Rapid, Classical)
- **rating_history**: Historical rating changes for analytics

### Games
- **games**: Chess game records with metadata, results, and timing information
- **game_moves**: Individual moves for each game with detailed move information
- **chat_messages**: In-game chat messages between players and spectators

### Tournaments
- **tournaments**: Tournament configurations and state
- **tournament_players**: Player participation and scores in tournaments
- **tournament_pairings**: Round pairings and results

### Social & Gamification
- **achievements**: Available achievements in the system
- **user_achievements**: Achievements earned by users
- **follows**: Follower relationships between users
- **notifications**: User notifications

### Moderation
- **reports**: User reports for moderation

## Database Configuration

The database connection is configured through environment variables in `.env`:

```env
DATABASE_URL="postgresql://chess_admin:chess_dev_password@localhost:5432/chess_arena"
```

For Docker development, the PostgreSQL service is defined in `docker-compose.yml`.

## Common Commands

### Generate Prisma Client
```bash
npm run prisma:generate
```

### Create a new migration
```bash
npm run prisma:migrate
```

### Apply migrations to production
```bash
npm run prisma:migrate:deploy
```

### Open Prisma Studio (Database GUI)
```bash
npm run prisma:studio
```

### Push schema changes without migrations (development only)
```bash
npm run db:push
```

### Reset database (WARNING: deletes all data)
```bash
npm run db:reset
```

## Schema Features

### Enums
- **UserRole**: SUPER_ADMIN, TOURNAMENT_ADMIN, PLAYER, SPECTATOR
- **TimeControl**: BULLET, BLITZ, RAPID, CLASSICAL
- **GameStatus**: PENDING, ACTIVE, COMPLETED, ABORTED
- **GameResult**: WHITE_WIN, BLACK_WIN, DRAW
- **TournamentFormat**: SWISS, ROUND_ROBIN, SINGLE_ELIMINATION, DOUBLE_ELIMINATION, ARENA
- **TournamentStatus**: CREATED, REGISTRATION_OPEN, REGISTRATION_CLOSED, IN_PROGRESS, ROUND_IN_PROGRESS, ROUND_COMPLETED, COMPLETED, CANCELLED
- **PairingResult**: WHITE_WIN, BLACK_WIN, DRAW, BYE
- **ReportStatus**: PENDING, REVIEWED, RESOLVED, DISMISSED

### Key Relationships
- Users can play multiple games (as white or black player)
- Users can participate in multiple tournaments
- Games belong to tournaments (optional)
- Tournaments have multiple players and pairings
- Users can follow other users
- Users can earn achievements
- Games have multiple moves and chat messages

### Indexes
The schema includes optimized indexes for:
- User lookups (email, username, college domain)
- Game queries (by player, tournament, status, time control)
- Tournament queries (by status, start time)
- Rating leaderboards (by time control and rating)
- Notification queries (by user and read status)
- Social features (followers, following)

## Data Types

- **UUID**: Used for all primary keys
- **Timestamps**: All tables include `createdAt` and `updatedAt` where appropriate
- **JSON/JSONB**: Used for flexible data like notification preferences
- **Decimal**: Used for tournament scores with precise decimal values
- **Boolean**: Used for flags and status indicators

## Constraints

- Unique constraints on email, username, and various composite keys
- Foreign key constraints with appropriate cascade/set null behaviors
- Check constraints for valid enum values and data ranges
- Partial indexes for optimized queries on filtered data

## Migration Strategy

1. **Development**: Use `prisma migrate dev` to create and apply migrations
2. **Staging**: Use `prisma migrate deploy` to apply migrations
3. **Production**: Use `prisma migrate deploy` with proper backup procedures

## Best Practices

1. Always create migrations for schema changes
2. Test migrations on staging before production
3. Use transactions for data consistency
4. Leverage Prisma's type safety in application code
5. Use Prisma Studio for debugging and data inspection
6. Keep the schema in sync with the design document

## Related Files

- `schema.prisma`: Main schema definition
- `../src/prisma/prisma.service.ts`: Prisma service for NestJS
- `../src/prisma/prisma.module.ts`: Prisma module for dependency injection
- `../.env`: Environment variables including DATABASE_URL
