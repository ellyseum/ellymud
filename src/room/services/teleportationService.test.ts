/**
 * Unit tests for TeleportationService
 * @module room/services/teleportationService.test
 */

import { TeleportationService } from './teleportationService';
import { Room } from '../room';
import { createMockUser, createMockClient, createMockRoom } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

jest.mock('../../utils/formatters', () => ({
  formatUsername: jest.fn(
    (username: string) => username.charAt(0).toUpperCase() + username.slice(1)
  ),
}));

jest.mock('../../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  getPlayerLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

import { writeToClient } from '../../utils/socketWriter';
import { systemLogger } from '../../utils/logger';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('TeleportationService', () => {
  let teleportationService: TeleportationService;
  let mockRoomManager: {
    getRoom: jest.Mock;
    getStartingRoomId: jest.Mock;
    getAllRooms: jest.Mock;
  };
  let mockNotifyPlayersInRoom: jest.Mock;
  let startingRoom: Room;
  let currentRoom: Room;

  beforeEach(() => {
    jest.clearAllMocks();

    startingRoom = createMockRoom('starting-room', 'Starting Room');
    currentRoom = createMockRoom('town-square', 'Town Square');

    mockRoomManager = {
      getRoom: jest.fn((roomId: string) => {
        if (roomId === 'starting-room') return startingRoom;
        if (roomId === 'town-square') return currentRoom;
        return undefined;
      }),
      getStartingRoomId: jest.fn().mockReturnValue('starting-room'),
      getAllRooms: jest.fn().mockReturnValue([startingRoom, currentRoom]),
    };

    mockNotifyPlayersInRoom = jest.fn();

    teleportationService = new TeleportationService(mockRoomManager, mockNotifyPlayersInRoom);
  });

  describe('removePlayerFromAllRooms', () => {
    it('should remove player from all rooms', () => {
      startingRoom.players.push('testuser');
      currentRoom.players.push('testuser');

      teleportationService.removePlayerFromAllRooms('testuser');

      expect(startingRoom.removePlayer).toHaveBeenCalledWith('testuser');
      expect(currentRoom.removePlayer).toHaveBeenCalledWith('testuser');
    });

    it('should call getAllRooms', () => {
      teleportationService.removePlayerFromAllRooms('testuser');

      expect(mockRoomManager.getAllRooms).toHaveBeenCalled();
    });
  });

  describe('teleportToStartingRoomIfNeeded', () => {
    it('should return false if client has no user', () => {
      const client = createMockClient({ user: null });

      const result = teleportationService.teleportToStartingRoomIfNeeded(client);

      expect(result).toBe(false);
    });

    it('should return false if player is in a valid room', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'town-square' }),
      });

      const result = teleportationService.teleportToStartingRoomIfNeeded(client);

      expect(result).toBe(false);
      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should teleport player if in invalid room', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'invalid-room' }),
      });

      const result = teleportationService.teleportToStartingRoomIfNeeded(client);

      expect(result).toBe(true);
      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should teleport player if currentRoomId is empty', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: '' }),
      });

      const result = teleportationService.teleportToStartingRoomIfNeeded(client);

      expect(result).toBe(true);
    });
  });

  describe('teleportToStartingRoom', () => {
    it('should return false if client has no user', () => {
      const client = createMockClient({ user: null });

      const result = teleportationService.teleportToStartingRoom(client);

      expect(result).toBe(false);
    });

    it('should return false if starting room does not exist', () => {
      mockRoomManager.getRoom.mockReturnValue(undefined);
      const client = createMockClient({
        user: createMockUser(),
      });

      const result = teleportationService.teleportToStartingRoom(client);

      expect(result).toBe(false);
      expect(systemLogger.error).toHaveBeenCalledWith('Error: Starting room does not exist!');
    });

    it('should teleport player to starting room', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'old-room' }),
      });

      const result = teleportationService.teleportToStartingRoom(client);

      expect(result).toBe(true);
      expect(client.user!.currentRoomId).toBe('starting-room');
    });

    it('should remove player from all rooms before adding to starting room', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'town-square' }),
      });
      currentRoom.players.push('testuser');

      teleportationService.teleportToStartingRoom(client);

      expect(startingRoom.removePlayer).toHaveBeenCalledWith('testuser');
      expect(currentRoom.removePlayer).toHaveBeenCalledWith('testuser');
    });

    it('should add player to starting room', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      teleportationService.teleportToStartingRoom(client);

      expect(startingRoom.addPlayer).toHaveBeenCalledWith('testuser');
    });

    it('should notify player about teleport', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      teleportationService.teleportToStartingRoom(client);

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('teleported'));
    });

    it('should show room description to player', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      teleportationService.teleportToStartingRoom(client);

      expect(startingRoom.getDescriptionExcludingPlayer).toHaveBeenCalledWith('testuser');
      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should notify other players in starting room', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      teleportationService.teleportToStartingRoom(client);

      expect(mockNotifyPlayersInRoom).toHaveBeenCalledWith(
        'starting-room',
        expect.stringContaining('appears'),
        'testuser'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle player with no currentRoomId', () => {
      const user = createMockUser();
      // @ts-expect-error - Testing undefined currentRoomId
      delete user.currentRoomId;
      const client = createMockClient({ user });

      const result = teleportationService.teleportToStartingRoomIfNeeded(client);

      expect(result).toBe(true);
    });

    it('should handle multiple teleports', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      teleportationService.teleportToStartingRoom(client);
      teleportationService.teleportToStartingRoom(client);

      expect(startingRoom.addPlayer).toHaveBeenCalledTimes(2);
    });
  });
});
