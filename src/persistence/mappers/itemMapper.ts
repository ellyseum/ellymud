/**
 * Item field mappers for database <-> domain conversion
 * Centralizes snake_case (DB) <-> camelCase (TypeScript) mapping
 * @module persistence/mappers/itemMapper
 */

import { GameItem, ItemInstance, EquipmentSlot } from '../../types';
import { ItemTemplatesTable, ItemInstancesTable } from '../../data/schema';

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
 * Convert a database row to a GameItem domain object
 */
export function dbRowToGameItem(row: ItemTemplatesTable): GameItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type as GameItem['type'],
    slot: row.slot as EquipmentSlot | undefined,
    value: row.value,
    weight: row.weight ?? undefined,
    globalLimit: row.global_limit ?? undefined,
    stats: safeJsonParse(row.stats, undefined),
    requirements: safeJsonParse(row.requirements, undefined),
  };
}

/**
 * Convert a GameItem domain object to a database row
 */
export function gameItemToDbRow(item: GameItem): ItemTemplatesTable {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    type: item.type,
    slot: item.slot || null,
    value: item.value ?? 0,
    weight: item.weight ?? null,
    global_limit: item.globalLimit ?? null,
    stats: item.stats ? JSON.stringify(item.stats) : null,
    requirements: item.requirements ? JSON.stringify(item.requirements) : null,
  };
}

/**
 * Convert a database row to an ItemInstance domain object
 */
export function dbRowToItemInstance(row: ItemInstancesTable): ItemInstance {
  const rawHistory = safeJsonParse<Array<{ timestamp: string; event: string; details?: string }>>(
    row.history,
    []
  );
  const history = rawHistory.map((entry) => ({
    ...entry,
    timestamp: new Date(entry.timestamp),
  }));

  return {
    instanceId: row.instance_id,
    templateId: row.template_id,
    created: new Date(row.created),
    createdBy: row.created_by,
    properties: safeJsonParse(row.properties, undefined),
    history: history.length > 0 ? history : undefined,
  };
}

/**
 * Convert an ItemInstance domain object to a database row
 */
export function itemInstanceToDbRow(instance: ItemInstance): ItemInstancesTable {
  return {
    instance_id: instance.instanceId,
    template_id: instance.templateId,
    created: instance.created.toISOString(),
    created_by: instance.createdBy,
    properties: instance.properties ? JSON.stringify(instance.properties) : null,
    history: instance.history
      ? JSON.stringify(
          instance.history.map((h) => ({
            ...h,
            timestamp: h.timestamp.toISOString(),
          }))
        )
      : null,
  };
}
