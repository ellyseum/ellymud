# Field Mappers - LLM Context

## Overview

Centralized conversion functions between database rows (snake_case) and domain objects (camelCase). Used by Kysely repositories to transform data.

## Key Functions

### User Mapper (`userMapper.ts`)

```typescript
import { dbRowToUser, userToDbRow } from '../persistence/mappers';

// Database row → Domain object
const user: User = dbRowToUser(dbRow);

// Domain object → Database row
const row = userToDbRow(user);
```

**Field mappings:**
- `password_hash` ↔ `passwordHash`
- `max_health` ↔ `maxHealth`
- `join_date` ↔ `joinDate`
- `current_room_id` ↔ `currentRoomId`
- `inventory_items` (JSON string) ↔ `inventory.items` (array)

### Room Mapper (`roomMapper.ts`)

```typescript
import { dbRowToRoomData, roomDataToDbRow } from '../persistence/mappers';

const room: RoomData = dbRowToRoomData(dbRow);
const row = roomDataToDbRow(room);
```

**Field mappings:**
- `exits` (JSON string) ↔ `exits` (Exit[])
- `currency_gold/silver/copper` ↔ `currency.gold/silver/copper`
- `flags` (JSON string) ↔ `flags` (string[])
- `npc_template_ids` (JSON string) ↔ `npcs` (string[])

### Item Mapper (`itemMapper.ts`)

```typescript
import { 
  dbRowToGameItem, gameItemToDbRow,
  dbRowToItemInstance, itemInstanceToDbRow 
} from '../persistence/mappers';
```

**Template mappings:**
- `stats` (JSON string) ↔ `stats` (object)
- `requirements` (JSON string) ↔ `requirements` (object)

**Instance mappings:**
- `instance_id` ↔ `instanceId`
- `template_id` ↔ `templateId`
- `created_by` ↔ `createdBy`
- `properties` (JSON string) ↔ `properties` (object)
- `history` (JSON string) ↔ `history` (array)

## JSON Field Handling

Complex fields are stored as JSON strings in the database:

```typescript
// To database: serialize
const row = {
  inventory_items: JSON.stringify(user.inventory?.items ?? []),
  flags: JSON.stringify(user.flags ?? []),
};

// From database: parse
const user = {
  inventory: {
    items: JSON.parse(row.inventory_items ?? '[]'),
  },
  flags: JSON.parse(row.flags ?? '[]'),
};
```

## Date Handling

Dates are stored as ISO strings in the database:

```typescript
// To database
const row = { join_date: user.joinDate.toISOString() };

// From database
const user = { joinDate: new Date(row.join_date) };
```

## Related Context

- [`../KyselyUserRepository.ts`](../KyselyUserRepository.ts) - Uses user mapper
- [`../KyselyRoomRepository.ts`](../KyselyRoomRepository.ts) - Uses room mapper
- [`../KyselyItemRepository.ts`](../KyselyItemRepository.ts) - Uses item mapper
- [`../../data/schema.ts`](../../data/schema.ts) - Database table definitions
