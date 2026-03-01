# PGN Import/Export API Usage Examples

## Authentication

All endpoints require a JWT token. First, obtain a token by logging in:

```bash
# Login to get JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Response:
# {
#   "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": { ... }
# }
```

## 1. Import PGN File (Requirement 28.11)

### Import a Single Game

```bash
curl -X POST http://localhost:3000/api/games/import-pgn \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pgnText": "[Event \"Casual Game\"]\n[Site \"ChessArena\"]\n[Date \"2024.01.15\"]\n[Round \"1\"]\n[White \"Alice\"]\n[Black \"Bob\"]\n[Result \"1-0\"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 1-0"
  }'
```

**Response:**
```json
{
  "message": "Successfully imported 1 game(s)",
  "gameIds": ["550e8400-e29b-41d4-a716-446655440000"],
  "count": 1
}
```

### Import Multiple Games

```bash
curl -X POST http://localhost:3000/api/games/import-pgn \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pgnText": "[Event \"Game 1\"]\n[Site \"ChessArena\"]\n[Date \"2024.01.15\"]\n[Round \"1\"]\n[White \"Alice\"]\n[Black \"Bob\"]\n[Result \"1-0\"]\n\n1. e4 e5 1-0\n\n[Event \"Game 2\"]\n[Site \"ChessArena\"]\n[Date \"2024.01.16\"]\n[Round \"2\"]\n[White \"Charlie\"]\n[Black \"Diana\"]\n[Result \"0-1\"]\n\n1. d4 d5 0-1"
  }'
```

**Response:**
```json
{
  "message": "Successfully imported 2 game(s)",
  "gameIds": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001"
  ],
  "count": 2
}
```

### Import from File

```bash
# Read PGN from file and import
curl -X POST http://localhost:3000/api/games/import-pgn \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"pgnText\": $(jq -Rs . < game.pgn)}"
```

### Error Handling

```bash
# Invalid PGN
curl -X POST http://localhost:3000/api/games/import-pgn \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pgnText": "This is not a valid PGN"
  }'

# Response (400 Bad Request):
# {
#   "statusCode": 400,
#   "message": "PGN parsing failed: Missing required header: Event",
#   "error": "Bad Request"
# }
```

## 2. Download Single Game as PGN (Requirement 28.12)

```bash
# Download game by ID
curl -X GET http://localhost:3000/api/games/550e8400-e29b-41d4-a716-446655440000/pgn \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o game.pgn

# Or view in terminal
curl -X GET http://localhost:3000/api/games/550e8400-e29b-41d4-a716-446655440000/pgn \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```
[Event "Casual Game"]
[Site "ChessArena"]
[Date "2024.01.15"]
[Round "1"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]
[TimeControl "300+3"]
[WhiteElo "1500"]
[BlackElo "1480"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3
O-O 9. h3 Nb8 10. d4 Nbd7 1-0
```

### Error Cases

```bash
# Non-existent game
curl -X GET http://localhost:3000/api/games/00000000-0000-0000-0000-000000000000/pgn \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response (404 Not Found):
# {
#   "statusCode": 404,
#   "message": "Game with ID 00000000-0000-0000-0000-000000000000 not found",
#   "error": "Not Found"
# }

# Unauthorized access to active game
curl -X GET http://localhost:3000/api/games/SOME_GAME_ID/pgn \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response (403 Forbidden):
# {
#   "statusCode": 403,
#   "message": "You do not have permission to export this game",
#   "error": "Forbidden"
# }
```

## 3. Download Multiple Games as PGN (Requirement 28.13)

### Using POST with JSON Body

```bash
curl -X POST http://localhost:3000/api/games/export-pgn \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "gameIds": [
      "550e8400-e29b-41d4-a716-446655440000",
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002"
    ]
  }' \
  -o games.pgn
```

### Using GET with Query Parameters

```bash
curl -X GET "http://localhost:3000/api/games/export-pgn?gameIds=550e8400-e29b-41d4-a716-446655440000,550e8400-e29b-41d4-a716-446655440001,550e8400-e29b-41d4-a716-446655440002" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o games.pgn
```

**Response:**
```
[Event "Game 1"]
[Site "ChessArena"]
[Date "2024.01.15"]
[Round "1"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0

[Event "Game 2"]
[Site "ChessArena"]
[Date "2024.01.16"]
[Round "2"]
[White "Charlie"]
[Black "Diana"]
[Result "0-1"]

1. d4 d5 2. c4 e6 0-1

[Event "Game 3"]
[Site "ChessArena"]
[Date "2024.01.17"]
[Round "3"]
[White "Eve"]
[Black "Frank"]
[Result "1/2-1/2"]

1. e4 c5 2. Nf3 d6 1/2-1/2
```

### Error Cases

```bash
# Empty game IDs array
curl -X POST http://localhost:3000/api/games/export-pgn \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gameIds": []}'

# Response (400 Bad Request):
# {
#   "statusCode": 400,
#   "message": "No game IDs provided",
#   "error": "Bad Request"
# }

# Invalid UUID format
curl -X POST http://localhost:3000/api/games/export-pgn \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gameIds": ["invalid-uuid", "another-invalid"]}'

# Response (400 Bad Request):
# {
#   "statusCode": 400,
#   "message": ["each value in gameIds must be a UUID"],
#   "error": "Bad Request"
# }
```

## JavaScript/TypeScript Examples

### Using Fetch API

```typescript
// Import PGN
async function importPgn(pgnText: string, token: string) {
  const response = await fetch('http://localhost:3000/api/games/import-pgn', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pgnText }),
  });

  if (!response.ok) {
    throw new Error(`Import failed: ${response.statusText}`);
  }

  return await response.json();
}

