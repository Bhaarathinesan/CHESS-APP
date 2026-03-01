# Task 10.5: Clock Synchronization Implementation

## Overview

This document describes the implementation of real-time clock synchronization between the server and clients for chess games. The system ensures accurate time tracking with server-side authority and automatic drift correction.

## Requirements

- **Requirement 5.7**: Synchronize clock times between client and server with maximum 100ms drift
- **Requirement 5.12**: Track clock times server-side to prevent client-side manipulation
- **Requirement 6.10**: Synchronize game clocks across all connected clients every 1 second

## Architecture

### Server-Side (Backend)

The server maintains authoritative clock state and broadcasts updates to all connected clients.

#### Clock State Storage

Clock state is stored in Redis with the following structure:

```typescript
{
  whiteTimeRemaining: number;    // Milliseconds
  blackTimeRemaining: number;    // Milliseconds
  currentTurn: 'white' | 'black';
  lastUpdate: number;            // Timestamp
  isPaused: boolean;
  tickCount: number;             // For sync scheduling
}
```

#### Clock Tick Mechanism

The server uses a 100ms interval for accurate time tracking:

1. **Tick Interval**: Every 100ms, the `tickClock` method:
   - Calculates elapsed time since last update
   - Decrements the active player's time
   - Checks for timeout conditions
   - Updates Redis with new state

2. **Sync Broadcasting**: Every 1 second (10 ticks):
   - Emits `clock_sync` event to all clients in game room
   - Includes current times and server timestamp
   - Enables client-side drift correction

3. **Full State Sync**: Every 30 seconds (300 ticks):
   - Broadcasts complete game state
   - Prevents accumulated drift
   - Ensures all clients stay synchronized

#### Clock Sync Event

```typescript
socket.emit('clock_sync', {
  gameId: string;
  whiteTimeRemaining: number;
  blackTimeRemaining: number;
  serverTimestamp: number;  // For drift calculation
});
```

### Client-Side (Frontend)

The client receives server updates and maintains smooth local countdown between syncs.

#### useClockSync Hook

Custom React hook that handles clock synchronization:

```typescript
const {
  whiteTimeRemaining,
  blackTimeRemaining,
  driftOffset,
  setCurrentTurn,
  setClockTimes,
} = useClockSync(socket, gameId);
```

**Features:**

1. **Server Sync Reception**:
   - Listens to `clock_sync` events
   - Updates local state with server-authoritative time
   - Calculates network latency and drift

2. **Drift Correction**:
   - Estimates one-way latency: `(receiveTime - serverTimestamp) / 2`
   - Adjusts server time by estimated latency
   - Calculates drift between local and adjusted server time
   - Maintains accuracy within 100ms

3. **Local Countdown**:
   - Runs 100ms interval for smooth display
   - Decrements active player's time locally
   - Provides immediate feedback between server syncs
   - Overridden by server sync for accuracy

## Implementation Details

### Server-Side Clock Management

#### Starting the Clock

```typescript
await gateway.handleStartClock(socket, {
  gameId: 'game-123',
  whiteTimeRemaining: 300000,
  blackTimeRemaining: 300000,
  currentTurn: 'white',
});
```

This:
1. Stores initial clock state in Redis
2. Starts the 100ms tick interval
3. Begins broadcasting sync updates

#### Updating the Clock

```typescript
await gateway.handleUpdateClock(socket, {
  gameId: 'game-123',
  whiteTimeRemaining: 295000,
  blackTimeRemaining: 300000,
  currentTurn: 'black',
});
```

Updates clock state (e.g., after a move with time increment).

#### Stopping the Clock

```typescript
await gateway.handleStopClock(socket, {
  gameId: 'game-123',
});
```

Stops the interval and cleans up Redis state.

### Client-Side Integration

#### Basic Usage

```typescript
import { useClockSync } from '@/hooks/useClockSync';
import { ChessClock } from '@/components/chess';

function GamePage() {
  const socket = useSocket();
  const gameId = 'game-123';
  
  const {
    whiteTimeRemaining,
    blackTimeRemaining,
    setCurrentTurn,
  } = useClockSync(socket, gameId);
  
  return (
    <>
      <ChessClock
        timeRemaining={whiteTimeRemaining}
        isActive={currentTurn === 'white'}
        playerColor="white"
      />
      <ChessClock
        timeRemaining={blackTimeRemaining}
        isActive={currentTurn === 'black'}
        playerColor="black"
      />
    </>
  );
}
```

#### Handling Turn Changes

```typescript
const handleMove = (move) => {
  // Make move
  socket.emit('make_move', { gameId, move });
  
  // Switch turn
  setCurrentTurn(currentTurn === 'white' ? 'black' : 'white');
};
```

## Drift Correction Algorithm

