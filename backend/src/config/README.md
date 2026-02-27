# Configuration Module

This module provides type-safe environment variable validation and configuration management for the ChessArena backend.

## Overview

The configuration module uses [Zod](https://zod.dev/) to validate environment variables at application startup, ensuring all required configuration is present and correctly formatted before the application runs.

## Files

- `env.config.ts` - Environment variable validation schema and validation logic
- `configuration.ts` - Structured configuration factory for NestJS
- `env.config.spec.ts` - Unit tests for environment validation
- `index.ts` - Module exports

## Usage

### Basic Usage

```typescript
import { env, getEnv } from './config';

// Access validated environment variables
console.log(env.DATABASE_URL);
console.log(env.JWT_SECRET);

// Or get the full config object
const config = getEnv();
console.log(config.PORT);
```

### NestJS Integration

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

Then access configuration in services:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyService {
  constructor(private configService: ConfigService) {}

  someMethod() {
    const dbUrl = this.configService.get('database.url');
    const jwtSecret = this.configService.get('auth.jwt.secret');
  }
}
```

## Environment Variables

See [ENV_SETUP.md](../../../../ENV_SETUP.md) for complete documentation of all environment variables.

### Required Variables

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret (min 32 characters)
- `FRONTEND_URL` - Frontend application URL

### Optional Variables

All other variables have sensible defaults for development. See `.env.example` for the complete list.

## Validation

The module validates:

- **Type correctness**: URLs must be valid URLs, emails must be valid emails
- **Required fields**: Missing required variables cause startup failure
- **Value constraints**: JWT_SECRET must be at least 32 characters
- **Enum values**: NODE_ENV must be one of: development, staging, production, test
- **Transformations**: String values are transformed to appropriate types (numbers, booleans, arrays)

## Error Handling

If validation fails, the application will throw a detailed error message:

```
Environment variable validation failed:
DATABASE_URL: Invalid input: expected string, received undefined
JWT_SECRET: String must contain at least 32 character(s)
```

This ensures configuration errors are caught immediately at startup rather than causing runtime failures.

## Testing

Run the configuration tests:

```bash
npm test -- env.config.spec.ts
```

The test suite covers:
- Valid configuration validation
- Missing required variables
- Invalid formats (URLs, emails)
- Type transformations (strings to numbers, booleans, arrays)
- Default value application
- Optional variable handling

## Adding New Variables

To add a new environment variable:

1. Add it to the Zod schema in `env.config.ts`:
   ```typescript
   MY_NEW_VAR: z.string().optional(),
   ```

2. Add it to `.env.example` files with documentation

3. Update `configuration.ts` to include it in the structured config

4. Add tests in `env.config.spec.ts`

5. Document it in `ENV_SETUP.md`

## Best Practices

1. **Always validate** - Never access `process.env` directly, use the validated `env` object
2. **Fail fast** - Let validation errors stop the application at startup
3. **Use types** - TypeScript will catch typos and incorrect usage
4. **Document** - Keep `.env.example` files up to date
5. **Test** - Add tests for new variables and validation rules
