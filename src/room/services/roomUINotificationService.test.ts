/**
 * Unit tests for RoomUINotificationService
 * @module room/services/roomUINotificationService.test
 */

import { RoomUINotificationService } from './roomUINotificationService';
import { Room } from '../room';
import { createMockUser, createMockClient, createMockRoom } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
  writeFormattedMessageToClient: jest.fn(),
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
  createContextLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  createMechanicsLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

import { writeToClient, writeFormattedMessageToClient } from '../../utils/socketWriter';
import { systemLogger } from '../../utils/logger';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;
const mockWriteFormattedMessageToClient = writeFormattedMessageToClient as jest.MockedFunction<
  typeof writeFormattedMessageToClient
>;

describe('RoomUINotificationService', () => {
  let roomUINotificationService: RoomUINotificationService;
  let mockRoomManager: {
    getRoom: jest.Mock;
    getStartingRoomId: jest.Mock;
  };
  let mockFindClientByUsername: jest.Mock;
  let mockTeleportService: {
    teleportToStartingRoom: jest.Mock;
  };
  let townSquare: Room;

  beforeEach(() => {
    jest.clearAllMocks();

    townSquare = createMockRoom('town-square', 'Town Square');

    mockRoomManager = {
      getRoom: jest.fn((roomId: string) => {
        if (roomId === 'town-square') return townSquare;
        return undefined;
      }),
      getStartingRoomId: jest.fn().mockReturnValue('starting-room'),
    };

    mockFindClientByUsername = jest.fn();
    mockTeleportService = {
      teleportToStartingRoom: jest.fn().mockReturnValue(true),
    };

    roomUINotificationService = new RoomUINotificationService(
      mockRoomManager,
      mockFindClientByUsername,
      mockTeleportService
    );
  });

  describe('lookRoom', () => {
    it('should return false if client has no user', () => {
      const client = createMockClient({ user: null });

      const result = roomUINotificationService.lookRoom(client);

      expect(result).toBe(false);
    });

    it('should show room description to player', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      const result = roomUINotificationService.lookRoom(client);

      expect(result).toBe(true);
      expect(townSquare.getDescriptionExcludingPlayer).toHaveBeenCalledWith('testuser');
      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should teleport if room not found', () => {
      mockRoomManager.getRoom.mockReturnValue(undefined);
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'invalid-room' }),
      });

      roomUINotificationService.lookRoom(client);

      expect(mockTeleportService.teleportToStartingRoom).toHaveBeenCalledWith(client);
    });

    it('should use starting room if currentRoomId is undefined', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: '' }),
      });

      roomUINotificationService.lookRoom(client);

      expect(mockRoomManager.getRoom).toHaveBeenCalledWith('starting-room');
    });
  });

  describe('briefLookRoom', () => {
    it('should return false if client has no user', () => {
      const client = createMockClient({ user: null });

      const result = roomUINotificationService.briefLookRoom(client);

      expect(result).toBe(false);
    });

    it('should show brief room description to player', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      const result = roomUINotificationService.briefLookRoom(client);

      expect(result).toBe(true);
      expect(townSquare.getBriefDescriptionExcludingPlayer).toHaveBeenCalledWith('testuser');
      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should teleport if room not found', () => {
      mockRoomManager.getRoom.mockReturnValue(undefined);
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'invalid-room' }),
      });

      roomUINotificationService.briefLookRoom(client);

      expect(mockTeleportService.teleportToStartingRoom).toHaveBeenCalledWith(client);
    });
  });

  describe('notifyPlayersInRoom', () => {
    it('should not notify if room not found', () => {
      mockRoomManager.getRoom.mockReturnValue(undefined);

      roomUINotificationService.notifyPlayersInRoom('invalid-room', 'Hello!');

      expect(mockWriteFormattedMessageToClient).not.toHaveBeenCalled();
    });

    it('should notify all players in room', () => {
      townSquare.players = ['player1', 'player2', 'player3'];
      const client1 = createMockClient({ user: createMockUser({ username: 'player1' }) });
      const client2 = createMockClient({ user: createMockUser({ username: 'player2' }) });
      const client3 = createMockClient({ user: createMockUser({ username: 'player3' }) });

      mockFindClientByUsername.mockImplementation((username: string) => {
        if (username === 'player1') return client1;
        if (username === 'player2') return client2;
        if (username === 'player3') return client3;
        return undefined;
      });

      roomUINotificationService.notifyPlayersInRoom('town-square', 'Hello!');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledTimes(3);
    });

    it('should exclude specified player', () => {
      townSquare.players = ['player1', 'player2'];
      const client1 = createMockClient({ user: createMockUser({ username: 'player1' }) });
      const client2 = createMockClient({ user: createMockUser({ username: 'player2' }) });

      mockFindClientByUsername.mockImplementation((username: string) => {
        if (username === 'player1') return client1;
        if (username === 'player2') return client2;
        return undefined;
      });

      roomUINotificationService.notifyPlayersInRoom('town-square', 'Hello!', 'player1');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledTimes(1);
      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(client2, 'Hello!');
    });

    it('should handle missing clients gracefully', () => {
      townSquare.players = ['player1', 'player2'];
      mockFindClientByUsername.mockReturnValue(undefined);

      roomUINotificationService.notifyPlayersInRoom('town-square', 'Hello!');

      expect(mockWriteFormattedMessageToClient).not.toHaveBeenCalled();
    });
  });

  describe('announcePlayerEntrance', () => {
    it('should not announce if room not found', () => {
      mockRoomManager.getRoom.mockReturnValue(undefined);

      roomUINotificationService.announcePlayerEntrance('invalid-room', 'testuser');

      expect(mockWriteFormattedMessageToClient).not.toHaveBeenCalled();
    });

    it('should announce to other players in room', () => {
      townSquare.players = ['testuser', 'otherplayer'];
      const otherClient = createMockClient({
        user: createMockUser({ username: 'otherplayer' }),
      });

      mockFindClientByUsername.mockImplementation((username: string) => {
        if (username === 'otherplayer') return otherClient;
        return undefined;
      });

      roomUINotificationService.announcePlayerEntrance('town-square', 'testuser');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        otherClient,
        expect.stringContaining('enters')
      );
    });

    it('should log player entrance', () => {
      townSquare.players = [];

      roomUINotificationService.announcePlayerEntrance('town-square', 'testuser');

      expect(systemLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('testuser entered room')
      );
    });

    it('should not notify the entering player themselves', () => {
      townSquare.players = ['testuser', 'otherplayer'];
      const testClient = createMockClient({ user: createMockUser({ username: 'testuser' }) });
      const otherClient = createMockClient({
        user: createMockUser({ username: 'otherplayer' }),
      });

      mockFindClientByUsername.mockImplementation((username: string) => {
        if (username === 'testuser') return testClient;
        if (username === 'otherplayer') return otherClient;
        return undefined;
      });

      roomUINotificationService.announcePlayerEntrance('town-square', 'testuser');

      expect(mockWriteFormattedMessageToClient).not.toHaveBeenCalledWith(
        testClient,
        expect.anything()
      );
      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        otherClient,
        expect.stringContaining('enters')
      );
    });
  });
});
