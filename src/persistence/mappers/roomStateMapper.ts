/**
 * RoomState field mappers for database ↔ domain conversion
 * @module persistence/mappers/roomStateMapper
 */

import { RoomStatesTable } from '../../data/schema';
import { RoomState, SerializedItemInstance } from '../../room/roomState';

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
 * Convert a database row to RoomState domain object
 */
export function dbRowToRoomState(row: RoomStatesTable): RoomState {
  return {
    roomId: row.room_id,
    itemInstances: safeJsonParse<SerializedItemInstance[]>(row.item_instances, []),
    npcTemplateIds: safeJsonParse<string[]>(row.npc_template_ids, []),
    currency: {
      gold: row.currency_gold,
      silver: row.currency_silver,
      copper: row.currency_copper,
    },
    items: safeJsonParse<string[] | undefined>(row.items, undefined),
  };
}

/**
 * Convert RoomState domain object to a database row
 */
export function roomStateToDbRow(state: RoomState): RoomStatesTable {
  return {
    room_id: state.roomId,
    item_instances: JSON.stringify(state.itemInstances),
    npc_template_ids: JSON.stringify(state.npcTemplateIds),
    currency_gold: state.currency.gold,
    currency_silver: state.currency.silver,
    currency_copper: state.currency.copper,
    items: state.items ? JSON.stringify(state.items) : null,
  };
}
