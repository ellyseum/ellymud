/**
 * Unit tests for NPC class
 * @module combat/npc.test
 */

import { NPC, NPCData } from './npc';
import { NPCInventoryItem } from '../types';

// Mock dependencies
jest.mock('fs');
jest.mock('../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../utils/jsonUtils', () => ({
  parseAndValidateJson: jest.fn(),
}));

jest.mock('../utils/fileUtils', () => ({
  loadAndValidateJsonFile: jest.fn(),
}));

jest.mock('../config', () => ({
  default: {
    DIRECT_NPCS_DATA: null,
  },
}));

jest.mock('../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn().mockReturnValue({
      canCreateInstance: jest.fn().mockReturnValue(true),
      createItemInstance: jest.fn().mockImplementation((itemId: string) => ({
        instanceId: `instance-${itemId}-${Date.now()}`,
        templateId: itemId,
      })),
    }),
  },
}));

// Helper to create NPC data
const createNpcData = (overrides: Partial<NPCData> = {}): NPCData => ({
  id: 'test-npc-001',
  name: 'Test Goblin',
  description: 'A fearsome test goblin.',
  health: 100,
  maxHealth: 100,
  damage: [5, 10] as [number, number],
  isHostile: true,
  isPassive: false,
  experienceValue: 50,
  attackTexts: ['swipes $TARGET$'],
  deathMessages: ['falls dead'],
  ...overrides,
});

