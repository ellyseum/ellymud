/**
 * Unit tests for DropCommand
 * @module command/commands/drop.command.test
 */

import { DropCommand } from './drop.command';
import { createMockClient, createMockUser, createMockRoom } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

jest.mock('../../utils/formatters', () => ({
  formatUsername: jest.fn((name: string) => name),
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
const mockCreateItemInstance = jest.fn();
const mockAddItemHistory = jest.fn();

jest.mock('../../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn().mockReturnValue({
      getItemInstance: (id: string) => mockGetItemInstance(id),
      getItem: (id: string) => mockGetItem(id),
      createItemInstance: (id: string, username: string) => mockCreateItemInstance(id, username),
      addItemHistory: (id: string, event: string, desc: string) =>
        mockAddItemHistory(id, event, desc),
    }),
  },
}));

const mockUpdateRoom = jest.fn();
const mockGetRoom = jest.fn();

jest.mock('../../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn().mockReturnValue({
      getRoom: (id: string) => mockGetRoom(id),
      updateRoom: (room: unknown) => mockUpdateRoom(room),
    }),
  },
}));

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('DropCommand', () => {
  let dropCommand: DropCommand;
  let mockUserManager: {
    updateUserInventory: jest.Mock;
  };
  let mockClients: Map<string, unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemInstance.mockReturnValue(null);
    mockGetItem.mockReturnValue(null);
    mockCreateItemInstance.mockReturnValue(null);

    mockUserManager = {
      updateUserInventory: jest.fn(),
    };

    mockClients = new Map();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dropCommand = new DropCommand(mockClients as any, mockUserManager as any);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(dropCommand.name).toBe('drop');
    });

    it('should have a description', () => {
      expect(dropCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      dropCommand.execute(client, 'sword');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should show error when no argument provided', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      dropCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('What do you want to drop?')
      );
    });

    it('should show error when not in valid room', () => {
      mockGetRoom.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser(),
      });

      dropCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('not in a valid room')
      );
    });

    describe('dropping currency', () => {
      it('should drop specified amount of gold', () => {
        const mockRoom = createMockRoom('test-room', 'Test Room');
        mockRoom.currency = { gold: 0, silver: 0, copper: 0 };
        mockGetRoom.mockReturnValue(mockRoom);

        const user = createMockUser({
          inventory: {
            items: [],
            currency: { gold: 100, silver: 0, copper: 0 },
          },
        });
        const client = createMockClient({ user });

        dropCommand.execute(client, '50 gold');

        expect(user.inventory.currency.gold).toBe(50);
        expect(mockRoom.currency.gold).toBe(50);
        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('You drop 50 gold')
        );
      });

      it('should drop all gold when just "gold" is specified', () => {
        const mockRoom = createMockRoom('test-room', 'Test Room');
        mockRoom.currency = { gold: 0, silver: 0, copper: 0 };
        mockGetRoom.mockReturnValue(mockRoom);

        const user = createMockUser({
          inventory: {
            items: [],
            currency: { gold: 75, silver: 0, copper: 0 },
          },
        });
        const client = createMockClient({ user });

        dropCommand.execute(client, 'gold');

        expect(user.inventory.currency.gold).toBe(0);
        expect(mockRoom.currency.gold).toBe(75);
      });

      it('should match partial currency names', () => {
        const mockRoom = createMockRoom('test-room', 'Test Room');
        mockRoom.currency = { gold: 0, silver: 0, copper: 0 };
        mockGetRoom.mockReturnValue(mockRoom);

        const user = createMockUser({
          inventory: {
            items: [],
            currency: { gold: 50, silver: 0, copper: 0 },
          },
        });
        const client = createMockClient({ user });

        dropCommand.execute(client, 'g'); // Partial match for gold

        expect(user.inventory.currency.gold).toBe(0);
        expect(mockRoom.currency.gold).toBe(50);
      });

      it('should show error when not enough currency', () => {
        const mockRoom = createMockRoom('test-room', 'Test Room');
        mockRoom.currency = { gold: 0, silver: 0, copper: 0 };
        mockGetRoom.mockReturnValue(mockRoom);

        const client = createMockClient({
          user: createMockUser({
            inventory: {
              items: [],
              currency: { gold: 10, silver: 0, copper: 0 },
            },
          }),
        });

        dropCommand.execute(client, '50 gold');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining("don't have that many")
        );
      });

      it('should show error when no currency to drop', () => {
        const mockRoom = createMockRoom('test-room', 'Test Room');
        mockRoom.currency = { gold: 0, silver: 0, copper: 0 };
        mockGetRoom.mockReturnValue(mockRoom);

        const client = createMockClient({
          user: createMockUser({
            inventory: {
              items: [],
              currency: { gold: 0, silver: 0, copper: 0 },
            },
          }),
        });

        dropCommand.execute(client, 'gold');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining("don't have any gold")
        );
      });

      it('should show error when dropping zero or negative amount', () => {
        const mockRoom = createMockRoom('test-room', 'Test Room');
        mockRoom.currency = { gold: 0, silver: 0, copper: 0 };
        mockGetRoom.mockReturnValue(mockRoom);

        const client = createMockClient({
          user: createMockUser({
            inventory: {
              items: [],
              currency: { gold: 100, silver: 0, copper: 0 },
            },
          }),
        });

        dropCommand.execute(client, '0 gold');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining("can't drop a negative or zero")
        );
      });
    });

    describe('dropping all', () => {
      it('should show message when nothing to drop', () => {
        const mockRoom = createMockRoom('test-room', 'Test Room');
        mockRoom.currency = { gold: 0, silver: 0, copper: 0 };
        mockGetRoom.mockReturnValue(mockRoom);

        const client = createMockClient({
          user: createMockUser({
            inventory: {
              items: [],
              currency: { gold: 0, silver: 0, copper: 0 },
            },
          }),
        });

        dropCommand.execute(client, 'all');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('have nothing to drop')
        );
      });
    });

    describe('dropping items', () => {
      it('should show error when item not found', () => {
        const mockRoom = createMockRoom('test-room', 'Test Room');
        mockRoom.currency = { gold: 0, silver: 0, copper: 0 };
        mockGetRoom.mockReturnValue(mockRoom);

        const client = createMockClient({
          user: createMockUser({
            inventory: {
              items: [],
              currency: { gold: 0, silver: 0, copper: 0 },
            },
          }),
        });

        dropCommand.execute(client, 'sword');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining("don't have a sword")
        );
      });

      it('should drop item by exact instance ID', () => {
        const mockRoom = createMockRoom('test-room', 'Test Room');
        mockRoom.currency = { gold: 0, silver: 0, copper: 0 };
        mockRoom.addItemInstance = jest.fn();
        mockGetRoom.mockReturnValue(mockRoom);

        mockGetItemInstance.mockReturnValue({
          instanceId: 'sword-instance-1',
          templateId: 'sword-template',
          properties: {},
        });
        mockGetItem.mockReturnValue({
          id: 'sword-template',
          name: 'Iron Sword',
          type: 'weapon',
          value: 100,
        });

        const user = createMockUser({
          inventory: {
            items: ['sword-instance-1'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        });
        const client = createMockClient({ user });

        dropCommand.execute(client, 'sword-instance-1');

        expect(user.inventory.items).not.toContain('sword-instance-1');
        expect(mockRoom.addItemInstance).toHaveBeenCalledWith('sword-instance-1', 'sword-template');
        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('You drop the')
        );
      });

      it('should drop item by template name', () => {
        const mockRoom = createMockRoom('test-room', 'Test Room');
        mockRoom.currency = { gold: 0, silver: 0, copper: 0 };
        mockRoom.addItemInstance = jest.fn();
        mockGetRoom.mockReturnValue(mockRoom);

        mockGetItemInstance.mockReturnValue({
          instanceId: 'sword-instance-1',
          templateId: 'sword-template',
          properties: {},
        });
        mockGetItem.mockReturnValue({
          id: 'sword-template',
          name: 'Iron Sword',
          type: 'weapon',
          value: 100,
        });

        const user = createMockUser({
          inventory: {
            items: ['sword-instance-1'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        });
        const client = createMockClient({ user });

        dropCommand.execute(client, 'iron sword');

        expect(user.inventory.items).not.toContain('sword-instance-1');
        expect(mockAddItemHistory).toHaveBeenCalledWith(
          'sword-instance-1',
          'drop',
          expect.any(String)
        );
      });
    });
  });
});

// Additional tests to improve coverage
describe('DropCommand Extended Coverage', () => {
  let dropCommand: DropCommand;
  let mockUserManager: {
    updateUserInventory: jest.Mock;
  };
  let mockClients: Map<string, unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemInstance.mockReturnValue(null);
    mockGetItem.mockReturnValue(null);
    mockCreateItemInstance.mockReturnValue(null);

    mockUserManager = {
      updateUserInventory: jest.fn(),
    };

    mockClients = new Map();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dropCommand = new DropCommand(mockClients as any, mockUserManager as any);
  });

  describe('edge cases', () => {
    it('should handle dropping non-existent item', () => {
      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      dropCommand.execute(client, 'nonexistent');

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should handle dropping with empty args', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      dropCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalled();
    });
  });

  describe('drop all', () => {
    it('should handle drop all with empty inventory', () => {
      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      dropCommand.execute(client, 'all');

      expect(mockWriteToClient).toHaveBeenCalled();
    });
  });
});
