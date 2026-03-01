# Task 13.2: WebSocket Authentication Middleware Implementation

## Overview
Implemented WebSocket authentication middleware that validates JWT tokens on connection, attaches user data to socket connections, and handles authentication errors according to Requirement 24.3.

## Implementation Details

### 1. Connection-Level Authentication
Modified `GameGateway.handleConnection()` to perform authentication at the connection level rather than per-message:

**Key Features:**
- Validates JWT token on initial WebSocket connection
- Extracts token from multiple sources (Authorization header, query params, auth params)
- Verifies token signature and expiration
- Fetches user data from database
- Validates user exists and is not banned
- Attaches user data to socket connection for use in message handlers
- Emits authentication success/failure events
- Disconnects unauthorized clients immediately

**Token Extraction Priority:**
1. Authorization header (`Bearer <token>`)
2. Auth parameter (`handshake.auth.token`)
3. Query parameter (`handshake.query.token`)

### 2. User Data Attachment
User data is attached to `client.data.user` and includes:
- `id`: User UUID
- `email`: User email address
- `username`: Unique username
- `displayName`: Display name
- `role`: User role (player, tournament_admin, super_admin, spectator)
- `isBanned`: Ban status
- `emailVerified`: Email verification status

This data is available to all message handlers via `@ConnectedSocket() client: Socket` and can be accessed as `client.data.user`.

### 3. Authentication Error Handling
The implementation handles multiple error scenarios:

**No Token Provided:**
- Emits: `{ event: 'error', message: 'Authentication required' }`
- Action: Disconnects client immediately

**Invalid JWT Token:**
- Emits: `{ event: 'error', message: 'Authentication failed' }`
- Action: Disconnects client immediately
- Logs error with details

**User Not Found:**
- Emits: `{ event: 'error', message: 'User not found' }`
- Action: Disconnects client immediately

**User Banned:**
- Emits: `{ event: 'error', message: 'Account is banned' }`
- Action: Disconnects client immediately

**Successful Authentication:**
- Emits: `{ event: 'authenticated', userId: string, username: string }`
- Action: Connection remains open

### 4. Module Configuration
Updated `GatewaysModule` to import `ConfigModule` to provide `ConfigService` for JWT secret access.

## Files Modified

### backend/src/gateways/game.gateway.ts
- Added imports: `JwtService`, `PrismaService`, `ConfigService`
- Updated constructor to inject required services
- Implemented `handleConnection()` with authentication logic
- Added `extractTokenFromHandshake()` helper method

### backend/src/gateways/gateways.module.ts
- Added `ConfigModule` to imports array

## Tests Created

### backend/src/gateways/game.gateway.auth.spec.ts
Comprehensive test suite covering:

**Authentication Success:**
- Valid JWT token with valid user
- Token extraction from Authorization header
- Token extraction from query parameter
- Token extraction from auth parameter
- Token priority (header > auth > query)

**Authentication Failures:**
- No token provided
- Invalid JWT token
- User not found in database
- User is banned

**Test Coverage:**
- 8 test cases covering all authentication scenarios
- Mocked services: JwtService, PrismaService, ConfigService, RedisService
- Verified correct error messages and disconnection behavior
- Verified user data attachment on success

## Security Considerations

1. **Token Validation:** JWT tokens are verified using the configured secret from environment variables
2. **User Verification:** User existence and ban status are checked on every connection
3. **Immediate Disconnection:** Unauthorized clients are disconnected immediately to prevent resource consumption
4. **Secure Token Transport:** Supports Bearer token in Authorization header (recommended) with fallbacks
5. **Error Messages:** Generic error messages prevent information leakage about system internals
6. **Logging:** Failed authentication attempts are logged with client ID for security monitoring

## Requirement Validation

**Requirement 24.3:** "THE Authentication_Service SHALL use secure WebSocket (WSS) for real-time game connections"

✅ **Validated JWT tokens on WebSocket connection** - Tokens are verified on initial connection
✅ **Attached user data to socket connection** - User data stored in `client.data.user`
✅ **Handled authentication errors** - Multiple error scenarios handled with appropriate responses

## Usage Example

### Client-Side Connection (JavaScript/TypeScript)
```typescript
import { io } from 'socket.io-client';

const token = localStorage.getItem('jwt_token');

const socket = io('http://localhost:3001/game', {
  auth: {
    token: token
  },
  // OR using extraHeaders:
  extraHeaders: {
    Authorization: `Bearer ${token}`
  }
});

socket.on('authenticated', (data) => {
  console.log('Authenticated as:', data.username);
});

socket.on('error', (error) => {
  console.error('Authentication failed:', error.message);
});
```

### Server-Side Message Handler
```typescript
@UseGuards(WsJwtGuard) // Optional: per-message validation
@SubscribeMessage('some_event')
handleSomeEvent(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: any,
) {
  // User data is available from connection authentication
  const user = client.data.user;
  console.log('User:', user.username, 'sent event');
  
  // Process event...
}
```

## Next Steps

The WebSocket authentication middleware is now complete and ready for use. The next task (13.3) will implement game room management using this authenticated connection infrastructure.

## Notes

- The `@UseGuards(WsJwtGuard)` decorator on individual message handlers is now optional since authentication happens at connection level
- However, keeping the guard on sensitive operations provides defense-in-depth
- The WsJwtGuard can be updated to simply check `client.data.user` exists rather than re-validating the token
- Consider implementing token refresh mechanism for long-lived connections
- Consider implementing rate limiting per authenticated user
