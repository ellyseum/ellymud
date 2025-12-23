# Admin API

Backend API for the web-based admin dashboard, providing user management and server administration capabilities.

## Contents

| File           | Description                                |
| -------------- | ------------------------------------------ |
| `adminApi.ts`  | Express routes for all admin endpoints     |
| `adminAuth.ts` | Authentication middleware for admin access |

## Features

The Admin API provides:

- **User Management**: Create, edit, delete, and view user accounts
- **Session Monitoring**: Track active connections and their states
- **Server Control**: Start/stop services, view health status
- **Configuration**: Update game settings via API
- **Log Access**: Query and search system logs

## Authentication

All admin endpoints require authentication:

1. Admin user must have `isAdmin: true` in their user record
2. Requests must include valid authentication token
3. `adminAuth.ts` middleware validates all requests

## API Endpoints

| Method | Endpoint               | Description       |
| ------ | ---------------------- | ----------------- |
| GET    | `/api/admin/users`     | List all users    |
| GET    | `/api/admin/users/:id` | Get specific user |
| PUT    | `/api/admin/users/:id` | Update user       |
| DELETE | `/api/admin/users/:id` | Delete user       |
| GET    | `/api/admin/sessions`  | Active sessions   |
| GET    | `/api/admin/stats`     | Server statistics |
| GET    | `/api/admin/config`    | Current config    |
| POST   | `/api/admin/config`    | Update config     |

## Related

- [public/admin/](../../public/admin/) - Admin dashboard frontend
- [src/server/apiServer.ts](../server/apiServer.ts) - Express server setup
- [src/user/userManager.ts](../user/userManager.ts) - User data access
