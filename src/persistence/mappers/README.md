# Field Mappers

Centralized conversion functions between database rows (snake_case) and domain objects (camelCase).

## Contents

| File | Description |
|------|-------------|
| `index.ts` | Barrel export for all mappers |
| `userMapper.ts` | User ↔ database row conversion |
| `roomMapper.ts` | RoomData ↔ database row conversion |
| `roomStateMapper.ts` | RoomState ↔ database row conversion |
| `itemMapper.ts` | GameItem/ItemInstance ↔ database row conversion |
| `npcMapper.ts` | NPCData ↔ database row conversion |
| `areaMapper.ts` | Area ↔ database row conversion |
| `adminMapper.ts` | AdminUser ↔ database row conversion |
| `bugReportMapper.ts` | BugReport ↔ database row conversion |
| `merchantStateMapper.ts` | MerchantInventoryState ↔ database row conversion |
| `abilityMapper.ts` | AbilityTemplate ↔ database row conversion |
| `snakeScoreMapper.ts` | SnakeScoreEntry ↔ database row conversion |

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
- [../KyselyAdminRepository.ts](../KyselyAdminRepository.ts) - Uses admin mapper
- [../KyselyBugReportRepository.ts](../KyselyBugReportRepository.ts) - Uses bug report mapper
