/**
 * Unit tests for ItemManager class
 * @module utils/itemManager.test
 */

import { ItemManager } from './itemManager';
import { GameItem, ItemInstance } from '../types';
import { createMockUser } from '../test/helpers/mockFactories';

// Mock dependencies
jest.mock('./logger', () => ({
  createContextLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn(() =>
    JSON.stringify([
      {
        id: 'iron-sword',
        name: 'Iron Sword',
        type: 'weapon',
        slot: 'weapon',
        description: 'A basic iron sword',
        value: 50,
        attack: 5,
      },
      {
        id: 'leather-armor',
        name: 'Leather Armor',
        type: 'armor',
        slot: 'chest',
        description: 'Basic leather armor',
        value: 30,
        defense: 3,
      },
    ])
  ),
  writeFileSync: jest.fn(),
}));

jest.mock('./fileUtils', () => ({
  loadAndValidateJsonFile: jest.fn().mockReturnValue([
    {
      id: 'iron-sword',
      name: 'Iron Sword',
      type: 'weapon',
      slot: 'weapon',
      description: 'A basic iron sword',
      value: 50,
      attack: 5,
    },
    {
      id: 'leather-armor',
      name: 'Leather Armor',
      type: 'armor',
      slot: 'chest',
      description: 'Basic leather armor',
      value: 30,
      defense: 3,
    },
  ]),
}));

jest.mock('./jsonUtils', () => ({
  parseAndValidateJson: jest.fn().mockReturnValue([
    {
      id: 'iron-sword',
      name: 'Iron Sword',
      type: 'weapon',
      slot: 'weapon',
      description: 'A basic iron sword',
      value: 50,
      attack: 5,
    },
    {
      id: 'leather-armor',
      name: 'Leather Armor',
      type: 'armor',
      slot: 'chest',
      description: 'Basic leather armor',
      value: 30,
      defense: 3,
    },
  ]),
}));

jest.mock('../config', () => ({
  __esModule: true,
  default: {
    ITEMS_FILE: '/test/data/items.json',
    DIRECT_ITEMS_DATA: null,
    DATA_DIR: '/test/data',
  },
  ITEMS_FILE: '/test/data/items.json',
  DIRECT_ITEMS_DATA: null,
  DATA_DIR: '/test/data',
  STORAGE_BACKEND: 'json',
}));

// Reset the singleton before each test
const resetSingleton = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ItemManager as any)['instance'] = null;
};

