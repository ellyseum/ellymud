/**
 * Area field mappers for database <-> domain conversion
 * @module persistence/mappers/areaMapper
 */

import { Area, AreaCombatConfig, AreaSpawnConfig } from '../../area/area';
import { AreasTable } from '../../data/schema';

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (value == null) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function dbRowToArea(row: AreasTable): Area {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    levelRange: safeJsonParse(row.level_range, { min: 1, max: 10 }),
    flags: safeJsonParse(row.flags, []),
    combatConfig: safeJsonParse<AreaCombatConfig | undefined>(row.combat_config, undefined),
    spawnConfig: safeJsonParse<AreaSpawnConfig[]>(row.spawn_config, []),
    defaultRoomFlags: safeJsonParse<string[] | undefined>(row.default_room_flags, undefined),
    created: row.created,
    modified: row.modified,
  };
}

export function areaToDbRow(area: Area): AreasTable {
  return {
    id: area.id,
    name: area.name,
    description: area.description,
    level_range: JSON.stringify(area.levelRange),
    flags: area.flags.length > 0 ? JSON.stringify(area.flags) : null,
    combat_config: area.combatConfig ? JSON.stringify(area.combatConfig) : null,
    spawn_config: JSON.stringify(area.spawnConfig),
    default_room_flags: area.defaultRoomFlags ? JSON.stringify(area.defaultRoomFlags) : null,
    created: area.created,
    modified: area.modified,
  };
}
