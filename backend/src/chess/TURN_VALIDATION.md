# Player Turn Validation - Task 6.7

## Overview

Task 6.7 implements player turn validation to ensure players can only move their own pieces and that turns alternate correctly between white and black.

## Implementation

The turn validation is handled automatically by the chess.js library, which is wrapped by our `ChessEngineService`. The implementation leverages the following methods:

### Key Methods

1. **`getTurn(game: Chess): 'w' | 'b'`**
   - Returns the current player's turn ('w' for white, 'b' for black)
   - Used to check whose turn it is before allowing moves

2. **`isValidMove(game: Chess, from: string, to: string, promotion?: string): boolean`**
   - Validates if a move is legal in the current position
   - Automatically checks if the piece belongs to the current player
   - Returns `false` if trying to move opponent's pieces

3. **`makeMove(game: Chess, from: string, to: string, promotion?: string): Move | null`**
   - Attempts to make a move on the board
   - Returns `null` if the move is invalid (including wrong turn)
   - Automatically switches turn after a successful move

## How It Works

The chess.js library internally tracks the current turn and validates all moves against it:

1. When `isValidMove()` or `makeMove()` is called, chess.js checks:
   - Is there a piece at the source square?
   - Does the piece belong to the current player?
   - Is the move legal according to chess rules?

2. If a player tries to move an opponent's piece:
   - `isValidMove()` returns `false`
   - `makeMove()` returns `null`
   - No move is made, turn doesn't change

3. After a successful move:
   - The turn automatically switches to the opponent
   - The next call to `getTurn()` returns the opposite color

## Requirement Compliance

This implementation satisfies **Requirement 2.10**:
- ✅ THE Chess_Engine SHALL prevent players from moving opponent pieces

## Testing

Comprehensive unit tests are included in `chess-engine.service.spec.ts`:

### Test Cases

1. **Prevent moving opponent pieces**
   ```typescript
   it('should prevent players from moving opponent pieces', () => {
     const game = service.createGame();
     // White's turn, try to move black piece
     expect(service.isValidMove(game, 'e7', 'e5')).toBe(false);
   });
   ```

2. **Validate correct player turn**
   ```typescript
   it('should validate correct player turn', () => {
     const game = service.createGame();
     
     // White's turn
     expect(service.getTurn(game)).toBe('w');
     expect(service.isValidMove(game, 'e2', 'e4')).toBe(true);
     
     service.makeMove(game, 'e2', 'e4');
     
     // Black's turn
     expect(service.getTurn(game)).toBe('b');
     expect(service.isValidMove(game, 'e7', 'e5')).toBe(true);
     expect(service.isValidMove(game, 'd2', 'd4')).toBe(false); // white piece on black's turn
   });
   ```

## Usage Example

```typescript
const game = chessEngineService.createGame();

// Check whose turn it is
const currentTurn = chessEngineService.getTurn(game); // 'w'

// Try to move white piece (valid)
const whiteMove = chessEngineService.makeMove(game, 'e2', 'e4');
// Returns move object, turn switches to 'b'

// Try to move white piece again (invalid - black's turn)
const invalidMove = chessEngineService.makeMove(game, 'd2', 'd4');
// Returns null, turn remains 'b'

// Move black piece (valid)
const blackMove = chessEngineService.makeMove(game, 'e7', 'e5');
// Returns move object, turn switches to 'w'
```

## Server-Side Validation

In a multiplayer context, the server should:

1. Receive move requests from clients
2. Verify the requesting player matches the current turn
3. Use `isValidMove()` to validate the move
4. Use `makeMove()` to execute valid moves
5. Broadcast the move to all clients
6. Reject invalid moves with appropriate error messages

Example server-side validation:
```typescript
async handleMove(client: Socket, moveData: { from: string; to: string }) {
  const game = await this.getGame(client.gameId);
  const player = await this.getPlayer(client.userId);
  
  // Check if it's the player's turn
  const currentTurn = this.chessEngineService.getTurn(game.chessInstance);
  if ((currentTurn === 'w' && player.color !== 'white') ||
      (currentTurn === 'b' && player.color !== 'black')) {
    return { error: 'Not your turn' };
  }
  
  // Validate and make move
  const move = this.chessEngineService.makeMove(
    game.chessInstance,
    moveData.from,
    moveData.to
  );
  
  if (!move) {
    return { error: 'Invalid move' };
  }
  
  // Broadcast move to all clients
  this.broadcastMove(client.gameId, move);
}
```

## Conclusion

Task 6.7 is complete. The ChessEngineService properly exposes and tests the turn validation functionality provided by chess.js, ensuring players cannot move their opponent's pieces and that turns alternate correctly.
