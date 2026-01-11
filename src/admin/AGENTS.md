# Admin API - LLM Context

## Overview

Backend API for the web admin interface. Provides endpoints for user management, session monitoring, game configuration, and world building (areas/rooms). Protected by admin authentication.

## File Reference

### `adminApi.ts`

**Purpose**: Express routes for admin operations

```typescript
export function setupAdminRoutes(app: Express, userManager: UserManager): void;
```

**Endpoints**:

**Core Admin:**
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/users` - List all users
- `GET /api/admin/sessions` - Active sessions
- `POST /api/admin/kick/:username` - Kick user
- `POST /api/admin/ban/:username` - Ban user
- `GET /api/admin/config` - Game configuration

**Area Management (World Builder):**
- `GET /api/admin/areas` - List all areas
- `GET /api/admin/areas/:id` - Get area with associated rooms
- `POST /api/admin/areas` - Create new area
- `PUT /api/admin/areas/:id` - Update area
- `DELETE /api/admin/areas/:id` - Delete area

**Room Management (World Builder):**
- `GET /api/admin/rooms` - List all rooms
- `GET /api/admin/rooms/:id` - Get room by ID
- `POST /api/admin/rooms` - Create new room
- `PUT /api/admin/rooms/:id` - Update room
- `DELETE /api/admin/rooms/:id` - Delete room
- `POST /api/admin/rooms/link` - Link two rooms with exits
- `POST /api/admin/rooms/unlink` - Remove exit from room

### `adminAuth.ts`

**Purpose**: Authentication middleware

```typescript
export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void;
```

**Auth Flow**:

1. Check for Authorization header (Bearer token)
2. Validate token against admin credentials
3. Allow or reject request

## Related Context

- [`../../public/admin/`](../../public/admin/) - Frontend that calls these APIs
- [`../user/userManager.ts`](../user/userManager.ts) - User data access
- [`../area/areaManager.ts`](../area/areaManager.ts) - Area CRUD operations
- [`../room/roomManager.ts`](../room/roomManager.ts) - Room CRUD operations
