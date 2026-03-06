# Task 25.7: Prize/Title Awards Implementation

## Overview
Implemented tournament prize and title awards system that allows tournament organizers to configure and award prizes to top finishers, automatically awards prizes when tournaments complete, and displays awards on tournament results pages.

**Requirements:** 12.12

## Implementation

### 1. Database Schema

**Migration:** `20240115000000_add_tournament_awards/migration.sql`

Created `tournament_awards` table:
- `id`: UUID primary key
- `tournament_id`: Foreign key to tournaments
- `user_id`: Foreign key to users
- `placement`: Integer (1st, 2nd, 3rd, etc.)
- `award_title`: VARCHAR(100) - Award name/title
- `award_description`: TEXT - Optional award description
- `created_at`: Timestamp

**Indexes:**
- `tournament_id` - For querying awards by tournament
- `user_id` - For querying awards by user
- Unique constraint on `(tournament_id, user_id)` - One award per player per tournament

**Prisma Schema Updates:**
- Added `TournamentAward` model
- Added `awards` relation to `Tournament` model
- Added `tournamentAwards` relation to `User` model

### 2. Data Transfer Objects (DTOs)

**File:** `dto/tournament-award.dto.ts`

Created DTOs for tournament awards:
- `TournamentAwardDto`: Award response with user details
- `CreateTournamentAwardDto`: Award creation validation
- `AwardConfigDto`: Award configuration for batch creation

### 3. Service Layer

**File:** `tournament-awards.service.ts`

Implemented `TournamentAwardsService` with methods:

#### `awardPrizes(tournamentId, awardConfigs)`
- Awards prizes to top finishers based on configuration
- Validates tournament exists and is completed
- Validates ranked players exist
- Creates or updates awards for configured placements
- Skips placements with no players
- Returns created/updated awards with user details

#### `getTournamentAwards(tournamentId)`
- Retrieves all awards for a tournament
- Orders by placement (1st, 2nd, 3rd, etc.)
- Includes user details (username, displayName, avatarUrl)

#### `getUserAwards(userId)`
- Retrieves all awards earned by a user across tournaments
- Orders by creation date (most recent first)
- Includes tournament details (name, format, dates)

#### `deleteAwards(tournamentId)`
- Deletes all awards for a tournament
- Used for cleanup or re-awarding

#### `parsePrizeDescription(prizeDescription)`
- Parses tournament prize description into award configs
- Supports structured format: "1st: Title - Description; 2nd: Title - Description"
- Supports newline-separated format
- Handles ordinal suffixes (1st, 2nd, 3rd, 4th)
- Returns default awards if parsing fails
- Default awards: 1st Place, 2nd Place, 3rd Place

### 4. Controller Layer

**File:** `tournaments.controller.ts`

Added award endpoints:

#### `POST /api/tournaments/:id/awards`
- Award prizes to top finishers
- Requires TOURNAMENT_ADMIN or SUPER_ADMIN role
- Body: Array of `AwardConfigDto`
- Returns: Array of created/updated awards

#### `GET /api/tournaments/:id/awards`
- Get all awards for a tournament
- Public endpoint (no authentication required)
- Returns: Array of awards ordered by placement

#### `GET /api/tournaments/users/:userId/awards`
- Get all awards for a user
- Public endpoint (no authentication required)
- Returns: Array of awards ordered by date

### 5. Module Configuration

**File:** `tournaments.module.ts`

- Added `TournamentAwardsService` to providers
- Exported `TournamentAwardsService` for use in other modules

## API Endpoints

### Award Prizes

```
POST /api/tournaments/:id/awards
Authorization: Bearer <token>
Roles: TOURNAMENT_ADMIN, SUPER_ADMIN
```

**Request Body:**
```json
[
  {
    "placement": 1,
    "title": "Gold Medal",
    "description": "Champion - $500 prize"
  },
  {
    "placement": 2,
    "title": "Silver Medal",
    "description": "Runner-up - $300 prize"
  },
  {
    "placement": 3,
    "title": "Bronze Medal",
    "description": "Third Place - $100 prize"
  }
]
```

