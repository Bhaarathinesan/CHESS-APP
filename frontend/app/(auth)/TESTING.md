# Authentication Pages - Testing Checklist

## Manual Testing Guide

### Prerequisites
1. Backend server running on `http://localhost:3001`
2. Frontend server running on `http://localhost:3000`
3. Database seeded with test data

### Login Page Tests

#### Valid Login
- [ ] Navigate to `/login`
- [ ] Enter valid email and password
- [ ] Click "Sign In"
- [ ] Verify redirect to `/dashboard`
- [ ] Verify token stored in localStorage

#### Invalid Credentials
- [ ] Enter invalid email/password
- [ ] Click "Sign In"
- [ ] Verify error message displayed
- [ ] Verify no redirect occurs

#### Remember Me
- [ ] Check "Remember Me" checkbox
- [ ] Login successfully
- [ ] Verify extended session token (check token expiry)

#### Client-Side Validation
- [ ] Submit empty form - verify email and password errors
- [ ] Enter invalid email format - verify email error
- [ ] Verify errors clear when typing in fields

#### Loading States
- [ ] Click "Sign In" and verify:
  - Button shows loading spinner
  - Button is disabled during request
  - Form fields remain accessible

### Register Page Tests

#### Valid Registration
- [ ] Navigate to `/register`
- [ ] Fill all fields with valid data:
  - Email: `test@college.edu`
  - Username: `testuser123`
  - Display Name: `Test User`
  - Password: `Test1234`
  - Confirm Password: `Test1234`
  - College Name: `Test College`
  - College Domain: `college.edu`
- [ ] Click "Create Account"
- [ ] Verify success message displayed
- [ ] Verify auto-redirect to `/login` after 3 seconds

#### Password Validation
- [ ] Enter password without uppercase - verify error
- [ ] Enter password without lowercase - verify error
- [ ] Enter password without number - verify error
- [ ] Enter password less than 8 chars - verify error
- [ ] Enter mismatched passwords - verify confirm password error

#### Username Validation
- [ ] Enter username less than 3 chars - verify error
- [ ] Enter username with special chars - verify error
- [ ] Enter username with spaces - verify error
- [ ] Enter valid username - verify no error

#### Email Validation
- [ ] Enter invalid email format - verify error
- [ ] Enter email without @ - verify error
- [ ] Enter valid email - verify no error

#### Field Length Validation
- [ ] Enter display name > 100 chars - verify error
- [ ] Enter college name > 255 chars - verify error
- [ ] Enter username > 50 chars - verify error

#### Duplicate User
- [ ] Register with existing email
- [ ] Verify appropriate error message
- [ ] Register with existing username
- [ ] Verify appropriate error message

#### Loading States
- [ ] Click "Create Account" and verify:
  - Button shows loading spinner
  - Button is disabled during request
  - Form fields remain accessible

### Navigation Tests

#### Login to Register
- [ ] On login page, click "Sign up" link
- [ ] Verify navigation to `/register`

#### Register to Login
- [ ] On register page, click "Sign in" link
- [ ] Verify navigation to `/login`

### UI/UX Tests

#### Responsive Design
- [ ] Test on mobile viewport (375px)
- [ ] Test on tablet viewport (768px)
- [ ] Test on desktop viewport (1920px)
- [ ] Verify form is centered and readable on all sizes

#### Accessibility
- [ ] Tab through form fields - verify logical order
- [ ] Verify all inputs have labels
- [ ] Verify error messages are associated with fields
- [ ] Test with screen reader (if available)

#### Visual Design
- [ ] Verify gradient background displays correctly
- [ ] Verify card shadow and rounded corners
- [ ] Verify button hover states
- [ ] Verify input focus states
- [ ] Verify error message styling (red)
- [ ] Verify success message styling (green)

### Google OAuth (Placeholder)
- [ ] Click "Sign in with Google" button
- [ ] Verify alert shows "Google OAuth not yet implemented"
- [ ] Verify no errors in console

## API Integration Tests

### Network Errors
- [ ] Stop backend server
- [ ] Try to login
- [ ] Verify "Network error occurred" message

### Server Errors
- [ ] Trigger 500 error from backend (if possible)
- [ ] Verify appropriate error message displayed

### Validation Errors from Backend
- [ ] Submit invalid data that passes client validation
- [ ] Verify backend validation errors displayed correctly

## Security Tests

### Token Storage
- [ ] Login successfully
- [ ] Open browser DevTools > Application > Local Storage
- [ ] Verify `auth_token` is stored
- [ ] Logout (when implemented)
- [ ] Verify token is removed

### XSS Prevention
- [ ] Try entering `<script>alert('xss')</script>` in form fields
- [ ] Verify script doesn't execute
- [ ] Verify input is properly escaped

## Performance Tests

### Load Time
- [ ] Measure page load time (should be < 2 seconds)
- [ ] Verify no unnecessary re-renders

### Form Submission
- [ ] Measure time from submit to response
- [ ] Verify loading state appears immediately

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

## Known Issues / TODO

- Google OAuth not implemented (placeholder only)
- Forgot password page not implemented
- Email verification flow not implemented
- No rate limiting feedback on client
- No CAPTCHA for bot prevention
