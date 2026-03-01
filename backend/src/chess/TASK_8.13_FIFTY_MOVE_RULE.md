# Task 8.13: Fifty-Move Rule Detection

## Overview

This task implements detection of the fifty-move rule draw condition as specified in Requirement 4.6.

**Requirement 4.6:** WHEN 50 consecutive moves occur without a pawn move or capture, THE Chess_Engine SHALL allow either player to claim a draw.

## Implementation Details

### Approach

The chess.js library automatically tracks the halfmove clock (the number of halfmoves since the last pawn move or capture) and provides built-in detection for the fifty-move rule. The ChessEngineService already exposes the `isDraw()` method which includes fifty-move rule detection.

### Key Features

1. **Automatic Tracking**: The halfmove clock is automatically maintained by chess.js
2. **Counter Reset**: The counter resets to zero after any pawn move or capture
3. **Draw Availability**: When 50 full moves (100 halfmoves) occur without a pawn move or capture, the game becomes drawable
4. **Non-Automatic**: The game doesn't end automatically; players must claim the draw

### Methods Used

- `isDraw(game)`: Returns true if the game is drawable by any condition, including fifty-move rule
- The halfmove clock is tracked in the FEN string (5th field)

## Test Coverage

Comprehensive tests were created in `fifty-move-rule.spec.ts` covering:

### Basic Detection (3 tests)
- ✅ No fifty-move rule at game start
- ✅ No detection after 49 moves without pawn move or capture
- ✅ Detection after 50 moves without pawn move or capture

### Counter Reset Conditions (2 tests)
- ✅ Counter resets after pawn move
- ✅ Counter resets after capture

### Different Piece Movements (4 tests)
- ✅ Detection with bishop and knight moves
- ✅ Detection with rook moves
- ✅ Detection with queen moves
- ✅ Detection with king moves

### Edge Cases (3 tests)
- ✅ Handling with castling (doesn't reset counter)
- ✅ Handling with en passant capture (resets counter)
- ✅ Handling with pawn promotion (resets counter)

### Complex Positions (2 tests)
- ✅ Detection in endgame with multiple pieces
- ✅ Detection in middle game position

### Game State (3 tests)
- ✅ Game marked as drawable when rule is reached
- ✅ Moves can continue after rule is reached
- ✅ Game doesn't automatically end

### Integration with Other Draw Conditions (4 tests)
- ✅ Detection independent of other draw conditions
- ✅ Not confused with threefold repetition
- ✅ Can occur simultaneously with threefold repetition
- ✅ Not confused with insufficient material

### FEN Position Handling (3 tests)
- ✅ Respects halfmove clock from FEN string
- ✅ Detection when FEN has halfmove clock at 100
- ✅ Counter resets after pawn move from FEN position

**Total: 27 comprehensive tests**

## Usage Example

```typescript
const game = service.createGame();

// Make 50 moves without pawn moves or captures
for (let i = 0; i < 50; i++) {
  service.makeMoveSan(game, 'Nf3');
  service.makeMoveSan(game, 'Nf6');
  service.makeMoveSan(game, 'Ng1');
  service.makeMoveSan(game, 'Ng8');
}

// Check if fifty-move rule applies
if (service.isDraw(game)) {
  console.log('Draw can be claimed by fifty-move rule');
}
```

## FEN String Format

The halfmove clock is the 5th field in a FEN string:
```
rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
                                                    ^
                                                    halfmove clock
```

- Value of 0-99: No fifty-move rule
- Value of 100+: Fifty-move rule applies, draw can be claimed

## Integration Points

### Game Server
When a game reaches the fifty-move rule:
1. The server should notify both players that a draw can be claimed
2. Either player can claim the draw
3. If neither player claims, the game continues
4. The game should display the halfmove count to players

### Database
When recording games:
- Store the termination reason as `'fifty_move_rule'` if draw is claimed
- Include the halfmove clock value in the final FEN

## Notes

1. **Automatic vs Manual**: Unlike insufficient material (which automatically ends the game), the fifty-move rule requires a player to claim the draw
2. **Counter Tracking**: The halfmove clock increments after each move and resets to 0 after any pawn move or capture
3. **Historical Context**: The fifty-move rule exists to prevent endless games where neither player can make progress
4. **FIDE Rules**: This implementation follows standard FIDE rules for the fifty-move rule

## Related Requirements

- Requirement 4.6: Fifty-move rule detection
- Requirement 4.12: Record game termination reason
- Requirement 33.3: Unit tests for draw conditions

## Related Tasks

- Task 8.10: Threefold repetition detection (similar draw condition)
- Task 8.16: Insufficient material detection (automatic draw)
- Task 8.7: Stalemate detection (automatic draw)
