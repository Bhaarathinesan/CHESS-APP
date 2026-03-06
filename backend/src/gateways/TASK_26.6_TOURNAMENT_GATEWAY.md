# Task 26.6: Tournament Gateway for WebSocket

## Overview

This task implements the Tournament Gateway for real-time tournament event broadcasting using WebSocket (Socket.IO). The gateway handles tournament room management and broadcasts various tournament lifecycle events to participants.

## Implementation Status

✅ **COMPLETED**

## Requirements Addressed

- **Requirement 10.4**: Tournament lifecycle management - join tournament events
- **Requirement 10.5**: Tournament started notifications
- **Requirement 10.6**: Round started with pairings broadcast
- **Requirement 10.7**: Individual pairing announcements and tournament completion
- **Requirement 12.1**: Real-time standings updates

## Files Created/Modified

### Created Files

1. **`backend/src/gateways/tournament.gateway.spec.ts`**
   - Comprehensive unit tests for all gateway methods
   - Tests for authentication, room management, and all broadcast methods
   - 100% coverage of gateway functionality

### Modified Files

1. **`backend/src/gateways/tournament.gateway.ts`**
   - Enhanced with full authentication using JWT
   - Implemented all required event handlers
   - Added all broadcast methods for tournament events

## Features Implemented

### 1. Authentication & Connection Management

- **JWT Authentication**: Validates tokens on connection
- **User Verification**: Checks user exists and is not banned
- **Connection Logging**: Tracks connections and disconnections
- **Error Handling**: Proper error messages for authentication failures

### 2. Event Handlers

#### `join_tournament`
- Validates user is registered for the tournament
- Joins user to tournament-specific room (`tournament:{tournamentId}`)
- Returns confirmation or error message
- **Requirement**: 10.4

#### `leave_tournament`
- Removes user from tournament room
- Logs the action
- Returns confirmation

### 3. Broadcast Methods

#### `broadcastTournamentStarted()`
- Broadcasts when tournament begins
- Includes tournament details and current round
- Sent to all participants in tournament room
- **Requirement**: 10.5

#### `broadcastRoundStarted()`
- Broadcasts when a new round begins
- Includes round number and all pairings
- Fetches and formats player details for each pairing
- Triggers individual pairing announcements
- **Requirement**: 10.6

#### `broadcastPairingAnnounced()`
- Sends individual pairing to specific player
- Includes opponent details, color assignment, and game ID
- Handles bye rounds gracefully
- Targets specific user sockets within tournament room
- **Requirement**: 10.7

#### `broadcastStandingsUpdate()`
- Broadcasts updated standings after game completion
- Real-time updates to all tournament participants
- Includes complete standings data with rankings
- **Requirement**: 12.1

#### `broadcastTournamentCompleted()`
- Broadcasts when tournament finishes
- Includes final standings and top winners
- Fetches winner details with rankings
- **Requirement**: 10.7

#### `broadcastTournamentCancelled()`
- Notifies all participants of cancellation
- Includes cancellation reason
- **Requirement**: 10.9

#### `broadcastRoundCompleted()`
- Broadcasts when a round finishes
- Includes updated standings after round
- Prepares participants for next round

## Event Payloads

### Client → Server Events

```typescript
// Join tournament room
socket.emit('join_tournament', { tournamentId: string })

// Leave tournament room
socket.emit('leave_tournament', { tournamentId: string })
```

### Server → Client Events

```typescript
// Tournament started
socket.on('tournament_started', {
  tournament: {
    id: string,
    name: string,
    format: string,
    timeControl: string,
    status: string,
    roundsTotal: number
  },
  currentRound: number,
  timestamp: number
})

// Round started
socket.on('round_started', {
  tournamentId: string,
  roundNumber: number,
  pairings: Array<{
    id: string,
    boardNumber: number,
    whitePlayer: User,
    blackPlayer: User,
    isBye: boolean,
    gameId: string
  }>,
  timestamp: number
})

// Pairing announced (individual)
socket.on('pairing_announced', {
  tournamentId: string,
  pairing: {
    id: string,
    boardNumber: number,
    roundNumber: number
  },
  opponent: User,
  color: 'white' | 'black',
  gameId: string,
  timestamp: number
})

// Standings updated
socket.on('standings_updated', {
  tournamentId: string,
  standings: PlayerStanding[],
  timestamp: number
})

// Tournament completed
socket.on('tournament_completed', {
  tournamentId: string,
  finalStandings: PlayerStanding[],
  winners: Array<User & { rank: number, score: number }>,
  timestamp: number
})

// Tournament cancelled
socket.on('tournament_cancelled', {
  tournamentId: string,
  reason: string,
  timestamp: number
})

// Round completed
socket.on('round_completed', {
  tournamentId: string,
  roundNumber: number,
  standings: PlayerStanding[],
  timestamp: number
})
```

