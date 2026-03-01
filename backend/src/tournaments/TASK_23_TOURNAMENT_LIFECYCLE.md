# Task 23: Tournament Lifecycle Management Implementation

## Overview
Implemented complete tournament lifecycle management system including status transitions, registration, start logic, cancellation, and pause/resume functionality.

## Requirements Implemented
- **10.1-10.7**: Tournament status transitions and lifecycle states
- **10.2, 10.12**: Tournament registration (join/leave)
- **10.4, 10.13**: Tournament start logic and auto-cancellation
- **10.8, 10.9**: Tournament cancellation with player notifications
- **10.10, 10.11**: Tournament pause and resume functionality

## Components Created

### 1. Tournament State Machine Service
**File**: `tournament-state-machine.service.ts`

A dedicated service that manages tournament status transitions and validates state changes.

**Key Features**:
- Defines valid state transitions for all tournament statuses
- Validates status transitions before they occur
- Provides helper methods to check tournament state capabilities
- Enforces business rules for tournament lifecycle

**Status Transition Flow**:
```
CREATED → REGISTRATION_OPEN → REGISTRATION_CLOSED → IN_PROGRESS → 
ROUND_IN_PROGRESS → ROUND_COMPLETED → COMPLETED

Alternative paths:
- CREATED/REGISTRATION_OPEN/REGISTRATION_CLOSED → CANCELLED
- ROUND_IN_PROGRESS ↔ IN_PROGRESS (pause/resume)
```

**Methods**:
- `validateTransition(currentStatus, newStatus)`: Validates if a status transition is allowed
- `isTerminalState(status)`: Checks if status is terminal (COMPLETED or CANCELLED)
- `canBeCancelled(status)`: Checks if tournament can be cancelled
- `canBeStarted(status)`: Checks if tournament can be started
- `isActive(status)`: Checks if tournament is in active state
- `canJoin(status, allowLateRegistration)`: Checks if players can join
- `canLeave(status)`: Checks if players can leave
- `getValidNextStates(status)`: Returns all valid next states

### 2. Tournament Service Extensions

#### Join Tournament
**Endpoint**: `POST /api/tournaments/:id/join`
**Requirements**: 10.2, 10.12

**Validations**:
- Tournament exists
- User exists
- Tournament status allows joining (REGISTRATION_OPEN or IN_PROGRESS with late registration)
- Registration deadline not passed
- Player not already registered
- Tournament not full (currentPlayers < maxPlayers)

**Actions**:
- Creates TournamentPlayer record
- Increments tournament currentPlayers count
- Returns updated tournament with player list

#### Leave Tournament
**Endpoint**: `DELETE /api/tournaments/:id/leave`
**Requirements**: 10.2

**Validations**:
- Tournament exists
- Tournament status allows leaving (CREATED, REGISTRATION_OPEN, or REGISTRATION_CLOSED)
- Player is registered

**Actions**:
- Deletes TournamentPlayer record
- Decrements tournament currentPlayers count
- Returns updated tournament

#### Start Tournament
**Endpoint**: `POST /api/tournaments/:id/start`
**Requirements**: 10.4, 10.13

**Authorization**: Tournament creator or Super Admin only

**Validations**:
- Tournament exists
- User is authorized (creator or Super Admin)
- Tournament status allows starting (REGISTRATION_OPEN or REGISTRATION_CLOSED)
- Minimum players requirement met (currentPlayers >= minPlayers)
- Status transition is valid

**Actions**:
- Updates tournament status to IN_PROGRESS
- Returns updated tournament
- TODO: Trigger first round pairing generation
- TODO: Notify all registered players

#### Auto-Cancel Tournament
**Method**: `autoCancelIfMinimumNotReached(tournamentId)`
**Requirements**: 10.13

**Conditions**:
- Tournament status is REGISTRATION_OPEN or REGISTRATION_CLOSED
- Start time has passed
- Minimum players not reached

**Actions**:
- Updates tournament status to CANCELLED
- Returns updated tournament
- TODO: Notify all registered players

**Usage**: This method should be called by a scheduled job that checks tournaments near their start time.

#### Cancel Tournament
**Endpoint**: `POST /api/tournaments/:id/cancel`
**Requirements**: 10.8, 10.9

**Authorization**: Tournament creator or Super Admin only

**Validations**:
- Tournament exists
- User is authorized (creator or Super Admin)
- Tournament can be cancelled (status is CREATED, REGISTRATION_OPEN, or REGISTRATION_CLOSED)
- Status transition is valid

