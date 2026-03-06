# Ban and Rating Rollback System

This document describes the ban management and rating rollback system for the ChessArena platform, fulfilling Requirements 24.16 and 24.17.

## Overview

The ban system allows super admins to issue warnings, temporary bans, and permanent bans to users who violate platform rules. The rating rollback system allows admins to reverse rating changes from games affected by cheating or other violations.

## Features

### Ban Types

1. **Warning**: A formal warning issued to a user. Does not restrict access.
2. **Temporary Ban**: Prevents user from playing games and joining tournaments until expiration date.
3. **Permanent Ban**: Permanently prevents user from playing games and joining tournaments.

### Ban Management

- Issue warnings, temporary bans, and permanent bans
- Revoke bans (unban users)
- View ban history for users
- Track who issued and revoked bans
- Automatic expiration of temporary bans

### Rating Rollback

- Rollback ratings from specific games
- Rollback ratings from date range
- Rollback ratings from games against specific opponent
- Preview rollback before applying changes
- Maintains rating history with rollback entries

## Database Schema

### UserBan Model

```prisma
model UserBan {
  id           String   @id @default(uuid())
  userId       String   // User who received the ban
  banType      BanType  // WARNING, TEMPORARY, PERMANENT
  reason       String   // Reason for the ban
  expiresAt    DateTime? // Expiration date (null for permanent)
  issuedBy     String   // Admin who issued the ban
  issuedAt     DateTime @default(now())
  revokedAt    DateTime? // When ban was revoked
  revokedBy    String?  // Admin who revoked the ban
  revokeReason String?  // Reason for revoking
  isActive     Boolean  @default(true)
}
```

## API Endpoints

### Ban Management

#### Issue Ban
```
POST /api/admin/users/:userId/ban
Authorization: Bearer <super_admin_token>

Body:
{
  "banType": "warning" | "temporary" | "permanent",
  "reason": "Reason for ban",
  "expiresAt": "2024-12-31T23:59:59Z" // Required for temporary bans
}

Response:
{
  "id": "ban-uuid",
  "userId": "user-uuid",
  "banType": "temporary",
  "reason": "Cheating detected",
  "expiresAt": "2024-12-31T23:59:59Z",
  "issuedBy": "admin-uuid",
  "issuedAt": "2024-01-21T10:00:00Z",
  "isActive": true,
  "user": { ... },
  "issuer": { ... }
}
```

#### Revoke Ban
```
DELETE /api/admin/users/:userId/ban/:banId
Authorization: Bearer <super_admin_token>

Body:
{
  "revokeReason": "Appeal accepted"
}

Response:
{
  "id": "ban-uuid",
  "isActive": false,
  "revokedAt": "2024-01-21T11:00:00Z",
  "revokedBy": "admin-uuid",
  "revokeReason": "Appeal accepted",
  ...
}
```

#### Get User Bans
```
GET /api/admin/users/:userId/bans
Authorization: Bearer <super_admin_token>

Response:
[
  {
    "id": "ban-uuid",
    "banType": "warning",
    "reason": "First offense",
    "issuedAt": "2024-01-15T10:00:00Z",
    "isActive": true,
    ...
  },
  ...
]
```

### Rating Rollback

#### Rollback Ratings from Specific Games
```
POST /api/admin/users/:userId/rollback-ratings
Authorization: Bearer <super_admin_token>

Body:
{
  "gameIds": ["game-uuid-1", "game-uuid-2"]
}

Response:
{
  "userId": "user-uuid",
  "rollbacks": [
    {
      "timeControl": "blitz",
      "gamesAffected": 2,
      "ratingBefore": 1235,
      "ratingAfter": 1200,
      "ratingChange": -35
    }
  ],
  "totalGamesAffected": 2
}
```

#### Rollback Ratings from Date Range
```
POST /api/admin/users/:userId/rollback-ratings
Authorization: Bearer <super_admin_token>

Body:
{
  "fromDate": "2024-01-01T00:00:00Z",
  "toDate": "2024-01-31T23:59:59Z"
}

Response: (same as above)
```

