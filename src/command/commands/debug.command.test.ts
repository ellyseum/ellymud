/**
 * Unit tests for DebugCommand
 * @module command/commands/debug.command.test
 */

import { DebugCommand } from './debug.command';
import { createMockClient, createMockUser, createMockNPC } from '../../test/helpers/mockFactories';

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

jest.mock('../../utils/itemNameColorizer', () => ({
  stripColorCodes: jest.fn((text: string) => text),
}));

// Mock SudoCommand
jest.mock('./sudo.command', () => ({
  SudoCommand: {
    isAuthorizedUser: jest.fn(),
  },
}));

import { SudoCommand } from './sudo.command';
const mockIsAuthorizedUser = SudoCommand.isAuthorizedUser as jest.Mock;

const mockGetRoom = jest.fn();
const mockGetAllRooms = jest.fn().mockReturnValue([]);

jest.mock('../../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn(() => ({
      getRoom: mockGetRoom,
      getAllRooms: mockGetAllRooms,
    })),
  },
}));

const mockGetUser = jest.fn();
const mockGetActiveUserSession = jest.fn();

const mockGetAllUsers = jest.fn().mockReturnValue([]);
const mockIsUserActive = jest.fn().mockReturnValue(false);

jest.mock('../../user/userManager', () => ({
  UserManager: {
    getInstance: jest.fn(() => ({
      getUser: mockGetUser,
      getActiveUserSession: mockGetActiveUserSession,
      getAllUsers: mockGetAllUsers,
      isUserActive: mockIsUserActive,
    })),
  },
}));

const mockIsInCombat = jest.fn().mockReturnValue(false);
const mockGetCombat = jest.fn().mockReturnValue(null);
const mockGetActiveCombatsInRoom = jest.fn().mockReturnValue([]);

jest.mock('../../combat/combatSystem', () => ({
  CombatSystem: {
    getInstance: jest.fn(() => ({
      isInCombat: mockIsInCombat,
      getCombat: mockGetCombat,
      getActiveCombatsInRoom: mockGetActiveCombatsInRoom,
    })),
  },
}));

const mockGetItem = jest.fn();
const mockGetItemInstance = jest.fn();

const mockGetAllItemInstances = jest.fn().mockReturnValue([]);
const mockGetAllItems = jest.fn().mockReturnValue([]);

jest.mock('../../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn(() => ({
      getItem: mockGetItem,
      getItemInstance: mockGetItemInstance,
      getAllItemInstances: mockGetAllItemInstances,
      getAllItems: mockGetAllItems,
    })),
  },
}));

