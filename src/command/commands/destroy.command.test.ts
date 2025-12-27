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
  });
});
