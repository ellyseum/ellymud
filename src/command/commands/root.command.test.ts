/**
 * Unit tests for RootCommand
 * @module command/commands/root.command.test
 */

import {
  createMockClient,
  createMockUser,
  createMockRoom,
  createMockUserManager,
  createMockRoomManager,
} from '../../test/helpers/mockFactories';

// Mock dependencies first before imports
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

jest.mock('../../effects/effectManager', () => ({
  EffectManager: {
    getInstance: jest.fn().mockReturnValue({
      addEffect: jest.fn(),
      on: jest.fn(),
    }),
  },
}));

jest.mock('../../types/effects', () => ({
  EffectType: {
    MOVEMENT_BLOCK: 'MOVEMENT_BLOCK',
  },
}));

import { RootCommand } from './root.command';
import { UserManager } from '../../user/userManager';
import { RoomManager } from '../../room/roomManager';
import { EffectManager } from '../../effects/effectManager';
import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

// Create mock managers with extra methods
const createTestUserManager = () => {
  const manager = createMockUserManager();
  manager.getActiveUserSession = jest.fn().mockReturnValue(undefined);
  return manager;
};

const createTestRoomManager = () => {
  const manager = createMockRoomManager();
  return manager;
};

describe('RootCommand', () => {
  let rootCommand: RootCommand;
  let mockUserManager: jest.Mocked<UserManager>;
  let mockRoomManager: jest.Mocked<RoomManager>;
  let mockEffectManager: { addEffect: jest.Mock; on: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserManager = createTestUserManager();
    mockRoomManager = createTestRoomManager();

    // Get the mocked effect manager
    mockEffectManager = (EffectManager.getInstance as jest.Mock)() as {
      addEffect: jest.Mock;
      on: jest.Mock;
    };

    rootCommand = new RootCommand(mockUserManager, mockRoomManager);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(rootCommand.name).toBe('root');
    });

    it('should have a description', () => {
      expect(rootCommand.description).toBeDefined();
      expect(rootCommand.description).toContain('Root');
    });
  });

  describe('execute', () => {
    it('should return error if client has no user', () => {
      const client = createMockClient({ user: null });

      rootCommand.execute(client, 'target');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('must be logged in')
      );
    });

    it('should return error if user lacks required flag', () => {
      const client = createMockClient({
        user: createMockUser({ flags: [] }),
      });

      rootCommand.execute(client, 'target');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('lack the necessary skill')
      );
    });

    it('should return error if no target specified', () => {
      const client = createMockClient({
        user: createMockUser({ flags: ['can_cast_root'] }),
      });

      rootCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Root who?'));
    });

    it('should return error if target is not online', () => {
      const client = createMockClient({
        user: createMockUser({ flags: ['can_cast_root'] }),
      });

      mockUserManager.getActiveUserSession.mockReturnValue(undefined);

      rootCommand.execute(client, 'offlineuser');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('is not online')
      );
    });

    it('should return error if caster not in a room', () => {
      const client = createMockClient({
        user: createMockUser({ flags: ['can_cast_root'], currentRoomId: '' }),
      });

      const targetClient = createMockClient({
        user: createMockUser({ username: 'target', currentRoomId: 'room1' }),
      });

      mockUserManager.getActiveUserSession.mockReturnValue(targetClient);

      rootCommand.execute(client, 'target');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('must be in a room')
      );
    });

    it('should return error if target not in same room', () => {
      const client = createMockClient({
        user: createMockUser({ flags: ['can_cast_root'], currentRoomId: 'room1' }),
      });

      const targetClient = createMockClient({
        user: createMockUser({ username: 'target', currentRoomId: 'room2' }),
      });

      mockUserManager.getActiveUserSession.mockReturnValue(targetClient);

      rootCommand.execute(client, 'target');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('is not here')
      );
    });

    it('should apply root effect to target in same room', () => {
      const mockRoom = createMockRoom('room1', 'Test Room');
      (mockRoom as unknown as { players: string[] }).players = ['testuser', 'target'];

      const client = createMockClient({
        user: createMockUser({
          username: 'testuser',
          flags: ['can_cast_root'],
          currentRoomId: 'room1',
        }),
      });

      const targetClient = createMockClient({
        user: createMockUser({ username: 'target', currentRoomId: 'room1' }),
      });

      mockUserManager.getActiveUserSession.mockImplementation((username: string) => {
        if (username === 'target') return targetClient;
        if (username === 'testuser') return client;
        return undefined;
      });

      mockRoomManager.getRoom.mockReturnValue(mockRoom);

      rootCommand.execute(client, 'target');

      expect(mockEffectManager.addEffect).toHaveBeenCalledWith(
        'target',
        true,
        expect.objectContaining({
          type: 'MOVEMENT_BLOCK',
          name: 'Root',
        })
      );
    });

    it('should broadcast cast message to players in room', () => {
      const mockRoom = createMockRoom('room1', 'Test Room');
      (mockRoom as unknown as { players: string[] }).players = ['testuser', 'target', 'observer'];

      const client = createMockClient({
        user: createMockUser({
          username: 'testuser',
          flags: ['can_cast_root'],
          currentRoomId: 'room1',
        }),
      });

      const targetClient = createMockClient({
        user: createMockUser({ username: 'target', currentRoomId: 'room1' }),
      });

      const observerClient = createMockClient({
        user: createMockUser({ username: 'observer', currentRoomId: 'room1' }),
      });

      mockUserManager.getActiveUserSession.mockImplementation((username: string) => {
        if (username === 'target') return targetClient;
        if (username === 'testuser') return client;
        if (username === 'observer') return observerClient;
        return undefined;
      });

      mockRoomManager.getRoom.mockReturnValue(mockRoom);

      rootCommand.execute(client, 'target');

      // Should write to all players in room
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('casts root'));
      expect(mockWriteToClient).toHaveBeenCalledWith(
        targetClient,
        expect.stringContaining('casts root')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        observerClient,
        expect.stringContaining('casts root')
      );
    });
  });
});
