import { ensureStatsRecord, setStat, addToStat } from './syncStats';
import { RulesetRegistry } from '../ruleset/rulesetRegistry';
import { defaultFantasyRulesetConfig } from '../rulesets/fantasy';
import { User } from '../types';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    username: 'alice',
    health: 100,
    maxHealth: 100,
    experience: 0,
    level: 1,
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

  it('ensureStatsRecord builds the record from legacy top-level fields', () => {
    const user = makeUser();
    (user as unknown as Record<string, unknown>).stats = undefined as unknown as Record<
      string,
      number
    >;
    Object.assign(user as unknown as Record<string, unknown>, {
      strength: 14,
      dexterity: 12,
      agility: 11,
      constitution: 13,
      wisdom: 10,
      intelligence: 9,
      charisma: 8,
    });
    ensureStatsRecord(user);
    expect(user.stats.strength).toBe(14);
    expect(user.stats.charisma).toBe(8);
  });

  it('ensureStatsRecord is idempotent when a record already exists', () => {
    const user = makeUser();
    user.stats.strength = 99;
    ensureStatsRecord(user);
    expect(user.stats.strength).toBe(99);
  });

  it('setStat updates only the record', () => {
    const user = makeUser();
    setStat(user, 'strength', 20);
    expect(user.stats.strength).toBe(20);
  });

  it('setStat for a non-fantasy id lands in the record', () => {
    const user = makeUser();
    setStat(user, 'hacking', 7);
    expect(user.stats.hacking).toBe(7);
  });

  it('addToStat applies a delta to the record', () => {
    const user = makeUser();
    addToStat(user, 'strength', 3);
    expect(user.stats.strength).toBe(17);
  });

  it('addToStat starts from schema baseValue when stat is unset', () => {
    const user = makeUser({ stats: {} });
    addToStat(user, 'wisdom', 5);
    expect(user.stats.wisdom).toBe(15); // base 10 + 5
  });
});
