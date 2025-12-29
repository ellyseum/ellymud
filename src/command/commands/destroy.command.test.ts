/**
 * Unit tests for DestroyCommand
 * @module command/commands/destroy.command.test
 */

import { createMockClient, createMockUser } from '../../test/helpers/mockFactories';

// Mock dependencies first before imports
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
  createContextLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
  getPlayerLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockGetItemInstance = jest.fn();
const mockGetItem = jest.fn();
const mockDeleteItemInstance = jest.fn();
const mockFindInstanceByPartialId = jest.fn();

jest.mock('../../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn().mockReturnValue({
      getItemInstance: (id: string) => mockGetItemInstance(id),
      getItem: (id: string) => mockGetItem(id),
      deleteItemInstance: (id: string) => mockDeleteItemInstance(id),
      findInstanceByPartialId: (id: string) => mockFindInstanceByPartialId(id),
    }),
  },
}));

const mockIsAuthorized = jest.fn();

jest.mock('./sudo.command', () => ({
  SudoCommand: {
    getInstance: jest.fn().mockReturnValue({
      isAuthorized: (username: string) => mockIsAuthorized(username),
    }),
  },
}));

jest.mock('../../user/userManager', () => ({
  UserManager: {
    getInstance: jest.fn().mockReturnValue({
      getAllUsers: jest.fn().mockReturnValue([]),
      updateUserInventory: jest.fn(),
      updateUserStats: jest.fn(),
    }),
  },
}));

jest.mock('../../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn().mockReturnValue({
      getAllRooms: jest.fn().mockReturnValue([]),
      updateRoom: jest.fn(),
    }),
  },
}));

