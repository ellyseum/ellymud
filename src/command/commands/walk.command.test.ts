/**
 * Unit tests for WalkCommand
 * @module command/commands/walk.command.test
 */

import { WalkCommand } from './walk.command';
import { ConnectedClient } from '../../types';
import { createMockUser, createMockClient } from '../../test/helpers/mockFactories';
import { movementEventBus } from '../../room/services/movementEventBus';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  getPlayerLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

const mockGetRoom = jest.fn();
const mockGetStartingRoomId = jest.fn().mockReturnValue('start');
const mockMovePlayer = jest.fn().mockReturnValue(true);

jest.mock('../../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn().mockReturnValue({
      getRoom: (...args: unknown[]) => mockGetRoom(...args),
      getStartingRoomId: (...args: unknown[]) => mockGetStartingRoomId(...args),
      movePlayer: (...args: unknown[]) => mockMovePlayer(...args),
      getAllRooms: jest.fn().mockReturnValue([]),
      getRoomsByArea: jest.fn().mockReturnValue([]),
    }),
  },
}));

jest.mock('../../utils/pathfinder', () => ({
  findPathByName: jest.fn(),
}));

import { writeToClient } from '../../utils/socketWriter';
import { findPathByName } from '../../utils/pathfinder';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;
const mockFindPathByName = findPathByName as jest.MockedFunction<typeof findPathByName>;

// Counter for unique client IDs (needed because jest.useFakeTimers freezes Date.now)
let clientIdCounter = 0;

const createUniqueClient = (overrides: Partial<ConnectedClient> = {}): ConnectedClient => {
  clientIdCounter++;
  return createMockClient({
    id: `test-walk-client-${clientIdCounter}`,
    ...overrides,
  });
};

/**
 * Helper to simulate movement completion by emitting the event
 */
const emitMovementComplete = (clientId: string, direction: string = 'north') => {
  movementEventBus.emitComplete({
    clientId,
    username: 'testuser',
    fromRoomId: 'room-1',
    toRoomId: 'room-2',
    direction,
    success: true,
  });
};

