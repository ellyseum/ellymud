/**
 * Unit tests for KyselyNpcRepository
 * Tests database operations for NPC templates using in-memory SQLite
 */

import { Kysely } from 'kysely';
import { Database } from '../data/schema';
import { KyselyNpcRepository } from './KyselyNpcRepository';
import { setupTestDb, destroyTestDb } from '../testing/testDb';
import { NPCData } from '../combat/npc';

describe('KyselyNpcRepository', () => {
  let db: Kysely<Database>;
  let repository: KyselyNpcRepository;

  const createTestNpc = (overrides: Partial<NPCData> = {}): NPCData => ({
    id: 'test-npc',
    name: 'Test NPC',
    description: 'A test NPC',
    health: 100,
    maxHealth: 100,
    damage: [5, 10] as [number, number],
    isHostile: false,
    isPassive: false,
    experienceValue: 50,
    attackTexts: ['attacks'],
    deathMessages: ['dies'],
    ...overrides,
  });

  beforeEach(async () => {
    db = await setupTestDb();
    repository = new KyselyNpcRepository(db);
  });

  afterEach(async () => {
    await destroyTestDb();
  });

  describe('save', () => {
    it('should save a new NPC', async () => {
      const npc = createTestNpc();

      await repository.save(npc);

      const result = await repository.findById('test-npc');
      expect(result).toBeDefined();
      expect(result?.name).toBe('Test NPC');
    });

    it('should update an existing NPC', async () => {
      const npc = createTestNpc();
      await repository.save(npc);

      const updated = { ...npc, name: 'Updated NPC' };
      await repository.save(updated);

      const result = await repository.findById('test-npc');
      expect(result?.name).toBe('Updated NPC');
    });
  });

  describe('saveAll', () => {
    it('should save multiple NPCs', async () => {
      const npcs = [
        createTestNpc({ id: 'npc1', name: 'NPC One' }),
        createTestNpc({ id: 'npc2', name: 'NPC Two' }),
        createTestNpc({ id: 'npc3', name: 'NPC Three' }),
      ];

      await repository.saveAll(npcs);

      const all = await repository.findAll();
      expect(all).toHaveLength(3);
    });

    it('should handle empty array', async () => {
      await expect(repository.saveAll([])).resolves.not.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return empty array when no NPCs exist', async () => {
      const result = await repository.findAll();
      expect(result).toEqual([]);
    });

    it('should return all NPCs', async () => {
      const npcs = [createTestNpc({ id: 'npc1' }), createTestNpc({ id: 'npc2' })];
      await repository.saveAll(npcs);

      const result = await repository.findAll();
      expect(result).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('should return undefined for non-existent NPC', async () => {
      const result = await repository.findById('non-existent');
      expect(result).toBeUndefined();
    });

    it('should return the NPC when found', async () => {
      const npc = createTestNpc({ id: 'goblin', name: 'Goblin' });
      await repository.save(npc);

      const result = await repository.findById('goblin');
      expect(result?.id).toBe('goblin');
      expect(result?.name).toBe('Goblin');
    });
  });

  describe('findByName', () => {
    it('should return undefined for non-existent name', async () => {
      const result = await repository.findByName('Unknown');
      expect(result).toBeUndefined();
    });

    it('should return the NPC when found by name', async () => {
      const npc = createTestNpc({ id: 'wolf', name: 'Gray Wolf' });
      await repository.save(npc);

      const result = await repository.findByName('Gray Wolf');
      expect(result?.id).toBe('wolf');
    });
  });

  describe('findHostile', () => {
    it('should return only hostile NPCs', async () => {
      await repository.saveAll([
        createTestNpc({ id: 'friendly', name: 'Friendly', isHostile: false }),
        createTestNpc({ id: 'hostile1', name: 'Hostile One', isHostile: true }),
        createTestNpc({ id: 'hostile2', name: 'Hostile Two', isHostile: true }),
      ]);

      const result = await repository.findHostile();
      expect(result).toHaveLength(2);
      expect(result.every((n) => n.isHostile)).toBe(true);
    });

    it('should return empty array when no hostile NPCs', async () => {
      await repository.save(createTestNpc({ isHostile: false }));

      const result = await repository.findHostile();
      expect(result).toEqual([]);
    });
  });

  describe('findMerchants', () => {
    it('should return only merchant NPCs', async () => {
      await repository.saveAll([
        createTestNpc({ id: 'npc1', merchant: false }),
        createTestNpc({ id: 'merchant1', name: 'Shopkeeper', merchant: true }),
        createTestNpc({ id: 'merchant2', name: 'Vendor', merchant: true }),
      ]);

      const result = await repository.findMerchants();
      expect(result).toHaveLength(2);
      expect(result.every((n) => n.merchant === true)).toBe(true);
    });

    it('should return empty array when no merchants', async () => {
      await repository.save(createTestNpc({ merchant: false }));

      const result = await repository.findMerchants();
      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete an existing NPC', async () => {
      const npc = createTestNpc();
      await repository.save(npc);

      await repository.delete('test-npc');

      const result = await repository.findById('test-npc');
      expect(result).toBeUndefined();
    });

    it('should not throw when deleting non-existent NPC', async () => {
      await expect(repository.delete('non-existent')).resolves.not.toThrow();
    });
  });

  describe('data integrity', () => {
    it('should preserve damage tuple', async () => {
      const npc = createTestNpc({ damage: [15, 30] });
      await repository.save(npc);

      const result = await repository.findById('test-npc');
      expect(result?.damage).toEqual([15, 30]);
    });

    it('should preserve merchant inventory data', async () => {
      const npc = createTestNpc({
        merchant: true,
        inventory: [
          { itemId: 'sword', itemCount: 1, spawnRate: 1.0 },
          { itemId: 'shield', itemCount: 1, spawnRate: 0.5 },
        ],
        stockConfig: [
          {
            templateId: 'potion',
            maxStock: 10,
            restockAmount: 2,
            restockPeriod: 1,
            restockUnit: 'hours',
          },
        ],
      });
      await repository.save(npc);

      const result = await repository.findById('test-npc');
      expect(result?.merchant).toBe(true);
      expect(result?.inventory).toHaveLength(2);
      expect(result?.stockConfig).toHaveLength(1);
    });

    it('should preserve attack texts and death messages', async () => {
      const npc = createTestNpc({
        attackTexts: ['swipes at', 'bites', 'claws'],
        deathMessages: ['falls down', 'crumbles to dust'],
      });
      await repository.save(npc);

      const result = await repository.findById('test-npc');
      expect(result?.attackTexts).toEqual(['swipes at', 'bites', 'claws']);
      expect(result?.deathMessages).toEqual(['falls down', 'crumbles to dust']);
    });
  });
});
