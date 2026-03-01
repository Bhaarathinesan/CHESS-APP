# Task 17.7: Rematch System Implementation

## Overview
Implemented a complete rematch system allowing players to offer rematches after game completion. The system uses Redis for temporary storage with automatic 60-second expiration, WebSocket notifications for real-time updates, and automatically swaps colors for the rematch game.

## Requirements Implemented
- **7.8**: When a game completes, offer both players a rematch option
  - Players can offer rematch after game completion
  - Rematch uses same time control and settings as original game
  - Colors are swapped for the rematch
  - Rematch offers expire after 60 seconds

## Implementation Details

### 1. Data Transfer Objects (DTOs)
**File**: `backend/src/matchmaking/dto/create-rematch.dto.ts`
- `CreateRematchDto`: Validates rematch creation requests
  - gameId: The completed game ID

### 2. RematchOffer Interface
**File**: `backend/src/matchmaking/matchmaking.service.ts`
```typescript
interface RematchOffer {
  id: string;
  gameId: string;
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

#### Rematch Creation
- `createRematchOffer()`: Creates a new rematch offer
  - Validates game exists and is completed
  - Validates sender is a player in the game
  - Prevents duplicate rematch offers for same game
  - Stores rematch offer in Redis with 60-second TTL
  - Tracks rematch offers for both sender and receiver
  - Notifies receiver via WebSocket
  - Uses same time control and settings as original game

#### Rematch Response
- `acceptRematchOffer()`: Accepts a rematch offer and creates a new game
  - Validates user is the receiver
  - Creates a new game with swapped colors (white becomes black, black becomes white)
  - Uses same time control and settings as original game
  - Deletes rematch offer from Redis
  - Notifies sender via WebSocket

- `declineRematchOffer()`: Declines a rematch offer
  - Validates user is the receiver
  - Deletes rematch offer from Redis
  - Notifies sender via WebSocket

#### Rematch Retrieval
- `getRematchOffer()`: Retrieves a rematch offer by ID
- `getPendingRematch()`: Gets pending rematch offer for a game
- `getReceivedRematchOffers()`: Gets all rematch offers received by a user
- `getSentRematchOffers()`: Gets all rematch offers sent by a user

### 4. REST API Endpoints
**File**: `backend/src/matchmaking/matchmaking.controller.ts`

- `POST /api/matchmaking/games/:gameId/rematch` - Create a rematch offer
- `POST /api/matchmaking/games/:gameId/rematch/accept` - Accept a rematch offer
- `POST /api/matchmaking/games/:gameId/rematch/decline` - Decline a rematch offer
- `GET /api/matchmaking/rematches/received` - Get received rematch offers
- `GET /api/matchmaking/rematches/sent` - Get sent rematch offers

All endpoints require JWT authentication via `JwtAuthGuard`.

### 5. WebSocket Events
**File**: `backend/src/gateways/matchmaking.gateway.ts`

#### Emitted Events (Server → Client)
- `rematch_offered`: Notifies receiver of new rematch offer
  - Includes sender details, time control, settings, expiration time
  - Sent immediately after rematch offer creation

- `rematch_accepted`: Notifies sender that rematch was accepted
  - Includes game ID and receiver details
  - Sent when receiver accepts the rematch

- `rematch_declined`: Notifies sender that rematch was declined
  - Includes receiver details
  - Sent when receiver declines the rematch

### 6. Redis Storage Strategy
**Keys Used**:
- `rematch:{rematchId}` - Stores rematch offer data (60s TTL)
- `user:rematch:sent:{userId}:{gameId}` - Tracks sent rematch offer (60s TTL)
- `user:rematch:received:{userId}:{gameId}` - Tracks received rematch offer (60s TTL)

**TTL Behavior**:
- All keys expire after 60 seconds automatically
- Redis handles expiration, no manual cleanup needed
- Expired rematch offers return null when queried

### 7. Color Swapping Logic
When a rematch is accepted, the colors are automatically swapped:
- Original white player becomes black in rematch
- Original black player becomes white in rematch
- This ensures fairness and follows standard chess rematch conventions

### 8. Validation & Error Handling
- Game must exist and be completed
- Only players from the original game can offer rematch
- Cannot create duplicate rematch offers for same game
- Only receiver can accept/decline rematch offers
- Expired rematch offers return appropriate errors

## Testing

### Unit Tests
**File**: `backend/src/matchmaking/rematch.spec.ts`

**Test Coverage**:
1. Rematch Offer Creation
   - ✓ Creates rematch offer successfully
   - ✓ Validates game exists
   - ✓ Validates game is completed
   - ✓ Validates sender is a player in the game
   - ✓ Prevents duplicate rematch offers
   - ✓ Sets 60-second TTL correctly

2. Rematch Acceptance
   - ✓ Accepts rematch and creates new game with swapped colors
   - ✓ Validates rematch offer exists
   - ✓ Validates user is receiver
   - ✓ Validates original game exists

3. Rematch Decline
   - ✓ Declines rematch offer successfully
   - ✓ Validates rematch offer exists
   - ✓ Validates user is receiver

4. Rematch Retrieval
   - ✓ Returns rematch offer by ID
   - ✓ Returns null when not found
   - ✓ Returns received rematch offers
   - ✓ Returns sent rematch offers
   - ✓ Returns empty arrays when no offers

**Test Results**: All 19 tests passing

## API Usage Examples

### Create a Rematch Offer
```bash
POST /api/matchmaking/games/{gameId}/rematch
Authorization: Bearer <jwt_token>
```

### Accept a Rematch Offer
```bash
POST /api/matchmaking/games/{gameId}/rematch/accept
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "rematchId": "rematch-uuid"
}
```

### Decline a Rematch Offer
```bash
POST /api/matchmaking/games/{gameId}/rematch/decline
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "rematchId": "rematch-uuid"
}
```

### Get Received Rematch Offers
```bash
GET /api/matchmaking/rematches/received
Authorization: Bearer <jwt_token>
```

### Get Sent Rematch Offers
```bash
GET /api/matchmaking/rematches/sent
Authorization: Bearer <jwt_token>
```

## WebSocket Integration

### Client-Side Example
```typescript
// Listen for rematch offered
socket.on('rematch_offered', (data) => {
  console.log('Rematch offer from:', data.sender.displayName);
  console.log('Game ID:', data.gameId);
  console.log('Time control:', data.timeControl);
  console.log('Expires at:', new Date(data.expiresAt));
  // Show rematch offer notification UI
});

