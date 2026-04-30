import { RESERVED_STAT_IDS } from './reservedStatIds';

/**
 * Sync test: every non-stat User field must be in RESERVED_STAT_IDS so a
 * ruleset can't register it as a stat id and shadow the field.
 *
 * If you add or remove a User interface field, update RESERVED_STAT_IDS
 * to match. The test fails loudly when these drift.
 */
describe('RESERVED_STAT_IDS', () => {
  // Hand-curated list of User non-stat fields. Updates here go alongside
  // updates to src/types.ts User interface and src/ruleset/reservedStatIds.ts.
  const EXPECTED_USER_NON_STAT_FIELDS = [
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
  ];

  it('contains every expected User non-stat field', () => {
    for (const field of EXPECTED_USER_NON_STAT_FIELDS) {
      expect(RESERVED_STAT_IDS.has(field)).toBe(true);
    }
  });

  it('does NOT contain the seven fantasy stat ids', () => {
    // These are stat ids the default ruleset registers; reserving them would
    // prevent the default ruleset from loading.
    for (const statId of [
      'strength',
      'dexterity',
      'agility',
      'constitution',
      'intelligence',
      'wisdom',
      'charisma',
    ]) {
      expect(RESERVED_STAT_IDS.has(statId)).toBe(false);
    }
  });
});