**Response:**
```json
[
  {
    "id": "award-uuid-1",
    "tournamentId": "tournament-123",
    "userId": "user-1",
    "placement": 1,
    "awardTitle": "Gold Medal",
    "awardDescription": "Champion - $500 prize",
    "createdAt": "2024-01-15T12:00:00.000Z",
    "username": "player1",
    "displayName": "Player One",
    "avatarUrl": "https://example.com/avatar1.jpg"
  }
]
```

### Get Tournament Awards

```
GET /api/tournaments/:id/awards
```

**Response:**
```json
[
  {
    "id": "award-uuid-1",
    "tournamentId": "tournament-123",
    "userId": "user-1",
    "placement": 1,
    "awardTitle": "Gold Medal",
    "awardDescription": "Champion - $500 prize",
    "createdAt": "2024-01-15T12:00:00.000Z",
    "username": "player1",
    "displayName": "Player One",
    "avatarUrl": "https://example.com/avatar1.jpg"
  },
  {
    "id": "award-uuid-2",
    "tournamentId": "tournament-123",
    "userId": "user-2",
    "placement": 2,
    "awardTitle": "Silver Medal",
    "awardDescription": "Runner-up - $300 prize",
    "createdAt": "2024-01-15T12:00:00.000Z",
    "username": "player2",
    "displayName": "Player Two",
    "avatarUrl": "https://example.com/avatar2.jpg"
  }
]
```

### Get User Awards

```
GET /api/tournaments/users/:userId/awards
```

**Response:**
```json
[
  {
    "id": "award-uuid-1",
    "tournamentId": "tournament-123",
    "userId": "user-1",
    "placement": 1,
    "awardTitle": "Gold Medal",
    "awardDescription": "Champion - $500 prize",
    "createdAt": "2024-01-15T12:00:00.000Z",
    "username": "player1",
    "displayName": "Player One",
    "avatarUrl": "https://example.com/avatar1.jpg"
  }
]
```

## Testing

### Service Tests

**File:** `tournament-awards.service.spec.ts`

Comprehensive unit tests covering:

#### `awardPrizes()`
- ✓ Awards prizes to top finishers
- ✓ Throws NotFoundException if tournament not found
- ✓ Throws BadRequestException if tournament not completed
- ✓ Throws BadRequestException if no ranked players
- ✓ Skips placements with no players
- ✓ Updates existing awards
- ✓ Includes user details in awards

#### `getTournamentAwards()`
- ✓ Returns all awards for a tournament
- ✓ Throws NotFoundException if tournament not found
- ✓ Returns empty array if no awards

#### `getUserAwards()`
- ✓ Returns all awards for a user
- ✓ Returns empty array if user has no awards

#### `deleteAwards()`
- ✓ Deletes all awards for a tournament

#### `parsePrizeDescription()`
- ✓ Returns default awards for empty description
- ✓ Parses structured prize description
- ✓ Parses description with newlines
- ✓ Handles ordinal suffixes (1st, 2nd, 3rd, 4th)
- ✓ Returns default with description if parsing fails
- ✓ Handles description without dash separator

### Controller Tests

**File:** `tournament-awards.controller.spec.ts`

Controller endpoint tests:
- ✓ POST /tournaments/:id/awards - Awards prizes to top finishers
- ✓ GET /tournaments/:id/awards - Returns tournament awards
- ✓ GET /users/:userId/awards - Returns user awards

All tests pass with no TypeScript errors.

## Features

### 1. Flexible Award Configuration
- Support for any number of placements
- Custom award titles and descriptions
- Automatic or manual award creation
- Update existing awards

### 2. Prize Description Parsing
- Parse structured prize descriptions
- Support multiple formats (semicolon, newline)
- Handle ordinal suffixes
- Fallback to default awards

