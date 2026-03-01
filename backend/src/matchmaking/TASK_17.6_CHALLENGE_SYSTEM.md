# Task 17.6: Direct Challenge System Implementation

## Overview
Implemented a complete direct challenge system allowing players to challenge specific opponents to chess games. The system uses Redis for temporary storage with automatic 60-second expiration and WebSocket notifications for real-time updates.

## Requirements Implemented
- **7.4**: Allow players to send direct challenges to specific opponents
- **7.5**: Notify players when they receive a challenge (within 2 seconds via WebSocket)
- **7.6**: Allow players to accept, decline, or ignore challenges
- **7.7**: Expire unanswered challenges after 60 seconds

## Implementation Details

### 1. Data Transfer Objects (DTOs)
**File**: `backend/src/matchmaking/dto/create-challenge.dto.ts`
- `CreateChallengeDto`: Validates challenge creation requests
  - receiverId: Target player ID
  - timeControl: Game time control (Bullet, Blitz, Rapid, Classical)
  - initialTimeMinutes: Base time in minutes
  - incrementSeconds: Time increment per move
  - isRated: Whether the game affects ratings (default: true)

### 2. Challenge Interface
**File**: `backend/src/matchmaking/matchmaking.service.ts`
```typescript
interface Challenge {
  id: string;
  senderId: string;
  receiverId: string;
  timeControl: TimeControl;
  initialTimeMinutes: number;
  incrementSeconds: number;
  isRated: boolean;
  createdAt: number;
  expiresAt: number;
}
```

### 3. Service Methods
**File**: `backend/src/matchmaking/matchmaking.service.ts`

#### Challenge Creation
- `createChallenge()`: Creates a new challenge
  - Validates sender and receiver are different users
  - Checks receiver exists and is not banned
  - Prevents duplicate challenges to same user
  - Stores challenge in Redis with 60-second TTL
  - Tracks challenges for both sender and receiver
  - Notifies receiver via WebSocket

#### Challenge Response
- `acceptChallenge()`: Accepts a challenge and creates a game
  - Validates user is the receiver
  - Creates a new game with specified settings
  - Randomly assigns colors to players
  - Deletes challenge from Redis
  - Notifies sender via WebSocket

- `declineChallenge()`: Declines a challenge
  - Validates user is the receiver
  - Deletes challenge from Redis
  - Notifies sender via WebSocket

#### Challenge Retrieval
- `getChallenge()`: Retrieves a challenge by ID
- `getPendingChallenge()`: Gets pending challenge between two users
- `getReceivedChallenges()`: Gets all challenges received by a user
- `getSentChallenges()`: Gets all challenges sent by a user

### 4. REST API Endpoints
**File**: `backend/src/matchmaking/matchmaking.controller.ts`

- `POST /api/matchmaking/challenges` - Create a challenge
- `POST /api/matchmaking/challenges/:id/accept` - Accept a challenge
- `POST /api/matchmaking/challenges/:id/decline` - Decline a challenge
- `GET /api/matchmaking/challenges/received` - Get received challenges
- `GET /api/matchmaking/challenges/sent` - Get sent challenges

All endpoints require JWT authentication via `JwtAuthGuard`.

### 5. WebSocket Events
**File**: `backend/src/gateways/matchmaking.gateway.ts`

#### Emitted Events (Server → Client)
- `challenge_received`: Notifies receiver of new challenge
  - Includes sender details, time control, settings, expiration time
  - Sent within 2 seconds (Requirement 7.5)

- `challenge_accepted`: Notifies sender that challenge was accepted
  - Includes game ID and receiver details

- `challenge_declined`: Notifies sender that challenge was declined
  - Includes receiver details

- `challenge_expired`: Notifies both users when challenge expires
  - Sent after 60-second TTL expires (Requirement 7.7)

### 6. Redis Storage Strategy
**Keys Used**:
- `challenge:{challengeId}` - Stores challenge data (60s TTL)
- `user:challenge:sent:{userId}` - Tracks sent challenge (60s TTL)
- `user:challenge:received:{userId}` - Tracks received challenge (60s TTL)

**TTL Behavior**:
- All keys expire after 60 seconds automatically
- Redis handles expiration, no manual cleanup needed
- Expired challenges return null when queried

### 7. Validation & Error Handling
- Cannot challenge yourself
- Cannot challenge non-existent users
- Cannot challenge banned users
- Cannot send duplicate challenges to same user
- Only receiver can accept/decline challenges
- Expired challenges return appropriate errors

