# Admin Interface - LLM Context

## Overview

Web-based admin dashboard. Allows administrators to manage users, view sessions, kick/ban players, and configure game settings.

## File Reference

### `login.html` + Login Flow

```javascript
// Login calls /api/admin/login
// Returns JWT token
// Token stored in localStorage
// Used for subsequent API calls
```

### `dashboard.html` + `dashboard.js`

**Features**:
- Online user list
- User management (kick, ban)
- Session monitoring
- Game configuration
- Bug report viewing

**API Calls**:
```javascript
// Endpoints used
GET  /api/admin/users        // List users
GET  /api/admin/sessions     // Active sessions
POST /api/admin/kick/:user   // Kick user
POST /api/admin/ban/:user    // Ban user
GET  /api/admin/config       // Game config
POST /api/admin/config       // Update config
GET  /api/admin/bugs         // Bug reports
```

### `mock-api/`

Mock API responses for frontend development without running server.

## Conventions

### Authentication

```javascript
// All API calls include token
fetch('/api/admin/users', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
  }
});
```

### Error Handling

```javascript
// Check response status
if (!response.ok) {
  if (response.status === 401) {
    // Redirect to login
    window.location = 'login.html';
  }
}
```

## Related Context

- [`../../src/admin/adminApi.ts`](../../src/admin/adminApi.ts) - API endpoints
- [`../../src/admin/adminAuth.ts`](../../src/admin/adminAuth.ts) - Authentication
