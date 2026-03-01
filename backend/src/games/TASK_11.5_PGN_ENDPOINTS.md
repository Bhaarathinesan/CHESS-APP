# Task 11.5: PGN Import/Export Endpoints Implementation

## Overview

This task implements REST API endpoints for PGN (Portable Game Notation) import and export functionality, completing requirements 28.11, 28.12, and 28.13 from the chess-arena specification.

## Requirements Implemented

### Requirement 28.11: PGN File Upload
- **Endpoint**: `POST /api/games/import-pgn`
- **Description**: Allows players to upload PGN files to import games
- **Features**:
  - Parses single or multiple games from PGN text
  - Validates PGN format and move legality
  - Creates game records in database
  - Returns list of created game IDs
  - Provides descriptive error messages for invalid PGN

### Requirement 28.12: Single Game Download
- **Endpoint**: `GET /api/games/:id/pgn`
- **Description**: Allows players to download individual games as PGN files
- **Features**:
  - Exports game in standard PGN format
  - Returns stored PGN if available
  - Generates PGN from game data if not stored
  - Includes proper headers (Event, Site, Date, Round, White, Black, Result)
  - Sets appropriate content-type and content-disposition headers
  - Enforces access control (players can view their own games or completed games)

### Requirement 28.13: Multiple Games Download
- **Endpoints**: 
  - `POST /api/games/export-pgn` (with body)
  - `GET /api/games/export-pgn?gameIds=id1,id2,id3` (with query params)
- **Description**: Allows players to download multiple games as a single PGN file
- **Features**:
  - Exports multiple games in a single PGN file
  - Supports both POST with body and GET with query parameters
  - Validates access to all requested games
  - Formats games with proper separation

## Architecture

### Module Structure

```
backend/src/games/
├── games.module.ts              # Module definition
├── games.controller.ts          # REST API endpoints
├── games.service.ts             # Business logic
├── dto/
│   ├── upload-pgn.dto.ts       # DTO for PGN upload
│   └── download-multiple-pgn.dto.ts  # DTO for multiple game export
├── games.controller.spec.ts     # Controller unit tests
├── games.service.spec.ts        # Service unit tests
├── games.integration.spec.ts    # Integration tests
└── TASK_11.5_PGN_ENDPOINTS.md  # This documentation
```

### Dependencies

- **PrismaService**: Database access for game records
- **PgnParserService**: Parses PGN text into game objects
- **PgnFormatterService**: Formats game objects into PGN text
- **JwtAuthGuard**: Authentication middleware

## API Endpoints

### 1. Import PGN File

**Request:**
```http
POST /api/games/import-pgn
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "pgnText": "[Event \"Test Game\"]\n[Site \"ChessArena\"]\n..."
}
```

**Response:**
```json
{
  "message": "Successfully imported 2 game(s)",
  "gameIds": ["uuid-1", "uuid-2"],
  "count": 2
}
```

**Error Responses:**
- `400 Bad Request`: Invalid PGN format
- `401 Unauthorized`: Missing or invalid authentication token

### 2. Download Single Game

**Request:**
```http
GET /api/games/{gameId}/pgn
Authorization: Bearer <jwt-token>
```

**Response:**
```
Content-Type: application/x-chess-pgn
Content-Disposition: attachment; filename="game.pgn"

[Event "Test Game"]
[Site "ChessArena"]
[Date "2024.01.15"]
[Round "1"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User does not have access to this game
- `404 Not Found`: Game does not exist

### 3. Download Multiple Games (POST)

**Request:**
```http
POST /api/games/export-pgn
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "gameIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Response:**
```
Content-Type: application/x-chess-pgn
Content-Disposition: attachment; filename="games.pgn"

[Event "Game 1"]
...

[Event "Game 2"]
...
```

### 4. Download Multiple Games (GET)

**Request:**
```http
GET /api/games/export-pgn?gameIds=uuid-1,uuid-2,uuid-3
Authorization: Bearer <jwt-token>
```

**Response:** Same as POST endpoint

**Error Responses:**
- `400 Bad Request`: No game IDs provided or invalid UUID format
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User does not have access to one or more games
- `404 Not Found`: No games found with provided IDs

## Security & Authorization

### Authentication
All endpoints require JWT authentication via the `JwtAuthGuard`.

### Authorization Rules
- **Import**: Any authenticated user can import games
- **Export Single Game**: 
  - User must be a player in the game (white or black), OR
  - Game must be completed (public access)
- **Export Multiple Games**:
  - User must have access to ALL requested games
  - Same rules as single game export apply to each game

## Data Flow

### Import Flow
```
Client → Controller → Service → PgnParser → Validate → Create Game Records → Return IDs
```

### Export Flow
```
Client → Controller → Service → Fetch Game(s) → Check Access → Format PGN → Return PGN
```

## Testing

### Unit Tests
- **games.service.spec.ts**: Tests service business logic
  - PGN import with valid/invalid data
  - Single game export
  - Multiple games export
  - Error handling
  
- **games.controller.spec.ts**: Tests controller endpoints
  - Request/response handling
  - DTO validation
  - Authentication integration

### Integration Tests
- **games.integration.spec.ts**: End-to-end API tests
  - Full request/response cycle
  - Database integration
  - Authentication flow
  - All three requirements (28.11, 28.12, 28.13)

### Test Coverage
- Import single game: ✓
- Import multiple games: ✓
- Import invalid PGN: ✓
- Export single game: ✓
- Export multiple games (POST): ✓
- Export multiple games (GET): ✓
- Authentication required: ✓
- Authorization checks: ✓
- Error handling: ✓

## Implementation Notes

### PGN Storage
- Imported games store the original PGN in the `pgn` field
- Games created through gameplay generate PGN on export
- Stored PGN is returned directly for performance

### Game Creation from PGN
When importing PGN files:
- Uses uploader as both white and black player (placeholder)
- Sets `isRated` to false (imported games don't affect ratings)
- Sets status to `COMPLETED`
- Sets termination reason to `imported`
- Creates move records from parsed moves

### Time Control Detection
Attempts to determine time control from PGN headers:
- Parses `TimeControl` header if present
- Falls back to `RAPID` as default

### Date Parsing
Handles various PGN date formats:
- Standard format: `YYYY.MM.DD`
- Unknown dates: `????.??.??`
- Invalid dates default to null

## Future Enhancements

1. **User Matching**: Link imported games to existing users by name/email
2. **Bulk Import**: Support file upload (multipart/form-data)
3. **Import History**: Track import source and timestamp
4. **PGN Validation**: More comprehensive validation of PGN structure
5. **Opening Detection**: Automatically detect and tag openings
6. **Export Options**: Allow filtering by date range, opponent, result
7. **Compression**: Support gzip compression for large PGN files
8. **Async Processing**: Queue large imports for background processing

## Related Tasks

- **Task 11.1**: PGN Parser implementation (dependency)
- **Task 11.2**: PGN Formatter implementation (dependency)
- **Task 11.3**: Unit tests for PGN parser/formatter
- **Task 11.4**: Property test for PGN round-trip

## Completion Checklist

- [x] Create games module
- [x] Implement games service with import/export logic
- [x] Create REST API controller with three endpoints
- [x] Add DTOs for request validation
- [x] Implement authentication guards
- [x] Add authorization checks
- [x] Write unit tests for service
- [x] Write unit tests for controller
- [x] Write integration tests
- [x] Update app module to include games module
- [x] Verify TypeScript compilation
- [x] Document implementation

## Status

✅ **COMPLETE** - All requirements (28.11, 28.12, 28.13) implemented and tested.
