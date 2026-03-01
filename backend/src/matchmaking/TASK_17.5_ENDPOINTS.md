# Task 17.5: Matchmaking REST Endpoints

**Requirements: 7.1, 7.11**

## Overview
Implemented REST API endpoints for matchmaking queue operations, complementing the WebSocket functionality provided by MatchmakingGateway.

## Endpoints Implemented

### 1. POST /api/matchmaking/queue
**Requirement 7.1** - Join matchmaking queue

**Request:**
```typescript
{
  timeControl: TimeControl;  // BULLET, BLITZ, RAPID, CLASSICAL
  ratingRange?: number;      // Optional, default 200 (min: 50, max: 500)
}
```

**Response:**
```typescript
{
  position: number;          // Queue position (1-indexed)
  waitTimeSeconds: number;   // Time spent in queue
  queueSize: number;         // Total players in queue
}
```

**Features:**
- JWT authentication required
- Validates user not already in queue
- Fetches user's rating for the time control
- Adds user to Redis sorted set queue
- Returns immediate queue status

### 2. DELETE /api/matchmaking/queue
**Requirement 7.11** - Leave matchmaking queue

**Response:**
```typescript
{
  success: boolean;  // true if removed, false if not in queue
}
```

**Features:**
- JWT authentication required
- Removes user from current queue
- Cleans up Redis entries
- Returns success status

### 3. GET /api/matchmaking/status
**Requirement 7.9** - Get current queue status

**Response:**
```typescript
{
  position: number;          // 0 if not in queue
  waitTimeSeconds: number;   // 0 if not in queue
  queueSize: number;         // 0 if not in queue
}
```

**Features:**
- JWT authentication required
- Returns current position in queue
- Returns empty status if user not in queue

## Authentication
All endpoints use `@UseGuards(JwtAuthGuard)` and extract user ID via `@CurrentUser('sub')` decorator.

## Error Handling
- **400 Bad Request**: User already in queue (when joining)
- **400 Bad Request**: User not in queue (when getting status)
- **401 Unauthorized**: Invalid or missing JWT token

## Integration
- Uses existing `MatchmakingService` methods
- Works alongside `MatchmakingGateway` for WebSocket events
- Registered in `MatchmakingModule`

## Testing
Comprehensive unit tests in `matchmaking.controller.spec.ts`:
- ✓ Join queue with valid parameters
- ✓ Use default rating range
- ✓ Handle user already in queue error
- ✓ Successfully leave queue
- ✓ Handle user not in queue
- ✓ Return queue status for user in queue
- ✓ Return empty status if user not in queue

All 7 tests passing.

## Requirements Fulfilled
✅ **7.1**: Players can join matchmaking queue via REST API  
✅ **7.11**: Players can leave matchmaking queue via REST API  
✅ **7.9**: Queue status tracking with position and wait time
