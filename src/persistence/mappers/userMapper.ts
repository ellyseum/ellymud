/**
 * User field mappers for database <-> domain conversion
 * Centralizes snake_case (DB) <-> camelCase (TypeScript) mapping
 * @module persistence/mappers/userMapper
 */

import { User } from '../../types';
import { UsersTable } from '../../data/schema';

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
 * Read a stat from the JSON `stats` column, falling back to the per-stat
 * legacy column. The JSON column is the source of truth post-C4; the
 * fallback exists for rows written before the bridge populated the JSON
 * (i.e., before the v1 schema migration ran on this DB).
 */
function readStat(jsonStats: Record<string, number> | null, legacy: number, id: string): number {
  const v = jsonStats?.[id];
  return typeof v === 'number' && Number.isFinite(v) ? v : legacy;
}

/**
 * Convert a database row to a User domain object
 */
export function dbRowToUser(row: UsersTable): User {
  const jsonStats = safeJsonParse<Record<string, number> | null>(row.stats, null);
  const jsonAllocated = safeJsonParse<Record<string, number> | null>(row.allocated_stats, null);
  // Build the canonical stats record. Source of truth: the JSON column when
  // populated; otherwise reconstructed from the legacy per-stat columns. This
  // is what consumers should reach via getStat().
  const statsRecord: Record<string, number> = jsonStats ?? {
    strength: row.strength,
    dexterity: row.dexterity,
    agility: row.agility,
    constitution: row.constitution,
    wisdom: row.wisdom,
    intelligence: row.intelligence,
    charisma: row.charisma,
  };
  return {
    username: row.username,
    passwordHash: row.password_hash,
    salt: row.salt,
    health: row.health,
    maxHealth: row.max_health,
    mana: row.mana,
    maxMana: row.max_mana,
    experience: row.experience,
    level: row.level,
    strength: readStat(jsonStats, row.strength, 'strength'),
    dexterity: readStat(jsonStats, row.dexterity, 'dexterity'),
    agility: readStat(jsonStats, row.agility, 'agility'),
    constitution: readStat(jsonStats, row.constitution, 'constitution'),
    wisdom: readStat(jsonStats, row.wisdom, 'wisdom'),
    intelligence: readStat(jsonStats, row.intelligence, 'intelligence'),
    charisma: readStat(jsonStats, row.charisma, 'charisma'),
    stats: statsRecord,
    // Pass the JSON record through directly so ruleset-declared stats
    // beyond the seven fantasy attributes survive the round-trip.
    allocatedStats: jsonAllocated ?? undefined,
    equipment: safeJsonParse(row.equipment, undefined),
    joinDate: new Date(row.join_date),
    lastLogin: new Date(row.last_login),
    totalPlayTime: row.total_play_time,
    currentRoomId: row.current_room_id,
    inventory: {
      items: safeJsonParse(row.inventory_items, []),
      currency: {
        gold: row.inventory_gold,
        silver: row.inventory_silver,
        copper: row.inventory_copper,
      },
    },
    bank: {
      gold: row.bank_gold,
      silver: row.bank_silver,
      copper: row.bank_copper,
    },
    inCombat: row.in_combat === 1,
    isUnconscious: row.is_unconscious === 1,
    isResting: row.is_resting === 1,
    isMeditating: row.is_meditating === 1,
    flags: safeJsonParse(row.flags, undefined),
    pendingAdminMessages: safeJsonParse(row.pending_admin_messages, undefined),
    email: row.email ?? undefined,
    description: row.description ?? undefined,
  };
}

/**
 * Convert a User domain object to a database row
 */
export function userToDbRow(user: User): UsersTable {
  return {
    username: user.username,
    password_hash: user.passwordHash ?? '',
    salt: user.salt ?? '',
    health: user.health,
    max_health: user.maxHealth,
    mana: user.mana ?? 0, // Default to 0 for classes without mana
    max_mana: user.maxMana ?? 0, // Default to 0 for classes without mana
    experience: user.experience,
    level: user.level,
    strength: user.strength,
    dexterity: user.dexterity,
    agility: user.agility,
    constitution: user.constitution,
    wisdom: user.wisdom,
    intelligence: user.intelligence,
    charisma: user.charisma,
    // Bridge writes: emit the JSON columns alongside the legacy per-stat
    // columns. The stats record (populated and kept in sync via syncStats)
    // is the source of truth for ruleset-declared stats; flat columns
    // continue receiving the seven fantasy values for one transition phase.
    stats: JSON.stringify(
      user.stats ?? {
        strength: user.strength,
        dexterity: user.dexterity,
        agility: user.agility,
        constitution: user.constitution,
        wisdom: user.wisdom,
        intelligence: user.intelligence,
        charisma: user.charisma,
      }
    ),
    allocated_stats: user.allocatedStats ? JSON.stringify(user.allocatedStats) : null,
    equipment: user.equipment ? JSON.stringify(user.equipment) : null,
    join_date: user.joinDate.toISOString(),
    last_login: user.lastLogin.toISOString(),
    total_play_time: user.totalPlayTime ?? 0,
    current_room_id: user.currentRoomId,
    inventory_items: user.inventory?.items ? JSON.stringify(user.inventory.items) : null,
    inventory_gold: user.inventory?.currency?.gold ?? 0,
    inventory_silver: user.inventory?.currency?.silver ?? 0,
    inventory_copper: user.inventory?.currency?.copper ?? 0,
    bank_gold: user.bank?.gold ?? 0,
    bank_silver: user.bank?.silver ?? 0,
    bank_copper: user.bank?.copper ?? 0,
    in_combat: user.inCombat ? 1 : 0,
    is_unconscious: user.isUnconscious ? 1 : 0,
    is_resting: user.isResting ? 1 : 0,
    is_meditating: user.isMeditating ? 1 : 0,
    flags: user.flags ? JSON.stringify(user.flags) : null,
    pending_admin_messages: user.pendingAdminMessages
      ? JSON.stringify(user.pendingAdminMessages)
      : null,
    email: user.email ?? null,
    description: user.description ?? null,
  };
}
