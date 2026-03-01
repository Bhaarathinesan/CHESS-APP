# Authentication Module

This module handles user authentication and registration for the ChessArena platform.

## Features

- User registration with email and password
- Email domain validation for college/university domains
- Password hashing using bcrypt with 10 salt rounds
- Automatic creation of initial ELO ratings for all time controls
- Input validation using Zod schemas

## API Endpoints

### POST /auth/register

Registers a new user account.

**Request Body:**
```json
{
  "email": "student@university.edu",
  "username": "johndoe",
  "password": "SecurePass123",
  "displayName": "John Doe",
  "collegeName": "University Name",
  "collegeDomain": "university.edu"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "student@university.edu",
    "username": "johndoe",
    "displayName": "John Doe",
    "collegeName": "University Name",
    "collegeDomain": "university.edu",
    "role": "PLAYER",
    "emailVerified": false,
    ...
  }
}
```

**Validation Rules:**

- **Email**: Must be a valid email format from an approved educational domain (.edu, .ac.uk, .edu.au, .edu.in, .ac.in)
- **Username**: 3-50 characters, alphanumeric with underscores and hyphens only
- **Password**: Minimum 8 characters, must contain at least one uppercase letter, one lowercase letter, and one number
- **Display Name**: 1-100 characters
- **College Name**: 1-255 characters
- **College Domain**: Must match the email domain

**Error Responses:**

- `400 Bad Request`: Validation errors, invalid email domain, or non-educational domain
- `409 Conflict`: Email or username already exists

## Implementation Details

### Password Security

- Passwords are hashed using bcrypt with 10 salt rounds (as per requirement 1.5)
- Password hashes are never returned in API responses
- Minimum password requirements enforce strong passwords

### Email Domain Validation

The service validates that:
1. The email domain matches the provided college domain
2. The email domain ends with an approved educational suffix

Approved domains include:
- `.edu` (US educational institutions)
- `.ac.uk` (UK academic institutions)
- `.edu.au` (Australian educational institutions)
- `.edu.in` (Indian educational institutions)
- `.ac.in` (Indian academic institutions)

### Initial Ratings

Upon registration, the system automatically creates initial ELO ratings for all time controls:
- Bullet: 1200 (provisional)
- Blitz: 1200 (provisional)
- Rapid: 1200 (provisional)
- Classical: 1200 (provisional)

All ratings start with a K-factor of 40 and are marked as provisional until the user completes 20 games in that time control.

## Testing

Unit tests are provided for both the service and controller:
- `auth.service.spec.ts`: Tests for business logic, validation, and error handling
- `auth.controller.spec.ts`: Tests for HTTP endpoint behavior

Run tests with:
```bash
npm test -- auth.service.spec.ts
npm test -- auth.controller.spec.ts
```

## Future Enhancements

The following features are planned for future implementation:
- Email verification
- Google OAuth integration
- Password reset functionality
- JWT token generation and validation
- Two-factor authentication
