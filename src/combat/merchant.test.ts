/**
 * Unit tests for Merchant class
 * @module combat/merchant.test
 */

import { Merchant, MerchantData } from './merchant';
import { MerchantStockConfig, NPCInventoryItem } from '../types';

// Mock dependencies
jest.mock('../utils/logger', () => ({
  createContextLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn().mockReturnValue({
      canCreateInstance: jest.fn().mockReturnValue(true),
      createItemInstance: jest.fn().mockImplementation((itemId: string, _source: string) => ({
        instanceId: `instance-${itemId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        templateId: itemId,
      })),
      getItemInstance: jest.fn().mockImplementation((instanceId: string) => {
        if (instanceId.includes('orphaned')) return undefined;
        return {
          instanceId,
          templateId: instanceId.split('-')[1] || 'item',
        };
      }),
      getItem: jest.fn().mockImplementation((templateId: string) => ({
        id: templateId,
        name: `Item ${templateId}`,
        description: `Description of ${templateId}`,
        type: 'misc',
        value: 100,
      })),
    }),
  },
}));

// Helper to create merchant data
const createMerchantData = (overrides: Partial<MerchantData> = {}): MerchantData => ({
  id: 'test-merchant-001',
  name: 'Test Merchant',
  description: 'A test merchant.',
  health: 100,
  maxHealth: 100,
  damage: [1, 3] as [number, number],
  isHostile: false,
  isPassive: true,
  experienceValue: 0,
  attackTexts: ['attacks $TARGET$'],
  deathMessages: ['falls'],
  merchant: true,
  ...overrides,
});

describe('Merchant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a Merchant with provided values', () => {
      const merchant = new Merchant('Shop Keeper', 100, 100);

      expect(merchant.name).toBe('Shop Keeper');
      expect(merchant.health).toBe(100);
      expect(merchant.maxHealth).toBe(100);
      expect(merchant.isPassive).toBe(true);
      expect(merchant.experienceValue).toBe(0);
    });

    it('should use default values for passive and experience', () => {
      const merchant = new Merchant('Vendor', 50, 50);

      expect(merchant.isPassive).toBe(true);
      expect(merchant.experienceValue).toBe(0);
    });

    it('should initialize stockConfig from NPCInventoryItem if no stockConfig provided', () => {
      const npcInventory: NPCInventoryItem[] = [
        { itemId: 'sword-001', itemCount: 5, spawnRate: 1.0 },
        { itemId: 'potion-001', itemCount: { min: 2, max: 10 }, spawnRate: 0.8 },
      ];

      const merchant = new Merchant(
        'Blacksmith',
        100,
        100,
        [1, 3],
        false,
        true,
        0,
        'A blacksmith.',
        undefined,
        undefined,
        undefined,
        undefined,
        npcInventory
      );

      expect(merchant.stockConfig.length).toBe(2);
      expect(merchant.stockConfig[0].templateId).toBe('sword-001');
      expect(merchant.stockConfig[0].maxStock).toBe(5);
      expect(merchant.stockConfig[1].templateId).toBe('potion-001');
      expect(merchant.stockConfig[1].maxStock).toBe(10);
    });

    it('should use provided stockConfig when given', () => {
      const stockConfig: MerchantStockConfig[] = [
        {
          templateId: 'armor-001',
          maxStock: 3,
          restockAmount: 1,
          restockPeriod: 12,
          restockUnit: 'hours',
        },
      ];

      const merchant = new Merchant(
        'Armorer',
        100,
        100,
        [1, 3],
        false,
        true,
        0,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        [],
        stockConfig
      );

      expect(merchant.stockConfig).toEqual(stockConfig);
    });
  });

  describe('isMerchant', () => {
    it('should return true for Merchant', () => {
      const merchant = new Merchant('Vendor', 100, 100);
      expect(merchant.isMerchant()).toBe(true);
    });
  });

  describe('fromMerchantData', () => {
    it('should create Merchant from MerchantData object', () => {
      const data = createMerchantData();
      const merchant = Merchant.fromMerchantData(data);

      expect(merchant.name).toBe('Test Merchant');
      expect(merchant.health).toBe(100);
      expect(merchant.maxHealth).toBe(100);
      expect(merchant.isHostile).toBe(false);
      expect(merchant.isPassive).toBe(true);
      expect(merchant.templateId).toBe('test-merchant-001');
    });

    it('should handle MerchantData with inventory', () => {
      const inventory: NPCInventoryItem[] = [
        { itemId: 'gold-coins', itemCount: 10, spawnRate: 1.0 },
      ];
      const data = createMerchantData({ inventory });
      const merchant = Merchant.fromMerchantData(data);

      expect(merchant.inventory).toEqual(inventory);
    });

    it('should handle MerchantData with stockConfig', () => {
      const stockConfig: MerchantStockConfig[] = [
        {
          templateId: 'sword-001',
          maxStock: 5,
          restockAmount: 2,
          restockPeriod: 24,
          restockUnit: 'hours',
        },
      ];
      const data = createMerchantData({ stockConfig });
      const merchant = Merchant.fromMerchantData(data);

      expect(merchant.stockConfig).toEqual(stockConfig);
    });
  });

  describe('addItem', () => {
    it('should add item instance to inventory', () => {
      const merchant = new Merchant('Vendor', 100, 100);

      merchant.addItem('item-instance-123');

      expect(merchant.actualInventory).toContain('item-instance-123');
    });

    it('should accumulate multiple items', () => {
      const merchant = new Merchant('Vendor', 100, 100);

      merchant.addItem('item-1');
      merchant.addItem('item-2');
      merchant.addItem('item-3');

      expect(merchant.actualInventory).toHaveLength(3);
    });
  });

  describe('removeItem', () => {
    it('should remove item from inventory and return true', () => {
      const merchant = new Merchant('Vendor', 100, 100);
      merchant.actualInventory = ['item-1', 'item-2', 'item-3'];

      const result = merchant.removeItem('item-2');

      expect(result).toBe(true);
      expect(merchant.actualInventory).not.toContain('item-2');
      expect(merchant.actualInventory).toHaveLength(2);
    });

    it('should return false when item not found', () => {
      const merchant = new Merchant('Vendor', 100, 100);
      merchant.actualInventory = ['item-1', 'item-2'];

      const result = merchant.removeItem('item-nonexistent');

      expect(result).toBe(false);
      expect(merchant.actualInventory).toHaveLength(2);
    });
  });

  describe('getInventoryState', () => {
    it('should return current inventory state', () => {
      const stockConfig: MerchantStockConfig[] = [
        {
          templateId: 'sword-001',
          maxStock: 5,
          restockAmount: 2,
          restockPeriod: 24,
          restockUnit: 'hours',
        },
      ];
      const merchant = new Merchant(
        'Vendor',
        100,
        100,
        [1, 3],
        false,
        true,
        0,
        undefined,
        undefined,
        undefined,
        'vendor-template',
        'vendor-instance-123',
        [],
        stockConfig,
        ['item-1', 'item-2']
      );

      const state = merchant.getInventoryState();

      expect(state.npcInstanceId).toBe('vendor-instance-123');
      expect(state.npcTemplateId).toBe('vendor-template');
      expect(state.actualInventory).toEqual(['item-1', 'item-2']);
      expect(state.stockConfig).toEqual(stockConfig);
    });

    it('should return a copy of arrays, not references', () => {
      const merchant = new Merchant('Vendor', 100, 100);
      merchant.actualInventory = ['item-1'];

      const state = merchant.getInventoryState();
      state.actualInventory.push('item-2');

      expect(merchant.actualInventory).toHaveLength(1);
    });
  });

  describe('initializeInventory', () => {
    it('should create items based on stock config', () => {
      const stockConfig: MerchantStockConfig[] = [
        {
          templateId: 'sword-001',
          maxStock: 3,
          restockAmount: 1,
          restockPeriod: 24,
          restockUnit: 'hours',
        },
      ];
      const merchant = new Merchant(
        'Vendor',
        100,
        100,
        [1, 3],
        false,
        true,
        0,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        [],
        stockConfig
      );

      merchant.initializeInventory();

      expect(merchant.actualInventory.length).toBe(3);
    });

    it('should set lastRestock on stock config', () => {
      const stockConfig: MerchantStockConfig[] = [
        {
          templateId: 'potion-001',
          maxStock: 2,
          restockAmount: 1,
          restockPeriod: 12,
          restockUnit: 'hours',
        },
      ];
      const merchant = new Merchant(
        'Vendor',
        100,
        100,
        [1, 3],
        false,
        true,
        0,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        [],
        stockConfig
      );

      merchant.initializeInventory();

      expect(merchant.stockConfig[0].lastRestock).toBeDefined();
    });
  });

  describe('restoreInventory', () => {
    it('should restore inventory from state', () => {
      const merchant = new Merchant('Vendor', 100, 100);
      const state = {
        npcInstanceId: 'vendor-instance',
        npcTemplateId: 'vendor-template',
        actualInventory: ['instance-item-1', 'instance-item-2'],
        stockConfig: [
          {
            templateId: 'sword-001',
            maxStock: 5,
            restockAmount: 2,
            restockPeriod: 24,
            restockUnit: 'hours' as const,
          },
        ],
      };

      merchant.restoreInventory(state);

      expect(merchant.actualInventory).toHaveLength(2);
      expect(merchant.stockConfig).toEqual(state.stockConfig);
    });

    it('should filter out orphaned item instances', () => {
      const merchant = new Merchant('Vendor', 100, 100);
      const state = {
        npcInstanceId: 'vendor-instance',
        npcTemplateId: 'vendor-template',
        actualInventory: ['instance-item-1', 'orphaned-item', 'instance-item-2'],
        stockConfig: [],
      };

      merchant.restoreInventory(state);

      expect(merchant.actualInventory).not.toContain('orphaned-item');
      expect(merchant.actualInventory).toHaveLength(2);
    });
  });

  describe('checkRestock', () => {
    it('should not restock if not enough time has passed', () => {
      const stockConfig: MerchantStockConfig[] = [
        {
          templateId: 'sword-001',
          maxStock: 5,
          restockAmount: 2,
          restockPeriod: 24,
          restockUnit: 'hours',
          lastRestock: new Date().toISOString(),
        },
      ];
      const merchant = new Merchant(
        'Vendor',
        100,
        100,
        [1, 3],
        false,
        true,
        0,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        [],
        stockConfig
      );

      const restocked = merchant.checkRestock();

      expect(restocked).toBe(false);
    });

    it('should restock when enough time has passed', () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const stockConfig: MerchantStockConfig[] = [
        {
          templateId: 'sword-001',
          maxStock: 5,
          restockAmount: 2,
          restockPeriod: 24,
          restockUnit: 'hours',
          lastRestock: oldDate.toISOString(),
        },
      ];
      const merchant = new Merchant(
        'Vendor',
        100,
        100,
        [1, 3],
        false,
        true,
        0,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        [],
        stockConfig
      );

      const restocked = merchant.checkRestock();

      expect(restocked).toBe(true);
      expect(merchant.actualInventory.length).toBeGreaterThan(0);
    });
  });

  describe('findItemByName', () => {
    it('should find item by partial name match', () => {
      const merchant = new Merchant('Vendor', 100, 100);
      merchant.actualInventory = ['instance-sword-1'];

      const found = merchant.findItemByName('sword');

      expect(found).toBe('instance-sword-1');
    });

    it('should return undefined when item not found', () => {
      const merchant = new Merchant('Vendor', 100, 100);
      merchant.actualInventory = ['instance-sword-1'];

      const found = merchant.findItemByName('axe');

      expect(found).toBeUndefined();
    });
  });

  describe('getInventoryGrouped', () => {
    it('should group inventory by template', () => {
      const merchant = new Merchant('Vendor', 100, 100);
      merchant.actualInventory = ['instance-sword-1', 'instance-sword-2', 'instance-potion-1'];

      const grouped = merchant.getInventoryGrouped();

      expect(grouped.size).toBe(2);
    });
  });

  describe('inherited NPC functionality', () => {
    it('should still function as an NPC', () => {
      const merchant = new Merchant('Vendor', 100, 100, [5, 10]);

      expect(merchant.isAlive()).toBe(true);
      expect(merchant.isUser()).toBe(false);
      expect(merchant.getName()).toBe('Vendor');
    });

    it('should be able to take damage', () => {
      const merchant = new Merchant('Vendor', 100, 100);
      merchant.takeDamage(30);
      expect(merchant.health).toBe(70);
    });
  });
});