import { writeToClient } from '../../utils/socketWriter';
import { RoomManager } from '../../room/roomManager';
import { UserManager } from '../../user/userManager';
import { CombatSystem } from '../../combat/combatSystem';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('DebugCommand', () => {
  let debugCommand: DebugCommand;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockRoomManager: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockUserManager: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockCombatSystem: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRoomManager = RoomManager.getInstance(new Map());
    mockUserManager = UserManager.getInstance();
    mockCombatSystem = CombatSystem.getInstance(mockUserManager, mockRoomManager);

    debugCommand = new DebugCommand(mockRoomManager, mockUserManager, mockCombatSystem);
  });

  describe('constructor', () => {
    it('should create debug command with correct properties', () => {
      expect(debugCommand.name).toBe('debug');
      expect(debugCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      debugCommand.execute(client, 'room');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should show error if user is not authorized', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'normaluser' }),
      });

      mockIsAuthorizedUser.mockReturnValue(false);

      debugCommand.execute(client, 'room');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('do not have permission')
      );
    });

    it('should show help when no subcommand provided', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockIsAuthorizedUser.mockReturnValue(true);

      debugCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should handle npc subcommand', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin', currentRoomId: 'test-room' }),
      });

      mockIsAuthorizedUser.mockReturnValue(true);
      mockGetRoom.mockReturnValue({
        id: 'test-room',
        name: 'Test Room',
        npcs: new Map(),
        getNPC: jest.fn().mockReturnValue(undefined),
        findNPCByName: jest.fn().mockReturnValue(undefined),
        findNPCsByTemplateId: jest.fn().mockReturnValue([]),
      });

      debugCommand.execute(client, 'npc goblin');

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should handle room subcommand', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin', currentRoomId: 'test-room' }),
      });

      mockIsAuthorizedUser.mockReturnValue(true);
      mockGetRoom.mockReturnValue({
        id: 'test-room',
        name: 'Test Room',
        description: 'A test room',
        players: [],
        npcs: new Map(),
        items: [],
        itemInstances: new Map(),
        exits: [],
        currency: { gold: 0, silver: 0, copper: 0 },
      });

      debugCommand.execute(client, 'room');

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should handle player subcommand', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockIsAuthorizedUser.mockReturnValue(true);
      mockGetUser.mockReturnValue(createMockUser({ username: 'targetplayer' }));

      debugCommand.execute(client, 'player targetplayer');

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should handle combat subcommand', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin', currentRoomId: 'test-room' }),
      });

      mockIsAuthorizedUser.mockReturnValue(true);
      mockGetRoom.mockReturnValue({
        id: 'test-room',
        name: 'Test Room',
        players: [],
        npcs: new Map(),
      });

      debugCommand.execute(client, 'combat');

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should handle system subcommand', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockIsAuthorizedUser.mockReturnValue(true);
      mockGetAllRooms.mockReturnValue([]);

      debugCommand.execute(client, 'system');

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should handle item subcommand', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin', currentRoomId: 'test-room' }),
      });

      mockIsAuthorizedUser.mockReturnValue(true);
      mockGetRoom.mockReturnValue({
        id: 'test-room',
        name: 'Test Room',
        items: [],
        itemInstances: new Map(),
        getItemInstances: jest.fn().mockReturnValue(new Map()),
      });

      debugCommand.execute(client, 'item');

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should show help for unknown subcommand', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockIsAuthorizedUser.mockReturnValue(true);

      debugCommand.execute(client, 'unknowncommand');

      expect(mockWriteToClient).toHaveBeenCalled();
    });
  });

  describe('debugNPC', () => {
    it('should show NPC details when found', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin', currentRoomId: 'test-room' }),
      });

      const mockNpc = createMockNPC({
        name: 'Goblin',
        instanceId: 'goblin-1',
      });

      mockIsAuthorizedUser.mockReturnValue(true);
      mockGetRoom.mockReturnValue({
        id: 'test-room',
        name: 'Test Room',
        npcs: new Map([['goblin-1', mockNpc]]),
      });

      debugCommand.execute(client, 'npc goblin');

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should list all NPCs when no target specified', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin', currentRoomId: 'test-room' }),
      });

      const mockNpc = createMockNPC({
        name: 'Goblin',
        instanceId: 'goblin-1',
      });

      mockIsAuthorizedUser.mockReturnValue(true);
      mockGetRoom.mockReturnValue({
        id: 'test-room',
        name: 'Test Room',
        npcs: new Map([['goblin-1', mockNpc]]),
      });

      debugCommand.execute(client, 'npc');

      expect(mockWriteToClient).toHaveBeenCalled();
    });
  });

  describe('debugRoom', () => {
    it('should show current room when no target specified', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin', currentRoomId: 'test-room' }),
      });

      mockIsAuthorizedUser.mockReturnValue(true);
      mockGetRoom.mockReturnValue({
        id: 'test-room',
        name: 'Test Room',
        description: 'A test room',
        players: [],
        npcs: new Map(),
        items: [],
        itemInstances: new Map(),
        exits: [],
        currency: { gold: 0, silver: 0, copper: 0 },
      });

      debugCommand.execute(client, 'room');

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should show specific room when target specified', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin', currentRoomId: 'test-room' }),
      });

      mockIsAuthorizedUser.mockReturnValue(true);
      mockGetRoom.mockReturnValue({
        id: 'other-room',
        name: 'Other Room',
        description: 'Another room',
        players: [],
        npcs: new Map(),
        items: [],
        itemInstances: new Map(),
        getItemInstances: jest.fn().mockReturnValue(new Map()),
        exits: [],
        currency: { gold: 0, silver: 0, copper: 0 },
      });

      debugCommand.execute(client, 'room other-room');

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should show error when room not found', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin', currentRoomId: 'test-room' }),
      });

      mockIsAuthorizedUser.mockReturnValue(true);
      mockGetRoom.mockReturnValue(null);

      debugCommand.execute(client, 'room invalid-room');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('not found'));
    });
  });

  describe('debugPlayer', () => {
    it('should show error when no player specified', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockIsAuthorizedUser.mockReturnValue(true);

      debugCommand.execute(client, 'player');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Usage'));
    });

    it('should show error when player not found', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockIsAuthorizedUser.mockReturnValue(true);
      mockGetUser.mockReturnValue(null);

      debugCommand.execute(client, 'player nonexistent');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('not found'));
    });

    it('should show player details when found', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockIsAuthorizedUser.mockReturnValue(true);
      mockGetUser.mockReturnValue(
        createMockUser({
          username: 'targetplayer',
          health: 100,
          maxHealth: 100,
          level: 5,
        })
      );

      debugCommand.execute(client, 'player targetplayer');

      expect(mockWriteToClient).toHaveBeenCalled();
    });
  });

  describe('debugSystem', () => {
    it('should show system information', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockIsAuthorizedUser.mockReturnValue(true);
      mockGetAllRooms.mockReturnValue([
        { id: 'room-1', name: 'Room 1', npcs: new Map() },
        { id: 'room-2', name: 'Room 2', npcs: new Map() },
      ]);

      debugCommand.execute(client, 'system');

      expect(mockWriteToClient).toHaveBeenCalled();
    });
  });
});
