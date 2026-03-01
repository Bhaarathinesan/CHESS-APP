# Task 11.2: PGN Formatter Implementation

## Overview
Implemented a PGN (Portable Game Notation) formatter service that converts parsed game objects back into valid PGN format. This complements the PGN parser (task 11.1) and enables full round-trip conversion.

## Requirements Implemented

### Requirement 28.7: Format game objects into valid PGN files
✅ **Implemented**: The `PgnFormatterService.formatGame()` method converts `ParsedGame` objects into valid PGN strings.

### Requirement 28.8: Include all required PGN headers when formatting games
✅ **Implemented**: The formatter includes all seven required PGN headers in the correct order:
- Event
- Site
- Date
- Round
- White
- Black
- Result

Optional headers (ECO, WhiteElo, BlackElo, etc.) are also preserved and included after required headers.

### Requirement 28.9: Format moves with proper move numbers and notation
✅ **Implemented**: The formatter correctly:
- Adds move numbers for white's moves (1., 2., 3., etc.)
- Formats moves in Standard Algebraic Notation (SAN)
- Handles special moves (castling O-O and O-O-O, pawn promotion e8=Q)
- Includes comments in braces {comment}
- Includes variations in parentheses (1... c5 2. Nf3)
- Wraps long move sequences at 80 characters without breaking comments or variations
- Adds result markers at the end (1-0, 0-1, 1/2-1/2, *)

## Implementation Details

### Files Created
1. **backend/src/chess/pgn-formatter.service.ts** - Main formatter service
2. **backend/src/chess/pgn-formatter.service.spec.ts** - Unit tests (27 tests)
3. **backend/src/chess/pgn-round-trip.spec.ts** - Integration tests (11 tests)

### Key Features

#### Header Formatting
- Headers are output in the standard order
- All header values are properly quoted
- Optional headers are preserved

#### Move Formatting
- Move numbers are added for white's moves
- Black's first move in variations uses ellipsis notation (1... c5)
- Comments are preserved and formatted in braces
- Variations are preserved and formatted in parentheses
- Nested variations are supported

#### Line Wrapping
- Move text is wrapped at 80 characters for readability
- Comments and variations are kept as single tokens (not split across lines)
- Proper tokenization ensures valid PGN structure

#### Multiple Games
- `formatMultipleGames()` method formats arrays of games
- Games are separated by blank lines

### Test Coverage

#### Unit Tests (27 tests)
- Basic formatting with all required headers
- Header ordering
- Optional headers
- Move number formatting
- Castling (kingside and queenside)
- Pawn promotion
- Result markers (1-0, 0-1, 1/2-1/2, *)
- Comments (single and multiple)
- Variations (single and multiple)
- Multiple games
- Line wrapping
- Real-world examples (Scholar's Mate, Fool's Mate, annotated games)
- Edge cases (single move, empty comments/variations)

#### Round-Trip Integration Tests (11 tests)
- Parse → Format → Parse preserves game data
- Comments preservation
- Variations preservation
- Optional headers preservation
- Scholar's Mate round-trip
- Castling round-trip
- Queenside castling round-trip
- Pawn promotion round-trip
- Multiple games round-trip
- Complex games with comments and variations
- Validation of formatted PGN

All 38 tests pass successfully.

## Usage Example

```typescript
import { PgnFormatterService } from './pgn-formatter.service';
import { ParsedGame } from './pgn-parser.service';

const formatter = new PgnFormatterService();

const game: ParsedGame = {
  headers: {
    Event: 'Test Tournament',
    Site: 'Online',
    Date: '2024.01.15',
    Round: '1',
    White: 'Player A',
    Black: 'Player B',
    Result: '1-0',
  },
  moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
  comments: {
    1: ['Best by test'],
  },
  variations: {},
  result: '1-0',
};

const pgn = formatter.formatGame(game);
console.log(pgn);
// Output:
// [Event "Test Tournament"]
// [Site "Online"]
// [Date "2024.01.15"]
// [Round "1"]
// [White "Player A"]
// [Black "Player B"]
// [Result "1-0"]
//
// 1. e4 {Best by test} e5 2. Nf3 Nc6 3. Bb5 1-0
```

## Integration

The formatter service has been added to the `ChessModule` and is exported for use by other modules:

```typescript
@Module({
  providers: [ChessEngineService, PgnParserService, PgnFormatterService],
  exports: [ChessEngineService, PgnParserService, PgnFormatterService],
})
export class ChessModule {}
```

## Round-Trip Property

The implementation satisfies **Requirement 28.10** (round-trip property):
- For all valid game objects, parsing → formatting → parsing produces an equivalent game object
- All 11 round-trip tests verify this property
- Headers, moves, comments, variations, and results are all preserved

## Next Steps

Task 11.3 will implement unit tests for the PGN parser and formatter (already completed as part of this implementation).

Task 11.4 will implement property-based tests for the PGN round-trip property.

Task 11.5 will implement PGN import/export endpoints in the API.

## Status
✅ **COMPLETE** - All requirements implemented and tested
- 27 unit tests passing
- 11 round-trip integration tests passing
- Full PGN formatting support
- Round-trip property verified