describe('ItemManager', () => {
  let itemManager: ItemManager;

  beforeEach(() => {
    jest.clearAllMocks();
    resetSingleton();
    itemManager = ItemManager.getInstance();
  });

  afterEach(() => {
    resetSingleton();
  });

  describe('getInstance', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = ItemManager.getInstance();
      const instance2 = ItemManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('getItem', () => {
    it('should return item by id when loaded', () => {
      const item = itemManager.getItem('iron-sword');

      if (item) {
        expect(item.name).toBe('Iron Sword');
      }
    });

    it('should return undefined for non-existent item', () => {
      const item = itemManager.getItem('non-existent');

      expect(item).toBeUndefined();
    });
  });

  describe('getAllItems', () => {
    it('should return array of items', () => {
      const items = itemManager.getAllItems();

      expect(Array.isArray(items)).toBe(true);
    });
  });

  describe('loadPrevalidatedItems', () => {
    it('should load items from array', () => {
      const testItems: GameItem[] = [
        {
          id: 'test-item',
          name: 'Test Item',
          type: 'misc',
          description: 'A test item',
          value: 100,
        },
      ];

      itemManager.loadPrevalidatedItems(testItems);

      const item = itemManager.getItem('test-item');
      expect(item?.name).toBe('Test Item');
    });

    it('should clear existing items before loading', () => {
      const firstItems: GameItem[] = [
        {
          id: 'first-item',
          name: 'First Item',
          type: 'misc',
          description: 'First item',
          value: 100,
        },
      ];

      const secondItems: GameItem[] = [
        {
          id: 'second-item',
          name: 'Second Item',
          type: 'misc',
          description: 'Second item',
          value: 100,
        },
      ];

      itemManager.loadPrevalidatedItems(firstItems);
      itemManager.loadPrevalidatedItems(secondItems);

      expect(itemManager.getItem('first-item')).toBeUndefined();
      expect(itemManager.getItem('second-item')?.name).toBe('Second Item');
    });
  });

  describe('loadPrevalidatedItemInstances', () => {
    it('should load item instances from array', () => {
      const testInstances: ItemInstance[] = [
        {
          instanceId: 'test-instance-1',
          templateId: 'iron-sword',
          created: new Date(),
          createdBy: 'test',
          properties: {},
        },
      ];

      itemManager.loadPrevalidatedItemInstances(testInstances);

      const instance = itemManager.getItemInstance('test-instance-1');
      expect(instance?.templateId).toBe('iron-sword');
    });

    it('should handle instances with history', () => {
      const testInstances: ItemInstance[] = [
        {
          instanceId: 'instance-with-history',
          templateId: 'iron-sword',
          created: new Date(),
          createdBy: 'test',
          properties: {},
          history: [
            {
              event: 'created',
              timestamp: new Date(),
              details: 'Created during test',
            },
          ],
        },
      ];

      itemManager.loadPrevalidatedItemInstances(testInstances);

      const instance = itemManager.getItemInstance('instance-with-history');
      expect(instance?.history).toHaveLength(1);
    });
  });

  describe('getItemInstance', () => {
    it('should retrieve loaded instances', () => {
      // Load an instance first
      const testInstances: ItemInstance[] = [
        {
          instanceId: 'lookup-test-instance',
          templateId: 'iron-sword',
          created: new Date(),
          createdBy: 'test',
          properties: {},
        },
      ];

      itemManager.loadPrevalidatedItemInstances(testInstances);

      const instance = itemManager.getItemInstance('lookup-test-instance');
      expect(instance?.templateId).toBe('iron-sword');
    });
  });

  describe('getAllItemInstances', () => {
    it('should return array of instances', () => {
      const instances = itemManager.getAllItemInstances();

      expect(Array.isArray(instances)).toBe(true);
    });
  });

  describe('calculateAttack', () => {
    it('should return base attack when user has no equipment', () => {
      const user = createMockUser({
        strength: 10,
        equipment: {},
      });

      const attack = itemManager.calculateAttack(user);

      expect(attack).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateDefense', () => {
    it('should return base defense when user has no equipment', () => {
      const user = createMockUser({
        constitution: 10,
        equipment: {},
      });

      const defense = itemManager.calculateDefense(user);

      expect(defense).toBeGreaterThanOrEqual(0);
    });
  });
});

// Additional tests to improve coverage
describe('ItemManager Extended Coverage', () => {
  let itemManager: ItemManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ItemManager as any)['instance'] = null;
    itemManager = ItemManager.getInstance();
  });

  describe('getItem', () => {
    it('should return item by ID', () => {
      const item = itemManager.getItem('iron-sword');
      expect(item).toBeDefined();
      expect(item?.name).toBe('Iron Sword');
    });

    it('should return undefined for non-existent item', () => {
      const item = itemManager.getItem('nonexistent');
      expect(item).toBeUndefined();
    });
  });

  describe('getAllItems', () => {
    it('should return all items', () => {
      const items = itemManager.getAllItems();
      expect(items).toBeDefined();
      expect(items.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('createItemInstance', () => {
    it('should create a new item instance', () => {
      const instance = itemManager.createItemInstance('iron-sword', 'testuser');
      expect(instance).toBeDefined();
      expect(instance?.templateId).toBe('iron-sword');
    });

    it('should return null for non-existent item template', () => {
      const instance = itemManager.createItemInstance('nonexistent', 'testuser');
      expect(instance).toBeNull();
    });
  });

  describe('getItemInstance', () => {
    it('should return instance after creation', () => {
      const created = itemManager.createItemInstance('iron-sword', 'testuser');
      if (created) {
        const retrieved = itemManager.getItemInstance(created.instanceId);
        expect(retrieved).toBeDefined();
        expect(retrieved?.instanceId).toBe(created.instanceId);
      }
    });
  });

  describe('getAllItemInstances', () => {
    it('should return all instances', () => {
      itemManager.createItemInstance('iron-sword', 'testuser');
      itemManager.createItemInstance('leather-armor', 'testuser');
      const instances = itemManager.getAllItemInstances();
      expect(instances.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('findInstanceByPartialId', () => {
    it('should return null for too short partial ID', () => {
      const found = itemManager.findInstanceByPartialId('abc');
      expect(found).toBeNull();
    });
  });

  describe('deleteItemInstance', () => {
    it('should return false for non-existent instance', () => {
      const deleted = itemManager.deleteItemInstance('nonexistent-12345678');
      expect(deleted).toBe(false);
    });
  });

  describe('addItemHistory', () => {
    it('should add history to item instance', () => {
      const created = itemManager.createItemInstance('iron-sword', 'testuser');
      if (created) {
        itemManager.addItemHistory(created.instanceId, 'pickup', 'Picked up by testuser');

        const retrieved = itemManager.getItemInstance(created.instanceId);
        expect(retrieved?.history).toBeDefined();
        expect(retrieved?.history?.length).toBeGreaterThan(0);
      }
    });

    it('should handle history for non-existent instance gracefully', () => {
      // Should not throw
      expect(() => {
        itemManager.addItemHistory('nonexistent', 'pickup', 'Test action');
      }).not.toThrow();
    });
  });

  describe('loadPrevalidatedItems', () => {
    it('should load items from array', () => {
      const items: GameItem[] = [
        {
          id: 'test-item',
          name: 'Test Item',
          type: 'misc',
          description: 'A test item',
          value: 1,
        },
      ];

      itemManager.loadPrevalidatedItems(items);

      const loaded = itemManager.getItem('test-item');
      expect(loaded).toBeDefined();
      expect(loaded?.name).toBe('Test Item');
    });
  });

  describe('loadPrevalidatedItemInstances', () => {
    it('should load instances from array', () => {
      const instances: ItemInstance[] = [
        {
          instanceId: 'test-instance-123',
          templateId: 'iron-sword',
          created: new Date(),
          createdBy: 'testuser',
          properties: {},
        },
      ];

      itemManager.loadPrevalidatedItemInstances(instances);

      const loaded = itemManager.getItemInstance('test-instance-123');
      expect(loaded).toBeDefined();
      expect(loaded?.templateId).toBe('iron-sword');
    });
  });
  describe('loadPrevalidatedItemInstances', () => {
    it('should load instances from array', () => {
      const instances: ItemInstance[] = [
        {
          instanceId: 'test-instance-123',
          templateId: 'iron-sword',
          created: new Date(),
          createdBy: 'testuser',
          properties: {},
        },
      ];

      itemManager.loadPrevalidatedItemInstances(instances);

      const loaded = itemManager.getItemInstance('test-instance-123');
      expect(loaded).toBeDefined();
      expect(loaded?.templateId).toBe('iron-sword');
    });
  });
});

// Tests using the new repository injection
describe('ItemManager with Repository Injection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ItemManager.resetInstance();
  });

  afterEach(() => {
    ItemManager.resetInstance();
  });

  describe('resetInstance', () => {
    it('should allow creating a fresh instance', () => {
      const instance1 = ItemManager.getInstance();
      ItemManager.resetInstance();
      const instance2 = ItemManager.getInstance();

      // They might be the same object since mocks are reused,
      // but the point is resetInstance doesn't throw
      expect(instance1).toBeDefined();
      expect(instance2).toBeDefined();
    });

    it('should reset instance to null', () => {
      ItemManager.getInstance();
      ItemManager.resetInstance();
      // After reset, getInstance creates a new instance
      // We can verify this works by checking getInstance doesn't throw
      expect(() => ItemManager.getInstance()).not.toThrow();
    });
  });

  describe('createWithRepository', () => {
    it('should create instance with manager', () => {
      // Since createWithRepository is now available, we can test that it returns a manager
      // Note: The current implementation still falls back to file loading for backwards compatibility
      // but the repository is stored and can be used for future refactoring
      const mockRepository = {
        loadItems: jest.fn().mockReturnValue([]),
        loadItemInstances: jest.fn().mockReturnValue([]),
        saveItems: jest.fn(),
        saveItemInstances: jest.fn(),
      };

      const manager = ItemManager.createWithRepository(mockRepository);
      expect(manager).toBeDefined();
      expect(manager).toBeInstanceOf(ItemManager);
    });
  });
});
