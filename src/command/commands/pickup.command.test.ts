/**
 * Unit tests for PickupCommand
 * @module command/commands/pickup.command.test
 */

import { PickupCommand } from './pickup.command';
import { createMockClient, createMockUser } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  getPlayerLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
  createContextLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
  systemLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
  writeFormattedMessageToClient: jest.fn(),
}));

jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/formatters', () => ({
  formatUsername: jest.fn((name: string) => name),
}));

jest.mock('../../utils/itemNameColorizer', () => ({
  colorizeItemName: jest.fn((name: string) => name),
  stripColorCodes: jest.fn((name: string) => name),
}));

const mockGetRoom = jest.fn();
const mockUpdateRoom = jest.fn();

jest.mock('../../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn(() => ({
      getRoom: mockGetRoom,
      updateRoom: mockUpdateRoom,
    })),
  },
}));

const mockUpdateUserInventory = jest.fn().mockReturnValue(true);

jest.mock('../../user/userManager', () => ({
  UserManager: {
    getInstance: jest.fn(() => ({
      updateUserInventory: mockUpdateUserInventory,
    })),
  },
}));

const mockGetItem = jest.fn();
const mockGetItemInstance = jest.fn();
const mockCreateItemInstance = jest.fn();

const mockAddItemHistory = jest.fn();

jest.mock('../../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn(() => ({
      getItem: mockGetItem,
      getItemInstance: mockGetItemInstance,
      createItemInstance: mockCreateItemInstance,
      addItemHistory: mockAddItemHistory,
    })),
  },
}));

