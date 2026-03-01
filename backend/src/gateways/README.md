# WebSocket Gateways

This directory contains Socket.IO gateway implementations for real-time communication in the ChessArena platform.

## Overview

The WebSocket layer is organized into four namespaces, each handling specific real-time features:

### Namespaces

1. **`/game`** - Game Gateway
   - Handles real-time chess game events
   - Move transmission
   - Clock synchronization
   - Draw offers and resignations
   - Spectator connections

2. **`/matchmaking`** - Matchmaking Gateway
   - Queue join/leave events
   - Match found notifications
   - Queue position updates

3. **`/tournament`** - Tournament Gateway
   - Round start notifications
   - Pairing announcements
   - Live standings updates

4. **`/notifications`** - Notifications Gateway
   - Push notifications to clients
   - Achievement unlocks
   - System announcements

## Authentication

All WebSocket connections are protected by JWT authentication using the `WsJwtGuard`.

### Connection Authentication

Clients can authenticate in two ways:

1. **Authorization Header** (Recommended):
```typescript
const socket = io('http://localhost:3001/game', {
  extraHeaders: {
    Authorization: `Bearer ${token}`
  }
});
```

2. **Query Parameter** (Fallback):
```typescript
const socket = io('http://localhost:3001/game', {
  auth: {
    token: token
  }
});
```

### User Data

After successful authentication, user data is attached to `socket.data.user` and includes:
- `id`: User ID
- `email`: User email
- `username`: Username
- `displayName`: Display name
- `role`: User role
- `emailVerified`: Email verification status

## CORS Configuration

CORS is configured to allow connections from `http://localhost:3000` with credentials enabled.

To modify CORS settings, update the `cors` option in each gateway decorator:

```typescript
@WebSocketGateway({
  namespace: '/game',
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
```

## Usage Examples

### Game Gateway

```typescript
// Client-side
const gameSocket = io('http://localhost:3001/game', {
  extraHeaders: {
    Authorization: `Bearer ${token}`
  }
});

// Join a game room
gameSocket.emit('join_game', { gameId: 'game-123' });

// Listen for join confirmation
gameSocket.on('joined_game', (data) => {
  console.log('Joined game:', data.gameId);
});

// Leave a game room
gameSocket.emit('leave_game', { gameId: 'game-123' });
```

### Matchmaking Gateway

```typescript
// Client-side
const matchmakingSocket = io('http://localhost:3001/matchmaking', {
  extraHeaders: {
    Authorization: `Bearer ${token}`
  }
});

// Join matchmaking queue
matchmakingSocket.emit('join_queue', { timeControl: 'blitz' });

// Listen for queue confirmation
matchmakingSocket.on('queue_joined', (data) => {
  console.log('Joined queue for:', data.timeControl);
});

// Leave queue
matchmakingSocket.emit('leave_queue');
```

### Tournament Gateway

```typescript
// Client-side
const tournamentSocket = io('http://localhost:3001/tournament', {
  extraHeaders: {
    Authorization: `Bearer ${token}`
  }
});

// Join tournament room
tournamentSocket.emit('join_tournament', { tournamentId: 'tournament-123' });

// Listen for join confirmation
tournamentSocket.on('joined_tournament', (data) => {
  console.log('Joined tournament:', data.tournamentId);
});
```

### Notifications Gateway

```typescript
// Client-side
const notificationsSocket = io('http://localhost:3001/notifications', {
  extraHeaders: {
    Authorization: `Bearer ${token}`
  }
});

// Subscribe to notifications
notificationsSocket.emit('subscribe');

// Listen for subscription confirmation
notificationsSocket.on('subscribed', () => {
  console.log('Subscribed to notifications');
});
```

## Connection Lifecycle

Each gateway implements `OnGatewayConnection` and `OnGatewayDisconnect` interfaces:

- **`handleConnection`**: Called when a client connects to the namespace
- **`handleDisconnect`**: Called when a client disconnects from the namespace

Both methods log connection events for monitoring and debugging.

## Room Management

Rooms are used to group clients for targeted broadcasting:

- Game rooms: `game:${gameId}`
- Tournament rooms: `tournament:${tournamentId}`

Clients join rooms using `client.join()` and leave using `client.leave()`.

## Broadcasting

To broadcast events to specific rooms:

```typescript
// Broadcast to all clients in a game room
this.server.to(`game:${gameId}`).emit('move_made', moveData);

// Broadcast to all clients in a tournament room
this.server.to(`tournament:${tournamentId}`).emit('round_started', roundData);
```

## Error Handling

WebSocket errors are thrown as `WsException` and logged using NestJS Logger:

```typescript
throw new WsException('Unauthorized: No token provided');
```

## Testing

To test WebSocket connections:

1. Start the backend server: `npm run start:dev`
2. Use a WebSocket client (e.g., Socket.IO client, Postman, or browser console)
3. Connect to the desired namespace with a valid JWT token
4. Emit events and listen for responses

## Next Steps

Future enhancements will include:
- Move validation and broadcasting in Game Gateway
- Matchmaking queue management in Matchmaking Gateway
- Tournament pairing and standings updates in Tournament Gateway
- Notification delivery in Notifications Gateway