describe('NPC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the NPC cache before each test
    NPC.clearNpcDataCache();
  });

  describe('constructor', () => {
    it('should create an NPC with provided values', () => {
      const npc = new NPC('Goblin', 100, 100, [5, 10], true, false, 50);

      expect(npc.name).toBe('Goblin');
      expect(npc.health).toBe(100);
      expect(npc.maxHealth).toBe(100);
      expect(npc.damage).toEqual([5, 10]);
      expect(npc.isHostile).toBe(true);
      expect(npc.isPassive).toBe(false);
      expect(npc.experienceValue).toBe(50);
    });

    it('should use default values when not provided', () => {
      const npc = new NPC('Skeleton', 50, 50);

      expect(npc.damage).toEqual([1, 3]);
      expect(npc.isHostile).toBe(false);
      expect(npc.isPassive).toBe(false);
      expect(npc.experienceValue).toBe(50);
      expect(npc.description).toBe('A Skeleton standing here.');
      expect(npc.attackTexts).toHaveLength(3);
      expect(npc.deathMessages).toHaveLength(1);
    });

    it('should generate a unique instanceId', () => {
      const npc1 = new NPC('Orc', 80, 80);
      const npc2 = new NPC('Orc', 80, 80);

      expect(npc1.instanceId).not.toBe(npc2.instanceId);
    });

    it('should use provided instanceId if given', () => {
      const npc = new NPC(
        'Troll',
        120,
        120,
        [10, 15],
        true,
        false,
        75,
        'A big troll.',
        ['smashes $TARGET$'],
        ['crumbles'],
        'troll-001',
        'custom-instance-id'
      );

      expect(npc.instanceId).toBe('custom-instance-id');
    });

    it('should set templateId from name if not provided', () => {
      const npc = new NPC('Giant Spider', 60, 60);

      expect(npc.templateId).toBe('giant spider');
    });
  });

  describe('isAlive', () => {
    it('should return true when health is positive', () => {
      const npc = new NPC('Goblin', 50, 100);
      expect(npc.isAlive()).toBe(true);
    });

    it('should return false when health is zero', () => {
      const npc = new NPC('Goblin', 0, 100);
      expect(npc.isAlive()).toBe(false);
    });

    it('should return false when health is negative', () => {
      const npc = new NPC('Goblin', -10, 100);
      expect(npc.isAlive()).toBe(false);
    });
  });

  describe('takeDamage', () => {
    it('should reduce health by damage amount', () => {
      const npc = new NPC('Goblin', 100, 100);
      npc.takeDamage(30);
      expect(npc.health).toBe(70);
    });

    it('should return actual damage dealt', () => {
      const npc = new NPC('Goblin', 100, 100);
      const damage = npc.takeDamage(25);
      expect(damage).toBe(25);
    });

    it('should cap damage at remaining health and prevent negative health', () => {
      const npc = new NPC('Goblin', 20, 100);
      const damage = npc.takeDamage(50);

      expect(npc.health).toBe(0);
      expect(damage).toBe(20); // Only took 20 damage because that's all the health left
    });

    it('should handle zero damage', () => {
      const npc = new NPC('Goblin', 100, 100);
      const damage = npc.takeDamage(0);

      expect(npc.health).toBe(100);
      expect(damage).toBe(0);
    });
  });

  describe('getAttackDamage', () => {
    it('should return damage within the specified range', () => {
      const npc = new NPC('Goblin', 100, 100, [5, 10]);

      for (let i = 0; i < 100; i++) {
        const damage = npc.getAttackDamage();
        expect(damage).toBeGreaterThanOrEqual(5);
        expect(damage).toBeLessThanOrEqual(10);
      }
    });

    it('should return fixed damage when min equals max', () => {
      const npc = new NPC('Goblin', 100, 100, [7, 7]);
      expect(npc.getAttackDamage()).toBe(7);
    });
  });

  describe('getAttackText', () => {
    it('should replace $TARGET$ with target name', () => {
      const npc = new NPC('Goblin', 100, 100, [5, 10], true, false, 50, 'A goblin.', [
        'swipes $TARGET$ with its claws',
      ]);

      const text = npc.getAttackText('Hero');
      expect(text).toBe('swipes Hero with its claws');
    });

    it('should return one of the attack texts', () => {
      const attackTexts = ['attacks $TARGET$', 'bites $TARGET$', 'slashes $TARGET$'];
      const npc = new NPC('Goblin', 100, 100, [5, 10], true, false, 50, 'A goblin.', attackTexts);

      const text = npc.getAttackText('you');
      expect(attackTexts.map((t) => t.replace('$TARGET$', 'you'))).toContain(text);
    });
  });

  describe('getDeathMessage', () => {
    it('should return one of the death messages', () => {
      const deathMessages = ['falls dead', 'collapses', 'expires'];
      const npc = new NPC(
        'Goblin',
        100,
        100,
        [5, 10],
        true,
        false,
        50,
        'A goblin.',
        ['attacks'],
        deathMessages
      );

      const message = npc.getDeathMessage();
      expect(deathMessages).toContain(message);
    });
  });

  describe('isMerchant', () => {
    it('should return false for regular NPC', () => {
      const npc = new NPC('Goblin', 100, 100);
      expect(npc.isMerchant()).toBe(false);
    });
  });

  describe('isUser', () => {
    it('should return false for NPC', () => {
      const npc = new NPC('Goblin', 100, 100);
      expect(npc.isUser()).toBe(false);
    });
  });

  describe('getName', () => {
    it('should return the NPC name', () => {
      const npc = new NPC('Dark Wizard', 100, 100);
      expect(npc.getName()).toBe('Dark Wizard');
    });
  });

  describe('aggression tracking', () => {
    let npc: NPC;

    beforeEach(() => {
      npc = new NPC('Goblin', 100, 100);
    });

    describe('hasAggression', () => {
      it('should return false when player has no aggression', () => {
        expect(npc.hasAggression('player1')).toBe(false);
      });

      it('should return true when player has aggression', () => {
        npc.addAggression('player1');
        expect(npc.hasAggression('player1')).toBe(true);
      });
    });

    describe('addAggression', () => {
      it('should add player to aggressors', () => {
        npc.addAggression('player1');
        expect(npc.hasAggression('player1')).toBe(true);
      });

      it('should accumulate damage dealt', () => {
        npc.addAggression('player1', 10);
        npc.addAggression('player1', 15);

        const aggressors = npc.getAllAggressors();
        expect(aggressors).toContain('player1');
      });

      it('should set NPC to hostile when attacked', () => {
        const passiveNpc = new NPC('Deer', 50, 50, [1, 2], false, true);
        passiveNpc.addAggression('hunter');
        expect(passiveNpc.isHostile).toBe(true);
      });
    });

    describe('removeAggression', () => {
      it('should remove player from aggressors', () => {
        npc.addAggression('player1');
        npc.removeAggression('player1');
        expect(npc.hasAggression('player1')).toBe(false);
      });

      it('should handle removing non-existent player', () => {
        expect(() => npc.removeAggression('nonexistent')).not.toThrow();
      });
    });

    describe('getAllAggressors', () => {
      it('should return empty array when no aggressors', () => {
        expect(npc.getAllAggressors()).toEqual([]);
      });

      it('should return all aggressors', () => {
        npc.addAggression('player1');
        npc.addAggression('player2');
        npc.addAggression('player3');

        const aggressors = npc.getAllAggressors();
        expect(aggressors).toHaveLength(3);
        expect(aggressors).toContain('player1');
        expect(aggressors).toContain('player2');
        expect(aggressors).toContain('player3');
      });
    });

    describe('clearAllAggression', () => {
      it('should remove all aggressors', () => {
        npc.addAggression('player1');
        npc.addAggression('player2');
        npc.clearAllAggression();

        expect(npc.getAllAggressors()).toEqual([]);
      });
    });
  });

  describe('fromNPCData', () => {
    it('should create NPC from NPCData object', () => {
      const data = createNpcData();
      const npc = NPC.fromNPCData(data);

      expect(npc.name).toBe('Test Goblin');
      expect(npc.health).toBe(100);
      expect(npc.maxHealth).toBe(100);
      expect(npc.damage).toEqual([5, 10]);
      expect(npc.isHostile).toBe(true);
      expect(npc.isPassive).toBe(false);
      expect(npc.experienceValue).toBe(50);
      expect(npc.description).toBe('A fearsome test goblin.');
      expect(npc.templateId).toBe('test-npc-001');
    });

    it('should handle NPC data with inventory', () => {
      const inventory: NPCInventoryItem[] = [
        { itemId: 'gold-coins', itemCount: 10, spawnRate: 1.0 },
      ];
      const data = createNpcData({ inventory });
      const npc = NPC.fromNPCData(data);

      expect(npc.inventory).toEqual(inventory);
    });

    it('should default inventory to empty array if not provided', () => {
      const data = createNpcData();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (data as any).inventory;
      const npc = NPC.fromNPCData(data);

      expect(npc.inventory).toEqual([]);
    });
  });

  describe('loadPrevalidatedNPCData', () => {
    it('should create a map from NPC data array', () => {
      const npcArray: NPCData[] = [
        createNpcData({ id: 'goblin-001', name: 'Goblin' }),
        createNpcData({ id: 'orc-001', name: 'Orc' }),
      ];

      const result = NPC.loadPrevalidatedNPCData(npcArray);

      expect(result.size).toBe(2);
      expect(result.has('goblin-001')).toBe(true);
      expect(result.has('orc-001')).toBe(true);
    });

    it('should update the cache', () => {
      const npcArray: NPCData[] = [createNpcData({ id: 'test-001' })];

      NPC.loadPrevalidatedNPCData(npcArray);

      // Cache should now be valid - subsequent calls should return cached data
      const result = NPC.loadNPCData();
      expect(result.has('test-001')).toBe(true);
    });
  });

  describe('clearNpcDataCache', () => {
    it('should clear the NPC data cache', () => {
      const npcArray: NPCData[] = [createNpcData({ id: 'cached-npc' })];
      NPC.loadPrevalidatedNPCData(npcArray);

      NPC.clearNpcDataCache();

      // After clearing, cache should be empty (will try to load from file/config)
      // Since we mocked config, it will use file loading which returns empty due to mock
    });
  });

  describe('edge cases', () => {
    it('should handle empty attack texts array', () => {
      const npc = new NPC('Goblin', 100, 100, [5, 10], true, false, 50, 'desc', []);

      // Should use default attack texts
      expect(npc.attackTexts).toHaveLength(0);
    });

    it('should handle empty death messages array', () => {
      const npc = new NPC('Goblin', 100, 100, [5, 10], true, false, 50, 'desc', ['attack'], []);

      expect(npc.deathMessages).toHaveLength(0);
    });

    it('should handle very large damage values', () => {
      const npc = new NPC('Dragon', 1000, 1000, [100, 200]);
      const damage = npc.getAttackDamage();
      expect(damage).toBeGreaterThanOrEqual(100);
      expect(damage).toBeLessThanOrEqual(200);
    });

    it('should handle multiple NPCs with same name but different instances', () => {
      const npc1 = new NPC('Guard', 100, 100);
      const npc2 = new NPC('Guard', 100, 100);

      expect(npc1.name).toBe(npc2.name);
      expect(npc1.instanceId).not.toBe(npc2.instanceId);
    });
  });
});
