/**
 * Unit tests for QuitCommand
 * @module command/commands/quit.command.test
 */

import { QuitCommand } from './quit.command';
import { ConnectedClient } from '../../types';
import { UserManager } from '../../user/userManager';
import { RoomManager } from '../../room/roomManager';
import {
  createMockUser,
  createMockClient,
  createMockUserManager,
} from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

jest.mock('../../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn().mockReturnValue({
      removePlayerFromAllRooms: jest.fn(),
    }),
  },
}));

jest.mock('../../combat/combatSystem', () => ({
  CombatSystem: {
    getInstance: jest.fn().mockReturnValue({
      handlePlayerDisconnect: jest.fn(),
    }),
  },
}));

import { writeToClient } from '../../utils/socketWriter';
import { RoomManager as MockedRoomManager } from '../../room/roomManager';
import { CombatSystem as MockedCombatSystem } from '../../combat/combatSystem';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('QuitCommand', () => {
  let quitCommand: QuitCommand;
  let mockUserManager: UserManager;
  let mockRoomManager: ReturnType<typeof MockedRoomManager.getInstance>;
  let mockCombatSystem: ReturnType<typeof MockedCombatSystem.getInstance>;
  let clients: Map<string, ConnectedClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    clients = new Map();
    mockUserManager = createMockUserManager();
    mockRoomManager = MockedRoomManager.getInstance(clients);
    mockCombatSystem = MockedCombatSystem.getInstance(
      mockUserManager as unknown as UserManager,
      mockRoomManager as unknown as RoomManager
    );
    quitCommand = new QuitCommand(mockUserManager, clients);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(quitCommand.name).toBe('quit');
    });

    it('should have a description', () => {
      expect(quitCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      quitCommand.execute(client);

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should send goodbye message', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      quitCommand.execute(client);

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Goodbye'));
    });

    it('should remove player from all rooms', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      quitCommand.execute(client);

      expect(mockRoomManager.removePlayerFromAllRooms).toHaveBeenCalledWith('testuser');
    });

    it('should update user last login', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      quitCommand.execute(client);

      expect(mockUserManager.updateUserStats).toHaveBeenCalledWith('testuser', {
        lastLogin: expect.any(Date),
      });
    });

    it('should unregister user session', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      quitCommand.execute(client);

      expect(mockUserManager.unregisterUserSession).toHaveBeenCalledWith('testuser');
    });

    it('should disconnect client after delay', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      quitCommand.execute(client);

      // Connection should not be ended immediately
      expect(client.connection.end).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(500);

      // Now connection should be ended
      expect(client.connection.end).toHaveBeenCalled();
    });

    it('should handle player in combat', () => {
      const client = createMockClient({
        user: createMockUser({ inCombat: true }),
      });

      quitCommand.execute(client);

      expect(mockCombatSystem.handlePlayerDisconnect).toHaveBeenCalledWith(client);
    });
  });
});
