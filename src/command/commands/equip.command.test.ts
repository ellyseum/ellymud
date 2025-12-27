/**
 * Unit tests for EquipCommand
 * @module command/commands/equip.command.test
 */

import { EquipCommand } from './equip.command';
import { GameItem, EquipmentSlot } from '../../types';
import { createMockClient, createMockUser } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

jest.mock('../../utils/itemNameColorizer', () => ({
  colorizeItemName: jest.fn((name: string) => name),
  stripColorCodes: jest.fn((text: string) => text),
}));

jest.mock('../../utils/logger', () => ({
  getPlayerLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockGetItemInstance = jest.fn();
const mockGetItem = jest.fn();
const mockCalculateAttack = jest.fn();
const mockCalculateDefense = jest.fn();
const mockCalculateStatBonuses = jest.fn();
const mockAddItemHistory = jest.fn();

jest.mock('../../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn().mockReturnValue({
      getItemInstance: (id: string) => mockGetItemInstance(id),
      getItem: (id: string) => mockGetItem(id),
      calculateAttack: () => mockCalculateAttack(),
      calculateDefense: () => mockCalculateDefense(),
      calculateStatBonuses: () => mockCalculateStatBonuses(),
      addItemHistory: (id: string, event: string, desc: string) =>
        mockAddItemHistory(id, event, desc),
    }),
  },
}));

const mockUpdateUserStats = jest.fn();