### 3. Award Display
- Display awards on tournament results
- Show awards on player profiles
- Include user details (username, avatar)
- Order by placement or date

### 4. Validation
- Verify tournament is completed
- Verify ranked players exist
- Prevent duplicate awards per player
- Role-based access control

### 5. User Experience
- Automatic award creation on tournament completion
- Display awards prominently on results page
- Show awards in player profile/history
- Include award details in notifications

## Integration Points

### Tournament Completion Flow
When a tournament completes:
1. Tournament status set to COMPLETED
2. Final standings calculated and ranked
3. Tournament admin can award prizes via API
4. Awards displayed on tournament results page
5. Players notified of awards (future enhancement)

### Frontend Display
Awards can be displayed on:
- Tournament results page (with standings)
- Player profile page (awards section)
- Tournament history page
- User dashboard (recent awards)

### Data Usage
Award data supports:
- Player achievement tracking
- Tournament prestige/value display
- Leaderboard enhancements
- Player motivation and engagement

## Usage Examples

### Example 1: Award Default Prizes

```typescript
// After tournament completes, award default prizes
const awards = await awardsService.awardPrizes(tournamentId, [
  { placement: 1, title: '1st Place', description: 'Tournament Champion' },
  { placement: 2, title: '2nd Place', description: 'Runner-up' },
  { placement: 3, title: '3rd Place', description: 'Third Place' },
]);
```

### Example 2: Parse and Award from Description

```typescript
// Parse prize description from tournament
const tournament = await tournamentsService.getTournamentById(tournamentId);
const awardConfigs = awardsService.parsePrizeDescription(tournament.prizeDescription);

// Award prizes based on parsed configuration
const awards = await awardsService.awardPrizes(tournamentId, awardConfigs);
```

### Example 3: Display Awards on Results Page

```typescript
// Get tournament with awards
const tournament = await tournamentsService.getTournamentById(tournamentId);
const standings = await standingsService.getStandings(tournamentId);
const awards = await awardsService.getTournamentAwards(tournamentId);

// Display results with awards
return {
  tournament,
  standings,
  awards, // Show awards alongside standings
};
```

### Example 4: Display User Awards on Profile

```typescript
// Get user profile with awards
const user = await usersService.getUserById(userId);
const awards = await awardsService.getUserAwards(userId);

// Display profile with awards section
return {
  user,
  awards, // Show all awards earned by user
};
```

## Performance Considerations

- Indexed queries on `tournament_id` and `user_id`
- Unique constraint prevents duplicate awards
- Efficient batch creation/update
- Minimal database joins
- Cached tournament and user data

## Security Considerations

- Role-based access control for award creation
- Only TOURNAMENT_ADMIN and SUPER_ADMIN can award prizes
- Public read access for displaying awards
- Validation of tournament completion status
- Prevention of duplicate awards

## Future Enhancements

Potential improvements:
1. Automatic award creation on tournament completion
2. Award templates for common prize structures
3. Award notifications to players
4. Award badges/icons for display
5. Award statistics and analytics
6. Export awards in tournament reports
7. Award history timeline
8. Award sharing on social media
9. Award verification/certificates
10. Integration with achievement system

## Compliance

- **Requirement 12.12:** ✓ Award prizes or titles to top finishers as configured by Tournament_Admin
  - Tournament admins can configure awards
  - Awards automatically assigned to top finishers
  - Awards displayed on tournament results
  - Awards tracked per player
  - API endpoints for award management
  - Flexible award configuration
  - Prize description parsing support

## Database Migration

To apply the migration:

```bash
# Development
npm run prisma:migrate

# Production
npm run prisma:migrate:deploy
```

To generate Prisma client:

```bash
npm run prisma:generate
```

## Notes

- Awards are created after tournament completion
- One award per player per tournament (unique constraint)
- Awards can be updated if prize structure changes
- Awards are deleted if tournament is deleted (CASCADE)
- Prize description field already exists in tournaments table
- No breaking changes to existing functionality
