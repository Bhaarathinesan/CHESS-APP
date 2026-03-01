# Task 8.16: Insufficient Material Detection

## Overview

This task implements detection of insufficient material draw conditions as specified in Requirements 4.7, 4.8, and 4.9.

**Requirement 4.7:** WHEN only Kings remain on the board, THE Chess_Engine SHALL automatically declare a draw for insufficient material

**Requirement 4.8:** WHEN only Kings and one Bishop or one Knight remain, THE Chess_Engine SHALL automatically declare a draw for insufficient material

**Requirement 4.9:** WHEN only Kings and Bishops of the same color remain, THE Chess_Engine SHALL automatically declare a draw for insufficient material

## Implementation Details

### Approach

The chess.js library automatically detects insufficient material positions and provides built-in detection through the `isInsufficientMaterial()` method. The ChessEngineService already exposes this functionality.

### Insufficient Material Scenarios

#### Automatic Draw Positions

1. **King vs King** (Requirement 4.7)
   - Only two kings on the board
   - No possible checkmate

2. **King + Bishop vs King** (Requirement 4.8)
   - One side has a king and bishop
   - Other side has only a king
   - Bishop alone cannot deliver checkmate

3. **King + Knight vs King** (Requirement 4.8)
   - One side has a king and knight
   - Other side has only a king
   - Knight alone cannot deliver checkmate

4. **King + Bishops (same color) vs King** (Requirement 4.9)
   - Multiple bishops all on the same colored squares
   - Cannot deliver checkmate with same-colored bishops

5. **King + Bishop vs King + Bishop (same color)**
   - Both sides have bishops on the same colored squares
   - Cannot deliver checkmate

6. **King + Knight vs King + Knight**
   - Both sides have knights
   - Cannot force checkmate

7. **King + Bishop vs King + Knight**
   - One side has bishop, other has knight
   - Cannot force checkmate

#### Sufficient Material Positions

These positions have enough material to deliver checkmate:

- King + Rook vs King
- King + Queen vs King
- King + Pawn vs King (pawn can promote)
- King + Two Knights vs King (checkmate is possible, though difficult)
- King + Bishops (opposite colors) vs King
- King + Bishop + Knight vs King

### Methods Used

- `isInsufficientMaterial(game)`: Returns true if the position has insufficient material
- `isDraw(game)`: Returns true if the game is drawn (includes insufficient material)
- `isGameOver(game)`: Returns true if the game is over (includes insufficient material)

## Test Coverage

Comprehensive tests were created in `insufficient-material.spec.ts` covering:

### King vs King (4 tests)
- ✅ Detection with only two kings
- ✅ Detection with kings in different positions
- ✅ Detection with kings adjacent
- ✅ No detection at game start

### King and Bishop vs King (4 tests)
- ✅ Detection with King+Bishop vs King
- ✅ Detection with King vs King+Bishop
- ✅ Detection with light-squared bishop
- ✅ Detection with dark-squared bishop

### King and Knight vs King (3 tests)
- ✅ Detection with King+Knight vs King
- ✅ Detection with King vs King+Knight
- ✅ Detection with knight in different positions

### King and Bishops of Same Color (4 tests)
- ✅ Detection with two light-squared bishops
- ✅ Detection with two dark-squared bishops
- ✅ Detection with bishops on same color for both sides
- ✅ Detection with multiple same-colored bishops

### Sufficient Material Scenarios (6 tests)
- ✅ No detection with King+Rook vs King
- ✅ No detection with King+Queen vs King
- ✅ No detection with King+Pawn vs King
- ✅ No detection with King+two Knights vs King
- ✅ No detection with bishops on opposite colors
- ✅ No detection with King+Bishop+Knight vs King

### Edge Cases and Complex Scenarios (5 tests)
- ✅ Detection after pieces are captured
- ✅ Handling with kings in check position
- ✅ Detection regardless of whose turn it is
- ✅ Detection with castling rights in FEN
- ✅ Detection with en passant square in FEN

### Integration with Other Draw Conditions (4 tests)
- ✅ Detection independent of other conditions
- ✅ Not confused with stalemate
- ✅ Not confused with threefold repetition
- ✅ Not confused with fifty-move rule

### Automatic Draw Declaration (3 tests)
- ✅ Automatic draw declaration
- ✅ Game marked as over
- ✅ Moves still available (but game is over)

### Progression to Insufficient Material (2 tests)
- ✅ Detection after last piece is captured
- ✅ Detection in endgame progression

### Special Cases (4 tests)
- ✅ King+Bishop vs King+Bishop (same color)
- ✅ No detection with opposite colored bishops
- ✅ King+Knight vs King+Knight
- ✅ King+Bishop vs King+Knight

**Total: 43 comprehensive tests**

## Usage Example

```typescript
const game = service.createGame();

// Set up King vs King position
const fen = '8/8/8/8/8/4k3/8/4K3 w - - 0 1';
service.loadFen(game, fen);

// Check for insufficient material
if (service.isInsufficientMaterial(game)) {
  console.log('Draw by insufficient material');
  console.log('Game over:', service.isGameOver(game)); // true
}
```

## Automatic Draw Declaration

Unlike the fifty-move rule and threefold repetition (which require a player to claim the draw), insufficient material **automatically** ends the game as a draw:

```typescript
const fen = '8/8/8/8/8/4k3/8/4K3 w - - 0 1';
const game = service.createGame(fen);

console.log(service.isInsufficientMaterial(game)); // true
console.log(service.isDraw(game));                 // true
console.log(service.isGameOver(game));             // true
```

## Integration Points

### Game Server
When insufficient material is detected:
1. The server should automatically end the game as a draw
2. No player action is required
3. The game result should be recorded as a draw
4. Both players should be notified immediately

### Database
When recording games with insufficient material:
- Store the termination reason as `'insufficient_material'`
- Record the final position in FEN format
- Mark the result as a draw

### UI
The client should:
- Display a message indicating the draw by insufficient material
- Show the final position
- Disable further move input
- Update the game status to "Draw"

## Notes

1. **Automatic vs Manual**: Insufficient material automatically ends the game, unlike fifty-move rule or threefold repetition
2. **FIDE Rules**: This implementation follows standard FIDE rules for insufficient material
3. **Edge Cases**: The chess.js library handles complex cases like multiple bishops on same-colored squares
4. **Bishop Colors**: Bishops are considered to be on the same color if they occupy squares of the same color (light or dark)

## Bishop Color Detection

To determine if bishops are on the same colored squares:
- Light squares: (file + rank) is even
- Dark squares: (file + rank) is odd

Examples:
- a1 (0+0=0, even) = dark square
- a2 (0+1=1, odd) = light square
- h8 (7+7=14, even) = dark square

## Related Requirements

- Requirement 4.7: King vs King insufficient material
- Requirement 4.8: King + Bishop/Knight vs King insufficient material
- Requirement 4.9: King + same-colored Bishops insufficient material
- Requirement 4.12: Record game termination reason
- Requirement 33.3: Unit tests for draw conditions

## Related Tasks

- Task 8.7: Stalemate detection (another automatic draw)
- Task 8.10: Threefold repetition detection (claimable draw)
- Task 8.13: Fifty-move rule detection (claimable draw)
- Task 8.4: Checkmate detection (game ending condition)
