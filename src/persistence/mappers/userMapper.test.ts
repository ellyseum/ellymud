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
    strength: 14,
    dexterity: 12,
    agility: 11,
    constitution: 13,
    wisdom: 10,
    intelligence: 9,
    charisma: 8,
    joinDate: new Date('2026-01-01'),
    lastLogin: new Date('2026-01-02'),
    currentRoomId: 'town-square',
    inventory: { items: [], currency: { gold: 0, silver: 0, copper: 0 } },
    ...overrides,
  } as User;
}

describe('userMapper bridge writes (C3)', () => {
  it('userToDbRow writes the new stats JSON column populated from flat fields', () => {
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

  it('userToDbRow continues writing legacy per-stat columns (bridge)', () => {
    const row = userToDbRow(makeUser());
    expect(row.strength).toBe(14);
    expect(row.dexterity).toBe(12);
    expect(row.agility).toBe(11);
    expect(row.constitution).toBe(13);
    expect(row.wisdom).toBe(10);
    expect(row.intelligence).toBe(9);
    expect(row.charisma).toBe(8);
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

  it('dbRowToUser still reads from legacy stat columns (C3 reads unchanged)', () => {
    const row = userToDbRow(makeUser());
    const user = dbRowToUser(row);
    expect(user.strength).toBe(14);
    expect(user.dexterity).toBe(12);
  });
});
