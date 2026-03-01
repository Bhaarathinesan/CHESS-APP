# Email Verification System

## Overview

The email verification system ensures that users verify their email addresses after registration. This is a critical security feature that confirms users have access to the email address they registered with.

## Features

### 1. Automatic Email Sending on Registration
- When a user registers with email/password, a verification email is automatically sent
- The email contains a unique verification token
- Registration succeeds even if email sending fails (graceful degradation)

### 2. Email Verification Token
- Secure random token generated using `crypto.randomBytes(32)`
- Token is 64 characters long (hex encoded)
- Stored in the database with the user record
- Cleared after successful verification

### 3. Verification Endpoints

#### GET /auth/verify-email?token={token}
Verifies a user's email address using the verification token.

**Query Parameters:**
- `token` (required): The verification token from the email

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

**Error Cases:**
- `400 Bad Request`: Token is missing
- `404 Not Found`: Invalid or expired token

#### POST /auth/resend-verification
Resends the verification email to a user.

**Request Body:**
```json
{
  "email": "user@university.edu"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification email sent"
}
```

**Error Cases:**
- `404 Not Found`: User not found
- `400 Bad Request`: Email already verified

## Email Service

### SendGrid Integration

The system uses SendGrid for sending transactional emails. Configuration is done via environment variables:

```env
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@chessarena.com
FRONTEND_URL=http://localhost:3000
```

### Development Mode

When `SENDGRID_API_KEY` is not configured or set to the placeholder value, the system operates in development mode:
- Emails are not actually sent
- Verification URLs are logged to the console
- This allows development without SendGrid credentials

### Email Template

The verification email includes:
- Personalized greeting with username
- Clear call-to-action button
- Plain text link as fallback
- 24-hour expiration notice
- Professional HTML formatting

## Database Schema

The `users` table includes the following fields for email verification:

```prisma
model User {
  emailVerified          Boolean   @default(false)
  emailVerificationToken String?
  // ... other fields
}
```

## Security Considerations

1. **Token Generation**: Uses cryptographically secure random bytes
2. **Token Storage**: Stored as plain text (tokens are single-use and expire)
3. **Graceful Degradation**: Registration succeeds even if email fails
4. **Token Clearing**: Tokens are cleared after successful verification
5. **Idempotency**: Verifying an already-verified email returns success

## Testing

### Unit Tests
- `auth.service.email-verification.spec.ts`: Tests for service methods
- `auth.controller.email-verification.spec.ts`: Tests for controller endpoints

### Test Coverage
- ✅ Successful email verification
- ✅ Already verified email handling
- ✅ Invalid token handling
- ✅ Missing token handling
- ✅ Resend verification email
- ✅ User not found handling
- ✅ Already verified user handling
- ✅ Token generation on registration
- ✅ Email sending failure handling

## Usage Example

### 1. User Registration
```typescript
POST /auth/register
{
  "email": "student@university.edu",
  "username": "student123",
  "password": "SecurePass123!",
  "displayName": "John Doe",
  "collegeName": "Test University",
  "collegeDomain": "university.edu"
}
```

Response includes message about checking email:
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email to verify your account.",
  "user": { ... }
}
```

### 2. User Receives Email
The user receives an email with a verification link:
```
http://localhost:3000/auth/verify-email?token=abc123...
```

### 3. User Clicks Link
Frontend calls the verification endpoint:
```typescript
GET /auth/verify-email?token=abc123...
```

### 4. Email Verified
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

### 5. Resend Verification (if needed)
```typescript
POST /auth/resend-verification
{
  "email": "student@university.edu"
}
```

## Future Enhancements

1. **Token Expiration**: Add timestamp-based expiration (currently tokens don't expire)
2. **Rate Limiting**: Limit resend requests per user
3. **Email Templates**: Use SendGrid dynamic templates
4. **Multi-language Support**: Localized email content
5. **Email Verification Requirement**: Optionally require verification before login

## Related Requirements

- **Requirement 1.3**: Email verification link sent on registration
- **Property 1**: Email verification sent on registration (property-based test)

## Implementation Status

✅ Generate email verification tokens
✅ Create email verification endpoint
✅ Send verification emails using SendGrid
✅ Unit tests for all functionality
✅ Integration with registration flow
✅ Graceful error handling
✅ Development mode support