import { writeToClient } from '../../utils/socketWriter';
import { UserManager } from '../../user/userManager';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('PickupCommand', () => {
  let pickupCommand: PickupCommand;
  let mockClients: Map<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockUserManager: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClients = new Map();
    mockUserManager = UserManager.getInstance();

    pickupCommand = new PickupCommand(mockClients as Map<string, never>, mockUserManager);
  });

  describe('constructor', () => {
    it('should create pickup command with correct properties', () => {
      expect(pickupCommand.name).toBe('pickup');
      expect(pickupCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      pickupCommand.execute(client, 'gold');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should show message when no args provided', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      pickupCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('What do you want to pick up')
      );
    });

    it('should show error when room not found', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'testuser',
          currentRoomId: 'invalid-room',
        }),
      });

      mockGetRoom.mockReturnValue(null);

      pickupCommand.execute(client, 'gold');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('not in a valid room')
      );
    });
  });

  describe('pickup currency', () => {
    it('should pick up gold currency', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'testuser',
          currentRoomId: 'test-room',
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      const mockRoom = {
        id: 'test-room',
        name: 'Test Room',
        players: ['testuser'],
        currency: { gold: 100, silver: 0, copper: 0 },
        items: [],
        npcs: new Map(),
        getItemInstances: jest.fn().mockReturnValue(new Map()),
      };

      mockGetRoom.mockReturnValue(mockRoom);

      pickupCommand.execute(client, 'gold');

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should pick up with partial currency name', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'testuser',
          currentRoomId: 'test-room',
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      const mockRoom = {
        id: 'test-room',
        name: 'Test Room',
        players: ['testuser'],
        currency: { gold: 100, silver: 0, copper: 0 },
        items: [],
        npcs: new Map(),
        getItemInstances: jest.fn().mockReturnValue(new Map()),
      };

      mockGetRoom.mockReturnValue(mockRoom);

      pickupCommand.execute(client, 'g');

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should pick up specific amount of currency', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'testuser',
          currentRoomId: 'test-room',
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      const mockRoom = {
        id: 'test-room',
        name: 'Test Room',
        players: ['testuser'],
        currency: { gold: 100, silver: 0, copper: 0 },
        items: [],
        npcs: new Map(),
        getItemInstances: jest.fn().mockReturnValue(new Map()),
      };

      mockGetRoom.mockReturnValue(mockRoom);

      pickupCommand.execute(client, '50 gold');

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should pick up all coins', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'testuser',
          currentRoomId: 'test-room',
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      const mockRoom = {
        id: 'test-room',
        name: 'Test Room',
        players: ['testuser'],
        currency: { gold: 100, silver: 50, copper: 25 },
        items: [],
        npcs: new Map(),
        getItemInstances: jest.fn().mockReturnValue(new Map()),
      };

      mockGetRoom.mockReturnValue(mockRoom);

      pickupCommand.execute(client, 'all coins');

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should show message when no coins to pick up', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'testuser',
          currentRoomId: 'test-room',
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      const mockRoom = {
        id: 'test-room',
        name: 'Test Room',
        players: ['testuser'],
        currency: { gold: 0, silver: 0, copper: 0 },
        items: [],
        npcs: new Map(),
        getItemInstances: jest.fn().mockReturnValue(new Map()),
      };

      mockGetRoom.mockReturnValue(mockRoom);

      pickupCommand.execute(client, 'all coins');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('no coins'));
    });
  });

  describe('pickup all', () => {
    it('should pick up all items and currency', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'testuser',
          currentRoomId: 'test-room',
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      const mockRoom = {
        id: 'test-room',
        name: 'Test Room',
        players: ['testuser'],
        currency: { gold: 100, silver: 0, copper: 0 },
        items: [],
        npcs: new Map(),
        getItemInstances: jest.fn().mockReturnValue(new Map()),
      };

      mockGetRoom.mockReturnValue(mockRoom);

      pickupCommand.execute(client, 'all');

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should show nothing to pick up when room is empty', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'testuser',
          currentRoomId: 'test-room',
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      const mockRoom = {
        id: 'test-room',
        name: 'Test Room',
        players: ['testuser'],
        currency: { gold: 0, silver: 0, copper: 0 },
        items: [],
        npcs: new Map(),
        getItemInstances: jest.fn().mockReturnValue(new Map()),
      };

      mockGetRoom.mockReturnValue(mockRoom);

      pickupCommand.execute(client, 'all');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('nothing here')
      );
    });
  });

  describe('pickup item instance', () => {
    it('should try to pick up item by name', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'testuser',
          currentRoomId: 'test-room',
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      const itemInstancesMap = new Map([['sword-instance-1', 'iron-sword']]);
      const mockRoom = {
        id: 'test-room',
        name: 'Test Room',
        players: ['testuser'],
        currency: { gold: 0, silver: 0, copper: 0 },
        items: [],
        npcs: new Map(),
        itemInstances: itemInstancesMap,
        getItemInstances: jest.fn().mockReturnValue(itemInstancesMap),
        hasItemInstance: jest.fn().mockReturnValue(true),
        removeItemInstance: jest.fn().mockReturnValue(true),
        findItemInstanceId: jest.fn().mockReturnValue('sword-instance-1'),
      };

      mockGetRoom.mockReturnValue(mockRoom);
      mockGetItemInstance.mockReturnValue({
        instanceId: 'sword-instance-1',
        templateId: 'iron-sword',
        properties: {},
      });
      mockGetItem.mockReturnValue({
        id: 'iron-sword',
        name: 'Iron Sword',
        type: 'weapon',
      });

      pickupCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle silver currency', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'testuser',
          currentRoomId: 'test-room',
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      const mockRoom = {
        id: 'test-room',
        name: 'Test Room',
        players: ['testuser'],
        currency: { gold: 0, silver: 100, copper: 0 },
        items: [],
        npcs: new Map(),
        getItemInstances: jest.fn().mockReturnValue(new Map()),
      };

      mockGetRoom.mockReturnValue(mockRoom);

      pickupCommand.execute(client, 's');

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should handle copper currency', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'testuser',
          currentRoomId: 'test-room',
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      const mockRoom = {
        id: 'test-room',
        name: 'Test Room',
        players: ['testuser'],
        currency: { gold: 0, silver: 0, copper: 100 },
        items: [],
        npcs: new Map(),
        getItemInstances: jest.fn().mockReturnValue(new Map()),
      };

      mockGetRoom.mockReturnValue(mockRoom);

      pickupCommand.execute(client, 'copper');

      expect(mockWriteToClient).toHaveBeenCalled();
    });
  });
});
