# User Management

User data management, authentication, and session handling.

## Contents

| File | Description |
|------|-------------|
| `userManager.ts` | Singleton managing all user operations |

## Overview

The `UserManager` handles user authentication, persistence, session tracking, and stat management. User data is stored in `data/users.json` and loaded on server start.

## Related

- [`../states/login.state.ts`](../states/login.state.ts) - Uses for authentication
- [`../../data/users.json`](../../data/users.json) - User data storage