// Download single game
async function downloadGame(gameId: string, token: string) {
  const response = await fetch(`http://localhost:3000/api/games/${gameId}/pgn`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }

  return await response.text();
}

// Download multiple games
async function downloadMultipleGames(gameIds: string[], token: string) {
  const response = await fetch('http://localhost:3000/api/games/export-pgn', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ gameIds }),
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }

  return await response.text();
}

// Usage
const token = 'your-jwt-token';

// Import
const pgnText = `[Event "Test"]
[Site "ChessArena"]
[Date "2024.01.15"]
[Round "1"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 1-0`;

const importResult = await importPgn(pgnText, token);
console.log(`Imported ${importResult.count} game(s)`);

// Download single
const pgn = await downloadGame(importResult.gameIds[0], token);
console.log(pgn);

// Download multiple
const multiPgn = await downloadMultipleGames(importResult.gameIds, token);
console.log(multiPgn);
```

### Using Axios

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

// Import PGN
const importResult = await api.post('/games/import-pgn', {
  pgnText: pgnText,
});

// Download single game
const gameResponse = await api.get(`/games/${gameId}/pgn`);
const pgn = gameResponse.data;

// Download multiple games
const multiResponse = await api.post('/games/export-pgn', {
  gameIds: ['id1', 'id2', 'id3'],
});
const multiPgn = multiResponse.data;
```

## React Component Example

```tsx
import React, { useState } from 'react';

function PgnImportExport() {
  const [pgnText, setPgnText] = useState('');
  const [gameIds, setGameIds] = useState<string[]>([]);
  const [token] = useState(localStorage.getItem('authToken'));

  const handleImport = async () => {
    try {
      const response = await fetch('/api/games/import-pgn', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pgnText }),
      });

      const result = await response.json();
      setGameIds(result.gameIds);
      alert(`Successfully imported ${result.count} game(s)`);
    } catch (error) {
      alert('Import failed: ' + error.message);
    }
  };

  const handleExport = async (gameId: string) => {
    try {
      const response = await fetch(`/api/games/${gameId}/pgn`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const pgn = await response.text();
      
      // Download as file
      const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'game.pgn';
      a.click();
    } catch (error) {
      alert('Export failed: ' + error.message);
    }
  };

  return (
    <div>
      <h2>Import PGN</h2>
      <textarea
        value={pgnText}
        onChange={(e) => setPgnText(e.target.value)}
        placeholder="Paste PGN text here..."
        rows={10}
        cols={50}
      />
      <button onClick={handleImport}>Import</button>

      <h2>Imported Games</h2>
      <ul>
        {gameIds.map((id) => (
          <li key={id}>
            {id}
            <button onClick={() => handleExport(id)}>Export</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Testing with Postman

1. **Import Collection**: Create a new collection in Postman
2. **Set Environment Variable**: Add `authToken` variable
3. **Create Requests**:

### Import PGN Request
- Method: POST
- URL: `{{baseUrl}}/games/import-pgn`
- Headers: `Authorization: Bearer {{authToken}}`
- Body (JSON):
```json
{
  "pgnText": "[Event \"Test\"]\n[Site \"ChessArena\"]\n[Date \"2024.01.15\"]\n[Round \"1\"]\n[White \"Alice\"]\n[Black \"Bob\"]\n[Result \"1-0\"]\n\n1. e4 e5 1-0"
}
```

### Export Single Game Request
- Method: GET
- URL: `{{baseUrl}}/games/{{gameId}}/pgn`
- Headers: `Authorization: Bearer {{authToken}}`

### Export Multiple Games Request
- Method: POST
- URL: `{{baseUrl}}/games/export-pgn`
- Headers: `Authorization: Bearer {{authToken}}`
- Body (JSON):
```json
{
  "gameIds": ["{{gameId1}}", "{{gameId2}}"]
}
```

## Common Issues and Solutions

### Issue: "PGN parsing failed: Missing required header"
**Solution**: Ensure all required PGN headers are present (Event, Site, Date, Round, White, Black, Result)

### Issue: "Invalid move at position X"
**Solution**: Verify that all moves are in valid Standard Algebraic Notation (SAN)

### Issue: "You do not have permission to export this game"
**Solution**: You can only export games you participated in or games that are completed

### Issue: "No games found with the provided IDs"
**Solution**: Verify that the game IDs exist and are correctly formatted UUIDs

## Best Practices

1. **Validate PGN before import**: Use a PGN validator to check format
2. **Handle large files**: For files with many games, consider pagination
3. **Error handling**: Always wrap API calls in try-catch blocks
4. **Token management**: Store JWT tokens securely and refresh when needed
5. **File downloads**: Use proper MIME types and filenames for downloads
6. **Rate limiting**: Be mindful of API rate limits when importing many games
