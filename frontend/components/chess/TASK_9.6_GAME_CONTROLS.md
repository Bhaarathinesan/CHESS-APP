# Task 9.6: Game Controls Component - Implementation Summary

## Overview

This document summarizes the implementation of the GameControls component for the ChessArena platform, fulfilling requirements 4.10 and 4.11.

## Requirements Fulfilled

- **Requirement 4.10**: WHEN a player offers a draw, THE Chess_Engine SHALL notify the opponent and await response within 60 seconds
- **Requirement 4.11**: WHEN both players agree to a draw, THE Chess_Engine SHALL end the game as a draw by mutual agreement

## Implementation

### Component: GameControls.tsx

Location: `frontend/components/chess/GameControls.tsx`

#### Features Implemented

1. **Resign Button**
   - Red-styled button with flag icon
   - Shows confirmation modal before resigning
   - Disabled when game is not active
   - Calls `onResign` callback when confirmed

2. **Offer Draw Button**
   - Button with handshake icon
   - Disabled when game is not active or draw offer already exists
   - Calls `onOfferDraw` callback when clicked

3. **Settings Button**
   - Ghost-styled button with settings icon
   - Always enabled (even when game is inactive)
   - Calls `onSettings` callback when clicked

4. **Draw Offer Notifications**
   - **Received Draw Offer**: Blue notification showing opponent's draw offer
     - Displays countdown timer (60 seconds)
     - Shows "Accept Draw" and "Decline" buttons
     - Calls `onAcceptDraw` or `onDeclineDraw` callbacks
   - **Sent Draw Offer**: Yellow notification showing player's pending draw offer
     - Displays countdown timer (60 seconds)
     - Shows "Cancel Offer" button
     - Calls `onCancelDrawOffer` callback

5. **Button States and Permissions**
   - Action buttons (Resign, Offer Draw) disabled when:
     - Game is not active (`isGameActive={false}`)
     - Component is disabled (`disabled={true}`)
   - Offer Draw button additionally disabled when draw offer exists
   - Settings button remains enabled regardless of game state

6. **Countdown Timer**
   - Updates every 100ms for smooth countdown
   - Displays time remaining in seconds (e.g., "60s", "45s", "1s")
   - Automatically clears when draw offer expires

### Props Interface

```typescript
export interface GameControlsProps {
  gameId: string;                    // Game identifier
  playerId: string;                  // Current player identifier
  isPlayerTurn: boolean;             // Whether it's the player's turn
  isGameActive: boolean;             // Whether the game is active
  onResign?: () => void;             // Callback for resignation
  onOfferDraw?: () => void;          // Callback for offering draw
  onAcceptDraw?: () => void;         // Callback for accepting draw
  onDeclineDraw?: () => void;        // Callback for declining draw
  onCancelDrawOffer?: () => void;    // Callback for canceling draw offer
  onSettings?: () => void;           // Callback for settings
  drawOfferState?: {                 // Draw offer state
    hasOffer: boolean;               // Whether a draw offer exists
    isOffering: boolean;             // Whether current player offered
    offeringPlayerId?: string;       // ID of player who offered
    expiresAt?: number;              // Expiration timestamp (ms)
  };
  disabled?: boolean;                // Disable all action buttons
}
```

## WebSocket Integration

The component is designed to work with the draw offer WebSocket events implemented in task 8.19:

### Client → Server Events

- `offer_draw`: Triggered by `onOfferDraw` callback
- `accept_draw`: Triggered by `onAcceptDraw` callback
- `decline_draw`: Triggered by `onDeclineDraw` callback
- `cancel_draw_offer`: Triggered by `onCancelDrawOffer` callback

### Server → Client Events

The parent component should listen for these events and update the `drawOfferState` prop:

- `draw_offered`: Set `hasOffer=true`, `isOffering=false`, update `expiresAt`
- `draw_accepted`: End game as draw
- `draw_declined`: Set `hasOffer=false`
- `draw_offer_expired`: Set `hasOffer=false`
- `draw_offer_cancelled`: Set `hasOffer=false`

## Usage Example

