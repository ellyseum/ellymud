import { ensureStatsRecord, setStat, addToStat, buildStatsFromFlat } from './syncStats';
import { RulesetRegistry } from '../ruleset/rulesetRegistry';
import { defaultFantasyRulesetConfig } from '../ruleset/defaultFantasyRulesetConfig';
import { User } from '../types';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    username: 'alice',
    health: 100,
    maxHealth: 100,
    experience: 0,
    level: 1,
    strength: 14,
    dexterity: 12,
    agility: 11,
    constitution: 13,
    wisdom: 10,
    intelligence: 9,
    charisma: 8,
    stats: {
      strength: 14,
      dexterity: 12,
      agility: 11,
      constitution: 13,
      wisdom: 10,
      intelligence: 9,
      charisma: 8,
    },
    joinDate: new Date(),
    lastLogin: new Date(),
    currentRoomId: 'town-square',
    inventory: { items: [], currency: { gold: 0, silver: 0, copper: 0 } },
    ...overrides,
  } as User;
}

describe('syncStats', () => {
  beforeEach(() => {
    RulesetRegistry.resetForTesting();
    RulesetRegistry.getInstance().loadConfig(defaultFantasyRulesetConfig);
  });

  it('buildStatsFromFlat reads the seven flat fields into a record', () => {
    const user = makeUser({ stats: undefined as unknown as Record<string, number> });
    const record = buildStatsFromFlat(user);
    expect(record).toEqual({
      strength: 14,
      dexterity: 12,
      agility: 11,
      constitution: 13,
      wisdom: 10,
      intelligence: 9,
      charisma: 8,
    });
  });

  it('ensureStatsRecord backfills stats record for legacy user', () => {
    const user = makeUser({ stats: undefined as unknown as Record<string, number> });
    ensureStatsRecord(user);
    expect(user.stats).toBeDefined();
    expect(user.stats.strength).toBe(14);
  });

  it('ensureStatsRecord syncs flat fields back from record values', () => {
    const user = makeUser();
    user.stats.strength = 99; // record drifts ahead
    ensureStatsRecord(user);
    expect(user.strength).toBe(99); // flat field caught up
  });

  it('setStat updates both record and legacy flat field', () => {
    const user = makeUser();
    setStat(user, 'strength', 20);
    expect(user.strength).toBe(20);
    expect(user.stats.strength).toBe(20);
  });

  it('setStat for a non-fantasy id only updates the record', () => {
    const user = makeUser();
    setStat(user, 'hacking', 7);
    expect(user.stats.hacking).toBe(7);
    expect((user as unknown as Record<string, unknown>).hacking).toBeUndefined();
  });

  it('addToStat applies a delta to both shapes', () => {
    const user = makeUser();
    addToStat(user, 'strength', 3);
    expect(user.strength).toBe(17);
    expect(user.stats.strength).toBe(17);
  });

  it('addToStat from baseValue for unknown stat starts at schema baseValue', () => {
    const user = makeUser();
    addToStat(user, 'wisdom', 5); // baseValue 10, +5
    expect(user.stats.wisdom).toBe(15);
  });
});
