/*
 * EllyMUD
 * Copyright (C) 2026 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Stat ids that cannot be registered by a ruleset because they collide with
 * non-stat User fields (or with the storage keys for stats themselves).
 *
 * The fantasy stat names (strength, dexterity, ...) are intentionally NOT in
 * this set — the default fantasy ruleset registers them as legitimate stats.
 *
 * Kept synchronized with the User interface in src/types.ts via a unit test.
 *
 * @module ruleset/reservedStatIds
 */

export const RESERVED_STAT_IDS: ReadonlySet<string> = new Set<string>([
  'username',
  'password',
  'passwordHash',
  'salt',
  'health',
  'maxHealth',
  'mana',
  'maxMana',
  'experience',
  'level',
  'raceId',
  'classId',
  'classHistory',
  'questFlags',
  'unspentAttributePoints',
  'allocatedStats',
  'stats',
  'resource',
  'maxResource',
  'attack',
  'defense',
  'equipment',
  'inventory',
  'bank',
  'joinDate',
  'lastLogin',
  'totalPlayTime',
  'lastLoginTime',
  'currentRoomId',
  'commandHistory',
  'currentHistoryIndex',
  'savedCurrentCommand',
  'inCombat',
  'isUnconscious',
  'movementRestricted',
  'movementRestrictedReason',
  'isResting',
  'isMeditating',
  'restingTicks',
  'meditatingTicks',
  'isSneaking',
  'isHiding',
  'flags',
  'pendingAdminMessages',
  'snakeHighScore',
  'comboPoints',
  'comboTarget',
  'banned',
  'banReason',
  'banExpires',
  'banDate',
  'email',
  'role',
  'created',
  'description',
  'isAdmin',
]);