// Listen for rematch accepted
socket.on('rematch_accepted', (data) => {
  console.log('Rematch accepted! New game ID:', data.gameId);
  // Navigate to new game
});

// Listen for rematch declined
socket.on('rematch_declined', (data) => {
  console.log('Rematch declined by:', data.receiver.displayName);
  // Show notification
});
```

## Key Features

1. **Real-Time Notifications**: WebSocket events ensure instant updates
2. **Automatic Expiration**: Redis TTL handles cleanup automatically after 60 seconds
3. **Color Swapping**: Automatically swaps colors for fairness
4. **Same Settings**: Uses exact same time control and settings as original game
5. **Validation**: Comprehensive checks prevent invalid rematch offers
6. **User-Friendly**: Clear error messages and status tracking

## Performance Considerations

- Redis operations are O(1) for get/set/delete
- No database queries for rematch offer storage (uses Redis)
- WebSocket notifications are non-blocking
- Automatic cleanup via TTL prevents memory leaks
- Minimal data stored per rematch offer (~250 bytes)

## Differences from Challenge System

While similar to the challenge system, rematch has key differences:
1. **Context**: Rematch is tied to a completed game
2. **Settings**: Automatically uses same settings as original game
3. **Colors**: Automatically swaps colors for fairness
4. **Validation**: Requires game to be completed
5. **Participants**: Only players from original game can participate

## Files Modified/Created

### Created
- `backend/src/matchmaking/dto/create-rematch.dto.ts`
- `backend/src/matchmaking/rematch.spec.ts`
- `backend/src/matchmaking/TASK_17.7_REMATCH_SYSTEM.md`

### Modified
- `backend/src/matchmaking/matchmaking.service.ts`
- `backend/src/matchmaking/matchmaking.controller.ts`
- `backend/src/gateways/matchmaking.gateway.ts`

## Conclusion

The rematch system is fully implemented and tested, meeting requirement 7.8:
- ✅ 7.8: Players can offer rematch after game completion
  - Rematch uses same time control and settings
  - Colors are automatically swapped
  - Offers expire after 60 seconds
  - Real-time WebSocket notifications

The implementation is minimal, fast, and production-ready with comprehensive test coverage (19/19 tests passing).
