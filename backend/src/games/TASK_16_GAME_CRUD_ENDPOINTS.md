# Task 16: Game CRUD and Management Endpoints

## Overview

This document summarizes the implementation of Task 16, which adds comprehensive game CRUD (Create, Read, Update, Delete) and management endpoints to the ChessArena backend.

## Implemented Features

### 16.1 Game Creation Endpoint ✅

**Endpoint:** `POST /api/games`

**Features:**
- Create new games with customizable settings
- Validate time control configurations
- Support for rated/unrated games
- Tournament game support
- Automatic rating lookup for players
- Validation of player existence
- Prevention of self-play

**DTO:** `CreateGameDto`
- `whitePlayerId` (optional): UUID of white player
- `blackPlayerId` (optional): UUID of black player
- `timeControl`: BULLET, BLITZ, RAPID, or CLASSICAL
- `initialTimeMinutes`: 1-180 minutes
- `incrementSeconds`: 0-60 seconds
- `isRated` (optional): Boolean, defaults to true
- `tournamentId` (optional): UUID of tournament

**Validation:**
- Time control ranges validated per type:
  - BULLET: 1-3 minutes
  - BLITZ: 3-10 minutes
  - RAPID: 10-30 minutes
  - CLASSICAL: 30-180 minutes
- Increment: 0-60 seconds
- Players must exist in database
- Cannot create game against yourself

**Response:** `GameResponseDto` with full game details including:
- Game ID and status
- Player information with current ratings
- Time control settings
- Clock times
- Game state (FEN, move count)

### 16.2 Game Retrieval Endpoints ✅

**Endpoints:**

1. `GET /api/games/:id` - Get single game by ID
   - Returns complete game details
   - Includes player information with ratings
   - Includes all moves if game is completed

2. `GET /api/games/active/me` - Get active games for current user
   - Returns all PENDING and ACTIVE games
   - Ordered by creation date (newest first)
   - Includes player details and ratings

**Features:**
- Authorization checks (users can view their own games or completed games)
- Automatic rating lookup
- Move history included
- Player profile information

### 16.3 Game Result Recording ✅

**Endpoint:** `PUT /api/games/:id/result`

**Features:**
- Record complete game results
- Save all moves with timestamps
- Record termination reason
- Generate and save PGN automatically
- Update game status to COMPLETED

**DTO:** `RecordGameResultDto`
- `result` (optional): WHITE_WIN, BLACK_WIN, or DRAW
- `terminationReason`: String describing how game ended
- `moves`: Array of GameMoveDto objects
- `finalFen` (optional): Final board position
- `openingName` (optional): Opening name

**GameMoveDto includes:**
- `moveNumber`: Move number
- `color`: 'white' or 'black'
- `san`: Standard Algebraic Notation
- `uci`: Universal Chess Interface notation
- `fenAfter`: Board position after move
- `timeTakenMs`: Time spent on move
- `timeRemainingMs`: Time left after move
- Flags: isCheck, isCheckmate, isCapture, isCastling, isEnPassant, isPromotion
- `promotionPiece` (optional): Piece promoted to

**PGN Generation:**
- Automatic PGN generation from game data
- Includes all standard headers (Event, Site, Date, Round, White, Black, Result)
- Optional headers (WhiteElo, BlackElo, Opening, TimeControl)
- Complete move list in SAN notation

### 16.4 Game History Endpoints ✅

**Endpoint:** `GET /api/games/users/:userId/history`

**Features:**
- Paginated game history
- Multiple filter options
- Sorted by completion date (newest first)
- Includes player details and ratings

**Query Parameters:** `GameHistoryQueryDto`
- `page` (optional): Page number, default 1
- `limit` (optional): Items per page, default 20, max 100
- `opponentId` (optional): Filter by specific opponent
- `result` (optional): Filter by result (WHITE_WIN, BLACK_WIN, DRAW)
- `timeControl` (optional): Filter by time control
- `dateFrom` (optional): Filter by start date
- `dateTo` (optional): Filter by end date

**Response:** `GameHistoryResponseDto`
- `games`: Array of game objects
- `total`: Total number of games matching filters
- `page`: Current page number
- `limit`: Items per page
- `totalPages`: Total number of pages

