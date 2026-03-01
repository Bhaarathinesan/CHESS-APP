# Chat Moderation Implementation

## Overview

This document describes the chat moderation features implemented for Task 18.4, including profanity filtering, rate limiting, chat disable options, and report functionality.

## Features Implemented

### 1. Profanity Filtering (Requirement 19.6)

**Service**: `ProfanityFilterService`

The profanity filter automatically censors inappropriate language in chat messages:

- **Detection**: Identifies profanity words using a configurable word list
- **Normalization**: Handles leetspeak (e.g., "h3ll0" → "hello") and special characters
- **Filtering**: Replaces profanity with asterisks while keeping first and last characters
- **Severity Levels**: Classifies profanity as none, mild, moderate, or severe

**Usage**:
```typescript
const filtered = profanityFilter.filterProfanity("This is a damn test");
// Result: "This is a d**n test"

const hasProfanity = profanityFilter.containsProfanity("clean message");
// Result: false

const severity = profanityFilter.getSeverity("very bad word");
// Result: "severe" | "moderate" | "mild" | "none"
```

**Note**: The current implementation uses a basic word list. For production, consider using a comprehensive library like `bad-words` or `leo-profanity`.

### 2. Rate Limiting (Requirement 19.10)

**Service**: `ChatRateLimiterService`

Limits users to 5 messages per minute per game:

- **Storage**: Uses Redis for distributed rate limiting, with in-memory fallback
- **Window**: Sliding window of 60 seconds
- **Limit**: Maximum 5 messages per minute
- **Info**: Provides remaining message count and reset time

**Usage**:
```typescript
const canSend = await rateLimiter.canSendMessage(userId, gameId);
// Result: true if user can send, false if rate limited

const remaining = await rateLimiter.getRemainingMessages(userId, gameId);
// Result: 0-5 messages remaining

const resetTime = await rateLimiter.getResetTime(userId, gameId);
// Result: milliseconds until rate limit resets
```

**Error Response**:
```json
{
  "statusCode": 403,
  "message": "Rate limit exceeded. You can send more messages in 45 seconds."
}
```

### 3. Chat Disable Options

#### Per-Game Chat Disable (Requirement 19.4)

Users can disable chat for specific games:

**Database**: `users.chatDisabledGames` - Array of game IDs

**API Endpoints**:
- `POST /api/chat/toggle-game` - Toggle chat for a specific game
- `GET /api/chat/:gameId/enabled` - Check if chat is enabled

**WebSocket Events**:
- `toggle_game_chat` - Toggle chat for a game
- `game_chat_toggled` - Confirmation response

**Usage**:
```typescript
// REST API
POST /api/chat/toggle-game
{
  "gameId": "uuid",
  "enabled": false
}

// WebSocket
socket.emit('toggle_game_chat', {
  gameId: 'uuid',
  enabled: false
});
```

#### Global Chat Disable (Requirement 19.5)

Users can disable chat globally in settings:

**Database**: `users.chatEnabled` - Boolean flag

**API Endpoints**:
- `POST /api/chat/toggle-global` - Toggle chat globally

**Usage**:
```typescript
POST /api/chat/toggle-global
{
  "enabled": false
}
```

### 4. Report Functionality (Requirement 19.7)

Users can report inappropriate chat messages:

**Database**: `chat_reports` table
- `id` - Report ID
- `message_id` - Reported message ID
- `reporter_id` - User who reported
- `reason` - Report reason
- `status` - pending | reviewed | resolved | dismissed
- `reviewed_by` - Admin who reviewed (optional)
- `reviewed_at` - Review timestamp (optional)

**API Endpoints**:
- `POST /api/chat/report` - Report a message

**WebSocket Events**:
- `report_message` - Report a message
- `message_reported` - Confirmation response

**Usage**:
```typescript
// REST API
POST /api/chat/report
{
  "messageId": "uuid",
  "reason": "Inappropriate language"
}

// WebSocket
socket.emit('report_message', {
  messageId: 'uuid',
  reason: 'Inappropriate language'
});
```

**Validations**:
- Cannot report own messages
- Cannot report the same message twice
- Message must exist

## Database Schema Changes

### Users Table

Added fields:
```sql
ALTER TABLE "users" ADD COLUMN "chat_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "chat_disabled_games" TEXT[] NOT NULL DEFAULT '{}';
```

### Chat Reports Table

New table:
```sql
CREATE TABLE "chat_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chat_reports_message_id_idx" ON "chat_reports"("message_id");
CREATE INDEX "chat_reports_reporter_id_idx" ON "chat_reports"("reporter_id");
CREATE INDEX "chat_reports_status_idx" ON "chat_reports"("status");

ALTER TABLE "chat_reports" ADD CONSTRAINT "chat_reports_message_id_fkey" 
  FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") 
  ON DELETE CASCADE ON UPDATE CASCADE;
```

## Frontend Integration

### GameChat Component Updates

The `GameChat` component now supports:

1. **Chat Toggle Button**: Enable/disable chat for the current game
2. **Rate Limit Display**: Shows remaining messages when < 3 left
3. **Report Button**: Report icon (⚠️) on opponent messages
4. **Disabled State**: Shows "Chat is disabled" message when chat is off

