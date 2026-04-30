import { dbRowToUser } from './userMapper';
import { UsersTable } from '../../data/schema';

function baseRow(overrides: Partial<UsersTable> = {}): UsersTable {
  return {
    username: 'alice',
    password_hash: 'h',
    salt: 's',
    health: 100,
    max_health: 100,
    mana: 0,
    max_mana: 0,
    experience: 0,
    level: 1,
    strength: 10,
    dexterity: 10,
    agility: 10,
    constitution: 10,
    wisdom: 10,
    intelligence: 10,
    charisma: 10,
    stats: null,
    allocated_stats: null,
    equipment: null,
    join_date: '2026-01-01',
    last_login: '2026-01-01',
    total_play_time: 0,
    current_room_id: 'town-square',
    inventory_items: null,
    inventory_gold: 0,
    inventory_silver: 0,
    inventory_copper: 0,
    bank_gold: 0,
    bank_silver: 0,
    bank_copper: 0,
    in_combat: 0,
    is_unconscious: 0,
    is_resting: 0,
    is_meditating: 0,
    flags: null,
    pending_admin_messages: null,
    email: null,
    description: null,
    ...overrides,
  };
}

describe('dbRowToUser allocatedStats round-trip', () => {
  it('preserves ruleset-declared stats beyond the seven fantasy ids', () => {
    const row = baseRow({
      allocated_stats: JSON.stringify({
        strength: 4,
        constitution: 3,
        // Custom ruleset stats — must survive the mapper.
        hacking: 7,
        endurance: 2,
      }),
    });
    const user = dbRowToUser(row);
    expect(user.allocatedStats).toEqual({
      strength: 4,
      constitution: 3,
      hacking: 7,
      endurance: 2,
    });
  });

  it('returns undefined when the column is null', () => {
    const user = dbRowToUser(baseRow());
    expect(user.allocatedStats).toBeUndefined();
  });

  it('passes through partial allocation maps without injecting zeros', () => {
    const row = baseRow({
      allocated_stats: JSON.stringify({ strength: 2 }),
    });
    const user = dbRowToUser(row);
    expect(user.allocatedStats).toEqual({ strength: 2 });
    expect(user.allocatedStats?.dexterity).toBeUndefined();
  });
});
