/**
 * NPC field mappers for database ↔ domain conversion
 * @module persistence/mappers/npcMapper
 */

import { NpcTemplatesTable } from '../../data/schema';
import { NPCData } from '../../combat/npc';

/**
 * Safely parse JSON with a fallback value
 * @param json - The JSON string to parse
 * @param fallback - The fallback value if parsing fails
 * @returns The parsed value or the fallback
 */
function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Convert a database row to NPCData domain object
 */
export function dbRowToNPCData(row: NpcTemplatesTable): NPCData {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    health: row.health,
    maxHealth: row.max_health,
    damage: [row.damage_min, row.damage_max],
    isHostile: row.is_hostile === 1,
    isPassive: row.is_passive === 1,
    experienceValue: row.experience_value,
    attackTexts: safeJsonParse<string[]>(row.attack_texts, []),
    deathMessages: safeJsonParse<string[]>(row.death_messages, []),
    merchant: row.merchant === 1 ? true : row.merchant === 0 ? false : undefined,
    inventory: safeJsonParse(row.inventory, undefined),
    stockConfig: safeJsonParse(row.stock_config, undefined),
  };
}

/**
 * Convert NPCData domain object to a database row
 */
export function npcDataToDbRow(npc: NPCData): NpcTemplatesTable {
  return {
    id: npc.id,
    name: npc.name,
    description: npc.description,
    health: npc.health,
    max_health: npc.maxHealth,
    damage_min: npc.damage[0],
    damage_max: npc.damage[1],
    is_hostile: npc.isHostile ? 1 : 0,
    is_passive: npc.isPassive ? 1 : 0,
    experience_value: npc.experienceValue,
    attack_texts: JSON.stringify(npc.attackTexts),
    death_messages: JSON.stringify(npc.deathMessages),
    merchant: npc.merchant === undefined ? null : npc.merchant ? 1 : 0,
    inventory: npc.inventory ? JSON.stringify(npc.inventory) : null,
    stock_config: npc.stockConfig ? JSON.stringify(npc.stockConfig) : null,
  };
}
