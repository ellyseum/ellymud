# Admin Interface

Web-based admin dashboard for EllyMUD server management and monitoring.

## Contents

| File | Description |
|------|-------------|
| `index.html` | Admin portal entry page |
| `login.html` | Admin authentication form |
| `dashboard.html` | Main dashboard with session monitoring |
| `dashboard.js` | Dashboard logic and API interactions |
| `styles.css` | Admin interface styling |
| `config-test.html` | Configuration testing utility |

## Features

The admin dashboard provides:

- **User Management**: View, edit, and manage user accounts
- **Session Monitoring**: See who's online and their current activity
- **Server Statistics**: Monitor server health and performance
- **Configuration**: Adjust game settings in real-time
- **Log Access**: View system and player logs
- **Pipeline Metrics**: View agent pipeline execution statistics and history

## Authentication

Admin access requires:

1. A user account with admin privileges
2. Authentication via the login page
3. Valid session maintained via cookies/tokens

## Accessing the Dashboard

1. Start the EllyMUD server
2. Navigate to `http://localhost:8080/admin/`
3. Log in with admin credentials
4. Dashboard loads with live server data

## API Integration

The dashboard communicates with backend endpoints defined in `src/admin/adminApi.ts`. All API calls require authentication.

Key endpoints used:
- `GET /api/admin/users` - List all users
- `GET /api/admin/sessions` - Active sessions
- `GET /api/admin/stats` - Server statistics
- `POST /api/admin/config` - Update configuration
- `GET /api/admin/pipeline-metrics` - Pipeline execution metrics

## Related

- [src/admin/](../../src/admin/) - Backend API implementation
- [src/admin/adminAuth.ts](../../src/admin/adminAuth.ts) - Authentication middleware
- [public/](../) - Main web client
