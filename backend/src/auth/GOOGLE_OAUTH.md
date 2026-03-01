# Google OAuth Authentication Implementation

## Overview

This document describes the Google OAuth authentication implementation for the ChessArena platform, fulfilling **Requirement 1.2**: "THE Authentication_Service SHALL support registration and login with Google OAuth".

## Architecture

### Components

1. **GoogleStrategy** (`strategies/google.strategy.ts`)
   - Passport strategy for Google OAuth 2.0
   - Validates OAuth tokens and extracts user profile
   - Configured with client ID, secret, and callback URL

2. **GoogleOAuthGuard** (`guards/google-oauth.guard.ts`)
   - NestJS guard that wraps the Google strategy
   - Protects OAuth endpoints

3. **AuthService Methods**
   - `googleOAuth()`: Handles OAuth login/registration flow
   - `completeGoogleRegistration()`: Completes registration for new OAuth users

4. **AuthController Endpoints**
   - `GET /auth/google`: Initiates OAuth flow
   - `GET /auth/google/callback`: OAuth callback handler
   - `POST /auth/google/complete-registration`: Completes new user registration

## Authentication Flow

### Existing User Login

```
1. User clicks "Sign in with Google" on frontend
2. Frontend redirects to: GET /api/auth/google
3. Backend redirects to Google OAuth consent screen
4. User approves permissions
5. Google redirects to: GET /api/auth/google/callback?code=...
6. GoogleStrategy validates OAuth token and extracts profile
7. AuthService.googleOAuth() finds existing user by oauthId
8. Backend generates JWT token
9. Backend redirects to: {FRONTEND_URL}/auth/callback?token={jwt}
10. Frontend stores token and redirects to dashboard
```

### Account Linking

If a user with the same email already exists (registered via email/password):

```
1-6. Same as above
7. AuthService.googleOAuth() finds user by email
8. Backend links OAuth account to existing user:
   - Sets oauthProvider = 'google'
   - Sets oauthId = {google_user_id}
   - Sets emailVerified = true
   - Updates avatarUrl if not set
9-10. Same as above
```

### New User Registration

```
1-6. Same as above
7. AuthService.googleOAuth() finds no existing user
8. Backend redirects to: {FRONTEND_URL}/auth/complete-registration?profile={encoded_profile}
9. Frontend displays registration form pre-filled with:
   - Email (from Google)
   - Display name (from Google)
   - Avatar URL (from Google)
10. User provides:
    - Username
    - College name
    - College domain
11. Frontend posts to: POST /api/auth/google/complete-registration
12. Backend validates college domain
13. Backend creates user with:
    - OAuth credentials
    - emailVerified = true
    - passwordHash = null
14. Backend creates initial ratings
15. Backend generates JWT token
16. Frontend stores token and redirects to dashboard
```

## Database Schema

The User model includes OAuth fields:

```prisma
model User {
  // ... other fields
  passwordHash    String?  // NULL for OAuth users
  oauthProvider   String?  // 'google'
  oauthId         String?  // Google user ID
  emailVerified   Boolean  // Always true for OAuth users
  // ... other fields
}
```

## Configuration

### Environment Variables

Required in `.env`:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Configure OAuth consent screen
6. Add authorized redirect URIs:
   - Development: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://api.chessarena.com/api/auth/google/callback`
7. Copy Client ID and Client Secret to `.env`

## Security Features

### Email Verification
- OAuth users have `emailVerified = true` automatically
- Google has already verified the email address
- No verification email is sent

### Account Linking
- Prevents duplicate accounts with same email
- Links OAuth to existing email/password account
- Preserves user data (ratings, games, etc.)

### Password Handling
- OAuth users have `passwordHash = null`
- Cannot login with password
- Can add password later via "Set Password" feature (future)

### College Domain Validation
- OAuth users must still provide college information
- Email domain is validated against college domain
- Ensures only educational institution users can register

## API Endpoints

### GET /auth/google

Initiates Google OAuth flow.

**Response**: Redirects to Google OAuth consent screen

### GET /auth/google/callback

OAuth callback endpoint.

**Query Parameters**:
- `code`: OAuth authorization code (provided by Google)

**Response**: 
- Existing user: Redirects to `{FRONTEND_URL}/auth/callback?token={jwt}`
- New user: Redirects to `{FRONTEND_URL}/auth/complete-registration?profile={data}`
- Error: Redirects to `{FRONTEND_URL}/auth/error?message={error}`

