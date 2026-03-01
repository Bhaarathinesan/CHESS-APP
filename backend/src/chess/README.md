# Chess Module

This module provides chess game logic and move validation using the chess.js library. It wraps chess.js functionality in a NestJS service for easy integration with the rest of the application.

## Overview

The `ChessEngineService` is a stateless service that provides methods for:
- Creating and managing chess game instances
- Validating and executing moves
- Checking game state (check, checkmate, stalemate, draw)
- Working with FEN and PGN notation
- Managing move history

## Usage

### Basic Example

```typescript
import { ChessEngineService } from './chess/chess-engine.service';

// Inject the service
constructor(private chessEngine: ChessEngineService) {}

// Create a new game
const game = this.chessEngine.createGame();

// Make a move
const move = this.chessEngine.makeMove(game, 'e2', 'e4');
if (move) {
  console.log('Move successful:', move.san);
} else {
  console.log('Invalid move');
}

// Check game state
if (this.chessEngine.isCheckmate(game)) {
  console.log('Checkmate!');
}
```

### Move Validation

```typescript
// Check if a move is valid before making it
if (this.chessEngine.isValidMove(game, 'e2', 'e4')) {
  this.chessEngine.makeMove(game, 'e2', 'e4');
}

// Get all legal moves
const allMoves = this.chessEngine.getLegalMoves(game);

// Get legal moves for a specific piece
const pawnMoves = this.chessEngine.getLegalMoves(game, 'e2');
```

### Game State Checks

```typescript
// Check various game states
const isCheck = this.chessEngine.isCheck(game);
const isCheckmate = this.chessEngine.isCheckmate(game);
const isStalemate = this.chessEngine.isStalemate(game);
const isDraw = this.chessEngine.isDraw(game);
const isGameOver = this.chessEngine.isGameOver(game);

// Check specific draw conditions
const isInsufficientMaterial = this.chessEngine.isInsufficientMaterial(game);
const isThreefoldRepetition = this.chessEngine.isThreefoldRepetition(game);
```

### FEN Operations

```typescript
// Get current position as FEN
const fen = this.chessEngine.getFen(game);

// Load a position from FEN
const success = this.chessEngine.loadFen(game, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');

// Create a game from FEN
const game = this.chessEngine.createGame('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
```

### PGN Operations

```typescript
// Get game as PGN
const pgn = this.chessEngine.getPgn(game);

// Load a game from PGN
const success = this.chessEngine.loadPgn(game, '1. e4 e5 2. Nf3 Nc6');
```

### Move History

```typescript
// Get move history in SAN notation
const history = this.chessEngine.getHistory(game);
// ['e4', 'e5', 'Nf3', 'Nc6']

// Get verbose move history with details
const verboseHistory = this.chessEngine.getHistory(game, true);
// [{ from: 'e2', to: 'e4', san: 'e4', ... }, ...]

// Undo the last move
const undoneMove = this.chessEngine.undo(game);

// Reset to starting position
this.chessEngine.reset(game);
```

### Special Moves

```typescript
// Pawn promotion
const move = this.chessEngine.makeMove(game, 'e7', 'e8', 'q');

// Castling (using SAN notation)
this.chessEngine.makeMoveSan(game, 'O-O');  // Kingside
this.chessEngine.makeMoveSan(game, 'O-O-O');  // Queenside

// En passant (handled automatically)
this.chessEngine.makeMove(game, 'e5', 'd6');
```

## API Reference

### Game Creation

- `createGame(fen?: string): Chess` - Create a new chess game instance

### Move Operations

- `isValidMove(game, from, to, promotion?): boolean` - Check if a move is legal
- `makeMove(game, from, to, promotion?): Move | null` - Execute a move
- `makeMoveSan(game, san): Move | null` - Execute a move using SAN notation
- `getLegalMoves(game, square?): Move[]` - Get all legal moves

### Game State

- `isCheck(game): boolean` - Check if current player is in check
- `isCheckmate(game): boolean` - Check if current player is checkmated
- `isStalemate(game): boolean` - Check if position is stalemate
- `isDraw(game): boolean` - Check if game is drawn
- `isInsufficientMaterial(game): boolean` - Check for insufficient material
- `isThreefoldRepetition(game): boolean` - Check for threefold repetition
- `isGameOver(game): boolean` - Check if game is over

### Notation

- `getFen(game): string` - Get current position as FEN
- `loadFen(game, fen): boolean` - Load position from FEN
- `getPgn(game): string` - Get game as PGN
- `loadPgn(game, pgn): boolean` - Load game from PGN

### History

- `getHistory(game, verbose?): string[] | Move[]` - Get move history
- `undo(game): Move | null` - Undo last move
- `reset(game): void` - Reset to starting position

### Utility

- `getTurn(game): 'w' | 'b'` - Get current turn
- `getAscii(game): string` - Get ASCII board representation

## Important Notes

1. **Stateless Service**: The service itself is stateless. Each game is represented by a `Chess` instance that you must manage.

2. **Server-Side Validation**: Always validate moves server-side. This service should be used on the backend to ensure game integrity.

3. **Error Handling**: Methods that can fail (like `makeMove`, `loadFen`, `loadPgn`) return `null` or `false` on failure rather than throwing exceptions.

4. **Chess.js Instance**: The service returns and accepts `Chess` instances from the chess.js library. These instances maintain the game state.

## Testing

The module includes comprehensive unit tests covering:
- Basic piece movement validation
- Special moves (castling, en passant, promotion)
- Game state detection (check, checkmate, stalemate, draw)
- FEN and PGN operations
- Move history and undo functionality

Run tests with:
```bash
npm test -- chess-engine.service.spec.ts
```

## Requirements Validation

This module validates **Requirement 2.11**: "THE Chess_Engine SHALL validate all moves on both client-side and server-side"

The service provides the server-side validation component. The same chess.js library should be used on the client-side to ensure consistent validation logic.
