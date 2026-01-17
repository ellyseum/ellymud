# Field Mappers

Centralized conversion functions between database rows (snake_case) and domain objects (camelCase).

## Contents

| File | Description |
|------|-------------|
| `index.ts` | Barrel export for all mappers |
| `userMapper.ts` | User ↔ database row conversion |
| `roomMapper.ts` | RoomData ↔ database row conversion |
| `itemMapper.ts` | GameItem/ItemInstance ↔ database row conversion |
| `npcMapper.ts` | NPCData ↔ database row conversion |
| `areaMapper.ts` | Area ↔ database row conversion |

## Purpose

These mappers ensure consistent field naming conversion between:
- **Database layer**: Uses `snake_case` column names (e.g., `password_hash`, `current_room_id`)
- **Domain layer**: Uses `camelCase` properties (e.g., `passwordHash`, `currentRoomId`)

## Related

- [AGENTS.md](AGENTS.md) - Technical details for LLMs
- [../KyselyUserRepository.ts](../KyselyUserRepository.ts) - Uses user mapper
- [../KyselyRoomRepository.ts](../KyselyRoomRepository.ts) - Uses room mapper
- [../KyselyItemRepository.ts](../KyselyItemRepository.ts) - Uses item mapper
- [../KyselyNpcRepository.ts](../KyselyNpcRepository.ts) - Uses NPC mapper
- [../KyselyAreaRepository.ts](../KyselyAreaRepository.ts) - Uses area mapper
