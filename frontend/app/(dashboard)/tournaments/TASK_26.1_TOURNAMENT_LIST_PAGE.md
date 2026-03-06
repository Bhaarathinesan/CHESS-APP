# Task 26.1: Tournament List Page Implementation

## Overview
Implemented the tournament list page with filtering, pagination, and role-based Create Tournament button for admins.

## Requirements Fulfilled
- **Requirement 9.1**: Tournament browsing and filtering

## Files Created

### 1. TournamentCard Component
**Path**: `frontend/components/tournament/TournamentCard.tsx`

Displays tournament information in a card format:
- Tournament name and description
- Format (Swiss, Round Robin, etc.)
- Time control (Bullet, Blitz, Rapid, Classical)
- Status badge with color coding
- Player count (current/max)
- Start time
- Creator name
- Optional banner image
- Links to tournament details page

### 2. TournamentFilters Component
**Path**: `frontend/components/tournament/TournamentFilters.tsx`

Provides filtering options:
- Search by tournament name
- Filter by status (Open, In Progress, Completed)
- Filter by format (Swiss, Round Robin, etc.)
- Filter by time control (Bullet, Blitz, Rapid, Classical)

### 3. Pagination Component
**Path**: `frontend/components/ui/Pagination.tsx`

Reusable pagination component:
- Previous/Next buttons
- Page number buttons
- Ellipsis for large page counts
- Disabled state for first/last pages
- Highlights current page

### 4. Tournaments List Page
**Path**: `frontend/app/(dashboard)/tournaments/page.tsx`

Main page implementation:
- Fetches tournaments from backend API
- Applies filters and pagination
- Shows loading, error, and empty states
- Displays tournaments in a responsive grid (1/2/3 columns)
- Create Tournament button (visible only to TOURNAMENT_ADMIN and SUPER_ADMIN)
- Role-based access control using JWT token

## Tests Created

### 1. TournamentCard Tests
**Path**: `frontend/components/tournament/__tests__/TournamentCard.test.tsx`

Tests:
- Renders tournament name, description, format, time control
- Renders player count and status badge
- Renders creator name
- Renders banner image when provided
- Links to correct tournament details page

### 2. Pagination Tests
**Path**: `frontend/components/ui/__tests__/Pagination.test.tsx`

Tests:
- Does not render when totalPages is 1
- Renders page numbers correctly
- Disables Previous/Next buttons appropriately
- Calls onPageChange with correct page number
- Shows ellipsis for large page counts
- Highlights current page

## API Integration

The page integrates with the backend tournament API:
- **Endpoint**: `GET /api/tournaments`
- **Query Parameters**:
  - `page`: Current page number
  - `limit`: Items per page (default: 12)
  - `status`: Filter by tournament status
  - `format`: Filter by tournament format
  - `timeControl`: Filter by time control
  - `search`: Search by tournament name

**Response Structure**:
```typescript
{
  tournaments: Tournament[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

## Role-Based Access Control

The Create Tournament button is only visible to users with:
- `TOURNAMENT_ADMIN` role
- `SUPER_ADMIN` role

The role is extracted from the JWT token stored in localStorage.

## UI/UX Features

1. **Responsive Grid Layout**:
   - 1 column on mobile
   - 2 columns on tablet
   - 3 columns on desktop

2. **Status Color Coding**:
   - Created: Gray
   - Open: Green
   - Closed: Yellow
   - In Progress: Blue
   - Completed: Dark Gray
   - Cancelled: Red

3. **Loading States**:
   - Spinner while fetching data
   - Error message on failure
   - Empty state when no tournaments found

4. **Interactive Elements**:
   - Hover effects on tournament cards
   - Filter changes reset to page 1
   - Pagination updates URL (future enhancement)

## Component Exports

Updated `frontend/components/ui/index.ts` to export the Pagination component.

## TypeScript Types

All components are fully typed with TypeScript interfaces for:
- Tournament data structure
- Filter state
- Pagination props
- API responses

## Testing

All components have comprehensive unit tests using Vitest and React Testing Library:
- TournamentCard: 9 tests
- Pagination: 9 tests

## Future Enhancements

1. Add URL query parameters for filters and pagination
2. Add tournament search with debouncing
3. Add sorting options (by start time, player count, etc.)
4. Add favorite/bookmark tournaments
5. Add tournament type icons
6. Add live tournament indicators
7. Add tournament countdown timers
8. Add skeleton loading states

## Notes

- The page uses the existing UI component library (Button, Card, etc.)
- All styling uses Tailwind CSS with dark mode support
- The page follows the design document specifications
- The implementation is minimal and focused on core functionality