**Props**:
```typescript
interface GameChatProps {
  socket: Socket | null;
  gameId: string;
  currentUserId: string;
  initialMessages?: ChatMessage[];
  disabled?: boolean;
  onToggleChat?: (enabled: boolean) => void;
  chatEnabled?: boolean;
}
```

**New Features**:
- Report button on each opponent message
- Chat enable/disable toggle in header
- Rate limit indicator
- Disabled chat message

## API Reference

### REST Endpoints

#### Get Messages
```
GET /api/chat/:gameId/messages
Authorization: Bearer <token>

Response: ChatMessage[]
```

#### Report Message
```
POST /api/chat/report
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "messageId": "uuid",
  "reason": "string"
}

Response:
{
  "id": "uuid",
  "messageId": "uuid",
  "reporterId": "uuid",
  "reason": "string",
  "status": "pending",
  "createdAt": "timestamp"
}
```

#### Toggle Game Chat
```
POST /api/chat/toggle-game
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "gameId": "uuid",
  "enabled": boolean
}

Response:
{
  "success": true,
  "enabled": boolean
}
```

#### Toggle Global Chat
```
POST /api/chat/toggle-global
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "enabled": boolean
}

Response:
{
  "success": true,
  "enabled": boolean
}
```

#### Check Chat Enabled
```
GET /api/chat/:gameId/enabled
Authorization: Bearer <token>

Response:
{
  "enabled": boolean
}
```

#### Get Rate Limit Info
```
GET /api/chat/:gameId/rate-limit
Authorization: Bearer <token>

Response:
{
  "maxMessages": 5,
  "remaining": number,
  "resetInMs": number,
  "resetInSeconds": number
}
```

### WebSocket Events

#### Send Message (Updated)
```typescript
// Client → Server
socket.emit('send_message', {
  gameId: 'uuid',
  message: 'string'
});

// Server → Client (success)
socket.on('message_sent', (data) => {
  // data: { success: true, messageId: 'uuid' }
});

// Server → Client (error)
socket.on('chat_error', (data) => {
  // data: { message: 'Rate limit exceeded...' }
});
```

#### Report Message
```typescript
// Client → Server
socket.emit('report_message', {
  messageId: 'uuid',
  reason: 'string'
});

// Server → Client
socket.on('message_reported', (data) => {
  // data: { success: true, reportId: 'uuid' }
});
```

#### Toggle Game Chat
```typescript
// Client → Server
socket.emit('toggle_game_chat', {
  gameId: 'uuid',
  enabled: boolean
});

// Server → Client
socket.on('game_chat_toggled', (data) => {
  // data: { success: true, enabled: boolean }
});
```

#### Get Rate Limit Info
```typescript
// Client → Server
socket.emit('get_rate_limit_info', {
  gameId: 'uuid'
});

// Server → Client
socket.on('rate_limit_info', (data) => {
  // data: { maxMessages: 5, remaining: 3, resetInSeconds: 45 }
});
```

## Testing

### Manual Testing

1. **Profanity Filter**:
   - Send messages with profanity words
   - Verify they are censored with asterisks
   - Test leetspeak variations (e.g., "h3ll0")

2. **Rate Limiting**:
   - Send 5 messages quickly
   - Verify 6th message is blocked
   - Wait 60 seconds and verify you can send again

3. **Chat Disable**:
   - Toggle chat off for a game
   - Verify you cannot send messages
   - Toggle back on and verify it works

4. **Report Functionality**:
   - Report an opponent's message
   - Verify report is created in database
   - Try reporting same message twice (should fail)
   - Try reporting own message (should fail)

### Unit Tests

Create tests for:
- `ProfanityFilterService.filterProfanity()`
- `ProfanityFilterService.containsProfanity()`
- `ChatRateLimiterService.canSendMessage()`
- `ChatService.createMessage()` with various scenarios
- `ChatService.reportMessage()` with validations

## Migration Instructions

To apply the database changes:

1. **Option 1: Using Prisma Migrate**
   ```bash
   cd backend
   npx prisma migrate dev --name add_chat_moderation
   ```

2. **Option 2: Manual SQL**
   ```bash
   psql -U postgres -d chess_arena < prisma/migrations/add_chat_moderation/migration.sql
   ```

3. **Option 3: Using Prisma DB Push**
   ```bash
   cd backend
   npx prisma db push
   ```

After migration, regenerate Prisma client:
```bash
npx prisma generate
```

## Future Enhancements

1. **Enhanced Profanity Filter**:
   - Use comprehensive library (bad-words, leo-profanity)
   - Support multiple languages
   - Custom word lists per server

2. **Advanced Rate Limiting**:
   - Different limits for different user roles
   - Temporary bans for repeated violations
   - Exponential backoff for spammers

3. **Report Management**:
   - Admin panel for reviewing reports
   - Automatic actions based on report count
   - Appeal system for false reports

4. **Chat Analytics**:
   - Track profanity filter effectiveness
   - Monitor rate limit violations
   - Report statistics dashboard

## Requirements Satisfied

- ✅ **19.4**: Players can disable chat for a specific game
- ✅ **19.5**: Players can disable chat globally in settings
- ✅ **19.6**: Profanity filter automatically censors inappropriate language
- ✅ **19.7**: Players can report inappropriate chat messages
- ✅ **19.10**: Rate limiting prevents spam (5 messages per minute)
