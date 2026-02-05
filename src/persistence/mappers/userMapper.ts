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
 * Convert a database row to a User domain object
 */
export function dbRowToUser(row: UsersTable): User {
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
    strength: row.strength,
    dexterity: row.dexterity,
    agility: row.agility,
    constitution: row.constitution,
    wisdom: row.wisdom,
    intelligence: row.intelligence,
    charisma: row.charisma,
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
