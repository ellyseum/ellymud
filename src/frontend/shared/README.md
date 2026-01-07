# Shared

Shared TypeScript utilities and types for frontend applications.

## Contents

| File       | Description                        |
| ---------- | ---------------------------------- |
| `types.ts` | Common type definitions            |

## Overview

This directory contains code shared between the game client and admin panel. Currently includes common TypeScript type definitions that both applications use.

## Import Alias

Use the `@shared/` path alias to import from this directory:

```typescript
import { ConnectionStatus } from '@shared/types';
```

## Related

- [`../game/`](../game/) - Game client (imports shared types)
- [`../admin/`](../admin/) - Admin panel (imports shared types)
