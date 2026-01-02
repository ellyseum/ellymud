# Types - LLM Context

## Type Definitions (index.ts)

All shared TypeScript types for the admin dashboard.

### ServerStats

```typescript
interface ServerStats {
  onlineUsers: number;
  totalUsers: number;
  totalRooms: number;
  totalNpcs: number;
  totalItems: number;
  uptime: number;
  version: string;
}
```

### User

```typescript
interface User {
  username: string;
  level: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  gold: number;
  experience: number;
  currentRoom: string;
  isAdmin: boolean;
  createdAt: string;
  lastLogin: string;
}
```

### Room

```typescript
interface Room {
  id: string;
  name: string;
  description: string;
  exits: Record<string, string>;
  items: string[];
  npcs: string[];
}
```

### MudConfig

```typescript
interface MudConfig {
  serverName: string;
  maxPlayers: number;
  motd: string;
  pvpEnabled: boolean;
  experienceMultiplier: number;
  [key: string]: unknown; // Additional dynamic settings
}
```

### GameTimerConfig

```typescript
interface GameTimerConfig {
  tickInterval: number;
  combatTickRate: number;
  regenTickRate: number;
  enabled: boolean;
}
```

### ApiResponse

```typescript
// Generic API response wrapper
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
```

## Usage

Import types using the `type` keyword for type-only imports:

```typescript
import type { ServerStats, User, Room } from '../types';
```
