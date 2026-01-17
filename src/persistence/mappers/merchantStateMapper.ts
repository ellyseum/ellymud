/**
 * Mapper for MerchantInventoryState ↔ Database conversion
 * @module persistence/mappers/merchantStateMapper
 */

import { MerchantStatesTable } from '../../data/schema';
import { MerchantInventoryState } from '../../combat/merchant';

/**
 * Helper to safely parse JSON with a default value
 */
function safeJsonParse<T>(json: string | null | undefined, defaultValue: T): T {
  if (!json) return defaultValue;
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Convert database row to domain MerchantInventoryState
 */
export function dbRowToMerchantState(row: MerchantStatesTable): MerchantInventoryState {
  return {
    npcTemplateId: row.npc_template_id,
    npcInstanceId: row.npc_instance_id,
    actualInventory: safeJsonParse(row.actual_inventory, []),
    stockConfig: safeJsonParse(row.stock_config, []),
  };
}

/**
 * Convert domain MerchantInventoryState to database row
 */
export function merchantStateToDbRow(state: MerchantInventoryState): MerchantStatesTable {
  return {
    npc_template_id: state.npcTemplateId,
    npc_instance_id: state.npcInstanceId,
    actual_inventory: JSON.stringify(state.actualInventory),
    stock_config: JSON.stringify(state.stockConfig),
  };
}
