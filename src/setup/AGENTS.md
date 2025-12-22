# Setup - LLM Context

## Overview

First-run setup utilities for initializing the server. Creates admin accounts and initial configuration.

## File Reference

### `adminSetup.ts`

**Purpose**: Create initial admin account

```typescript
export async function setupAdmin(): Promise<void>
export function isAdminSetupRequired(): boolean
```

**Setup Flow**:
1. Check if admin exists in `data/admin.json`
2. If not, prompt for admin credentials
3. Create admin user in `data/users.json`
4. Save admin config to `data/admin.json`

## Related Context

- [`../../data/admin.json`](../../data/admin.json) - Admin configuration
- [`../user/userManager.ts`](../user/userManager.ts) - Creates admin user