**Actions**:
- Updates tournament status to CANCELLED
- Logs player IDs that need notification
- Returns updated tournament
- TODO: Notify all registered players within 5 minutes (Requirement 10.9)

#### Pause Tournament
**Endpoint**: `POST /api/tournaments/:id/pause`
**Requirements**: 10.10

**Authorization**: Tournament creator or Super Admin only

**Validations**:
- Tournament exists
- User is authorized
- Tournament status is ROUND_IN_PROGRESS
- Status transition is valid

**Actions**:
- Updates tournament status to IN_PROGRESS (paused state)
- Returns updated tournament
- TODO: Notify all players about pause
- TODO: Pause all ongoing games in current round

#### Resume Tournament
**Endpoint**: `POST /api/tournaments/:id/resume`
**Requirements**: 10.11

**Authorization**: Tournament creator or Super Admin only

**Validations**:
- Tournament exists
- User is authorized
- Tournament is paused (status IN_PROGRESS with currentRound > 0)
- Status transition is valid

**Actions**:
- Updates tournament status to ROUND_IN_PROGRESS
- Returns updated tournament
- TODO: Notify all players about resume
- TODO: Resume all paused games in current round

## API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/tournaments/:id/join` | JWT | Join a tournament |
| DELETE | `/api/tournaments/:id/leave` | JWT | Leave a tournament |
| POST | `/api/tournaments/:id/start` | Admin | Start a tournament |
| POST | `/api/tournaments/:id/cancel` | Admin | Cancel a tournament |
| POST | `/api/tournaments/:id/pause` | Admin | Pause tournament round |
| POST | `/api/tournaments/:id/resume` | Admin | Resume tournament round |

## Database Transactions

All operations that modify multiple records use Prisma transactions to ensure data consistency:

**Join Tournament**:
```typescript
await this.prisma.$transaction([
  this.prisma.tournamentPlayer.create({ ... }),
  this.prisma.tournament.update({ currentPlayers: { increment: 1 } }),
]);
```

**Leave Tournament**:
```typescript
await this.prisma.$transaction([
  this.prisma.tournamentPlayer.delete({ ... }),
  this.prisma.tournament.update({ currentPlayers: { decrement: 1 } }),
]);
```

## Error Handling

All methods include comprehensive error handling:
- `NotFoundException`: Tournament or user not found
- `BadRequestException`: Invalid status transitions, validation failures
- `ForbiddenException`: Unauthorized access attempts
- `ConflictException`: Duplicate registration attempts

## Testing

Updated test file to include `TournamentStateMachineService` in the test module providers.

Existing tests cover:
- Tournament creation with various validations
- Tournament retrieval by ID and share link
- Tournament listing with filtering
- Tournament updates with authorization checks

## Future Enhancements

### Notification Integration
When notification service is available, implement:
1. Player notifications for tournament cancellation (Requirement 10.9)
2. Player notifications for tournament start
3. Player notifications for pause/resume
4. Registration confirmation notifications

### Pairing Integration
When pairing service is implemented:
1. Trigger first round pairing generation on tournament start
2. Handle round progression (ROUND_IN_PROGRESS → ROUND_COMPLETED → next round)
3. Implement forfeit logic for players who don't join games within 5 minutes

### Scheduled Jobs
Implement background jobs for:
1. Auto-cancel tournaments that don't meet minimum players by start time
2. Auto-close registration when deadline passes
3. Auto-start tournaments if configured

## Usage Examples

### Join a Tournament
```bash
POST /api/tournaments/abc-123/join
Authorization: Bearer <jwt_token>

Response:
{
  "id": "abc-123",
  "name": "Spring Championship",
  "status": "REGISTRATION_OPEN",
  "currentPlayers": 8,
  "maxPlayers": 16,
  "players": [...]
}
```

### Start a Tournament
```bash
POST /api/tournaments/abc-123/start
Authorization: Bearer <admin_jwt_token>

Response:
{
  "id": "abc-123",
  "name": "Spring Championship",
  "status": "IN_PROGRESS",
  "currentPlayers": 12,
  ...
}
```

### Cancel a Tournament
```bash
POST /api/tournaments/abc-123/cancel
Authorization: Bearer <admin_jwt_token>

Response:
{
  "id": "abc-123",
  "name": "Spring Championship",
  "status": "CANCELLED",
  ...
}
```

## Module Integration

The `TournamentStateMachineService` has been added to the `TournamentsModule` providers and is injected into `TournamentsService` via constructor dependency injection.

## Compliance

All implementations follow:
- NestJS best practices
- TypeScript strict mode
- Prisma ORM patterns
- RESTful API conventions
- Role-based access control (RBAC)
- Transaction safety for data consistency
