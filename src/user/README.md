# User Management

User data management, authentication, session handling, and character persistence.

## Contents

| File             | Description                            |
| ---------------- | -------------------------------------- |
| `userManager.ts` | Singleton managing all user operations |

## UserManager Responsibilities

The `UserManager` singleton handles:

- **Authentication**: Login validation, password hashing
- **Registration**: New user creation with initial stats
- **Persistence**: Load/save user data to JSON
- **Session Tracking**: Track which users are online
- **Stat Management**: XP, leveling, health, mana
- **Inventory**: Item management for users

## User Data Structure

Each user record contains:

- `username` - Unique identifier
- `passwordHash` - Bcrypt hashed password
- `stats` - HP, MP, strength, dexterity, etc.
- `level` - Character level
- `experience` - XP towards next level
- `inventory` - Array of item instance IDs
- `equipment` - Currently equipped items by slot
- `currentRoom` - Room ID where player is located
- `isAdmin` - Admin privilege flag
- `createdAt` / `lastLogin` - Timestamps

## Key Operations

- `authenticate(username, password)` - Verify credentials
- `createUser(username, password)` - Register new user
- `getUser(username)` - Retrieve user data
- `updateUser(username, updates)` - Modify user data
- `saveUsers()` - Persist all user data to disk
- `isOnline(username)` - Check if user is connected

## Password Security

Passwords are:

- Hashed using bcrypt with salt rounds
- Never stored in plain text
- Validated server-side only

## Related

- [src/states/login.state.ts](../states/login.state.ts) - Uses for authentication
- [data/users.json](../../data/users.json) - User data storage
- [src/client/clientManager.ts](../client/clientManager.ts) - Tracks online users
