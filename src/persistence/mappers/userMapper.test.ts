import { userToDbRow, dbRowToUser } from './userMapper';
import { User } from '../../types';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    username: 'alice',
    passwordHash: 'h',
    salt: 's',
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
    joinDate: new Date('2026-01-01'),
    lastLogin: new Date('2026-01-02'),
    currentRoomId: 'town-square',
    inventory: { items: [], currency: { gold: 0, silver: 0, copper: 0 } },
    ...overrides,
  } as User;
}

describe('userMapper bridge writes (C3)', () => {
  it('userToDbRow writes the new stats JSON column populated from the stats record', () => {
    const row = userToDbRow(makeUser());
    expect(row.stats).not.toBeNull();
    const parsed = JSON.parse(row.stats!) as Record<string, number>;
    expect(parsed).toEqual({
      strength: 14,
      dexterity: 12,
      agility: 11,
      constitution: 13,
      wisdom: 10,
      intelligence: 9,
      charisma: 8,
    });
  });

  it('userToDbRow no longer writes the legacy per-stat columns', () => {
    const row = userToDbRow(makeUser());
    // The seven legacy columns were dropped after the JSON `stats` column
    // became the canonical storage; row should only carry the new shape.
    expect((row as unknown as Record<string, unknown>).strength).toBeUndefined();
    expect((row as unknown as Record<string, unknown>).charisma).toBeUndefined();
  });

  it('userToDbRow writes allocated_stats when present', () => {
    const user = makeUser({
      allocatedStats: {
        strength: 4,
        dexterity: 0,
        agility: 0,
        constitution: 3,
        wisdom: 0,
        intelligence: 0,
        charisma: 0,
      },
    });
    const row = userToDbRow(user);
    expect(row.allocated_stats).not.toBeNull();
    const parsed = JSON.parse(row.allocated_stats!) as Record<string, number>;
    expect(parsed.strength).toBe(4);
    expect(parsed.constitution).toBe(3);
  });

  it('userToDbRow writes null for allocated_stats when absent', () => {
    const row = userToDbRow(makeUser());
    expect(row.allocated_stats).toBeNull();
  });

  it('dbRowToUser reads stats from JSON column (C4 read path)', () => {
    const row = userToDbRow(makeUser());
    const user = dbRowToUser(row);
    expect(user.stats.strength).toBe(14);
    expect(user.stats.dexterity).toBe(12);
  });

  it('dbRowToUser returns an empty stats record when the JSON column is null', () => {
    // The legacy per-stat columns are gone; with no JSON either, there's
    // no fallback path. Engine downstream relies on getStat() falling
    // back to the schema baseValue.
    const row = userToDbRow(makeUser());
    row.stats = null;
    const user = dbRowToUser(row);
    expect(user.stats).toEqual({});
  });

  it('dbRowToUser prefers JSON column over legacy column when both populated', () => {
    const row = userToDbRow(makeUser());
    row.stats = JSON.stringify({
      strength: 99,
      dexterity: 99,
      agility: 99,
      constitution: 99,
      wisdom: 99,
      intelligence: 99,
      charisma: 99,
    });
    const user = dbRowToUser(row);
    expect(user.stats.strength).toBe(99);
  });

  it('dbRowToUser preserves a partial JSON record without injecting omitted ids', () => {
    // A ruleset can deliberately omit some of the seven historical ids; the
    // mapper must not fabricate them from the legacy columns when the JSON
    // column is present.
    const row = userToDbRow(makeUser());
    row.stats = JSON.stringify({ strength: 99 });
    const user = dbRowToUser(row);
    expect(user.stats.strength).toBe(99);
    expect(user.stats.dexterity).toBeUndefined();
  });

  it('dbRowToUser populates allocatedStats from JSON column', () => {
    const user = makeUser({
      allocatedStats: {
        strength: 4,
        dexterity: 0,
        agility: 0,
        constitution: 3,
        wisdom: 0,
        intelligence: 0,
        charisma: 0,
      },
    });
    const row = userToDbRow(user);
    const decoded = dbRowToUser(row);
    expect(decoded.allocatedStats?.strength).toBe(4);
    expect(decoded.allocatedStats?.constitution).toBe(3);
  });

  it('dbRowToUser leaves allocatedStats undefined when allocated_stats column is null', () => {
    const row = userToDbRow(makeUser());
    expect(row.allocated_stats).toBeNull();
    const user = dbRowToUser(row);
    expect(user.allocatedStats).toBeUndefined();
  });
});
