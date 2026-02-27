# Environment Variables Setup Guide

This guide explains how to configure environment variables for the ChessArena platform across different environments.

## Overview

The ChessArena platform uses environment variables for configuration management across:
- **Development**: Local development environment
- **Staging**: Pre-production testing environment
- **Production**: Live production environment

Environment variables are validated using [Zod](https://zod.dev/) to ensure type safety and catch configuration errors early.

## Quick Start

### Backend Setup

1. Navigate to the `backend/` directory
2. Copy the appropriate example file:
   ```bash
   # For development
   cp .env.example .env
   # OR copy environment-specific file
   cp .env.development.example .env.development
   ```
3. Edit the `.env` file and replace placeholder values with your actual credentials
4. The application will automatically validate environment variables on startup

### Frontend Setup

1. Navigate to the `frontend/` directory
2. Copy the appropriate example file:
   ```bash
   # For development
   cp .env.example .env.local
   # OR copy environment-specific file
   cp .env.development.example .env.development.local
   ```
3. Edit the `.env.local` file and replace placeholder values
4. Restart the Next.js development server

## Environment Files

### Backend Files

- `.env.example` - Template with all available variables
- `.env.development.example` - Development environment template
- `.env.staging.example` - Staging environment template
- `.env.production.example` - Production environment template

### Frontend Files

- `.env.example` - Template with all available variables
- `.env.development.example` - Development environment template
- `.env.staging.example` - Staging environment template
- `.env.production.example` - Production environment template

## Environment Variables Reference

### Backend Variables

#### Database Configuration
- `DATABASE_URL` - PostgreSQL connection string (required)
- `REDIS_URL` - Redis connection string (required)

#### Authentication
- `JWT_SECRET` - Secret key for JWT tokens (required, min 32 characters)
- `JWT_EXPIRATION` - JWT token expiration time (default: 24h)
- `REFRESH_TOKEN_EXPIRATION` - Refresh token expiration (default: 30d)

#### OAuth
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (optional)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret (optional)
- `GOOGLE_CALLBACK_URL` - OAuth callback URL (optional)

#### Email Service
- `SENDGRID_API_KEY` - SendGrid API key for emails (optional)
- `FROM_EMAIL` - Sender email address (optional)

#### Cloud Storage
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name (optional)
- `CLOUDINARY_API_KEY` - Cloudinary API key (optional)
- `CLOUDINARY_API_SECRET` - Cloudinary API secret (optional)

#### Application Configuration
- `NODE_ENV` - Environment mode (development|staging|production|test)
- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - Frontend application URL (required)

#### CORS Configuration
- `CORS_ORIGIN` - Allowed CORS origin (default: http://localhost:3000)

#### Rate Limiting
- `RATE_LIMIT_TTL` - Rate limit time window in seconds (default: 60)
- `RATE_LIMIT_MAX` - Maximum requests per window (default: 100)

#### WebSocket Configuration
- `WS_PORT` - WebSocket server port (default: 3001)
- `WS_PATH` - WebSocket path (default: /socket.io)

#### Logging
- `LOG_LEVEL` - Logging level (error|warn|info|debug)

#### Security
- `APPROVED_DOMAINS` - Comma-separated list of approved email domains
- `ENABLE_HTTPS` - Enable HTTPS enforcement (true|false)
- `ENABLE_HELMET` - Enable Helmet security headers (true|false)

### Frontend Variables

#### API Configuration
- `NEXT_PUBLIC_API_URL` - Backend API URL (required)
- `NEXT_PUBLIC_WS_URL` - WebSocket server URL (required)

#### Authentication
- `NEXTAUTH_URL` - NextAuth base URL (required, server-only)
- `NEXTAUTH_SECRET` - NextAuth secret key (required, server-only, min 32 chars)

#### OAuth
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth client ID (optional)

#### Application Configuration
- `NODE_ENV` - Environment mode (server-only)
- `NEXT_PUBLIC_APP_NAME` - Application name (default: ChessArena)
- `NEXT_PUBLIC_APP_URL` - Application URL (required)

#### Feature Flags
- `NEXT_PUBLIC_ENABLE_ANALYTICS` - Enable analytics (true|false)
- `NEXT_PUBLIC_ENABLE_PWA` - Enable PWA features (true|false)
- `NEXT_PUBLIC_ENABLE_DEBUG` - Enable debug mode (true|false)

#### Cloudinary
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name (optional)
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` - Upload preset (optional)

## Environment Validation

### Backend Validation

The backend uses Zod schemas to validate environment variables at startup:

```typescript
import { env } from './config';

// Access validated environment variables
console.log(env.DATABASE_URL);
console.log(env.JWT_SECRET);
```

If validation fails, the application will throw an error with detailed messages about missing or invalid variables.

### Frontend Validation

The frontend separates client and server environment variables:

```typescript
import { clientEnv, getServerEnv } from '@/lib/env.config';

// Client-side (safe in browser)
console.log(clientEnv.NEXT_PUBLIC_API_URL);

// Server-side only (API routes, getServerSideProps)
const serverEnv = getServerEnv();
console.log(serverEnv.NEXTAUTH_SECRET);
```

## Security Best Practices

1. **Never commit `.env` files** - They are in `.gitignore` by default
2. **Use strong secrets** - Generate random strings for JWT_SECRET and NEXTAUTH_SECRET
3. **Rotate secrets regularly** - Especially in production
4. **Limit access** - Only give team members access to necessary environments
5. **Use different credentials** - Never reuse production credentials in development
6. **Validate inputs** - The Zod schemas help catch configuration errors early

## Generating Secrets

Generate secure random secrets for JWT_SECRET and NEXTAUTH_SECRET:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

## Environment-Specific Configuration

### Development
- Use local database and Redis instances
- Enable debug logging
- Relaxed rate limiting
- Test email/OAuth credentials

### Staging
- Mirror production configuration
- Use staging database
- Enable logging for debugging
- Test with production-like data

### Production
- Use strong, unique secrets
- Enable HTTPS enforcement
- Strict rate limiting
- Production database with backups
- Enable security headers (Helmet)
- Minimal logging (warn/error only)

## Troubleshooting

### Validation Errors

If you see validation errors on startup:

1. Check the error message for the specific variable
2. Verify the variable is set in your `.env` file
3. Ensure the value matches the expected format (URL, email, etc.)
4. Check for typos in variable names

### Missing Variables

If a required variable is missing:

1. Copy from the appropriate `.env.example` file
2. Set the value according to your environment
3. Restart the application

### Docker Compose

When using Docker Compose, environment variables are set in `docker-compose.yml`. You can override them with a `.env` file in the root directory.

## Additional Resources

- [Zod Documentation](https://zod.dev/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