## Integration Points

### Called By

1. **TournamentsService**: Calls broadcast methods during tournament lifecycle
2. **GameGateway**: Calls `broadcastStandingsUpdate()` when tournament games complete
3. **Tournament State Machine**: Triggers broadcasts on state transitions

### Dependencies

- **PrismaService**: Database queries for users and tournament data
- **JwtService**: Token verification for authentication
- **ConfigService**: Configuration access for JWT secret
- **Socket.IO Server**: WebSocket communication

## Room Management

The gateway uses Socket.IO rooms for efficient broadcasting:

- **Room Format**: `tournament:{tournamentId}`
- **Purpose**: Group all participants of a tournament
- **Benefits**: 
  - Efficient broadcasting to specific tournament
  - Automatic cleanup on disconnect
  - Scalable for multiple concurrent tournaments

## Security Features

1. **JWT Authentication**: All connections require valid JWT token
2. **User Verification**: Checks user exists and is not banned
3. **Tournament Registration Check**: Validates user is registered before joining room
4. **Error Handling**: Proper error messages without exposing sensitive data

## Testing

### Test Coverage

- ✅ Connection authentication (valid, invalid, banned users)
- ✅ Join tournament (registered users, non-registered users)
- ✅ Leave tournament
- ✅ Broadcast tournament started
- ✅ Broadcast round started with pairings
- ✅ Broadcast individual pairing announcements
- ✅ Broadcast standings updates
- ✅ Broadcast tournament completed
- ✅ Broadcast tournament cancelled
- ✅ Broadcast round completed
- ✅ Handle bye rounds gracefully

### Running Tests

```bash
cd backend
npm test -- tournament.gateway.spec.ts
```

## Usage Example

### Server-Side (Broadcasting)

```typescript
// In TournamentsService or similar
constructor(
  private readonly tournamentGateway: TournamentGateway,
) {}

async startTournament(tournamentId: string) {
  // ... tournament start logic ...
  
  // Broadcast to all participants
  await this.tournamentGateway.broadcastTournamentStarted(
    tournamentId,
    tournament,
    1
  );
}

async startRound(tournamentId: string, roundNumber: number) {
  const pairings = await this.generatePairings(tournamentId, roundNumber);
  
  // Broadcast round start with pairings
  await this.tournamentGateway.broadcastRoundStarted(
    tournamentId,
    roundNumber,
    pairings
  );
}
```

### Client-Side (Frontend)

```typescript
import { io } from 'socket.io-client';

// Connect to tournament namespace
const tournamentSocket = io('http://localhost:3001/tournament', {
  auth: {
    token: accessToken
  }
});

// Join tournament room
tournamentSocket.emit('join_tournament', { 
  tournamentId: 'tournament-123' 
});

// Listen for tournament events
tournamentSocket.on('tournament_started', (data) => {
  console.log('Tournament started:', data.tournament);
  // Update UI
});

tournamentSocket.on('round_started', (data) => {
  console.log(`Round ${data.roundNumber} started`);
  console.log('Pairings:', data.pairings);
  // Update UI with pairings
});

tournamentSocket.on('pairing_announced', (data) => {
  console.log(`You are ${data.color} vs ${data.opponent.displayName}`);
  // Navigate to game
  router.push(`/play/${data.gameId}`);
});

tournamentSocket.on('standings_updated', (data) => {
  console.log('Standings updated:', data.standings);
  // Update standings table
});

tournamentSocket.on('tournament_completed', (data) => {
  console.log('Tournament finished!');
  console.log('Winners:', data.winners);
  // Show final results
});
```

## Performance Considerations

1. **Efficient Broadcasting**: Uses Socket.IO rooms to target specific tournaments
2. **Batch Operations**: Fetches user details in parallel using `Promise.all()`
3. **Minimal Payload**: Only sends necessary data in broadcasts
4. **Scalability**: Room-based architecture supports multiple concurrent tournaments

## Future Enhancements

1. **Spectator Support**: Allow non-participants to watch tournament progress
2. **Delayed Broadcasting**: Implement spectator delay for sensitive tournaments
3. **Reconnection Handling**: Restore tournament state on reconnect
4. **Rate Limiting**: Prevent spam on tournament events
5. **Analytics**: Track tournament engagement metrics

## Related Tasks

- **Task 22**: Tournament CRUD operations
- **Task 23**: Tournament lifecycle management
- **Task 24**: Pairing algorithms
- **Task 25**: Standings calculation
- **Task 26.1-26.5**: Frontend tournament components

## Conclusion

The Tournament Gateway successfully implements real-time WebSocket communication for tournament events. It provides a robust, secure, and scalable solution for broadcasting tournament updates to participants, meeting all specified requirements.
