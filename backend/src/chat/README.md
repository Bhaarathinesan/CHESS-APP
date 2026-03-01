# Chat Service

Minimal chat message storage and retrieval service for the ChessArena platform.

## Features

- **Message Storage**: Store chat messages associated with games
- **Message Retrieval**: Retrieve messages for a game in chronological order
- **Length Validation**: Enforce 200 character limit (Requirement 19.9)
- **Sender Information**: Include sender details with each message

## API

### `createMessage(gameId: string, senderId: string, content: string)`

Creates a new chat message.

**Parameters:**
- `gameId` - The game ID
- `senderId` - The user ID of the sender
- `content` - The message content (max 200 characters)

**Returns:** Created chat message with sender information

**Throws:**
- `BadRequestException` if message is empty or exceeds 200 characters

**Example:**
```typescript
const message = await chatService.createMessage(
  'game-123',
  'user-456',
  'Good game!'
);
```

### `getMessages(gameId: string, limit?: number)`

Retrieves messages for a game.

**Parameters:**
- `gameId` - The game ID
- `limit` - Optional limit on number of messages (default: 50)

**Returns:** Array of chat messages ordered by timestamp (oldest first)

**Example:**
```typescript
const messages = await chatService.getMessages('game-123', 20);
```

## Requirements

Implements:
- **Requirement 19.9**: Message length limit of 200 characters

## Testing

Run unit tests:
```bash
npm test -- chat.service.spec.ts
```

## Usage

Import the `ChatModule` in your module:

```typescript
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [ChatModule],
})
export class YourModule {}
```

Inject the service:

```typescript
constructor(private chatService: ChatService) {}
```
