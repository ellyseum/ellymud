# Type Definitions - LLM Context

## Overview

Specialized TypeScript type definitions. Main types are in `src/types.ts`; this directory contains domain-specific types.

## File Reference

### `effects.ts`

**Purpose**: Effect system type definitions

```typescript
export enum EffectType {
  POISON,
  STUN,
  ROOT,
  BUFF_STR,
  BUFF_DEF,
  DEBUFF_STR,
  DEBUFF_DEF,
  // etc.
}

export enum StackBehavior {
  REPLACE,
  REFRESH,
  STACK_DURATION,
  STACK_INTENSITY,
  STRONGEST_WINS,
  IGNORE,
}

export interface Effect {
  type: EffectType;
  name: string;
  duration: number;
  magnitude: number;
  source?: string;
  stackBehavior: StackBehavior;
}
```

### `index.ts`

**Purpose**: Barrel exports

```typescript
export * from './effects';
```

## Main Types File

Most types are in `src/types.ts`:

```typescript
// Key types defined there:
export interface ConnectedClient { }
export interface User { }
export interface Room { }
export interface Item { }
export interface Exit { }
export enum ClientStateType { }
export interface ClientState { }
```

## Related Context

- [`../types.ts`](../types.ts) - Main type definitions
- [`../effects/effectManager.ts`](../effects/effectManager.ts) - Uses effect types
