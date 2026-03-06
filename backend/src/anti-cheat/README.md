# Anti-Cheat Detection System

This module implements comprehensive anti-cheat detection for the ChessArena platform, fulfilling Requirements 24.10-24.13.

## Overview

The anti-cheat system passively monitors game behavior and flags suspicious accounts for admin review. It does not automatically ban users but provides evidence for manual review.

## Features

### 1. Fast Move Detection (Requirement 24.10)
Tracks move times for each player and flags suspiciously fast moves in complex positions.

**Detection Logic:**
- Monitors moves that take < 100ms in positions with < 20 pieces (complex endgames)
- Flags users after 5+ fast moves in complex positions
- Severity increases with more fast moves (1-3 scale)

**Integration:**
- Automatically tracked in `GameGateway.handleMakeMove()`
- Called after each move is recorded

### 2. Browser Tab Focus Loss Detection (Requirement 24.11)
Detects when a player's browser tab loses focus during games.

**Detection Logic:**
- Tracks focus loss events via WebSocket
- Flags users after 3+ focus losses during a game
- Records duration of each focus loss

**Client Integration:**
```typescript
// Client-side code should emit:
socket.emit('track_focus_loss', {
  gameId: 'game-id',
  focusLostAt: '2024-01-01T10:00:00Z',
  focusRegainedAt: '2024-01-01T10:00:05Z'
});
```

### 3. Browser Extension Detection (Requirement 24.12)
Detects chess analysis browser extensions that might assist players.

**Detection Logic:**
- Client-side detection of known chess extensions
- High severity (3) flags
- Records extension name, ID, and detection method

**Client Integration:**
```typescript
// Client-side code should emit when extension detected:
socket.emit('detect_extension', {
  gameId: 'game-id',
  extensionName: 'Chess Analyzer Pro',
  extensionId: 'ext-123',
  detectionMethod: 'dom_inspection'
});
```

### 4. Statistical Analysis (Requirement 24.13)
Performs statistical analysis on move patterns to detect engine usage.

**Detection Logic:**
- Analyzes move patterns after game completion
- Detects consistent fast moves (>30% of moves < 100ms)
- Detects suspiciously consistent timing (low coefficient of variation)
- Requires minimum 10 moves for analysis

**Integration:**
- Automatically called in `GameGateway.handleGameEnd()`
- Runs asynchronously after game completion

## Database Schema

```sql
CREATE TABLE anti_cheat_flags (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  game_id UUID,
  flag_type ENUM('fast_moves', 'tab_focus_loss', 'browser_extension', 'statistical_anomaly'),
  severity INTEGER DEFAULT 1,
  details JSONB DEFAULT '{}',
  status ENUM('pending', 'reviewed', 'confirmed', 'dismissed') DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Admin Endpoints

### Get All Flags
```
GET /api/admin/anti-cheat/flags?limit=50&offset=0
```
Returns pending flags ordered by severity and creation date.

### Get User Flags
```
GET /api/admin/anti-cheat/users/:userId
```
Returns all flags for a specific user.

### Get User Statistics
```
GET /api/admin/anti-cheat/users/:userId/statistics
```
Returns aggregated statistics:
- Total flags
- Flags by type
- Flags by status
- Average severity
- First and last flag dates

### Update Flag Status
```
PATCH /api/admin/anti-cheat/flags/:flagId
Body: {
  status: 'confirmed' | 'dismissed' | 'reviewed',
  adminNotes: 'Optional notes'
}
```

## Flag Severity Levels

- **Level 1 (Low)**: Minor suspicious behavior, may be coincidental
- **Level 2 (Medium)**: Moderate suspicious behavior, warrants investigation
- **Level 3 (High)**: Strong evidence of cheating, immediate review recommended

## Detection Thresholds

Configurable thresholds in `AntiCheatService`:

```typescript
private readonly FAST_MOVE_THRESHOLD_MS = 100;
private readonly COMPLEX_POSITION_PIECE_COUNT = 20;
private readonly SUSPICIOUS_FAST_MOVE_COUNT = 5;
private readonly FOCUS_LOSS_THRESHOLD_COUNT = 3;
```

## Usage Example

```typescript
// In GameGateway
await this.antiCheatService.trackMoveTime(
  gameId,
  userId,
  moveNumber,
  timeTakenMs,
  fenAfter
);

// After game ends
await this.antiCheatService.analyzeMovePatternsForGame(gameId);

// In AdminService
const flags = await this.antiCheatService.getPendingFlags(50, 0);
const stats = await this.antiCheatService.getUserFlagStatistics(userId);
```

## Testing

Run unit tests:
```bash
npm test -- anti-cheat.service.spec.ts
```

## Future Enhancements

Potential improvements:
- Machine learning model for move quality analysis
- Integration with Stockfish for move accuracy scoring
- Pattern matching against known engine move sequences
- IP address tracking for multiple accounts
- Device fingerprinting
- Behavioral biometrics (mouse movement patterns)

## Security Considerations

- All detection is server-side to prevent tampering
- Client-side detection (focus loss, extensions) is supplementary
- Flags are for review only, not automatic bans
- Admin actions are logged with reviewer ID and timestamp
- Sensitive flag details are only accessible to super admins
