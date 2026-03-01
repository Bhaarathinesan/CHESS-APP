# Matchmaking Queue Service

**Task 17.1 Implementation**  
**Requirements: 7.1, 7.9**

## Overview

The matchmaking queue service implements a Redis-based queue system for pairing players in chess games. Each time control (Bullet, Blitz, Rapid, Classical) has its own queue, and players are tracked with their rating and preferences.

## Features

### 1. Redis-Based Queue (Requirement 7.1)

- **Separate queues per time control**: Each time control category has its own Redis sorted set
- **Queue key format**: `matchmaking:queue:{timeControl}`
- **User tracking key format**: `matchmaking:user:{userId}`
- **Sorted by join time**: Players are ordered by when they joined (FIFO)

### 2. Player Queue Entry

Each queue entry contains:
```typescript
{
  userId: string;           // User ID
  rating: number;           // Current rating for time control
  timeControl: TimeControl; // Time control category
  ratingRange: number;      // Max rating difference (default 200)
  joinedAt: number;         // Timestamp when joined
}
```

### 3. Queue Position and Wait Time (Requirement 7.9)

The service tracks:
- **Position**: 1-indexed position in queue
- **Wait time**: Seconds since joining
- **Queue size**: Total players in queue

## API Endpoints

### POST /api/matchmaking/queue
Join the matchmaking queue.

**Request Body:**
```json
{
  "timeControl": "BLITZ",
  "ratingRange": 200
}
```

**Response:**
```json
{
  "position": 1,
  "waitTimeSeconds": 0,
  "queueSize": 1
}
```

### DELETE /api/matchmaking/queue
Leave the matchmaking queue.

**Response:**
```json
{
  "success": true
}
```

### GET /api/matchmaking/status
Get current queue status.

**Response:**
```json
{
  "position": 2,
  "waitTimeSeconds": 15,
  "queueSize": 5
}
```

## Service Methods

### `joinQueue(userId, timeControl, ratingRange)`
- Validates user is not already in a queue
- Fetches user's rating for the time control
- Adds entry to Redis sorted set
- Returns queue status

### `leaveQueue(userId)`
- Finds user's queue entry
- Removes from Redis sorted set
- Cleans up tracking keys
- Returns success status

### `getQueueStatus(userId, timeControl)`
- Retrieves all queue entries
- Finds user's position
- Calculates wait time
- Returns status object

### `getQueueEntries(timeControl)`
- Returns all players in a specific queue
- Used by matchmaking algorithm (Task 17.2)

### `getUserQueue(userId)`
- Returns which queue user is currently in
- Returns null if not in any queue

## Implementation Details

### Rating Retrieval
- Queries Prisma for user's rating in specific time control
- Defaults to 1200 for new players (per Requirement 8.1)

### Queue Validation
- Prevents users from joining multiple queues simultaneously
- Throws `BadRequestException` if already in queue

### Redis Data Structures
- **Sorted Sets (ZADD/ZRANGE)**: For maintaining queue order
- **String Keys (SET/GET)**: For tracking user's current queue
- **TTL**: User queue keys expire after 5 minutes

## Testing

Unit tests cover:
- ✅ Adding players to queue with rating and preferences
- ✅ Preventing duplicate queue entries
- ✅ Default rating for new players
- ✅ Removing players from queue
- ✅ Queue position calculation
- ✅ Wait time tracking
- ✅ Queue size reporting

## Next Steps (Task 17.2)

The matchmaking algorithm will:
1. Poll queues periodically
2. Find compatible players (rating within range)
3. Create games for matched pairs
4. Remove matched players from queue

## Usage Example

```typescript
// Join queue
const status = await matchmakingService.joinQueue(
  'user-123',
  TimeControl.BLITZ,
  200
);
// { position: 1, waitTimeSeconds: 0, queueSize: 1 }

// Check status
const updated = await matchmakingService.getQueueStatus(
  'user-123',
  TimeControl.BLITZ
);
// { position: 1, waitTimeSeconds: 15, queueSize: 3 }

// Leave queue
const removed = await matchmakingService.leaveQueue('user-123');
// true
```

## Performance Considerations

- **Redis sorted sets**: O(log N) for add/remove operations
- **Queue scanning**: O(N) for finding user position
- **Scalability**: Can handle thousands of concurrent queue entries
- **TTL cleanup**: Automatic expiration prevents stale entries

## Security

- **JWT Authentication**: All endpoints require valid JWT token
- **User validation**: Can only join/leave own queue
- **Rate limiting**: Should be added in production (not in scope for Task 17.1)