#### Rollback Ratings Against Opponent
```
POST /api/admin/users/:userId/rollback-ratings
Authorization: Bearer <super_admin_token>

Body:
{
  "opponentId": "opponent-uuid"
}

Response: (same as above)
```

#### Preview Rollback
```
POST /api/admin/users/:userId/rollback-ratings/preview
Authorization: Bearer <super_admin_token>

Body:
{
  "gameIds": ["game-uuid-1", "game-uuid-2"]
}

Response:
{
  "userId": "user-uuid",
  "preview": [
    {
      "timeControl": "blitz",
      "gamesAffected": 2,
      "totalRatingChange": 35,
      "currentRating": 1235,
      "newRating": 1200,
      "ratingChange": -35,
      "games": [
        {
          "gameId": "game-uuid-1",
          "ratingChange": 20,
          "completedAt": "2024-01-20T10:00:00Z"
        },
        ...
      ]
    }
  ],
  "totalGamesAffected": 2
}
```

## Integration Points

### Matchmaking
Ban checks are integrated into the matchmaking queue:
- Users cannot join matchmaking queue while banned
- Throws `BadRequestException` with message "Cannot join matchmaking while banned"

### Tournaments
Ban checks are integrated into tournament registration:
- Users cannot join tournaments while banned
- Throws `BadRequestException` with message "Cannot join tournament while banned"

### Automatic Expiration
Temporary bans are automatically expired when:
- User attempts to join matchmaking or tournament
- `isUserBanned()` is called and expiration date has passed
- Expired bans are marked as inactive
- User's `isBanned` flag is cleared

## Usage Examples

### Issue a Warning
```typescript
const warning = await banService.issueWarning(
  'user-123',
  'Inappropriate chat behavior',
  'admin-123'
);
```

### Issue a Temporary Ban
```typescript
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
const ban = await banService.issueTemporaryBan(
  'user-123',
  'Cheating detected',
  expiresAt,
  'admin-123'
);
```

### Issue a Permanent Ban
```typescript
const ban = await banService.issuePermanentBan(
  'user-123',
  'Repeated violations',
  'admin-123'
);
```

### Revoke a Ban
```typescript
const result = await banService.revokeBan(
  'ban-123',
  'admin-123',
  'Appeal accepted'
);
```

### Check if User is Banned
```typescript
const isBanned = await banService.isUserBanned('user-123');
if (isBanned) {
  throw new BadRequestException('User is banned');
}
```

### Rollback Ratings
```typescript
// From specific games
const result = await ratingRollbackService.rollbackRatingsFromGames(
  'user-123',
  ['game-1', 'game-2']
);

// From date range
const result = await ratingRollbackService.rollbackRatingsFromDateRange(
  'user-123',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

// Against specific opponent
const result = await ratingRollbackService.rollbackRatingsAgainstOpponent(
  'user-123',
  'opponent-123'
);
```

### Preview Rollback
```typescript
const preview = await ratingRollbackService.previewRollback(
  'user-123',
  ['game-1', 'game-2']
);
console.log('Rating will change from', preview.preview[0].currentRating, 'to', preview.preview[0].newRating);
```

## Testing

Run unit tests:
```bash
cd backend
npm test -- ban.service.spec.ts
npm test -- rating-rollback.service.spec.ts
```

## Security Considerations

- All ban and rollback endpoints require `super_admin` role
- Ban actions are logged with issuer and timestamp
- Revoke actions are logged with revoker and reason
- Rating rollback creates audit trail in rating history
- Minimum rating floor of 100 is enforced
- Ban checks are performed server-side to prevent bypassing

## Future Enhancements

- Email notifications when users are banned/unbanned
- Ban appeal system
- Automated ban suggestions based on anti-cheat flags
- Bulk rating rollback for multiple users
- Ban statistics and reporting