describe('WalkCommand', () => {
  let walkCommand: WalkCommand;
  let clients: Map<string, ConnectedClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    clients = new Map();
    walkCommand = new WalkCommand(clients);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(walkCommand.name).toBe('walk');
    });

    it('should have aliases', () => {
      expect(walkCommand.aliases).toContain('goto');
      expect(walkCommand.aliases).toContain('autowalk');
    });

    it('should have a description', () => {
      expect(walkCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should require user to be logged in', () => {
      const client = createUniqueClient({ user: null });

      walkCommand.execute(client, 'market');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('logged in'));
    });

    it('should show usage when no args provided', () => {
      const client = createUniqueClient({ user: createMockUser() });

      walkCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Usage'));
    });

    it('should show error when path not found', () => {
      const client = createUniqueClient({ user: createMockUser() });
      mockFindPathByName.mockReturnValue({
        found: false,
        path: [],
        roomIds: [],
        steps: 0,
        error: 'No room found',
      });

      walkCommand.execute(client, 'nonexistent');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Cannot find path')
      );
    });

    it('should show message when already at destination', () => {
      const client = createUniqueClient({ user: createMockUser() });
      mockFindPathByName.mockReturnValue({
        found: true,
        path: [],
        roomIds: ['room-1'],
        steps: 0,
      });

      walkCommand.execute(client, 'current-room');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('already there')
      );
    });

    it('should start auto-walk when path found', () => {
      const client = createUniqueClient({ user: createMockUser() });
      mockFindPathByName.mockReturnValue({
        found: true,
        path: ['north', 'east'],
        roomIds: ['room-1', 'room-2', 'room-3'],
        steps: 2,
      });
      mockGetRoom.mockReturnValue({ id: 'room-3', name: 'Destination' });

      walkCommand.execute(client, 'destination');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Starting auto-walk')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('2 steps'));
    });

    it('should move player on first step immediately', () => {
      const client = createUniqueClient({ user: createMockUser() });
      mockFindPathByName.mockReturnValue({
        found: true,
        path: ['north', 'east'],
        roomIds: ['room-1', 'room-2', 'room-3'],
        steps: 2,
      });
      mockGetRoom.mockReturnValue({ id: 'room-3', name: 'Destination' });
      mockMovePlayer.mockReturnValue(true);

      walkCommand.execute(client, 'destination');

      // First step happens immediately (event-driven)
      expect(mockMovePlayer).toHaveBeenCalledWith(client, 'north');
    });

    it('should move to next step when movement completes', () => {
      const client = createUniqueClient({ user: createMockUser() });
      mockFindPathByName.mockReturnValue({
        found: true,
        path: ['north', 'east'],
        roomIds: ['room-1', 'room-2', 'room-3'],
        steps: 2,
      });
      mockGetRoom.mockReturnValue({ id: 'room-3', name: 'Destination' });
      mockMovePlayer.mockReturnValue(true);

      walkCommand.execute(client, 'destination');

      // First step called immediately
      expect(mockMovePlayer).toHaveBeenCalledWith(client, 'north');

      // Simulate movement completion event
      emitMovementComplete(client.id, 'north');

      // Second step should be called
      expect(mockMovePlayer).toHaveBeenCalledWith(client, 'east');
    });

    it('should show arrival message when completed', () => {
      const client = createUniqueClient({ user: createMockUser() });
      mockFindPathByName.mockReturnValue({
        found: true,
        path: ['north'],
        roomIds: ['room-1', 'room-2'],
        steps: 1,
      });
      mockGetRoom.mockReturnValue({ id: 'room-2', name: 'Destination' });
      mockMovePlayer.mockReturnValue(true);

      walkCommand.execute(client, 'destination');

      // Simulate movement completion
      emitMovementComplete(client.id, 'north');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('arrived at Destination')
      );
    });

    it('should stop walk on movement failure', () => {
      const client = createUniqueClient({ user: createMockUser() });
      mockFindPathByName.mockReturnValue({
        found: true,
        path: ['north', 'east'],
        roomIds: ['room-1', 'room-2', 'room-3'],
        steps: 2,
      });
      mockGetRoom.mockReturnValue({ id: 'room-3', name: 'Destination' });
      mockMovePlayer.mockReturnValue(false); // Movement fails

      walkCommand.execute(client, 'destination');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('interrupted')
      );
    });

    it('should reject walk if already walking', () => {
      const client = createUniqueClient({ user: createMockUser() });
      mockFindPathByName.mockReturnValue({
        found: true,
        path: ['north', 'east', 'south'],
        roomIds: ['room-1', 'room-2', 'room-3', 'room-4'],
        steps: 3,
      });
      mockGetRoom.mockReturnValue({ id: 'room-4', name: 'Destination' });
      mockMovePlayer.mockReturnValue(true);

      // Start first walk
      walkCommand.execute(client, 'destination');

      // Try to start second walk (before first completes)
      walkCommand.execute(client, 'somewhere-else');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('already auto-walking')
      );
    });
  });

  describe('static methods', () => {
    it('isWalking should return true when walking', () => {
      const client = createUniqueClient({ user: createMockUser() });
      mockFindPathByName.mockReturnValue({
        found: true,
        path: ['north', 'east'], // Multiple steps so walk doesn't complete immediately
        roomIds: ['room-1', 'room-2', 'room-3'],
        steps: 2,
      });
      mockGetRoom.mockReturnValue({ id: 'room-3', name: 'Destination' });
      mockMovePlayer.mockReturnValue(true);

      walkCommand.execute(client, 'destination');

      expect(WalkCommand.isWalking(client.id)).toBe(true);
    });

    it('isWalking should return false when not walking', () => {
      const client = createUniqueClient({ user: createMockUser() });

      expect(WalkCommand.isWalking(client.id)).toBe(false);
    });

    it('interrupt should stop active walk with reason', () => {
      const client = createUniqueClient({ user: createMockUser() });
      mockFindPathByName.mockReturnValue({
        found: true,
        path: ['north', 'east'],
        roomIds: ['room-1', 'room-2', 'room-3'],
        steps: 2,
      });
      mockGetRoom.mockReturnValue({ id: 'room-3', name: 'Destination' });
      mockMovePlayer.mockReturnValue(true);

      walkCommand.execute(client, 'destination');

      WalkCommand.interrupt(client, 'you are under attack!');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('interrupted: you are under attack!')
      );
      expect(WalkCommand.isWalking(client.id)).toBe(false);
    });

    it('interrupt should do nothing when not walking', () => {
      const client = createUniqueClient({ user: createMockUser() });
      const callCount = mockWriteToClient.mock.calls.length;

      WalkCommand.interrupt(client, 'test reason');

      // No new calls to writeToClient
      expect(mockWriteToClient.mock.calls.length).toBe(callCount);
    });
  });

  describe('event-driven behavior', () => {
    it('should clean up event listeners when walk completes', () => {
      const client = createUniqueClient({ user: createMockUser() });
      mockFindPathByName.mockReturnValue({
        found: true,
        path: ['north'],
        roomIds: ['room-1', 'room-2'],
        steps: 1,
      });
      mockGetRoom.mockReturnValue({ id: 'room-2', name: 'Destination' });
      mockMovePlayer.mockReturnValue(true);

      walkCommand.execute(client, 'destination');

      // Complete the walk
      emitMovementComplete(client.id, 'north');

      // Should no longer be walking
      expect(WalkCommand.isWalking(client.id)).toBe(false);
    });

    it('should clean up event listeners when walk is cancelled', () => {
      const client = createUniqueClient({ user: createMockUser() });
      mockFindPathByName.mockReturnValue({
        found: true,
        path: ['north', 'east'],
        roomIds: ['room-1', 'room-2', 'room-3'],
        steps: 2,
      });
      mockGetRoom.mockReturnValue({ id: 'room-3', name: 'Destination' });
      mockMovePlayer.mockReturnValue(true);

      walkCommand.execute(client, 'destination');

      // Cancel the walk
      WalkCommand.interrupt(client, 'test');

      // Should no longer be walking
      expect(WalkCommand.isWalking(client.id)).toBe(false);

      // Emitting events should have no effect
      const callCountBefore = mockMovePlayer.mock.calls.length;
      emitMovementComplete(client.id, 'north');
      expect(mockMovePlayer.mock.calls.length).toBe(callCountBefore);
    });
  });
});