import { DestroyCommand } from './destroy.command';
import { writeToClient } from '../../utils/socketWriter';
import { ConnectedClient } from '../../types';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('DestroyCommand', () => {
  let destroyCommand: DestroyCommand;
  let mockClients: Map<string, ConnectedClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClients = new Map();
    mockIsAuthorized.mockReturnValue(true);
    mockGetItemInstance.mockReturnValue(null);
    mockGetItem.mockReturnValue(null);
    mockDeleteItemInstance.mockReturnValue(true);
    destroyCommand = new DestroyCommand(mockClients);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(destroyCommand.name).toBe('destroy');
    });

    it('should have a description', () => {
      expect(destroyCommand.description).toBeDefined();
      expect(destroyCommand.description).toContain('destroy');
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      destroyCommand.execute(client, 'item-123');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should return error if user not authorized', () => {
      mockIsAuthorized.mockReturnValue(false);

      const client = createMockClient({
        user: createMockUser(),
      });

      destroyCommand.execute(client, 'item-123');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('do not have permission')
      );
    });

    it('should show usage when no args provided', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      destroyCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Usage: destroy')
      );
    });

    it('should return error when item instance not found', () => {
      mockGetItemInstance.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser(),
      });

      destroyCommand.execute(client, 'nonexistent-item');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('not found'));
    });

    it('should return error when item template not found', () => {
      mockGetItemInstance.mockReturnValue({
        instanceId: 'item-123',
        templateId: 'template-123',
        properties: {},
      });
      mockGetItem.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser(),
      });

      destroyCommand.execute(client, 'item-123');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Template'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('not found'));
    });

    it('should successfully destroy item', () => {
      mockGetItemInstance.mockReturnValue({
        instanceId: 'item-123',
        templateId: 'sword-template',
        properties: {},
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
        type: 'weapon',
      });
      mockDeleteItemInstance.mockReturnValue(true);

      const client = createMockClient({
        user: createMockUser(),
      });

      destroyCommand.execute(client, 'item-123');

      expect(mockDeleteItemInstance).toHaveBeenCalledWith('item-123');
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Destroyed'));
    });

    it('should try partial ID matching for short IDs', () => {
      mockGetItemInstance.mockReturnValue(null);
      mockFindInstanceByPartialId.mockReturnValue({
        instanceId: 'item-123-full-uuid',
        templateId: 'sword-template',
        properties: {},
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
        type: 'weapon',
      });
      mockDeleteItemInstance.mockReturnValue(true);

      const client = createMockClient({
        user: createMockUser(),
      });

      destroyCommand.execute(client, 'item-123');

      expect(mockFindInstanceByPartialId).toHaveBeenCalledWith('item-123');
    });

    it('should display item custom name if available', () => {
      mockGetItemInstance.mockReturnValue({
        instanceId: 'item-123',
        templateId: 'sword-template',
        properties: { customName: 'Excalibur' },
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
        type: 'weapon',
      });
      mockDeleteItemInstance.mockReturnValue(true);

      const client = createMockClient({
        user: createMockUser(),
      });

      destroyCommand.execute(client, 'item-123');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Destroyed'));
    });

    it('should handle delete failure', () => {
      mockGetItemInstance.mockReturnValue({
        instanceId: 'item-123',
        templateId: 'sword-template',
        properties: {},
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
        type: 'weapon',
      });
      mockDeleteItemInstance.mockReturnValue(false);

      const client = createMockClient({
        user: createMockUser(),
      });

      destroyCommand.execute(client, 'item-123');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Failed to destroy')
      );
    });

    it('should handle partial ID matching error gracefully', () => {
      mockGetItemInstance.mockReturnValue(null);
      mockFindInstanceByPartialId.mockImplementation(() => {
        throw new Error('Multiple matches found');
      });

      const client = createMockClient({
        user: createMockUser(),
      });

      destroyCommand.execute(client, 'item-123');

      // Should continue with normal flow showing item not found
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('not found'));
    });

    it('should not try partial matching for short IDs less than 8 characters', () => {
      mockGetItemInstance.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser(),
      });

      destroyCommand.execute(client, 'short');

      expect(mockFindInstanceByPartialId).not.toHaveBeenCalled();
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('not found'));
    });
  });

  describe('handleConfirmation', () => {
    it('should return early when client has no user', () => {
      const client = createMockClient({ user: null });

      // Access private method
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (destroyCommand as any).handleConfirmation(client);

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('nothing pending')
      );
    });

    it('should return early when no pending destroy', () => {
      const client = createMockClient({
        user: createMockUser(),
        stateData: {},
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (destroyCommand as any).handleConfirmation(client);

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('nothing pending')
      );
    });

    it('should destroy item and clear pending state', () => {
      const mockUser = createMockUser({
        inventory: {
          items: ['item-123', 'item-456'],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      });

      const client = createMockClient({
        user: mockUser,
        stateData: {
          pendingDestroy: {
            itemId: 'item-123',
            index: 0,
            displayName: 'Iron Sword',
          },
        },
      });

      mockGetItemInstance.mockReturnValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (destroyCommand as any).handleConfirmation(client);

      expect(client.user?.inventory.items).toEqual(['item-456']);
      expect(client.stateData.pendingDestroy).toBeUndefined();
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('destroy the')
      );
    });

    it('should add destroy history for item instances', () => {
      const mockAddItemHistory = jest.fn();
      const { ItemManager } = jest.requireMock('../../utils/itemManager');
      ItemManager.getInstance.mockReturnValue({
        getItemInstance: mockGetItemInstance,
        getItem: mockGetItem,
        deleteItemInstance: mockDeleteItemInstance,
        findInstanceByPartialId: mockFindInstanceByPartialId,
        addItemHistory: mockAddItemHistory,
      });

      // Recreate command with new mock
      const testCommand = new DestroyCommand(mockClients);

      mockGetItemInstance.mockReturnValue({
        instanceId: 'item-123',
        templateId: 'sword-template',
        properties: {},
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
        type: 'weapon',
        stats: { damage: 10 },
      });

      const mockUser = createMockUser({
        inventory: {
          items: ['item-123'],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      });

      const client = createMockClient({
        user: mockUser,
        stateData: {
          pendingDestroy: {
            itemId: 'item-123',
            index: 0,
            displayName: 'Iron Sword',
          },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (testCommand as any).handleConfirmation(client);

      expect(mockAddItemHistory).toHaveBeenCalledWith(
        'item-123',
        'destroy',
        expect.stringContaining('Destroyed by')
      );
      expect(mockDeleteItemInstance).toHaveBeenCalledWith('item-123');
    });
  });

  describe('handleCancellation', () => {
    it('should return message when no pending destroy', () => {
      const client = createMockClient({
        user: createMockUser(),
        stateData: {},
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (destroyCommand as any).handleCancellation(client);

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('nothing pending')
      );
    });

    it('should clear pending destroy and notify user', () => {
      const client = createMockClient({
        user: createMockUser(),
        stateData: {
          pendingDestroy: {
            itemId: 'item-123',
            index: 0,
            displayName: 'Iron Sword',
          },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (destroyCommand as any).handleCancellation(client);

      expect(client.stateData.pendingDestroy).toBeUndefined();
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('not to destroy')
      );
    });

    it('should log cancellation when user is present', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'TestPlayer' }),
        stateData: {
          pendingDestroy: {
            itemId: 'item-123',
            index: 0,
            displayName: 'Iron Sword',
          },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (destroyCommand as any).handleCancellation(client);

      expect(client.stateData.pendingDestroy).toBeUndefined();
    });

    it('should handle cancellation when user is null', () => {
      const client = createMockClient({
        user: null,
        stateData: {
          pendingDestroy: {
            itemId: 'item-123',
            index: 0,
            displayName: 'Iron Sword',
          },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (destroyCommand as any).handleCancellation(client);

      expect(client.stateData.pendingDestroy).toBeUndefined();
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('not to destroy')
      );
    });
  });

  describe('findItemInInventory', () => {
    it('should return empty result when user has no inventory', () => {
      const client = createMockClient({
        user: createMockUser({
          inventory: { items: [], currency: { gold: 0, silver: 0, copper: 0 } },
        }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (destroyCommand as any).findItemInInventory(client, 'sword');

      expect(result).toEqual({ itemId: undefined, index: -1, displayName: '' });
    });

    it('should return empty result when client has no user', () => {
      const client = createMockClient({ user: null });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (destroyCommand as any).findItemInInventory(client, 'sword');

      expect(result).toEqual({ itemId: undefined, index: -1, displayName: '' });
    });

    it('should find item by exact instance ID', () => {
      const mockUser = createMockUser({
        inventory: {
          items: ['item-123', 'item-456'],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      });
      const client = createMockClient({ user: mockUser });

      mockGetItemInstance.mockReturnValue({
        instanceId: 'item-123',
        templateId: 'sword-template',
        properties: {},
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (destroyCommand as any).findItemInInventory(client, 'item-123');

      expect(result.itemId).toBe('item-123');
      expect(result.index).toBe(0);
      expect(result.displayName).toBe('Iron Sword');
    });

    it('should find item by case-insensitive ID match', () => {
      const mockUser = createMockUser({
        inventory: {
          items: ['ITEM-123'],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      });
      const client = createMockClient({ user: mockUser });

      mockGetItemInstance.mockReturnValue({
        instanceId: 'ITEM-123',
        templateId: 'sword-template',
        properties: {},
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (destroyCommand as any).findItemInInventory(client, 'item-123');

      expect(result.itemId).toBe('ITEM-123');
      expect(result.index).toBe(0);
    });

    it('should find item by custom name exact match', () => {
      const mockUser = createMockUser({
        inventory: {
          items: ['item-123'],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      });
      const client = createMockClient({ user: mockUser });

      mockGetItemInstance.mockReturnValue({
        instanceId: 'item-123',
        templateId: 'sword-template',
        properties: { customName: 'Excalibur' },
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (destroyCommand as any).findItemInInventory(client, 'Excalibur');

      expect(result.itemId).toBe('item-123');
      expect(result.displayName).toBe('Excalibur');
    });

    it('should find item by template name exact match', () => {
      const mockUser = createMockUser({
        inventory: {
          items: ['item-123'],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      });
      const client = createMockClient({ user: mockUser });

      mockGetItemInstance.mockReturnValue({
        instanceId: 'item-123',
        templateId: 'sword-template',
        properties: {},
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (destroyCommand as any).findItemInInventory(client, 'Iron Sword');

      expect(result.itemId).toBe('item-123');
      expect(result.displayName).toBe('Iron Sword');
    });

    it('should find item by partial custom name match', () => {
      const mockUser = createMockUser({
        inventory: {
          items: ['item-123'],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      });
      const client = createMockClient({ user: mockUser });

      mockGetItemInstance.mockReturnValue({
        instanceId: 'item-123',
        templateId: 'sword-template',
        properties: { customName: 'Ancient Excalibur of Legend' },
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (destroyCommand as any).findItemInInventory(client, 'excalibur');

      expect(result.itemId).toBe('item-123');
    });

    it('should find item by partial template name match', () => {
      const mockUser = createMockUser({
        inventory: {
          items: ['item-123'],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      });
      const client = createMockClient({ user: mockUser });

      mockGetItemInstance.mockReturnValue({
        instanceId: 'item-123',
        templateId: 'sword-template',
        properties: {},
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (destroyCommand as any).findItemInInventory(client, 'iron');

      expect(result.itemId).toBe('item-123');
    });

    it('should find legacy item by name', () => {
      const mockUser = createMockUser({
        inventory: {
          items: ['legacy-sword'],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      });
      const client = createMockClient({ user: mockUser });

      // No instance, but item template exists
      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue({
        id: 'legacy-sword',
        name: 'Old Blade',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (destroyCommand as any).findItemInInventory(client, 'Old Blade');

      expect(result.itemId).toBe('legacy-sword');
      expect(result.displayName).toBe('Old Blade');
    });

    it('should find legacy item by partial name', () => {
      const mockUser = createMockUser({
        inventory: {
          items: ['legacy-sword'],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      });
      const client = createMockClient({ user: mockUser });

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue({
        id: 'legacy-sword',
        name: 'Old Blade',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (destroyCommand as any).findItemInInventory(client, 'blade');

      expect(result.itemId).toBe('legacy-sword');
    });

    it('should return item ID as display name if no template found', () => {
      const mockUser = createMockUser({
        inventory: {
          items: ['unknown-item'],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      });
      const client = createMockClient({ user: mockUser });

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (destroyCommand as any).findItemInInventory(client, 'unknown-item');

      expect(result.itemId).toBe('unknown-item');
      expect(result.displayName).toBe('unknown-item');
    });

    it('should return not found when item name does not match anything', () => {
      const mockUser = createMockUser({
        inventory: {
          items: ['item-123'],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      });
      const client = createMockClient({ user: mockUser });

      mockGetItemInstance.mockReturnValue({
        instanceId: 'item-123',
        templateId: 'sword-template',
        properties: {},
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (destroyCommand as any).findItemInInventory(client, 'shield');

      expect(result).toEqual({ itemId: undefined, index: -1, displayName: '' });
    });
  });

  describe('findAndRemoveItem', () => {
    const mockGetAllUsers = jest.fn();
    const mockUpdateUserInventory = jest.fn();
    const mockUpdateUserStats = jest.fn();
    const mockGetAllRooms = jest.fn();
    const mockUpdateRoom = jest.fn();

    beforeEach(() => {
      const { UserManager } = jest.requireMock('../../user/userManager');
      UserManager.getInstance.mockReturnValue({
        getAllUsers: mockGetAllUsers,
        updateUserInventory: mockUpdateUserInventory,
        updateUserStats: mockUpdateUserStats,
        getActiveUserSession: jest.fn(),
      });

      const { RoomManager } = jest.requireMock('../../room/roomManager');
      RoomManager.getInstance.mockReturnValue({
        getAllRooms: mockGetAllRooms,
        updateRoom: mockUpdateRoom,
      });

      mockGetAllUsers.mockReturnValue([]);
      mockGetAllRooms.mockReturnValue([]);
    });

    it('should find and remove item from user inventory', () => {
      const testCommand = new DestroyCommand(mockClients);
      const testUser = {
        username: 'testuser',
        inventory: { items: ['item-123', 'item-456'], currency: { gold: 0, silver: 0, copper: 0 } },
        equipment: {},
      };
      mockGetAllUsers.mockReturnValue([testUser]);
      mockGetAllRooms.mockReturnValue([]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (testCommand as any).findAndRemoveItem('item-123');

      expect(result).toEqual({ location: 'inventory', owner: 'testuser' });
      expect(testUser.inventory.items).toEqual(['item-456']);
      expect(mockUpdateUserInventory).toHaveBeenCalledWith('testuser', testUser.inventory);
    });

    it('should find and remove item from user equipment', () => {
      const testCommand = new DestroyCommand(mockClients);
      const testUser = {
        username: 'player1',
        inventory: { items: [], currency: { gold: 0, silver: 0, copper: 0 } },
        equipment: { weapon: 'item-123', armor: 'armor-001' },
      };
      mockGetAllUsers.mockReturnValue([testUser]);
      mockGetAllRooms.mockReturnValue([]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (testCommand as any).findAndRemoveItem('item-123');

      expect(result).toEqual({ location: 'equipment (weapon)', owner: 'player1' });
      expect(testUser.equipment).toEqual({ armor: 'armor-001' });
      expect(mockUpdateUserStats).toHaveBeenCalledWith('player1', {
        equipment: testUser.equipment,
      });
    });

    it('should find and remove item from room itemInstances', () => {
      const testCommand = new DestroyCommand(mockClients);
      const mockRoom = {
        id: 'town-square',
        items: [],
        hasItemInstance: jest.fn().mockReturnValue(true),
        removeItemInstance: jest.fn(),
      };
      mockGetAllUsers.mockReturnValue([]);
      mockGetAllRooms.mockReturnValue([mockRoom]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (testCommand as any).findAndRemoveItem('item-123');

      expect(result).toEqual({ location: 'room town-square' });
      expect(mockRoom.removeItemInstance).toHaveBeenCalledWith('item-123');
      expect(mockUpdateRoom).toHaveBeenCalledWith(mockRoom);
    });

    it('should find and remove legacy item from room items array (string)', () => {
      const testCommand = new DestroyCommand(mockClients);
      const mockRoom = {
        id: 'forest',
        items: ['item-123', 'item-456'],
        hasItemInstance: jest.fn().mockReturnValue(false),
        removeItemInstance: jest.fn(),
      };
      mockGetAllUsers.mockReturnValue([]);
      mockGetAllRooms.mockReturnValue([mockRoom]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (testCommand as any).findAndRemoveItem('item-123');

      expect(result).toEqual({ location: 'room forest (legacy item)' });
      expect(mockRoom.items).toEqual(['item-456']);
      expect(mockUpdateRoom).toHaveBeenCalledWith(mockRoom);
    });

    it('should find and remove legacy item from room items array (object with name)', () => {
      const testCommand = new DestroyCommand(mockClients);
      const mockRoom = {
        id: 'cave',
        items: [{ name: 'item-123' }, { name: 'item-456' }],
        hasItemInstance: jest.fn().mockReturnValue(false),
        removeItemInstance: jest.fn(),
      };
      mockGetAllUsers.mockReturnValue([]);
      mockGetAllRooms.mockReturnValue([mockRoom]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (testCommand as any).findAndRemoveItem('item-123');

      expect(result).toEqual({ location: 'room cave (legacy item)' });
      expect(mockRoom.items).toEqual([{ name: 'item-456' }]);
    });

    it('should return empty object when item not found anywhere', () => {
      const testCommand = new DestroyCommand(mockClients);
      mockGetAllUsers.mockReturnValue([
        {
          username: 'player1',
          inventory: { items: [], currency: { gold: 0, silver: 0, copper: 0 } },
          equipment: {},
        },
      ]);
      mockGetAllRooms.mockReturnValue([
        {
          id: 'town',
          items: [],
          hasItemInstance: jest.fn().mockReturnValue(false),
        },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (testCommand as any).findAndRemoveItem('nonexistent');

      expect(result).toEqual({});
    });
  });

  describe('execute with owner notification', () => {
    const mockGetActiveUserSession = jest.fn();

    beforeEach(() => {
      const mockGetAllUsers = jest.fn().mockReturnValue([
        {
          username: 'victim',
          inventory: { items: ['item-123'], currency: { gold: 0, silver: 0, copper: 0 } },
          equipment: {},
        },
      ]);

      const { UserManager } = jest.requireMock('../../user/userManager');
      UserManager.getInstance.mockReturnValue({
        getAllUsers: mockGetAllUsers,
        updateUserInventory: jest.fn(),
        updateUserStats: jest.fn(),
        getActiveUserSession: mockGetActiveUserSession,
      });

      const { RoomManager } = jest.requireMock('../../room/roomManager');
      RoomManager.getInstance.mockReturnValue({
        getAllRooms: jest.fn().mockReturnValue([]),
        updateRoom: jest.fn(),
      });
    });

    it('should notify previous owner when they are online', () => {
      const testCommand = new DestroyCommand(mockClients);
      const adminClient = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      const victimClient = createMockClient({
        user: createMockUser({ username: 'victim' }),
      });

      mockIsAuthorized.mockReturnValue(true);
      mockGetItemInstance.mockReturnValue({
        instanceId: 'item-123',
        templateId: 'sword-template',
        properties: {},
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
      });
      mockDeleteItemInstance.mockReturnValue(true);
      mockGetActiveUserSession.mockReturnValue(victimClient);

      testCommand.execute(adminClient, 'item-123');

      // Verify admin was notified of the destruction
      expect(mockWriteToClient).toHaveBeenCalledWith(
        adminClient,
        expect.stringContaining('Destroyed')
      );
      // Verify victim was notified their item was destroyed
      expect(mockWriteToClient).toHaveBeenCalledWith(
        victimClient,
        expect.stringContaining('admin has destroyed')
      );
    });

    it('should not notify owner if they are the admin', () => {
      // Reset mock to have admin as owner
      const mockGetAllUsers = jest.fn().mockReturnValue([
        {
          username: 'admin',
          inventory: { items: ['item-123'], currency: { gold: 0, silver: 0, copper: 0 } },
          equipment: {},
        },
      ]);

      const { UserManager } = jest.requireMock('../../user/userManager');
      UserManager.getInstance.mockReturnValue({
        getAllUsers: mockGetAllUsers,
        updateUserInventory: jest.fn(),
        updateUserStats: jest.fn(),
        // Return null so the notification logic path is exercised but check owner !== admin first
        getActiveUserSession: jest.fn().mockReturnValue(null),
      });

      const testCommand = new DestroyCommand(mockClients);
      const adminClient = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockIsAuthorized.mockReturnValue(true);
      mockGetItemInstance.mockReturnValue({
        instanceId: 'item-123',
        templateId: 'sword-template',
        properties: {},
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
      });
      mockDeleteItemInstance.mockReturnValue(true);

      testCommand.execute(adminClient, 'item-123');

      // When admin is the owner, no "admin has destroyed" notification should be sent
      // (the code checks owner !== client.user.username before notifying)
      const adminNotificationCalls = mockWriteToClient.mock.calls.filter(
        (call) => call[0] === adminClient && call[1].includes('Destroyed')
      );
      expect(adminNotificationCalls.length).toBe(1);

      // No "admin has destroyed" notification should be sent to anyone
      const victimNotificationCalls = mockWriteToClient.mock.calls.filter((call) =>
        call[1].includes('admin has destroyed')
      );
      expect(victimNotificationCalls.length).toBe(0);
    });

    it('should not notify owner if they are offline', () => {
      const testCommand = new DestroyCommand(mockClients);
      const adminClient = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockIsAuthorized.mockReturnValue(true);
      mockGetItemInstance.mockReturnValue({
        instanceId: 'item-123',
        templateId: 'sword-template',
        properties: {},
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
      });
      mockDeleteItemInstance.mockReturnValue(true);
      mockGetActiveUserSession.mockReturnValue(null);

      testCommand.execute(adminClient, 'item-123');

      // Should only notify admin
      expect(mockWriteToClient).toHaveBeenCalledTimes(1);
      expect(mockWriteToClient).toHaveBeenCalledWith(
        adminClient,
        expect.stringContaining('Destroyed')
      );
    });
  });

  describe('execute with different location messages', () => {
    const mockGetAllUsers = jest.fn();
    const mockGetAllRooms = jest.fn();

    beforeEach(() => {
      const { UserManager } = jest.requireMock('../../user/userManager');
      UserManager.getInstance.mockReturnValue({
        getAllUsers: mockGetAllUsers,
        updateUserInventory: jest.fn(),
        updateUserStats: jest.fn(),
        getActiveUserSession: jest.fn().mockReturnValue(null),
      });

      const { RoomManager } = jest.requireMock('../../room/roomManager');
      RoomManager.getInstance.mockReturnValue({
        getAllRooms: mockGetAllRooms,
        updateRoom: jest.fn(),
      });
    });

    it('should display location and owner in message when item found in inventory', () => {
      mockGetAllUsers.mockReturnValue([
        {
          username: 'player1',
          inventory: { items: ['item-123'], currency: { gold: 0, silver: 0, copper: 0 } },
          equipment: {},
        },
      ]);
      mockGetAllRooms.mockReturnValue([]);

      const testCommand = new DestroyCommand(mockClients);
      const adminClient = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockIsAuthorized.mockReturnValue(true);
      mockGetItemInstance.mockReturnValue({
        instanceId: 'item-123',
        templateId: 'sword-template',
        properties: {},
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
      });
      mockDeleteItemInstance.mockReturnValue(true);

      testCommand.execute(adminClient, 'item-123');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        adminClient,
        expect.stringContaining("player1's inventory")
      );
    });

    it('should display only location when item found in room (no owner)', () => {
      mockGetAllUsers.mockReturnValue([]);
      const mockRoom = {
        id: 'town-square',
        items: [],
        hasItemInstance: jest.fn().mockReturnValue(true),
        removeItemInstance: jest.fn(),
      };
      mockGetAllRooms.mockReturnValue([mockRoom]);

      const testCommand = new DestroyCommand(mockClients);
      const adminClient = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockIsAuthorized.mockReturnValue(true);
      mockGetItemInstance.mockReturnValue({
        instanceId: 'item-123',
        templateId: 'sword-template',
        properties: {},
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
      });
      mockDeleteItemInstance.mockReturnValue(true);

      testCommand.execute(adminClient, 'item-123');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        adminClient,
        expect.stringContaining('room town-square')
      );
    });

    it('should display simple message when item found nowhere specific', () => {
      mockGetAllUsers.mockReturnValue([]);
      mockGetAllRooms.mockReturnValue([]);

      const testCommand = new DestroyCommand(mockClients);
      const adminClient = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockIsAuthorized.mockReturnValue(true);
      mockGetItemInstance.mockReturnValue({
        instanceId: 'item-123',
        templateId: 'sword-template',
        properties: {},
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
      });
      mockDeleteItemInstance.mockReturnValue(true);

      testCommand.execute(adminClient, 'item-123');

      // Should have a simple message without location info
      expect(mockWriteToClient).toHaveBeenCalledWith(
        adminClient,
        expect.stringContaining('Destroyed Iron Sword')
      );
    });
  });
});
