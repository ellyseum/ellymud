# Shared - LLM Context

## Overview

Shared utilities and TypeScript type definitions used by both the game client and admin panel. This directory enables code reuse across the unified frontend MPA.

## File Reference

### `types.ts`

**Purpose**: Common TypeScript type definitions for frontend apps

**Key Exports**:

```typescript
// Socket.IO message types
export interface OutputMessage {
  data?: string;
}

export interface MaskMessage {
  enabled: boolean;
}

export interface SpecialKeyMessage {
  key: 'up' | 'down' | 'left' | 'right';
}

// Connection status
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';
```

**Usage Example**:

```typescript
// In game client
import { OutputMessage, ConnectionStatus } from '@shared/types';

let status: ConnectionStatus = 'connecting';

socket.on('output', (msg: OutputMessage) => {
  if (msg.data) term.write(msg.data);
});
```

## Path Alias

The `@shared/` alias is configured in `src/frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["shared/*"]
    }
  }
}
```

## Conventions

### When to Add Types Here

Add types to shared when:
- Used by BOTH game client and admin panel
- Represents server communication contracts (Socket.IO, API responses)
- Common UI state types

Keep types app-specific when:
- Only used in admin panel → put in `admin/src/types/`
- Only used in game client → define inline in `main.ts`

### No Runtime Dependencies

This directory should contain ONLY type definitions - no runtime code, no npm dependencies. Both apps import types only.

```typescript
// ✅ Correct - type only
export interface SomeType { ... }
export type SomeUnion = 'a' | 'b';

// ❌ Wrong - runtime code
export function helper() { ... }
export const DEFAULT_VALUE = 42;
```

## Common Tasks

### Add New Shared Type

1. Add to `types.ts`:
   ```typescript
   export interface NewType {
     field: string;
   }
   ```

2. Import in app:
   ```typescript
   import { NewType } from '@shared/types';
   ```

### Split Into Multiple Files

If types.ts grows large, create separate files:
```
shared/
├── types.ts          # Re-exports all
├── socket-types.ts   # Socket.IO types
└── api-types.ts      # API response types
```

Update `types.ts` to re-export:
```typescript
export * from './socket-types';
export * from './api-types';
```

## Related Context

- [`../game/main.ts`](../game/main.ts) - Uses shared types for Socket.IO
- [`../admin/src/types/`](../admin/src/types/) - Admin-specific types
- [`../tsconfig.json`](../tsconfig.json) - Path alias configuration