```typescript
import GameControls from '@/components/chess/GameControls';
import { useState, useEffect } from 'react';
import { socket } from '@/lib/socket';

function GamePage() {
  const [drawOfferState, setDrawOfferState] = useState({
    hasOffer: false,
    isOffering: false,
  });

  useEffect(() => {
    // Listen for draw offer events
    socket.on('draw_offered', ({ gameId, offeringPlayerId, expiresAt }) => {
      setDrawOfferState({
        hasOffer: true,
        isOffering: offeringPlayerId === currentPlayerId,
        offeringPlayerId,
        expiresAt,
      });
    });

    socket.on('draw_declined', () => {
      setDrawOfferState({ hasOffer: false, isOffering: false });
    });

    socket.on('draw_offer_expired', () => {
      setDrawOfferState({ hasOffer: false, isOffering: false });
    });

    socket.on('draw_offer_cancelled', () => {
      setDrawOfferState({ hasOffer: false, isOffering: false });
    });

    socket.on('draw_accepted', () => {
      // End game as draw
      handleGameEnd('draw');
    });

    return () => {
      socket.off('draw_offered');
      socket.off('draw_declined');
      socket.off('draw_offer_expired');
      socket.off('draw_offer_cancelled');
      socket.off('draw_accepted');
    };
  }, []);

  const handleResign = () => {
    socket.emit('resign', { gameId, playerId });
  };

  const handleOfferDraw = () => {
    socket.emit('offer_draw', { gameId, playerId });
  };

  const handleAcceptDraw = () => {
    socket.emit('accept_draw', { gameId, playerId });
  };

  const handleDeclineDraw = () => {
    socket.emit('decline_draw', { gameId, playerId });
  };

  const handleCancelDrawOffer = () => {
    socket.emit('cancel_draw_offer', { gameId, playerId });
  };

  return (
    <div>
      {/* Chess board and other components */}
      <GameControls
        gameId={gameId}
        playerId={playerId}
        isPlayerTurn={isPlayerTurn}
        isGameActive={gameStatus === 'active'}
        onResign={handleResign}
        onOfferDraw={handleOfferDraw}
        onAcceptDraw={handleAcceptDraw}
        onDeclineDraw={handleDeclineDraw}
        onCancelDrawOffer={handleCancelDrawOffer}
        onSettings={() => setShowSettings(true)}
        drawOfferState={drawOfferState}
      />
    </div>
  );
}
```

## Testing

### Test File

Location: `frontend/components/chess/__tests__/GameControls.test.tsx`

### Test Coverage

The test suite covers:

1. **Basic Rendering**
   - All control buttons render correctly
   - Buttons are disabled when game is not active
   - Buttons are disabled when disabled prop is true

2. **Resign Functionality**
   - Confirmation modal appears on resign click
   - `onResign` callback is called when confirmed
   - Modal closes when cancelled

3. **Draw Offer Functionality**
   - `onOfferDraw` callback is called when button clicked
   - Offer Draw button is disabled when draw offer exists
   - Draw offer notification appears for received offers
   - Draw offer sent notification appears for sent offers
   - `onAcceptDraw` callback is called when accept clicked
   - `onDeclineDraw` callback is called when decline clicked
   - `onCancelDrawOffer` callback is called when cancel clicked

4. **Draw Offer Timer**
   - Countdown timer displays correctly
   - Timer updates every second
   - Timer shows remaining time in seconds

5. **Settings Button**
   - `onSettings` callback is called when clicked
   - Settings button remains enabled when game is inactive

6. **Button States and Permissions**
   - All buttons enabled when game is active
   - Action buttons disabled when game is inactive
   - Settings button not disabled when game is inactive
   - Draw action buttons disabled when draw offer is active

### Running Tests

Once testing infrastructure is set up (vitest, @testing-library/react), run:

```bash
cd frontend
npm test -- GameControls.test.tsx
```

## UI/UX Features

1. **Visual Feedback**
   - Blue notification for received draw offers
   - Yellow notification for sent draw offers
   - Red-styled resign button for clear warning
   - Icons for all buttons (Flag, Handshake, Settings)

2. **Countdown Timer**
   - Real-time countdown display
   - Clock icon with time remaining
   - Updates smoothly (100ms intervals)

3. **Confirmation Modal**
   - Prevents accidental resignations
   - Clear warning message
   - Easy to cancel

4. **Responsive Design**
   - Buttons wrap on small screens
   - Flexible layout with min-width constraints
   - Dark mode support

## Accessibility

- All buttons have proper labels
- Settings button has title attribute for tooltip
- Modal has proper heading structure
- Keyboard navigation supported
- Focus management in modals

## Future Enhancements

Potential improvements:
- Add sound effects for draw offers
- Add animation for countdown timer
- Add notification badge for pending draw offers
- Add keyboard shortcuts (e.g., Ctrl+R for resign)
- Add confirmation for draw acceptance
- Add draw offer history in game

## Related Files

- Backend draw offer implementation: `backend/src/gateways/game.gateway.ts`
- Draw offer documentation: `backend/src/gateways/DRAW_OFFER_IMPLEMENTATION.md`
- Task 8.19 summary: `backend/src/gateways/TASK_8.19_SUMMARY.md`
- Button component: `frontend/components/ui/Button.tsx`
- ChessBoard component: `frontend/components/chess/ChessBoard.tsx`

## Completion Status

✅ Resign button implemented
✅ Offer Draw button implemented
✅ Settings button implemented
✅ Button states and permissions implemented
✅ Draw offer notifications implemented
✅ Countdown timer implemented
✅ Confirmation modals implemented
✅ Unit tests written
✅ Documentation complete

Task 9.6 is complete and ready for integration with the game page and WebSocket layer.
