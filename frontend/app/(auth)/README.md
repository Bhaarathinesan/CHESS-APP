# Authentication Pages

This directory contains the authentication pages for ChessArena.

## Pages

### Login (`/login`)
- Email and password authentication
- "Remember Me" checkbox for extended sessions (30 days)
- Google OAuth button (placeholder - to be implemented)
- Link to registration page
- Link to forgot password page (to be implemented)

### Register (`/register`)
- Email and password registration
- Username selection with validation
- Display name
- College information (name and domain)
- Password strength requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
- Google OAuth button (placeholder - to be implemented)
- Link to login page

## Features

### Client-Side Validation
Both pages implement comprehensive client-side validation:
- Email format validation
- Password strength validation
- Username format validation (3-50 chars, alphanumeric with underscores/hyphens)
- Field length validation
- Password confirmation matching

### Error Handling
- Field-level error messages
- General error messages for API errors
- Success messages for successful operations
- Loading states during API calls

### User Experience
- Real-time validation feedback
- Error clearing on field change
- Disabled submit button during loading
- Loading spinner on submit button
- Auto-redirect after successful registration (3 seconds)
- Auto-redirect to dashboard after successful login

## API Integration

The pages connect to the following backend endpoints:
- `POST /auth/register` - User registration
- `POST /auth/login` - User login

Authentication tokens are stored in localStorage and automatically included in subsequent API requests.

## Requirements Satisfied

- **Requirement 1.1**: Registration with email and password
- **Requirement 1.2**: Google OAuth support (UI ready, implementation pending)
- **Requirement 1.5**: Password validation (client-side)
- **Requirement 1.8**: "Remember Me" functionality

## TODO

- [ ] Implement Google OAuth integration
- [ ] Implement forgot password page
- [ ] Add email verification flow
- [ ] Add rate limiting feedback
- [ ] Add CAPTCHA for bot prevention
