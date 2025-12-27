/**
 * Unit tests for InventoryCommand
 * @module command/commands/inventory.command.test
 */

import { InventoryCommand } from './inventory.command';
import { User, GameItem } from '../../types';
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

jest.mock('../../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn().mockReturnValue({
      getItemInstance: (id: string) => mockGetItemInstance(id),
      getItem: (id: string) => mockGetItem(id),
    }),
  },
}));

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('InventoryCommand', () => {
  let inventoryCommand: InventoryCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemInstance.mockReset();
    mockGetItem.mockReset();
    inventoryCommand = new InventoryCommand();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(inventoryCommand.name).toBe('inventory');
    });

    it('should have a description', () => {
      expect(inventoryCommand.description).toBeDefined();
    });

    it('should have aliases', () => {
      expect(inventoryCommand.aliases).toContain('inv');
      expect(inventoryCommand.aliases).toContain('i');
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      inventoryCommand.execute(client, '');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should display inventory header', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      inventoryCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Inventory'));
    });

    it('should initialize inventory if missing', () => {
      const user = createMockUser();
      // Remove inventory completely
      delete (user as Partial<User>).inventory;

      const client = createMockClient({ user });

      inventoryCommand.execute(client, '');

      expect(user.inventory).toBeDefined();
      expect(user.inventory?.items).toEqual([]);
      expect(user.inventory?.currency).toEqual({ gold: 0, silver: 0, copper: 0 });
    });

    it('should display currency: None when no currency', () => {
      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      inventoryCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('None'));
    });

    it('should display gold currency', () => {
      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: [],
            currency: { gold: 10, silver: 0, copper: 0 },
          },
        }),
      });

      inventoryCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('10 gold'));
    });

    it('should display silver currency', () => {
      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: [],
            currency: { gold: 0, silver: 25, copper: 0 },
          },
        }),
      });

      inventoryCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('25 silver'));
    });

    it('should display copper currency', () => {
      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 50 },
          },
        }),
      });

      inventoryCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('50 copper'));
    });

    it('should use singular for 1 gold piece', () => {
      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: [],
            currency: { gold: 1, silver: 0, copper: 0 },
          },
        }),
      });

      inventoryCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('1 gold piece\r\n')
      );
    });

    it('should display items when present', () => {
      const mockItem: GameItem = {
        id: 'sword',
        name: 'Iron Sword',
        description: 'A basic sword',
        type: 'weapon',
        value: 100,
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(mockItem);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      inventoryCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Items (1)'));
    });

    it('should show equipped status for equipped items', () => {
      const mockItem: GameItem = {
        id: 'sword',
        name: 'Iron Sword',
        description: 'A basic sword',
        type: 'weapon',
        value: 100,
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(mockItem);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
          equipment: {
            weapon: 'sword',
          },
        }),
      });

      inventoryCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('(equipped)'));
    });

    it('should display Items: None when no items', () => {
      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      inventoryCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Items: None')
      );
    });

    it('should handle item instances with custom names', () => {
      const mockTemplate: GameItem = {
        id: 'sword_template',
        name: 'Sword',
        description: 'A sword',
        type: 'weapon',
        value: 100,
      };

      mockGetItemInstance.mockReturnValue({
        id: 'sword_instance_1',
        templateId: 'sword_template',
        properties: { customName: 'Excalibur' },
      });
      mockGetItem.mockReturnValue(mockTemplate);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword_instance_1'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      inventoryCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Items (1)'));
    });

    it('should handle unknown items', () => {
      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(undefined);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['unknown_item'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      inventoryCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Unknown'));
    });

    it('should group items by type', () => {
      const mockSword: GameItem = {
        id: 'sword',
        name: 'Iron Sword',
        description: 'A sword',
        type: 'weapon',
        value: 100,
      };

      const mockShield: GameItem = {
        id: 'shield',
        name: 'Wooden Shield',
        description: 'A shield',
        type: 'armor',
        value: 50,
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockImplementation((id: string) => {
        if (id === 'sword') return mockSword;
        if (id === 'shield') return mockShield;
        return undefined;
      });

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword', 'shield'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      inventoryCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('weapon'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('armor'));
    });
  });
});
