/**
 * Unit tests for GiveItemCommand
 * @module command/commands/giveitem.command.test
 */

import { GiveItemCommand } from './giveitem.command';
import {
  createMockClient,
  createMockUser,
  createMockUserManager,
} from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  createContextLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../../utils/itemNameColorizer', () => ({
  colorizeItemName: jest.fn((name: string) => name),
}));

// Mock SudoCommand
const mockSudoInstance = {
  isAuthorized: jest.fn().mockReturnValue(false),
};

jest.mock('./sudo.command', () => ({
  SudoCommand: {
    getInstance: jest.fn(() => mockSudoInstance),
  },
}));

// Create mock objects BEFORE the jest.mock calls
const mockGetItem = jest.fn();
const mockGetItemInstance = jest.fn();
const mockCreateItemInstance = jest.fn();
const mockGetAllItems = jest.fn().mockReturnValue([]);
const mockGetAllItemInstances = jest.fn().mockReturnValue([]);
const mockFindInstanceByPartialId = jest.fn();
const mockAddItemHistory = jest.fn();

jest.mock('../../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn(() => ({
      getItem: mockGetItem,
      getItemInstance: mockGetItemInstance,
      createItemInstance: mockCreateItemInstance,
      getAllItems: mockGetAllItems,
      getAllItemInstances: mockGetAllItemInstances,
      findInstanceByPartialId: mockFindInstanceByPartialId,
      addItemHistory: mockAddItemHistory,
    })),
  },
}));

// Mock RoomManager
const mockGetAllRooms = jest.fn().mockReturnValue([]);
const mockUpdateRoom = jest.fn();

