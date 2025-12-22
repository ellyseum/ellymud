# Admin API - LLM Context

## Overview

Backend API for the web admin interface. Provides endpoints for user management, session monitoring, and game configuration. Protected by admin authentication.

## File Reference

### `adminApi.ts`

**Purpose**: Express routes for admin operations

```typescript
export function setupAdminRoutes(app: Express, userManager: UserManager): void
```

**Endpoints**:
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/users` - List all users
- `GET /api/admin/sessions` - Active sessions
- `POST /api/admin/kick/:username` - Kick user
- `POST /api/admin/ban/:username` - Ban user
- `GET /api/admin/rooms` - List rooms
- `GET /api/admin/config` - Game configuration

### `adminAuth.ts`

**Purpose**: Authentication middleware

```typescript
export function adminAuthMiddleware(
  req: Request, 
  res: Response, 
  next: NextFunction
): void
```

**Auth Flow**:
1. Check for Authorization header (Bearer token)
2. Validate token against admin credentials
3. Allow or reject request

## Related Context

- [`../../public/admin/`](../../public/admin/) - Frontend that calls these APIs
- [`../user/userManager.ts`](../user/userManager.ts) - User data access
