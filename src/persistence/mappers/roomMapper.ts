/**
 * Room field mappers for database <-> domain conversion
 * Centralizes snake_case (DB) <-> camelCase (TypeScript) mapping
 * @module persistence/mappers/roomMapper
 */

import { RoomData } from '../../room/roomData';
import { RoomsTable } from '../../data/schema';
import { Exit } from '../../types';

/**
 * Helper to safely parse JSON or return fallback
 */
function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (value == null) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * Convert a database row to a RoomData domain object
 */
export function dbRowToRoomData(row: RoomsTable): RoomData {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    exits: safeJsonParse<Exit[]>(row.exits, []),
    currency: {
      gold: row.currency_gold,
      silver: row.currency_silver,
      copper: row.currency_copper,
    },
    flags: safeJsonParse<string[] | undefined>(row.flags, undefined),
    npcs: safeJsonParse<string[] | undefined>(row.npc_template_ids, undefined),
    items: safeJsonParse<string[] | undefined>(row.item_instances, undefined),
  };
}

/**
 * Convert a RoomData domain object to a database row
 */
export function roomDataToDbRow(room: RoomData): RoomsTable {
  // Extract NPC template IDs
  let npcTemplateIds: string[] = [];
  if (room.npcs) {
    if (Array.isArray(room.npcs)) {
      npcTemplateIds = room.npcs;
    } else if (room.npcs instanceof Map) {
      room.npcs.forEach((npc) => {
        if (npc.templateId) {
          npcTemplateIds.push(npc.templateId);
        }
      });
    }
  }

  // Extract item instance IDs - items can be string IDs or Item objects with name
  let itemInstanceIds: string[] = [];
  if (room.items) {
    itemInstanceIds = room.items.filter((item): item is string => typeof item === 'string');
  }

  return {
    id: room.id,
    name: room.name ?? room.shortDescription ?? '',
    description: room.description ?? room.longDescription ?? '',
    exits: JSON.stringify(room.exits),
    currency_gold: room.currency?.gold ?? 0,
    currency_silver: room.currency?.silver ?? 0,
    currency_copper: room.currency?.copper ?? 0,
    flags: room.flags ? JSON.stringify(room.flags) : null,
    npc_template_ids: npcTemplateIds.length > 0 ? JSON.stringify(npcTemplateIds) : null,
    item_instances: itemInstanceIds.length > 0 ? JSON.stringify(itemInstanceIds) : null,
  };
}
