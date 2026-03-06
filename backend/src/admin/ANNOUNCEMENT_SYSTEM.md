# Announcement System

## Overview

The announcement system allows super admins to create and broadcast platform-wide announcements to all users. Announcements are displayed on the dashboard and sent as notifications to all users.

## Requirements

- **25.11**: Admin panel shall allow super_admin to create platform-wide announcements
- **25.18**: Admin panel shall require super_admin authentication for all administrative functions
- **16.15**: Platform shall display platform announcements on the dashboard

## Features

### 1. Announcement Creation
- Super admins can create announcements with title, message, priority, and optional link
- Announcements are stored in the database
- Notifications are created for all users
- Real-time broadcast via WebSocket to connected users

### 2. Priority Levels
- **LOW**: Informational messages (blue)
- **NORMAL**: Standard announcements (gray)
- **HIGH**: Important updates (orange)
- **URGENT**: Critical alerts (red)

### 3. Announcement Management
- List all announcements with pagination
- Update existing announcements
- Deactivate announcements
- Delete announcements
- Filter by active status

### 4. Expiration
- Announcements can have an optional expiration date
- Expired announcements are automatically deactivated
- Cleanup can be run as a cron job

### 5. Dashboard Display
- Active announcements are displayed on the dashboard
- Users can dismiss announcements (stored in localStorage)
- Priority-based styling and icons
- Optional link to more information

## Database Schema

```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority announcement_priority DEFAULT 'normal',
  link_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TYPE announcement_priority AS ENUM ('low', 'normal', 'high', 'urgent');
```

## API Endpoints

### Admin Endpoints (Super Admin Only)

#### POST /api/admin/announcements
Create a new announcement and broadcast to all users.

**Request:**
```json
{
  "title": "Maintenance Notice",
  "message": "The platform will be down for maintenance on Sunday at 2 AM UTC",
  "priority": "high",
  "linkUrl": "/maintenance",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "message": "Announcement created and broadcast successfully",
  "announcement": {
    "id": "uuid",
    "title": "Maintenance Notice",
    "message": "The platform will be down for maintenance on Sunday at 2 AM UTC",
    "priority": "high",
    "linkUrl": "/maintenance",
    "createdBy": "admin-user-id",
    "createdAt": "2024-01-15T10:00:00Z",
    "expiresAt": "2024-12-31T23:59:59Z",
    "isActive": true
  }
}
```

#### GET /api/admin/announcements
Get all announcements with pagination.

**Query Parameters:**
- `limit` (optional): Number of announcements per page (default: 20)
- `offset` (optional): Offset for pagination (default: 0)
- `activeOnly` (optional): Filter by active status (default: true)

**Response:**
```json
{
  "announcements": [...],
  "total": 10,
  "limit": 20,
  "offset": 0
}
```

#### GET /api/admin/announcements/:id
Get a single announcement by ID.

#### PATCH /api/admin/announcements/:id
Update an announcement.

#### DELETE /api/admin/announcements/:id
Delete an announcement.

#### POST /api/admin/announcements/:id/deactivate
Deactivate an announcement.

### Public Endpoints

#### GET /api/announcements
Get active announcements for display on dashboard.

**Query Parameters:**
- `limit` (optional): Number of announcements (default: 20)
- `offset` (optional): Offset for pagination (default: 0)

**Response:**
```json
{
  "announcements": [
    {
      "id": "uuid",
      "title": "New Feature",
      "message": "Check out our new tournament system!",
      "priority": "normal",
      "linkUrl": "/tournaments",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

## WebSocket Events

### Broadcast Event: `announcement`
Sent to all connected users when a new announcement is created.

**Payload:**
```json
{
  "id": "uuid",
  "title": "Maintenance Notice",
  "message": "The platform will be down for maintenance",
  "priority": "high",
  "linkUrl": "/maintenance",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

## Frontend Components

### AnnouncementsBanner
Displays active announcements on the dashboard.

**Features:**
- Fetches announcements from API
- Priority-based styling and icons
- Dismissible (stored in localStorage)
- Optional link to more information
- Responsive design

**Usage:**
```tsx
import { AnnouncementsBanner } from '@/components/dashboard';

<AnnouncementsBanner />
```

## Service Methods

### AnnouncementService

#### createAnnouncement(dto, createdBy)
Creates a new announcement and broadcasts to all users.

#### getAnnouncements(dto)
Gets announcements with pagination and filtering.

#### getAnnouncementById(id)
Gets a single announcement by ID.

#### updateAnnouncement(id, dto)
Updates an announcement.

#### deactivateAnnouncement(id)
Deactivates an announcement.

#### deleteAnnouncement(id)
Deletes an announcement.

#### getActiveAnnouncements(limit)
Gets active announcements for dashboard display.

#### cleanupExpiredAnnouncements()
Deactivates expired announcements (can be run as a cron job).

## Testing

### Unit Tests
- ✅ Create announcement and broadcast
- ✅ Get announcements with pagination
- ✅ Get announcement by ID
- ✅ Update announcement
- ✅ Deactivate announcement
- ✅ Delete announcement
- ✅ Get active announcements
- ✅ Cleanup expired announcements

Run tests:
```bash
npm test -- announcement.service.spec.ts
```

## Usage Examples

### Creating an Announcement

```typescript
// As super admin
const announcement = await announcementService.createAnnouncement(
  {
    title: 'New Tournament Format',
    message: 'We have added Swiss System tournaments!',
    priority: AnnouncementPriority.NORMAL,
    linkUrl: '/tournaments',
  },
  adminUserId
);
```

### Fetching Active Announcements

```typescript
// Public endpoint
const announcements = await announcementService.getActiveAnnouncements(5);
```

### Cleanup Expired Announcements

```typescript
// Run as cron job
const deactivatedCount = await announcementService.cleanupExpiredAnnouncements();
console.log(`Deactivated ${deactivatedCount} expired announcements`);
```

## Security

- All admin endpoints require `super_admin` role
- JWT authentication required for admin endpoints
- Public endpoint only returns active announcements
- Input validation on all DTOs
- XSS protection on frontend display

## Performance Considerations

- Announcements are cached on the frontend
- Dismissed announcements stored in localStorage
- WebSocket broadcast is efficient for real-time updates
- Database indexes on `created_at`, `is_active`, and `priority`
- Pagination for large announcement lists

## Future Enhancements

- [ ] Scheduled announcements (publish at specific time)
- [ ] Target specific user groups or colleges
- [ ] Rich text formatting for messages
- [ ] Announcement templates
- [ ] Analytics (views, dismissals)
- [ ] Email notifications for urgent announcements
