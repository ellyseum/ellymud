# Type Definitions

TypeScript type definitions and interfaces for specialized modules.

## Contents

| File         | Description                         |
| ------------ | ----------------------------------- |
| `effects.ts` | Effect-related types and interfaces |
| `index.ts`   | Barrel exports for all types        |

## Type Organization

EllyMUD organizes types in two places:

1. **`src/types.ts`** - Core types used everywhere:
   - `Client` - Connected client object
   - `User` - User data structure
   - `ClientStateType` - State enum
   - Common interfaces

2. **`src/types/`** (this directory) - Specialized types:
   - Module-specific interfaces
   - Complex type definitions
   - Types that would clutter main file

## When to Add Types Here

Add types to this directory when:

- They're specific to one module
- They're complex (many properties)
- They would clutter `src/types.ts`

Keep in `src/types.ts`:

- Core types used everywhere
- Simple, widely-used interfaces
- Enums

## Related

- [src/types.ts](../types.ts) - Main type definitions
- [src/combat/combatEntity.interface.ts](../combat/combatEntity.interface.ts) - Combat-specific types
- [src/room/interfaces.ts](../room/interfaces.ts) - Room-specific types
