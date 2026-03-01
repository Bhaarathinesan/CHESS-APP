# Draw Offer Implementation

## Overview

This document describes the implementation of the draw offer and acceptance mechanism for the ChessArena platform, fulfilling requirements 4.10 and 4.11.

## Requirements

- **4.10**: WHEN a player offers a draw, THE Chess_Engine SHALL notify the opponent and await response within 60 seconds
- **4.11**: WHEN both players agree to a draw, THE Chess_Engine SHALL end the game as a draw by mutual agreement

## Architecture

### Storage

Draw offers are stored temporarily in Redis with a 60-second TTL (Time To Live). The key format is:
```
draw_offer:{gameId}
```

The value is a JSON string containing:
```json
{
  "offeringPlayerId": "uuid",
  "timestamp": 1234567890
}
```

### WebSocket Events

The implementation uses the `/game` namespace with the following events:

#### Client → Server Events

1. **offer_draw**
   - Payload: `{ gameId: string, playerId: string }`
   - Creates a new draw offer
   - Returns: `draw_offer_sent` or `draw_offer_error`

2. **accept_draw**
   - Payload: `{ gameId: string, playerId: string }`
   - Accepts an existing draw offer
   - Returns: `draw_accepted_confirmed` or `draw_accept_error`

3. **decline_draw**
   - Payload: `{ gameId: string, playerId: string }`
   - Declines an existing draw offer
   - Returns: `draw_declined_confirmed` or `draw_decline_error`

4. **cancel_draw_offer**
   - Payload: `{ gameId: string, playerId: string }`
   - Cancels the player's own draw offer
   - Returns: `draw_offer_cancelled_confirmed` or `draw_cancel_error`

#### Server → Client Events

1. **draw_offered**
   - Payload: `{ gameId: string, offeringPlayerId: string, expiresAt: number }`
   - Broadcast to all players in the game room
   - Notifies that a draw has been offered

2. **draw_accepted**
   - Payload: `{ gameId: string, acceptingPlayerId: string, offeringPlayerId: string }`
   - Broadcast to all players in the game room
   - Notifies that the draw was accepted

3. **draw_declined**
   - Payload: `{ gameId: string, decliningPlayerId: string, offeringPlayerId: string }`
   - Broadcast to all players in the game room
   - Notifies that the draw was declined

4. **draw_offer_expired**
   - Payload: `{ gameId: string, offeringPlayerId: string }`
   - Broadcast to all players in the game room
   - Notifies that the draw offer expired after 60 seconds

5. **draw_offer_cancelled**
   - Payload: `{ gameId: string, offeringPlayerId: string }`
   - Broadcast to all players in the game room
   - Notifies that the draw offer was cancelled

## Implementation Details

### Draw Offer Flow

1. Player A sends `offer_draw` event
2. Server validates:
   - No existing draw offer for this game
3. Server stores offer in Redis with 60-second TTL
4. Server broadcasts `draw_offered` to game room
5. Server sets up 60-second timeout
6. Player B can:
   - Accept: sends `accept_draw` → server broadcasts `draw_accepted`
   - Decline: sends `decline_draw` → server broadcasts `draw_declined`
   - Wait: after 60 seconds → server broadcasts `draw_offer_expired`
7. Player A can cancel before response: sends `cancel_draw_offer` → server broadcasts `draw_offer_cancelled`

### Timeout Mechanism

The implementation uses two layers of timeout protection:

1. **Redis TTL**: Automatically expires the key after 60 seconds
2. **Node.js setTimeout**: Actively checks and broadcasts expiration event

This dual approach ensures:
- Memory cleanup even if the timeout callback fails
- Active notification to clients when offer expires
- Proper cleanup of timeout references

### Validation Rules

1. **Offer Draw**:
   - Only one active draw offer per game
   - Player must be part of the game

2. **Accept Draw**:
   - Active draw offer must exist
   - Accepting player cannot be the offering player

3. **Decline Draw**:
   - Active draw offer must exist
   - Declining player cannot be the offering player

4. **Cancel Draw Offer**:
   - Active draw offer must exist
   - Canceling player must be the offering player

## Testing

Unit tests cover:
- ✅ Creating draw offers
- ✅ Rejecting duplicate offers
- ✅ Auto-expiring after 60 seconds
- ✅ Accepting draw offers
- ✅ Declining draw offers
- ✅ Canceling draw offers
- ✅ Validation error cases
- ✅ Preventing self-acceptance/decline

## Frontend Integration

To integrate with the frontend, listen for these events:

```typescript
// Offer a draw
socket.emit('offer_draw', { gameId, playerId });

// Listen for draw offers
socket.on('draw_offered', ({ gameId, offeringPlayerId, expiresAt }) => {
  // Show draw offer UI with countdown
});

// Accept a draw
socket.emit('accept_draw', { gameId, playerId });

// Listen for draw acceptance
socket.on('draw_accepted', ({ gameId, acceptingPlayerId, offeringPlayerId }) => {
  // End game as draw
});

// Decline a draw
socket.emit('decline_draw', { gameId, playerId });

// Listen for draw decline
socket.on('draw_declined', ({ gameId, decliningPlayerId, offeringPlayerId }) => {
  // Hide draw offer UI
});

// Listen for draw offer expiration
socket.on('draw_offer_expired', ({ gameId, offeringPlayerId }) => {
  // Hide draw offer UI
});

// Cancel draw offer
socket.emit('cancel_draw_offer', { gameId, playerId });

// Listen for draw offer cancellation
socket.on('draw_offer_cancelled', ({ gameId, offeringPlayerId }) => {
  // Hide draw offer UI
});
```

## Game State Integration

When a draw is accepted (`draw_accepted` event), the game service should:

1. Update the game status to `COMPLETED`
2. Set the result to `DRAW`
3. Set the termination reason to `draw_agreement`
4. Save the final game state
5. Update player ratings (if rated game)
6. Notify both players of the final result

## Security Considerations

1. **Authentication**: All events require JWT authentication via `WsJwtGuard`
2. **Authorization**: Players can only interact with games they're part of
3. **Rate Limiting**: Consider adding rate limiting to prevent spam
4. **Validation**: All player IDs and game IDs are validated

## Future Enhancements

Potential improvements:
- Add draw offer history to game records
- Track draw offer statistics per player
- Implement cooldown between draw offers
- Add notification preferences for draw offers
- Support for automatic draw claims (threefold repetition, fifty-move rule)
