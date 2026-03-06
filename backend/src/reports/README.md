# Reports Module

## Overview

The Reports module provides functionality for users to report inappropriate behavior, suspicious activity, and violations of platform rules. This supports the moderation and safety features of the ChessArena platform.

## Requirements

- **19.7**: Report functionality for chat messages
- **24.14**: Report suspicious behavior (cheating, harassment)
- **25.12**: Admin panel for reviewing reported content

## Features

### Report Types

1. **User Reports** - Report users for harassment or inappropriate behavior
2. **Game Reports** - Report suspected cheating or unfair play
3. **Chat Reports** - Report inappropriate chat messages

### Endpoints

#### POST /api/reports
Submit a new report. Requires authentication.

**Request Body:**
```json
{
  "reportType": "user" | "game" | "chat",
  "description": "Description of the issue (max 1000 characters)",
  "reportedUserId": "uuid (required for user/game reports)",
  "gameId": "uuid (required for game reports)",
  "chatMessageId": "uuid (required for chat reports)"
}
```

**Response:**
```json
{
  "id": "report-uuid",
  "reporterId": "reporter-uuid",
  "reportedUserId": "reported-user-uuid",
  "reportType": "harassment" | "cheating" | "inappropriate_chat" | "other",
  "description": "Report description",
  "status": "PENDING",
  "createdAt": "2024-01-15T10:30:00Z",
  "reporter": {
    "id": "uuid",
    "username": "reporter_username",
    "displayName": "Reporter Name"
  },
  "reportedUser": {
    "id": "uuid",
    "username": "reported_username",
    "displayName": "Reported Name"
  }
}
```

#### GET /api/reports
Get all reports (admin only). Supports filtering and pagination.

**Query Parameters:**
- `status` - Filter by status (pending, reviewed, resolved, dismissed)
- `limit` - Number of reports to return (default: 50)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
[
  {
    "id": "report-uuid",
    "reporterId": "reporter-uuid",
    "reportedUserId": "reported-user-uuid",
    "gameId": "game-uuid",
    "reportType": "cheating",
    "description": "Report description",
    "status": "PENDING",
    "createdAt": "2024-01-15T10:30:00Z",
    "reporter": { ... },
    "reportedUser": { ... }
  }
]
```

#### GET /api/reports/:id
Get a single report by ID (admin only).

**Response:**
```json
{
  "id": "report-uuid",
  "reporterId": "reporter-uuid",
  "reportedUserId": "reported-user-uuid",
  "gameId": "game-uuid",
  "reportType": "cheating",
  "description": "Report description",
  "status": "PENDING",
  "adminNotes": "Admin review notes",
  "reviewedBy": "admin-uuid",
  "reviewedAt": "2024-01-15T11:00:00Z",
  "createdAt": "2024-01-15T10:30:00Z",
  "reporter": { ... },
  "reportedUser": { ... },
  "reviewer": { ... }
}
```

#### PATCH /api/reports/:id/status
Update report status (admin only).

**Request Body:**
```json
{
  "status": "reviewed" | "resolved" | "dismissed",
  "adminNotes": "Optional admin notes"
}
```

**Response:**
```json
{
  "id": "report-uuid",
  "status": "REVIEWED",
  "reviewedBy": "admin-uuid",
  "reviewedAt": "2024-01-15T11:00:00Z",
  "adminNotes": "Admin review notes",
  ...
}
```

## Validation Rules

### User Reports
- Must include `reportedUserId`
- Cannot report yourself
- Reported user must exist

### Game Reports
- Must include both `gameId` and `reportedUserId`
- Game must exist
- Reported user must exist

### Chat Reports
- Must include `chatMessageId`
- Chat message must exist
- Cannot report your own messages

### General
- Description is required and limited to 1000 characters
- All reports are created with status "PENDING"

## Database Schema

Reports are stored in the `reports` table with the following structure:

```sql
CREATE TABLE reports (
  id                UUID PRIMARY KEY,
  reporter_id       UUID NOT NULL REFERENCES users(id),
  reported_user_id  UUID REFERENCES users(id),
  game_id           UUID REFERENCES games(id),
  report_type       VARCHAR(30) NOT NULL,
  description       TEXT NOT NULL,
  status            VARCHAR(20) DEFAULT 'pending',
  admin_notes       TEXT,
  reviewed_by       UUID REFERENCES users(id),
  reviewed_at       TIMESTAMP,
  created_at        TIMESTAMP DEFAULT NOW()
);
```

## Report Status Flow

1. **PENDING** - Initial state when report is created
2. **REVIEWED** - Admin has reviewed the report
3. **RESOLVED** - Action taken, issue resolved
4. **DISMISSED** - Report was invalid or not actionable

## Usage Examples

### Submit a User Report
```typescript
const response = await fetch('/api/reports', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reportType: 'user',
    description: 'User was harassing me in chat',
    reportedUserId: 'user-uuid'
  })
});
```

### Submit a Game Report (Cheating)
```typescript
const response = await fetch('/api/reports', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reportType: 'game',
    description: 'Suspected use of chess engine',
    reportedUserId: 'cheater-uuid',
    gameId: 'game-uuid'
  })
});
```

### Submit a Chat Report
```typescript
const response = await fetch('/api/reports', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reportType: 'chat',
    description: 'Inappropriate language',
    chatMessageId: 'message-uuid'
  })
});
```

### Admin: Get Pending Reports
```typescript
const response = await fetch('/api/reports?status=pending&limit=20', {
  headers: {
    'Authorization': 'Bearer <admin-token>'
  }
});
```

### Admin: Update Report Status
```typescript
const response = await fetch('/api/reports/report-uuid/status', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer <admin-token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'resolved',
    adminNotes: 'User warned and chat privileges suspended for 24 hours'
  })
});
```

## Testing

Run the test suite:
```bash
npm test -- reports
```

The module includes comprehensive unit tests for:
- Report creation with all report types
- Validation rules
- Admin report management
- Status updates

## Integration with Other Modules

- **Auth Module**: Uses JWT authentication and role-based access control
- **Prisma Module**: Database operations for reports
- **Admin Module**: Admins can review and manage reports
- **Chat Module**: Chat reports reference chat messages
- **Games Module**: Game reports reference games

## Security Considerations

- All endpoints require authentication
- Admin endpoints require SUPER_ADMIN or TOURNAMENT_ADMIN role
- Users cannot report themselves
- Users cannot report their own messages
- All user inputs are validated and sanitized
- Report descriptions are limited to 1000 characters

## Future Enhancements

- Email notifications to admins for new reports
- Automatic flagging of users with multiple reports
- Report analytics and trends
- Bulk report management
- Report appeal system