jest.mock('../../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn(() => ({
      getAllRooms: mockGetAllRooms,
      updateRoom: mockUpdateRoom,
    })),
  },
}));

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('GiveItemCommand', () => {
  let giveItemCommand: GiveItemCommand;
  let mockUserManager: ReturnType<typeof createMockUserManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserManager = createMockUserManager();
    mockUserManager.getAllUsers.mockReturnValue([]);
    mockGetAllItems.mockReturnValue([]);

    giveItemCommand = new GiveItemCommand(mockUserManager);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(giveItemCommand.name).toBe('giveitem');
    });

    it('should have a description', () => {
      expect(giveItemCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    describe('permission checks', () => {
      it('should return early if client has no user', () => {
        const client = createMockClient({ user: null });

        giveItemCommand.execute(client, 'sword');

        expect(mockWriteToClient).not.toHaveBeenCalled();
      });

      it('should show error if user is not admin', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'testuser' }),
        });
        mockSudoInstance.isAuthorized.mockReturnValue(false);

        giveItemCommand.execute(client, 'sword');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('do not have permission')
        );
      });

      it('should allow admin to use command', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });
        mockSudoInstance.isAuthorized.mockReturnValue(true);
        mockGetItem.mockReturnValue(null);

        giveItemCommand.execute(client, 'sword');

        // Should proceed to item lookup
        expect(mockGetItem).toHaveBeenCalledWith('sword');
      });

      it('should check sudo from state data first', () => {
        const mockStateSudo = {
          isAuthorized: jest.fn().mockReturnValue(true),
        };
        const mockCommands = new Map();
        mockCommands.set('sudo', mockStateSudo);

        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
          stateData: { commands: mockCommands },
        });
        mockGetItem.mockReturnValue(null);

        giveItemCommand.execute(client, 'sword');

        expect(mockStateSudo.isAuthorized).toHaveBeenCalledWith('admin');
      });
    });

    describe('usage messages', () => {
      beforeEach(() => {
        mockSudoInstance.isAuthorized.mockReturnValue(true);
      });

      it('should show usage when no args provided', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        giveItemCommand.execute(client, '');

        expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Usage:'));
      });
    });

    describe('giving items by template', () => {
      beforeEach(() => {
        mockSudoInstance.isAuthorized.mockReturnValue(true);
      });

      it('should show error for unknown item', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });
        mockGetItem.mockReturnValue(null);

        giveItemCommand.execute(client, 'nonexistent');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('not found')
        );
      });

      it('should show error if target user not found', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });
        mockGetItem.mockReturnValue({ id: 'sword', name: 'Sword', type: 'weapon' });
        mockUserManager.getUser.mockReturnValue(undefined);

        giveItemCommand.execute(client, 'sword unknownuser');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('not found')
        );
      });

      it('should give item to self if no username specified', () => {
        const adminUser = createMockUser({
          username: 'admin',
          inventory: { items: [], currency: { gold: 0, silver: 0, copper: 0 } },
        });
        const client = createMockClient({
          user: adminUser,
        });
        mockGetItem.mockReturnValue({ id: 'sword', name: 'Sword', type: 'weapon' });
        mockCreateItemInstance.mockReturnValue({ instanceId: 'instance-123' });
        mockUserManager.getUser.mockReturnValue(adminUser);

        giveItemCommand.execute(client, 'sword');

        expect(mockUserManager.updateUserInventory).toHaveBeenCalledWith(
          'admin',
          expect.objectContaining({ items: expect.arrayContaining(['instance-123']) })
        );
        expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Added'));
      });

      it('should give item to another player', () => {
        const adminUser = createMockUser({ username: 'admin' });
        const targetUser = createMockUser({
          username: 'player1',
          inventory: { items: [], currency: { gold: 0, silver: 0, copper: 0 } },
        });
        const client = createMockClient({
          user: adminUser,
        });
        mockGetItem.mockReturnValue({ id: 'sword', name: 'Sword', type: 'weapon' });
        mockCreateItemInstance.mockReturnValue({ instanceId: 'instance-456' });
        mockUserManager.getUser.mockReturnValue(targetUser);
        mockUserManager.getActiveUserSession.mockReturnValue(undefined);

        giveItemCommand.execute(client, 'sword player1');

        expect(mockUserManager.updateUserInventory).toHaveBeenCalledWith(
          'player1',
          expect.objectContaining({ items: expect.arrayContaining(['instance-456']) })
        );
      });

      it('should notify target player if online', () => {
        const adminUser = createMockUser({ username: 'admin' });
        const targetUser = createMockUser({
          username: 'player1',
          inventory: { items: [], currency: { gold: 0, silver: 0, copper: 0 } },
        });
        const targetClient = createMockClient({ user: targetUser });
        const client = createMockClient({
          user: adminUser,
        });
        mockGetItem.mockReturnValue({ id: 'sword', name: 'Sword', type: 'weapon' });
        mockCreateItemInstance.mockReturnValue({ instanceId: 'instance-789' });
        mockUserManager.getUser.mockReturnValue(targetUser);
        mockUserManager.getActiveUserSession.mockReturnValue(targetClient);

        giveItemCommand.execute(client, 'sword player1');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          targetClient,
          expect.stringContaining('gave you')
        );
      });

      it('should initialize inventory if null', () => {
        const adminUser = createMockUser({ username: 'admin' });
        const targetUser = createMockUser({ username: 'player1' });
        (targetUser as { inventory?: unknown }).inventory = undefined;
        const client = createMockClient({
          user: adminUser,
        });
        mockGetItem.mockReturnValue({ id: 'sword', name: 'Sword', type: 'weapon' });
        mockCreateItemInstance.mockReturnValue({ instanceId: 'instance-999' });
        mockUserManager.getUser.mockReturnValue(targetUser);

        giveItemCommand.execute(client, 'sword player1');

        expect(targetUser.inventory).toBeDefined();
        expect(targetUser.inventory.items).toContain('instance-999');
      });

      it('should show error if instance creation fails', () => {
        const adminUser = createMockUser({ username: 'admin' });
        const targetUser = createMockUser({ username: 'player1' });
        const client = createMockClient({
          user: adminUser,
        });
        mockGetItem.mockReturnValue({ id: 'sword', name: 'Sword', type: 'weapon' });
        mockCreateItemInstance.mockReturnValue(null);
        mockUserManager.getUser.mockReturnValue(targetUser);

        giveItemCommand.execute(client, 'sword player1');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('Failed to create')
        );
      });
    });

    describe('giving items by instance', () => {
      beforeEach(() => {
        mockSudoInstance.isAuthorized.mockReturnValue(true);
        mockGetAllRooms.mockReturnValue([]);
        mockUserManager.getAllUsers.mockReturnValue([]);
      });

      it('should handle instance keyword', () => {
        const adminUser = createMockUser({ username: 'admin' });
        const targetUser = createMockUser({
          username: 'player1',
          inventory: { items: [], currency: { gold: 0, silver: 0, copper: 0 } },
        });
        const client = createMockClient({
          user: adminUser,
        });
        mockGetItemInstance.mockReturnValue({
          instanceId: 'full-instance-id',
          templateId: 'sword',
        });
        mockGetItem.mockReturnValue({ id: 'sword', name: 'Sword', type: 'weapon' });
        mockUserManager.getUser.mockReturnValue(targetUser);
        mockUserManager.getActiveUserSession.mockReturnValue(undefined);

        giveItemCommand.execute(client, 'instance full-instance-id player1');

        expect(mockUserManager.updateUserInventory).toHaveBeenCalledWith(
          'player1',
          expect.objectContaining({ items: expect.arrayContaining(['full-instance-id']) })
        );
      });

      it('should show error if instance not found', () => {
        const adminUser = createMockUser({ username: 'admin' });
        const client = createMockClient({
          user: adminUser,
        });
        mockGetItemInstance.mockReturnValue(undefined);
        mockFindInstanceByPartialId.mockImplementation(() => {
          throw new Error('not found');
        });

        giveItemCommand.execute(client, 'instance nonexistent-id');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('not found')
        );
      });

      it('should detect UUID-like input and use instance mode', () => {
        const adminUser = createMockUser({
          username: 'admin',
          inventory: { items: [], currency: { gold: 0, silver: 0, copper: 0 } },
        });
        const client = createMockClient({
          user: adminUser,
        });
        mockGetItemInstance.mockReturnValue({
          instanceId: 'abcd1234efgh5678',
          templateId: 'sword',
        });
        mockGetItem.mockReturnValue({ id: 'sword', name: 'Sword', type: 'weapon' });
        mockUserManager.getUser.mockReturnValue(adminUser);
        mockUserManager.getActiveUserSession.mockReturnValue(undefined);

        giveItemCommand.execute(client, 'abcd1234');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('instance ID')
        );
      });

      it('should show usage if instance keyword used without ID', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        giveItemCommand.execute(client, 'instance');

        expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Usage:'));
      });

      it('should handle ambiguous partial ID', () => {
        const adminUser = createMockUser({ username: 'admin' });
        const client = createMockClient({
          user: adminUser,
        });
        const targetUser = createMockUser({ username: 'player1' });
        mockGetItemInstance.mockReturnValue(undefined);
        mockFindInstanceByPartialId.mockReturnValue(undefined); // indicates ambiguous
        mockGetAllItemInstances.mockReturnValue([
          { instanceId: 'abcd1234-1', templateId: 'sword' },
          { instanceId: 'abcd1234-2', templateId: 'shield' },
        ]);
        mockGetItem.mockReturnValue({ id: 'sword', name: 'Sword', type: 'weapon' });
        mockUserManager.getUser.mockReturnValue(targetUser);

        giveItemCommand.execute(client, 'instance abcd1234 player1');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('Multiple items match')
        );
      });
    });

    describe('available items listing', () => {
      beforeEach(() => {
        mockSudoInstance.isAuthorized.mockReturnValue(true);
      });

      it('should list items grouped by type', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });
        mockGetItem.mockReturnValue(null);
        mockGetAllItems.mockReturnValue([
          { id: 'sword', name: 'Sword', type: 'weapon' },
          { id: 'dagger', name: 'Dagger', type: 'weapon' },
          { id: 'helm', name: 'Helm', type: 'armor' },
        ]);

        giveItemCommand.execute(client, 'unknownitem');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('Available items')
        );
        expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('WEAPON'));
        expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('ARMOR'));
      });

      it('should show message when no items available', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });
        mockGetItem.mockReturnValue(null);
        mockGetAllItems.mockReturnValue([]);

        giveItemCommand.execute(client, '');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('No items available')
        );
      });
    });
  });
});
