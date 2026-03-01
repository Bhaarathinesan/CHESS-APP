# RBAC Quick Start Guide

## Quick Reference

### Import Statements

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/decorators/roles.decorator';
import { CurrentUser } from './auth/decorators/current-user.decorator';
import { Public } from './auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';
```

### Common Patterns

#### 1. Public Route (No Authentication Required)

```typescript
@Public()
@Get('public-data')
getPublicData() {
  return { message: 'Anyone can access this' };
}
```

#### 2. Authenticated Route (Any Logged-in User)

```typescript
@Get('profile')
@UseGuards(JwtAuthGuard)
getProfile(@CurrentUser() user: any) {
  return { user };
}
```

#### 3. Super Admin Only

```typescript
@Get('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
adminOnly(@CurrentUser() user: any) {
  return { message: 'Super admin only' };
}
```

#### 4. Tournament Admin or Super Admin

```typescript
@Post('tournaments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.TOURNAMENT_ADMIN)
createTournament(@Body() dto: CreateTournamentDto) {
  return this.tournamentService.create(dto);
}
```

#### 5. Player Only

```typescript
@Get('my-games')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLAYER)
getMyGames(@CurrentUser() user: any) {
  return this.gameService.findByPlayer(user.id);
}
```

#### 6. Multiple Roles

```typescript
@Get('spectate')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLAYER, UserRole.SPECTATOR, UserRole.TOURNAMENT_ADMIN, UserRole.SUPER_ADMIN)
spectateGame(@Param('id') id: string) {
  return this.gameService.spectate(id);
}
```

#### 7. Controller-Level Protection

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminController {
  // All routes require SUPER_ADMIN role
  
  @Get('users')
  getUsers() { }
  
  @Get('reports')
  getReports() { }
}
```

## Role Definitions

| Role | Database Value | Use Case |
|------|---------------|----------|
| `UserRole.SUPER_ADMIN` | `super_admin` | Platform administration, full access |
| `UserRole.TOURNAMENT_ADMIN` | `tournament_admin` | Tournament creation and management |
| `UserRole.PLAYER` | `player` | Playing games, joining tournaments |
| `UserRole.SPECTATOR` | `spectator` | Watching games only |

## Testing

### Unit Test Example

```typescript
describe('MyController', () => {
  it('should allow super admin access', () => {
    const mockUser = { id: '1', role: UserRole.SUPER_ADMIN };
    const result = controller.adminRoute(mockUser);
    expect(result).toBeDefined();
  });
});
```

### E2E Test Example

```typescript
it('should deny access without proper role', () => {
  return request(app.getHttpServer())
    .get('/admin/dashboard')
    .set('Authorization', `Bearer ${playerToken}`)
    .expect(403);
});
```

## Common Mistakes

❌ **Wrong:** Forgetting to use both guards
```typescript
@UseGuards(RolesGuard)  // Missing JwtAuthGuard!
@Roles(UserRole.SUPER_ADMIN)
```

✅ **Correct:** Always use both guards
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
```

---

❌ **Wrong:** Wrong guard order
```typescript
@UseGuards(RolesGuard, JwtAuthGuard)  // Wrong order!
```

✅ **Correct:** JwtAuthGuard first, then RolesGuard
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
```

---

❌ **Wrong:** Using @Roles without guards
```typescript
@Roles(UserRole.SUPER_ADMIN)  // Guards not applied!
@Get('admin')
```

✅ **Correct:** Always apply guards when using @Roles
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Get('admin')
```

## Checklist

When protecting a route, ensure:

- [ ] Import all necessary decorators and guards
- [ ] Apply `@UseGuards(JwtAuthGuard, RolesGuard)` in correct order
- [ ] Specify required roles with `@Roles(...)`
- [ ] Use `@CurrentUser()` to access authenticated user
- [ ] Write tests for both authorized and unauthorized access
- [ ] Document why specific roles are required

## Need Help?

See the full documentation in `RBAC.md` for detailed explanations and advanced usage.