## Testing

### Unit Tests
**File**: `backend/src/matchmaking/challenge.spec.ts`

**Test Coverage**:
1. Challenge Creation
   - ✓ Creates challenge successfully
   - ✓ Prevents self-challenges
   - ✓ Validates receiver exists
   - ✓ Prevents challenging banned users
   - ✓ Prevents duplicate challenges

2. Challenge Acceptance
   - ✓ Accepts challenge and creates game
   - ✓ Validates challenge exists
   - ✓ Validates user is receiver

3. Challenge Decline
   - ✓ Declines challenge successfully
   - ✓ Validates challenge exists
   - ✓ Validates user is receiver

4. Challenge Retrieval
   - ✓ Returns received challenges
   - ✓ Returns sent challenges
   - ✓ Returns empty arrays when no challenges

5. Challenge Expiration
   - ✓ Sets 60-second TTL correctly
   - ✓ Calculates expiration time accurately

**Test Results**: All 16 tests passing

## API Usage Examples

### Create a Challenge
```bash
POST /api/matchmaking/challenges
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "receiverId": "user-uuid",
  "timeControl": "BLITZ",
  "initialTimeMinutes": 5,
  "incrementSeconds": 3,
  "isRated": true
}
```

### Accept a Challenge
```bash
POST /api/matchmaking/challenges/{challengeId}/accept
Authorization: Bearer <jwt_token>
```

### Decline a Challenge
```bash
POST /api/matchmaking/challenges/{challengeId}/decline
Authorization: Bearer <jwt_token>
```

### Get Received Challenges
```bash
GET /api/matchmaking/challenges/received
Authorization: Bearer <jwt_token>
```

### Get Sent Challenges
```bash
GET /api/matchmaking/challenges/sent
Authorization: Bearer <jwt_token>
```

## WebSocket Integration

### Client-Side Example
```typescript
// Listen for challenge received
socket.on('challenge_received', (data) => {
  console.log('Challenge from:', data.sender.displayName);
  console.log('Time control:', data.timeControl);
  console.log('Expires at:', new Date(data.expiresAt));
  // Show challenge notification UI
});

// Listen for challenge accepted
socket.on('challenge_accepted', (data) => {
  console.log('Challenge accepted! Game ID:', data.gameId);
  // Navigate to game
});

// Listen for challenge declined
socket.on('challenge_declined', (data) => {
  console.log('Challenge declined by:', data.receiver.displayName);
  // Show notification
});

// Listen for challenge expired
socket.on('challenge_expired', (data) => {
  console.log('Challenge expired:', data.challengeId);
  // Remove from UI
});
```

## Key Features

1. **Real-Time Notifications**: WebSocket events ensure instant updates
2. **Automatic Expiration**: Redis TTL handles cleanup automatically
3. **Validation**: Comprehensive checks prevent invalid challenges
4. **Flexible Settings**: Support for all time controls and rated/unrated games
5. **User-Friendly**: Clear error messages and status tracking

## Performance Considerations

- Redis operations are O(1) for get/set/delete
- No database queries for challenge storage (uses Redis)
- WebSocket notifications are non-blocking
- Automatic cleanup via TTL prevents memory leaks
- Minimal data stored per challenge (~200 bytes)

## Future Enhancements (Not in Current Scope)

- Multiple simultaneous challenges per user
- Challenge history/statistics
- Challenge templates/presets
- Challenge with specific color preference
- Challenge with custom time controls beyond presets
- Challenge rematch after game completion

## Files Modified/Created

### Created
- `backend/src/matchmaking/dto/create-challenge.dto.ts`
- `backend/src/matchmaking/challenge.spec.ts`
- `backend/src/matchmaking/TASK_17.6_CHALLENGE_SYSTEM.md`

### Modified
- `backend/src/matchmaking/matchmaking.service.ts`
- `backend/src/matchmaking/matchmaking.controller.ts`
- `backend/src/gateways/matchmaking.gateway.ts`

## Conclusion

The direct challenge system is fully implemented and tested, meeting all requirements:
- ✅ 7.4: Players can send direct challenges
- ✅ 7.5: Receivers are notified within 2 seconds via WebSocket
- ✅ 7.6: Players can accept, decline, or ignore challenges
- ✅ 7.7: Challenges expire after 60 seconds automatically

The implementation is minimal, fast, and production-ready with comprehensive test coverage.
