# Role-Based Access Control (RBAC) Guide

## Overview

The ChessArena platform implements role-based access control to protect routes based on user roles. This system supports four user roles as defined in Requirement 1.11:

- `SUPER_ADMIN` - Platform owner with full control over all system features
- `TOURNAMENT_ADMIN` - User who can create and manage tournaments
- `PLAYER` - Registered student or faculty member who can play games
- `SPECTATOR` - Guest or logged-in user who watches games without playing

## Components

### 1. Roles Decorator (`@Roles()`)

The `@Roles()` decorator is used to specify which roles are allowed to access a route.

**Location:** `backend/src/auth/decorators/roles.decorator.ts`

**Usage:**
```typescript
import { Roles } from './auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Roles(UserRole.SUPER_ADMIN)
@Get('admin-only')
adminOnlyRoute() {
  // Only super admins can access this
}

@Roles(UserRole.SUPER_ADMIN, UserRole.TOURNAMENT_ADMIN)
@Get('tournament-management')
tournamentManagement() {
  // Super admins and tournament admins can access this
}
```

### 2. Roles Guard (`RolesGuard`)

The `RolesGuard` enforces role-based access control by checking if the authenticated user has one of the required roles.

**Location:** `backend/src/auth/guards/roles.guard.ts`

**How it works:**
1. Extracts required roles from the `@Roles()` decorator metadata
2. If no roles are specified, allows access (open to all authenticated users)
3. If roles are specified, checks if the user's role matches any of the required roles
4. Returns `true` if user has permission, `false` otherwise

### 3. UserRole Enum

The `UserRole` enum is defined in the Prisma schema and automatically generated.

**Location:** `backend/prisma/schema.prisma`

```prisma
enum UserRole {
  SUPER_ADMIN      @map("super_admin")
  TOURNAMENT_ADMIN @map("tournament_admin")
  PLAYER           @map("player")
  SPECTATOR        @map("spectator")

  @@map("user_role")
}
```

## Usage Examples

### Basic Protected Route

Protect a route so only authenticated users with specific roles can access it:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin')
export class AdminController {
  // Only super admins can access
  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  getDashboard() {
    return { message: 'Admin dashboard' };
  }
}
```

### Multiple Roles

Allow multiple roles to access a route:

```typescript
@Controller('tournaments')
export class TournamentController {
  // Both super admins and tournament admins can create tournaments
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TOURNAMENT_ADMIN)
  createTournament(@Body() dto: CreateTournamentDto) {
    return this.tournamentService.create(dto);
  }
}
```

### Controller-Level Guards

Apply guards to all routes in a controller:

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminController {
  // All routes in this controller require SUPER_ADMIN role
  
  @Get('users')
  getUsers() {
    return this.adminService.getUsers();
  }

  @Get('reports')
  getReports() {
    return this.adminService.getReports();
  }
}
```

### Accessing Current User

Use the `@CurrentUser()` decorator to access the authenticated user:

```typescript
import { CurrentUser } from './auth/decorators/current-user.decorator';

@Get('profile')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLAYER)
getProfile(@CurrentUser() user: any) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}
```

### Public Routes

Use the `@Public()` decorator to make routes accessible without authentication:

```typescript
import { Public } from './auth/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }
}
```

## Global Guards

To apply authentication globally, configure guards in `main.ts`:

```typescript
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Apply JWT guard globally
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));
  
  await app.listen(3000);
}
bootstrap();
```

With global guards, all routes require authentication by default unless marked with `@Public()`.

## Testing

### Unit Tests

Test the RolesGuard with different scenarios:

```typescript
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow access when user has required role', () => {
    // Test implementation
  });

  it('should deny access when user lacks required role', () => {
    // Test implementation
  });
});
```

### Integration Tests

Test protected endpoints:

```typescript
describe('AdminController (e2e)', () => {
  it('should deny access to admin route without token', () => {
    return request(app.getHttpServer())
      .get('/admin/dashboard')
      .expect(401);
  });

  it('should deny access to admin route with player role', () => {
    const playerToken = getPlayerToken();
    return request(app.getHttpServer())
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(403);
  });

  it('should allow access to admin route with super admin role', () => {
    const adminToken = getSuperAdminToken();
    return request(app.getHttpServer())
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
```

## Best Practices

1. **Always use both guards together**: `@UseGuards(JwtAuthGuard, RolesGuard)`
   - JwtAuthGuard ensures the user is authenticated
   - RolesGuard ensures the user has the required role

2. **Order matters**: Apply JwtAuthGuard before RolesGuard
   - The user must be authenticated before checking roles

3. **Be specific with roles**: Only grant the minimum required role
   - Don't use SUPER_ADMIN for everything
   - Use TOURNAMENT_ADMIN for tournament management
   - Use PLAYER for player-specific features

4. **Document role requirements**: Add comments explaining why a role is required

5. **Test role boundaries**: Ensure users can't access routes they shouldn't

6. **Use controller-level guards**: When all routes need the same protection

7. **Handle unauthorized access gracefully**: Return appropriate error messages

## Error Responses

When a user lacks the required role, the guard returns `false`, which NestJS converts to a 403 Forbidden response:

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

When a user is not authenticated, the JwtAuthGuard returns a 401 Unauthorized response:

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

## Role Hierarchy

The roles have an implicit hierarchy:

1. **SUPER_ADMIN** - Highest privilege, can access everything
2. **TOURNAMENT_ADMIN** - Can manage tournaments
3. **PLAYER** - Can play games and participate in tournaments
4. **SPECTATOR** - Lowest privilege, can only watch games

When implementing features, consider this hierarchy and grant appropriate access.

## Future Enhancements

Potential improvements to the RBAC system:

1. **Permission-based access**: Instead of just roles, implement granular permissions
2. **Dynamic role assignment**: Allow admins to change user roles
3. **Role inheritance**: Automatically grant lower-level permissions to higher roles
4. **Audit logging**: Track who accessed what and when
5. **Rate limiting per role**: Different rate limits for different roles