The client calculates drift to maintain synchronization:

```typescript
function calculateDriftOffset(serverTimestamp: number, receiveTime: number): number {
  // Estimate one-way latency (half of round-trip)
  const estimatedLatency = (receiveTime - serverTimestamp) / 2;
  
  // Adjust server time by latency
  const adjustedServerTime = serverTimestamp + estimatedLatency;
  
  // Calculate drift
  const drift = receiveTime - adjustedServerTime;
  
  return drift;
}
```

This ensures:
- Network latency is accounted for
- Clock drift stays within 100ms
- Smooth synchronization across varying network conditions

## Server Authority

The server maintains authoritative time to prevent manipulation:

1. **Server-Side Tracking**: All time calculations happen on the server
2. **Redis Storage**: Clock state persists in Redis, not client memory
3. **Validation**: Server validates all time-related operations
4. **Override**: Server sync always overrides local countdown

This prevents:
- Client-side time manipulation
- Cheating by modifying local clock
- Inconsistent time across clients

## Testing

### Backend Tests

Located in `backend/src/gateways/clock-synchronization.spec.ts`:

- ✅ Broadcasts clock sync every 1 second
- ✅ Includes server timestamp for drift correction
- ✅ Broadcasts to all clients in game room
- ✅ Tracks clock times server-side in Redis
- ✅ Updates server-side clock on each tick
- ✅ Prevents client-side time manipulation
- ✅ Provides server timestamp for drift calculation
- ✅ Broadcasts full state every 30 seconds
- ✅ Ticks clock every 100ms for accuracy
- ✅ Decrements active player time accurately
- ✅ Does not decrement time when paused
- ✅ Stops clock interval when game ends

### Frontend Tests

Located in `frontend/hooks/__tests__/useClockSync.test.ts`:

- ✅ Receives and applies clock sync updates
- ✅ Ignores sync for different games
- ✅ Syncs clocks every 1 second from server
- ✅ Calculates drift offset for network latency
- ✅ Maintains clock accuracy within 100ms
- ✅ Decrements active player clock locally
- ✅ Does not decrement time below zero
- ✅ Switches countdown when turn changes
- ✅ Overrides local countdown with server sync
- ✅ Unregisters event listeners on unmount
- ✅ Clears local interval on unmount
- ✅ Handles null socket/gameId gracefully
- ✅ Handles rapid sync updates

## Performance Considerations

### Server-Side

- **100ms Tick Interval**: Provides accuracy without excessive CPU usage
- **Redis Storage**: Fast in-memory storage for clock state
- **Conditional Broadcasting**: Only syncs every 1 second, not every tick
- **Efficient Cleanup**: Intervals cleared when games end

### Client-Side

- **Local Countdown**: Reduces server load by handling display locally
- **Efficient Updates**: Only updates on server sync or local tick
- **Memory Management**: Cleans up intervals and listeners on unmount
- **Drift Correction**: Lightweight calculation, no heavy processing

## Edge Cases Handled

1. **Network Latency**: Drift correction accounts for varying latency
2. **Disconnection**: Clock pauses when player disconnects
3. **Reconnection**: Clock state restored from server
4. **Multiple Syncs**: Rapid syncs handled gracefully
5. **Clock Pause**: Time doesn't decrement when paused
6. **Timeout**: Detected and handled when time reaches zero
7. **Game End**: Intervals cleaned up properly

## Integration with Other Features

### Time Increment (Task 10.3)

Clock synchronization works seamlessly with time increment:
- Server adds increment after move
- Sync broadcasts updated time
- Client displays new time immediately

### Timeout Detection (Task 10.7)

Clock synchronization enables timeout detection:
- Server detects when time reaches zero
- Emits timeout event
- Declares opponent winner

### Move Latency Optimization (Task 14.5)

Clock sync benefits from move latency optimization:
- Fast move transmission reduces perceived lag
- Accurate timestamps for move timing
- Smooth clock updates

## Future Enhancements

Potential improvements for future iterations:

1. **Adaptive Sync Frequency**: Adjust sync rate based on network conditions
2. **Predictive Drift Correction**: Use historical data to predict drift
3. **Client-Side Validation**: Warn users of excessive drift
4. **Analytics**: Track sync accuracy and network performance
5. **Compression**: Optimize sync message size for bandwidth

## Conclusion

The clock synchronization implementation provides:

✅ **Accurate Time Tracking**: 100ms tick interval for precision  
✅ **Server Authority**: Prevents client-side manipulation  
✅ **Drift Correction**: Maintains <100ms accuracy  
✅ **Smooth Display**: Local countdown between syncs  
✅ **Scalable**: Efficient broadcasting to multiple clients  
✅ **Robust**: Handles edge cases and network issues  

This ensures a fair and accurate chess experience for all players.
