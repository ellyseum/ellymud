# Setup

First-run server setup and initial configuration utilities.

## Contents

| File            | Description                      |
| --------------- | -------------------------------- |
| `adminSetup.ts` | First-run admin account creation |

## First-Run Experience

When EllyMUD starts for the first time:

1. **Admin Check**: System checks if admin account exists
2. **Password Prompt**: If no admin, prompts for admin password
3. **Account Creation**: Creates admin user with full privileges
4. **MCP Key Setup**: Prompts for MCP API key generation
5. **Initialization**: Completes startup sequence

## Admin Setup Flow

```
Server Start
    ↓
Check data/admin.json
    ↓
No admin exists?
    ↓
Prompt: "Enter admin password:"
    ↓
Create admin user in users.json
    ↓
Save admin config
    ↓
Continue normal startup
```

## What Gets Created

- Admin user in `data/users.json` with `isAdmin: true`
- Admin configuration in `data/admin.json`
- MCP API key in `.env` file (if generated)

## Related

- [data/admin.json](../../data/admin.json) - Admin configuration storage
- [data/users.json](../../data/users.json) - User data including admin
- [src/app.ts](../app.ts) - Runs setup on server start
- [src/utils/mcpKeySetup.ts](../utils/mcpKeySetup.ts) - MCP key generation