### POST /auth/google/complete-registration

Completes registration for new OAuth users.

**Request Body**:
```json
{
  "email": "user@university.edu",
  "oauthId": "google-123456",
  "displayName": "John Doe",
  "avatarUrl": "https://...",
  "username": "johndoe",
  "collegeName": "Test University",
  "collegeDomain": "university.edu"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Registration completed successfully",
  "user": { ... },
  "accessToken": "jwt-token",
  "expiresIn": "24h",
  "isNewUser": true
}
```

## Testing

### Unit Tests

Located in `auth.service.google-oauth.spec.ts`:

- ✅ Login existing OAuth user
- ✅ Reject banned users
- ✅ Link OAuth to existing email account
- ✅ Return profile for new user
- ✅ Complete registration with validation
- ✅ Reject duplicate usernames
- ✅ Validate college domains
- ✅ Set emailVerified to true

### Manual Testing

1. **New User Registration**:
   ```
   1. Click "Sign in with Google"
   2. Approve permissions
   3. Complete registration form
   4. Verify account created with OAuth credentials
   ```

2. **Existing User Login**:
   ```
   1. Register with email/password
   2. Logout
   3. Click "Sign in with Google" with same email
   4. Verify account linked and logged in
   ```

3. **OAuth User Login**:
   ```
   1. Register with Google OAuth
   2. Logout
   3. Click "Sign in with Google"
   4. Verify logged in without registration form
   ```

## Frontend Integration

### Login Page

Add Google OAuth button:

```tsx
<button onClick={() => window.location.href = '/api/auth/google'}>
  Sign in with Google
</button>
```

### Callback Handler

Create `/auth/callback` page:

```tsx
const CallbackPage = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      router.push('/dashboard');
    }
  }, [token]);
  
  return <div>Logging in...</div>;
};
```

### Registration Completion

Create `/auth/complete-registration` page:

```tsx
const CompleteRegistrationPage = () => {
  const searchParams = useSearchParams();
  const profileData = JSON.parse(
    decodeURIComponent(searchParams.get('profile') || '{}')
  );
  
  const handleSubmit = async (data) => {
    const response = await fetch('/api/auth/google/complete-registration', {
      method: 'POST',
      body: JSON.stringify({ ...profileData, ...data }),
    });
    
    const result = await response.json();
    localStorage.setItem('token', result.accessToken);
    router.push('/dashboard');
  };
  
  return <RegistrationForm initialData={profileData} onSubmit={handleSubmit} />;
};
```

## Requirements Validation

✅ **Requirement 1.2**: "THE Authentication_Service SHALL support registration and login with Google OAuth"

- ✅ Users can register with Google OAuth
- ✅ Users can login with Google OAuth
- ✅ OAuth accounts are linked to existing email accounts
- ✅ OAuth users have verified emails automatically
- ✅ College domain validation applies to OAuth users

## Known Limitations

1. **Package Installation Required**: The `passport-google-oauth20` package needs to be installed:
   ```bash
   npm install passport-google-oauth20 @types/passport-google-oauth20
   ```

2. **Frontend Implementation Pending**: The frontend OAuth flow pages need to be created:
   - `/auth/callback` - Token handler
   - `/auth/complete-registration` - Registration completion form
   - `/auth/error` - Error display page

3. **Google Cloud Console Setup**: Requires manual configuration in Google Cloud Console to obtain credentials.

## Future Enhancements

1. **Multiple OAuth Providers**: Support GitHub, Microsoft, etc.
2. **Account Unlinking**: Allow users to unlink OAuth accounts
3. **Password Addition**: Allow OAuth users to add password for email/password login
4. **Profile Sync**: Periodically sync avatar and name from OAuth provider
5. **OAuth Scopes**: Request additional permissions (calendar, etc.) if needed

## Related Files

- `backend/src/auth/strategies/google.strategy.ts` - Google OAuth strategy
- `backend/src/auth/guards/google-oauth.guard.ts` - OAuth guard
- `backend/src/auth/auth.service.ts` - OAuth service methods
- `backend/src/auth/auth.controller.ts` - OAuth endpoints
- `backend/src/auth/auth.module.ts` - Module configuration
- `backend/src/auth/auth.service.google-oauth.spec.ts` - Unit tests