jest.mock('../../user/userManager', () => ({
  UserManager: {
    getInstance: jest.fn().mockReturnValue({
      updateUserStats: (username: string, stats: Record<string, unknown>) =>
        mockUpdateUserStats(username, stats),
    }),
  },
}));

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('EquipCommand', () => {
  let equipCommand: EquipCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemInstance.mockReturnValue(null);
    mockGetItem.mockReturnValue(null);
    mockCalculateAttack.mockReturnValue(10);
    mockCalculateDefense.mockReturnValue(5);
    mockCalculateStatBonuses.mockReturnValue({});
    equipCommand = new EquipCommand();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(equipCommand.name).toBe('equip');
    });

    it('should have a description', () => {
      expect(equipCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      equipCommand.execute(client, 'sword');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should show error when no item is specified', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      equipCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('What would you like to equip?')
      );
    });

    it('should show error when item not found in inventory', () => {
      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      equipCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't have an item called")
      );
    });

    it('should show error when item found in inventory but not in database', () => {
      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(undefined);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['unknown-item'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      equipCommand.execute(client, 'unknown-item');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('found in inventory but not in the database')
      );
    });

    it('should show error when item cannot be equipped (no slot)', () => {
      const mockItem: GameItem = {
        id: 'potion',
        name: 'Health Potion',
        description: 'A potion',
        type: 'consumable',
        value: 50,
        // No slot defined
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(mockItem);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['potion'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      equipCommand.execute(client, 'potion');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('cannot be equipped')
      );
    });

    it('should equip item when requirements are met', () => {
      const mockItem: GameItem = {
        id: 'sword',
        name: 'Iron Sword',
        description: 'A sword',
        type: 'weapon',
        value: 100,
        slot: EquipmentSlot.MAIN_HAND,
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(mockItem);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
          equipment: {},
        }),
      });

      equipCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('You equip'));
      expect(mockUpdateUserStats).toHaveBeenCalled();
    });

    it('should show error when level requirement not met', () => {
      const mockItem: GameItem = {
        id: 'epic-sword',
        name: 'Epic Sword',
        description: 'A powerful sword',
        type: 'weapon',
        value: 1000,
        slot: EquipmentSlot.MAIN_HAND,
        requirements: {
          level: 10,
        },
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(mockItem);

      const client = createMockClient({
        user: createMockUser({
          level: 5,
          inventory: {
            items: ['epic-sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      equipCommand.execute(client, 'epic-sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't meet the requirements")
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Requires Level:')
      );
    });

    it('should show error when strength requirement not met', () => {
      const mockItem: GameItem = {
        id: 'heavy-axe',
        name: 'Heavy Axe',
        description: 'A heavy axe',
        type: 'weapon',
        value: 200,
        slot: EquipmentSlot.MAIN_HAND,
        requirements: {
          strength: 20,
        },
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(mockItem);

      const client = createMockClient({
        user: createMockUser({
          strength: 10,
          inventory: {
            items: ['heavy-axe'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      equipCommand.execute(client, 'heavy-axe');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't meet the requirements")
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Requires Strength:')
      );
    });

    it('should show error when dexterity requirement not met', () => {
      const mockItem: GameItem = {
        id: 'dagger',
        name: 'Swift Dagger',
        description: 'A swift dagger',
        type: 'weapon',
        value: 150,
        slot: EquipmentSlot.MAIN_HAND,
        requirements: {
          dexterity: 15,
        },
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(mockItem);

      const client = createMockClient({
        user: createMockUser({
          dexterity: 10,
          inventory: {
            items: ['dagger'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      equipCommand.execute(client, 'dagger');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't meet the requirements")
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Requires Dexterity:')
      );
    });

    it('should unequip current item when equipping new item in same slot', () => {
      const mockSword: GameItem = {
        id: 'old-sword',
        name: 'Old Sword',
        description: 'An old sword',
        type: 'weapon',
        value: 50,
        slot: EquipmentSlot.MAIN_HAND,
      };

      const mockNewSword: GameItem = {
        id: 'new-sword',
        name: 'New Sword',
        description: 'A new sword',
        type: 'weapon',
        value: 100,
        slot: EquipmentSlot.MAIN_HAND,
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockImplementation((id: string) => {
        if (id === 'old-sword') return mockSword;
        if (id === 'new-sword') return mockNewSword;
        return null;
      });

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['new-sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
          equipment: {
            mainHand: 'old-sword',
          },
        }),
      });

      equipCommand.execute(client, 'new-sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('You unequip')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('You equip'));
    });

    it('should display stat bonuses when equipping item with stats', () => {
      const mockItem: GameItem = {
        id: 'power-sword',
        name: 'Power Sword',
        description: 'A powerful sword',
        type: 'weapon',
        value: 500,
        slot: EquipmentSlot.MAIN_HAND,
        stats: {
          attack: 10,
          defense: 5,
          strength: 3,
        },
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(mockItem);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['power-sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
          equipment: {},
        }),
      });

      equipCommand.execute(client, 'power-sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Attack: +10')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Defense: +5')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Strength: +3')
      );
    });

    it('should equip item instance with custom name', () => {
      const mockTemplate: GameItem = {
        id: 'sword-template',
        name: 'Sword',
        description: 'A sword',
        type: 'weapon',
        value: 100,
        slot: EquipmentSlot.MAIN_HAND,
      };

      mockGetItemInstance.mockReturnValue({
        instanceId: 'sword-instance-1',
        templateId: 'sword-template',
        properties: { customName: 'Excalibur' },
      });
      mockGetItem.mockReturnValue(mockTemplate);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword-instance-1'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
          equipment: {},
        }),
      });

      equipCommand.execute(client, 'excalibur');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('You equip'));
      expect(mockAddItemHistory).toHaveBeenCalledWith(
        'sword-instance-1',
        'equip',
        expect.stringContaining('Equipped by')
      );
    });

    it('should initialize equipment object if not present', () => {
      const mockItem: GameItem = {
        id: 'shield',
        name: 'Wooden Shield',
        description: 'A shield',
        type: 'armor',
        value: 50,
        slot: EquipmentSlot.OFF_HAND,
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(mockItem);

      const user = createMockUser({
        inventory: {
          items: ['shield'],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      });
      delete user.equipment;

      const client = createMockClient({ user });

      equipCommand.execute(client, 'shield');

      expect(user.equipment).toBeDefined();
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('You equip'));
    });

    it('should find item by exact instance ID', () => {
      const mockTemplate: GameItem = {
        id: 'sword-template',
        name: 'Sword',
        description: 'A sword',
        type: 'weapon',
        value: 100,
        slot: EquipmentSlot.MAIN_HAND,
      };

      mockGetItemInstance.mockReturnValue({
        instanceId: 'exact-id-12345',
        templateId: 'sword-template',
        properties: {},
      });
      mockGetItem.mockReturnValue(mockTemplate);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['exact-id-12345'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
          equipment: {},
        }),
      });

      equipCommand.execute(client, 'exact-id-12345');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('You equip'));
    });

    it('should handle item with all attribute bonuses', () => {
      const mockItem: GameItem = {
        id: 'magic-ring',
        name: 'Ring of Power',
        description: 'A powerful ring',
        type: 'armor',
        value: 1000,
        slot: EquipmentSlot.FINGER,
        stats: {
          dexterity: 2,
          agility: 2,
          constitution: 2,
          wisdom: 2,
          intelligence: 2,
          charisma: 2,
        },
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(mockItem);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['magic-ring'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
          equipment: {},
        }),
      });

      equipCommand.execute(client, 'magic-ring');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Dexterity: +2')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Agility: +2')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Constitution: +2')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Wisdom: +2'));
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Intelligence: +2')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Charisma: +2')
      );
    });

    it('should add history when unequipping item instance', () => {
      const mockOldItem: GameItem = {
        id: 'old-ring-template',
        name: 'Old Ring',
        description: 'An old ring',
        type: 'armor',
        value: 50,
        slot: EquipmentSlot.FINGER,
      };

      const mockNewItem: GameItem = {
        id: 'new-ring-template',
        name: 'New Ring',
        description: 'A new ring',
        type: 'armor',
        value: 100,
        slot: EquipmentSlot.FINGER,
      };

      mockGetItemInstance.mockImplementation((id: string) => {
        if (id === 'old-ring-instance') {
          return {
            instanceId: 'old-ring-instance',
            templateId: 'old-ring-template',
            properties: {},
          };
        }
        if (id === 'new-ring-instance') {
          return {
            instanceId: 'new-ring-instance',
            templateId: 'new-ring-template',
            properties: {},
          };
        }
        return null;
      });

      mockGetItem.mockImplementation((id: string) => {
        if (id === 'old-ring-template') return mockOldItem;
        if (id === 'new-ring-template') return mockNewItem;
        return null;
      });

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['new-ring-instance'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
          equipment: {
            finger: 'old-ring-instance',
          },
        }),
      });

      equipCommand.execute(client, 'new ring');

      expect(mockAddItemHistory).toHaveBeenCalledWith(
        'old-ring-instance',
        'unequip',
        expect.stringContaining('Unequipped by')
      );
    });
  });
});
