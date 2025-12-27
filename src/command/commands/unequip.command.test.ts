/**
 * Unit tests for UnequipCommand
 * @module command/commands/unequip.command.test
 */

import { UnequipCommand } from './unequip.command';
import { GameItem } from '../../types';
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

const mockGetItemInstance = jest.fn();
const mockGetItem = jest.fn();
const mockCalculateAttack = jest.fn();
const mockCalculateDefense = jest.fn();
const mockAddItemHistory = jest.fn();

jest.mock('../../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn().mockReturnValue({
      getItemInstance: (id: string) => mockGetItemInstance(id),
      getItem: (id: string) => mockGetItem(id),
      calculateAttack: () => mockCalculateAttack(),
      calculateDefense: () => mockCalculateDefense(),
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

describe('UnequipCommand', () => {
  let unequipCommand: UnequipCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemInstance.mockReturnValue(null);
    mockGetItem.mockReturnValue(null);
    mockCalculateAttack.mockReturnValue(10);
    mockCalculateDefense.mockReturnValue(5);
    unequipCommand = new UnequipCommand();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(unequipCommand.name).toBe('unequip');
    });

    it('should have a description', () => {
      expect(unequipCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      unequipCommand.execute(client, 'sword');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should show error when no argument is provided', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      unequipCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('What would you like to unequip?')
      );
    });

    it('should show error when user has no equipment', () => {
      const client = createMockClient({
        user: createMockUser({
          equipment: {},
        }),
      });

      unequipCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't have any equipment equipped")
      );
    });

    it('should show error when user equipment is undefined', () => {
      const user = createMockUser();
      delete user.equipment;
      const client = createMockClient({ user });

      unequipCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't have any equipment equipped")
      );
    });

    it('should unequip item by slot name', () => {
      const mockItem: GameItem = {
        id: 'sword',
        name: 'Iron Sword',
        description: 'A sword',
        type: 'weapon',
        value: 100,
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(mockItem);

      const client = createMockClient({
        user: createMockUser({
          equipment: {
            weapon: 'sword',
          },
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      unequipCommand.execute(client, 'weapon');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('You unequip')
      );
      expect(mockUpdateUserStats).toHaveBeenCalled();
    });

    it('should unequip item by item name', () => {
      const mockItem: GameItem = {
        id: 'sword',
        name: 'Iron Sword',
        description: 'A sword',
        type: 'weapon',
        value: 100,
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(mockItem);

      const client = createMockClient({
        user: createMockUser({
          equipment: {
            weapon: 'sword',
          },
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      unequipCommand.execute(client, 'iron sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('You unequip')
      );
    });

    it('should unequip item by partial name match', () => {
      const mockItem: GameItem = {
        id: 'sword',
        name: 'Iron Sword',
        description: 'A sword',
        type: 'weapon',
        value: 100,
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(mockItem);

      const client = createMockClient({
        user: createMockUser({
          equipment: {
            weapon: 'sword',
          },
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      unequipCommand.execute(client, 'iron');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('You unequip')
      );
    });

    it('should show error when item not found equipped', () => {
      const mockItem: GameItem = {
        id: 'sword',
        name: 'Iron Sword',
        description: 'A sword',
        type: 'weapon',
        value: 100,
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(mockItem);

      const client = createMockClient({
        user: createMockUser({
          equipment: {
            weapon: 'sword',
          },
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      unequipCommand.execute(client, 'shield');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't have anything called")
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Available slots:')
      );
    });

    it('should show stat loss when unequipping item with stats', () => {
      const mockItem: GameItem = {
        id: 'power-sword',
        name: 'Power Sword',
        description: 'A powerful sword',
        type: 'weapon',
        value: 500,
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
          equipment: {
            weapon: 'power-sword',
          },
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      unequipCommand.execute(client, 'weapon');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Attack: -10')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Defense: -5')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Strength: -3')
      );
    });

    it('should unequip item instance and add history', () => {
      const mockTemplate: GameItem = {
        id: 'sword-template',
        name: 'Sword',
        description: 'A sword',
        type: 'weapon',
        value: 100,
      };

      mockGetItemInstance.mockReturnValue({
        instanceId: 'sword-instance-1',
        templateId: 'sword-template',
        properties: {},
      });
      mockGetItem.mockReturnValue(mockTemplate);

      const client = createMockClient({
        user: createMockUser({
          equipment: {
            weapon: 'sword-instance-1',
          },
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      unequipCommand.execute(client, 'weapon');

      expect(mockAddItemHistory).toHaveBeenCalledWith(
        'sword-instance-1',
        'unequip',
        expect.stringContaining('Unequipped from')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('You unequip')
      );
    });

    it('should unequip item instance with custom name', () => {
      const mockTemplate: GameItem = {
        id: 'sword-template',
        name: 'Sword',
        description: 'A sword',
        type: 'weapon',
        value: 100,
      };

      mockGetItemInstance.mockReturnValue({
        instanceId: 'sword-instance-1',
        templateId: 'sword-template',
        properties: { customName: 'Excalibur' },
      });
      mockGetItem.mockReturnValue(mockTemplate);

      const client = createMockClient({
        user: createMockUser({
          equipment: {
            weapon: 'sword-instance-1',
          },
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      unequipCommand.execute(client, 'excalibur');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('You unequip')
      );
    });

    it('should handle partial match with custom name', () => {
      const mockTemplate: GameItem = {
        id: 'sword-template',
        name: 'Sword',
        description: 'A sword',
        type: 'weapon',
        value: 100,
      };

      mockGetItemInstance.mockReturnValue({
        instanceId: 'sword-instance-1',
        templateId: 'sword-template',
        properties: { customName: 'Legendary Excalibur' },
      });
      mockGetItem.mockReturnValue(mockTemplate);

      const client = createMockClient({
        user: createMockUser({
          equipment: {
            weapon: 'sword-instance-1',
          },
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      unequipCommand.execute(client, 'excal');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('You unequip')
      );
    });

    it('should show error when item template not found for instance', () => {
      mockGetItemInstance.mockReturnValue({
        instanceId: 'broken-instance',
        templateId: 'missing-template',
        properties: {},
      });
      mockGetItem.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser({
          equipment: {
            weapon: 'broken-instance',
          },
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      unequipCommand.execute(client, 'weapon');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Item template not found')
      );
    });

    it('should show error when legacy item not found in database', () => {
      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser({
          equipment: {
            weapon: 'unknown-item',
          },
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      unequipCommand.execute(client, 'weapon');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('not found in the database')
      );
    });

    it('should format slot names with underscores correctly', () => {
      const mockItem: GameItem = {
        id: 'gloves',
        name: 'Leather Gloves',
        description: 'Gloves',
        type: 'armor',
        value: 50,
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(mockItem);

      const client = createMockClient({
        user: createMockUser({
          equipment: {
            left_hand: 'gloves',
          },
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      unequipCommand.execute(client, 'left_hand');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Left Hand'));
    });

    it('should add item back to inventory when unequipping', () => {
      const mockItem: GameItem = {
        id: 'sword',
        name: 'Iron Sword',
        description: 'A sword',
        type: 'weapon',
        value: 100,
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(mockItem);

      const user = createMockUser({
        equipment: {
          weapon: 'sword',
        },
        inventory: {
          items: [],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      });
      const client = createMockClient({ user });

      unequipCommand.execute(client, 'weapon');

      expect(user.inventory.items).toContain('sword');
      expect(user.equipment!['weapon']).toBeUndefined();
    });

    it('should handle item instance with attribute bonuses', () => {
      const mockTemplate: GameItem = {
        id: 'ring-template',
        name: 'Magic Ring',
        description: 'A magic ring',
        type: 'armor',
        value: 200,
        stats: {
          dexterity: 2,
          agility: 2,
          constitution: 2,
          wisdom: 2,
          intelligence: 2,
          charisma: 2,
        },
      };

      mockGetItemInstance.mockReturnValue({
        instanceId: 'ring-instance',
        templateId: 'ring-template',
        properties: {},
      });
      mockGetItem.mockReturnValue(mockTemplate);

      const client = createMockClient({
        user: createMockUser({
          equipment: {
            ring: 'ring-instance',
          },
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      unequipCommand.execute(client, 'ring');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Dexterity: -2')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Agility: -2')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Constitution: -2')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Wisdom: -2'));
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Intelligence: -2')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Charisma: -2')
      );
    });

    it('should initialize inventory.items if missing', () => {
      const mockItem: GameItem = {
        id: 'sword',
        name: 'Iron Sword',
        description: 'A sword',
        type: 'weapon',
        value: 100,
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(mockItem);

      const user = createMockUser({
        equipment: {
          weapon: 'sword',
        },
        inventory: {
          items: undefined as unknown as string[],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      });
      const client = createMockClient({ user });

      unequipCommand.execute(client, 'weapon');

      expect(user.inventory.items).toBeDefined();
      expect(user.inventory.items).toContain('sword');
    });
  });
});
