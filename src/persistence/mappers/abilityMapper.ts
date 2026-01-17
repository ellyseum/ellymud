/**
 * Mapper for AbilityTemplate ↔ Database conversion
 * @module persistence/mappers/abilityMapper
 */

import { AbilitiesTable } from '../../data/schema';
import { AbilityTemplate } from '../../abilities/types';

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
 * Convert database row to domain AbilityTemplate
 */
export function dbRowToAbility(row: AbilitiesTable): AbilityTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type as AbilityTemplate['type'],
    mpCost: row.mp_cost,
    cooldownType: row.cooldown_type as AbilityTemplate['cooldownType'],
    cooldownValue: row.cooldown_value,
    targetType: row.target_type as AbilityTemplate['targetType'],
    effects: safeJsonParse(row.effects, []),
    requirements: row.requirements ? safeJsonParse(row.requirements, undefined) : undefined,
    procChance: row.proc_chance ?? undefined,
    consumesItem: row.consumes_item ? Boolean(row.consumes_item) : undefined,
  };
}

/**
 * Convert domain AbilityTemplate to database row
 */
export function abilityToDbRow(ability: AbilityTemplate): AbilitiesTable {
  return {
    id: ability.id,
    name: ability.name,
    description: ability.description,
    type: ability.type,
    mp_cost: ability.mpCost,
    cooldown_type: ability.cooldownType,
    cooldown_value: ability.cooldownValue,
    target_type: ability.targetType,
    effects: JSON.stringify(ability.effects),
    requirements: ability.requirements ? JSON.stringify(ability.requirements) : null,
    proc_chance: ability.procChance ?? null,
    consumes_item: ability.consumesItem ? 1 : null,
  };
}
