/**
 * Unit tests for PlayerMovementService
 * @module room/services/playerMovementService.test
 */

import { PlayerMovementService } from './playerMovementService';
import { ConnectedClient } from '../../types';
import { Room } from '../room';
import { createMockUser, createMockClient, createMockRoom } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
  writeFormattedMessageToClient: jest.fn(),
  drawCommandPrompt: jest.fn(),
}));

jest.mock('../../utils/formatters', () => ({
  formatUsername: jest.fn(
    (username: string) => username.charAt(0).toUpperCase() + username.slice(1)
  ),
}));

jest.mock('../../utils/logger', () => ({
  getPlayerLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

// Helper to create a test room with exits
const createTestRoom = (
  id: string,
  name: string,
  exits: { direction: string; roomId: string }[] = []
): Room => {
  const room = createMockRoom(id, name);
  Object.assign(room, {
    exits,
    addPlayer: jest.fn((username: string) => {
      (room.players as string[]).push(username);
    }),
    removePlayer: jest.fn((username: string) => {
      const index = (room.players as string[]).indexOf(username);
      if (index > -1) (room.players as string[]).splice(index, 1);
    }),
    getExit: jest.fn((direction: string) => {
      const exit = exits.find((e) => e.direction === direction);
      return exit ? exit.roomId : undefined;
    }),
  });
  return room;
};

describe('PlayerMovementService', () => {
  let playerMovementService: PlayerMovementService;
  let mockRoomManager: {
    getRoom: jest.Mock;
    getStartingRoomId: jest.Mock;
  };
  let mockDirectionHelper: {
    getOppositeDirection: jest.Mock;
    getFullDirectionName: jest.Mock;
  };
  let mockNotifyPlayersInRoom: jest.Mock;
  let mockGetClients: jest.Mock;
  let townSquare: Room;
  let marketStreet: Room;
  let clientsMap: Map<string, ConnectedClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    townSquare = createTestRoom('town-square', 'Town Square', [
      { direction: 'north', roomId: 'market-street' },
    ]);
    marketStreet = createTestRoom('market-street', 'Market Street', [
      { direction: 'south', roomId: 'town-square' },
    ]);
    clientsMap = new Map();

    mockRoomManager = {
      getRoom: jest.fn((roomId: string) => {
        if (roomId === 'town-square') return townSquare;
        if (roomId === 'market-street') return marketStreet;
        return undefined;
      }),
      getStartingRoomId: jest.fn().mockReturnValue('town-square'),
    };

    mockDirectionHelper = {
      getOppositeDirection: jest.fn((dir: string) => {
        const opposites: Record<string, string> = {
          north: 'south',
          south: 'north',
          east: 'west',
          west: 'east',
        };
        return opposites[dir] || 'somewhere';
      }),
      getFullDirectionName: jest.fn((dir: string) => dir),
    };

    mockNotifyPlayersInRoom = jest.fn();
    mockGetClients = jest.fn(() => clientsMap);

    playerMovementService = new PlayerMovementService(
      mockRoomManager,
      mockDirectionHelper,
      mockNotifyPlayersInRoom,
      mockGetClients
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('movePlayerWithDelay', () => {
    it('should return false if client has no user', () => {
      const client = createMockClient({ user: null });

      const result = playerMovementService.movePlayerWithDelay(client, 'north');

      expect(result).toBe(false);
    });

    it('should return false if movement is restricted', () => {
      const client = createMockClient({
        user: createMockUser({ movementRestricted: true }),
        stateData: {},
      });

      const result = playerMovementService.movePlayerWithDelay(client, 'north');

      expect(result).toBe(false);
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('unable to move')
      );
    });

    it('should show custom restriction reason', () => {
      const client = createMockClient({
        user: createMockUser({
          movementRestricted: true,
          movementRestrictedReason: 'You are frozen in place!',
        }),
        stateData: {},
      });

      playerMovementService.movePlayerWithDelay(client, 'north');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('frozen in place')
      );
    });

    it('should return false if current room not found', () => {
      mockRoomManager.getRoom.mockReturnValue(undefined);
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'invalid-room' }),
        stateData: {},
      });

      const result = playerMovementService.movePlayerWithDelay(client, 'north');

      expect(result).toBe(false);
    });

    it('should return false if no exit in that direction', () => {
      const client = createMockClient({
        user: createMockUser(),
        stateData: {},
      });

      const result = playerMovementService.movePlayerWithDelay(client, 'west');

      expect(result).toBe(false);
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('no exit'));
    });

    it('should return false if destination room not found', () => {
      townSquare.exits = [{ direction: 'east', roomId: 'nonexistent' }];
      const client = createMockClient({
        user: createMockUser(),
        stateData: {},
      });

      const result = playerMovementService.movePlayerWithDelay(client, 'east');

      expect(result).toBe(false);
    });

    it('should start movement with delay', () => {
      const client = createMockClient({
        user: createMockUser(),
        stateData: {},
      });

      const result = playerMovementService.movePlayerWithDelay(client, 'north');

      expect(result).toBe(true);
      expect(client.stateData.isMoving).toBe(true);
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Moving'));
    });

    it('should notify other players of departure', () => {
      townSquare.players = ['testuser', 'otherplayer'];
      const client = createMockClient({
        user: createMockUser(),
        stateData: {},
      });

      playerMovementService.movePlayerWithDelay(client, 'north');

      expect(mockNotifyPlayersInRoom).toHaveBeenCalledWith(
        'town-square',
        expect.stringContaining('starts moving'),
        'testuser'
      );
    });

    it('should set isMoving state during movement', () => {
      const client = createMockClient({
        user: createMockUser(),
        stateData: {},
      });

      playerMovementService.movePlayerWithDelay(client, 'north');

      expect(client.stateData.isMoving).toBe(true);
    });
  });
});