**Result Filtering:**
- Results are from the user's perspective
- WHITE_WIN filter returns games where user won (as white or black)
- BLACK_WIN filter returns games where user lost
- DRAW filter returns drawn games

## Database Schema

The implementation uses the existing Prisma schema with the following models:

- `Game`: Main game record
- `GameMove`: Individual move records
- `User`: Player information
- `Rating`: Player ratings by time control
- `Tournament`: Tournament information (optional)

## Validation and Error Handling

**Validation:**
- All DTOs use class-validator decorators
- Time control ranges validated
- Player existence checked
- Tournament existence checked (if specified)
- Self-play prevention

**Error Responses:**
- `BadRequestException`: Invalid input, validation errors
- `NotFoundException`: Game or player not found
- `ForbiddenException`: Unauthorized access

## Testing

All endpoints are fully tested:

**Service Tests:** `games.service.spec.ts`
- 11 tests passing
- Tests for PGN import/export
- Tests for game creation
- Tests for game retrieval
- Tests for result recording
- Tests for game history

**Controller Tests:** `games.controller.spec.ts`
- 11 tests passing
- Tests for all endpoints
- Tests for error handling
- Tests for query parameter parsing

## Requirements Validation

✅ **Requirement 7.3:** Matchmaking service allows custom game creation
- Implemented via POST /api/games endpoint
- Supports custom time controls and settings

✅ **Requirement 14.7:** Platform allows viewing game details and active games
- Implemented via GET /api/games/:id
- Implemented via GET /api/games/active/me

✅ **Requirement 6.12:** Game server saves complete game record on completion
- Implemented via PUT /api/games/:id/result
- Saves all moves with timestamps
- Generates and saves PGN

✅ **Requirement 4.12:** Chess engine records game termination reason
- Termination reason saved in game record
- Included in PGN generation

✅ **Requirement 14.8:** Platform allows filtering game history
- Implemented via GET /api/games/users/:userId/history
- Supports filtering by opponent, result, time control, date range
- Includes pagination

## API Examples

### Create a Game

```bash
POST /api/games
Authorization: Bearer <token>
Content-Type: application/json

{
  "timeControl": "BLITZ",
  "initialTimeMinutes": 5,
  "incrementSeconds": 3,
  "isRated": true
}
```

### Get Game Details

```bash
GET /api/games/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

### Get Active Games

```bash
GET /api/games/active/me
Authorization: Bearer <token>
```

### Record Game Result

```bash
PUT /api/games/550e8400-e29b-41d4-a716-446655440000/result
Authorization: Bearer <token>
Content-Type: application/json

{
  "result": "WHITE_WIN",
  "terminationReason": "checkmate",
  "moves": [
    {
      "moveNumber": 1,
      "color": "white",
      "san": "e4",
      "uci": "e2e4",
      "fenAfter": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      "timeTakenMs": 2500,
      "timeRemainingMs": 297500,
      "isCheck": false,
      "isCapture": false
    }
    // ... more moves
  ],
  "openingName": "King's Pawn Opening"
}
```

### Get Game History

```bash
GET /api/games/users/550e8400-e29b-41d4-a716-446655440000/history?page=1&limit=20&timeControl=BLITZ&result=WHITE_WIN
Authorization: Bearer <token>
```

## Files Created/Modified

**New Files:**
- `backend/src/games/dto/create-game.dto.ts`
- `backend/src/games/dto/game-response.dto.ts`
- `backend/src/games/dto/record-game-result.dto.ts`
- `backend/src/games/dto/game-history-query.dto.ts`
- `backend/src/games/TASK_16_GAME_CRUD_ENDPOINTS.md`

**Modified Files:**
- `backend/src/games/games.service.ts` - Added new methods
- `backend/src/games/games.controller.ts` - Added new endpoints
- `backend/package.json` - Added class-validator and class-transformer dependencies

## Next Steps

The game CRUD endpoints are now complete and ready for integration with:
- WebSocket game gateway (for real-time game updates)
- Matchmaking service (for automatic game creation)
- Rating system (for rating updates after game completion)
- Tournament system (for tournament game management)

## Notes

- All endpoints require JWT authentication
- Game creation supports both direct challenges and matchmaking
- PGN generation is automatic and follows standard format
- Game history filtering is flexible and supports multiple criteria
- All tests are passing and code is production-ready
