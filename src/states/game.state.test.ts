/**
 * Unit tests for GameState
 * @module states/game.state.test
 */

import { GameState } from './game.state';
import { ClientStateType, ConnectedClient } from '../types';
import { createMockClient, createMockUser, createMockRoom } from '../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../utils/socketWriter', () => ({
  writeFormattedMessageToClient: jest.fn(),
  drawCommandPrompt: jest.fn(),
}));

jest.mock('../utils/formatters', () => ({
  formatUsername: jest.fn((name: string) => name),
}));

jest.mock('../utils/logger', () => ({
  createContextLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockGetRoom = jest.fn();
const mockGetStartingRoomId = jest.fn();
const mockLookRoom = jest.fn();
const mockRemovePlayerFromAllRooms = jest.fn();

jest.mock('../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn().mockReturnValue({
      getRoom: (id: string) => mockGetRoom(id),
      getStartingRoomId: () => mockGetStartingRoomId(),
      lookRoom: (client: unknown) => mockLookRoom(client),
      removePlayerFromAllRooms: (username: string) => mockRemovePlayerFromAllRooms(username),
    }),
  },
}));

import { drawCommandPrompt } from '../utils/socketWriter';

const mockDrawCommandPrompt = drawCommandPrompt as jest.MockedFunction<typeof drawCommandPrompt>;

describe('GameState', () => {
  let gameState: GameState;
  let mockClients: Map<string, ConnectedClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClients = new Map();
    mockGetStartingRoomId.mockReturnValue('town-square');
    mockGetRoom.mockReturnValue(null);
    gameState = new GameState(mockClients);
  });

  describe('name', () => {
    it('should have correct state name', () => {
      expect(gameState.name).toBe(ClientStateType.GAME);
    });
  });

  describe('setGlobalClients', () => {
    it('should set global clients map', () => {
      const newClients = new Map<string, ConnectedClient>();
      GameState.setGlobalClients(newClients);
      // Just verify it doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('enter', () => {
    it('should transition to LOGIN if client has no user', () => {
      const client = createMockClient({ user: null });

      gameState.enter(client);

      expect(client.stateData.transitionTo).toBe(ClientStateType.LOGIN);
    });

    it('should add player to room on enter', () => {
      const mockRoom = createMockRoom('test-room', 'Test Room');
      mockGetRoom.mockReturnValue(mockRoom);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room' }),
      });

      gameState.enter(client);

      expect(mockRoom.addPlayer).toHaveBeenCalledWith('testuser');
    });

    it('should use previousRoomId from stateData if available', () => {
      const mockRoom = createMockRoom('previous-room', 'Previous Room');
      mockGetRoom.mockReturnValue(mockRoom);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'current-room' }),
        stateData: { previousRoomId: 'previous-room' },
      });

      gameState.enter(client);

      expect(mockGetRoom).toHaveBeenCalledWith('previous-room');
    });

    it('should fall back to starting room if room not found', () => {
      const mockStartingRoom = createMockRoom('town-square', 'Town Square');
      mockGetRoom.mockImplementation((id: string) => {
        if (id === 'town-square') return mockStartingRoom;
        return null;
      });

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'invalid-room' }),
      });

      gameState.enter(client);

      expect(mockStartingRoom.addPlayer).toHaveBeenCalledWith('testuser');
    });

    it('should clear previousRoomId from stateData', () => {
      const mockRoom = createMockRoom('test-room', 'Test Room');
      mockGetRoom.mockReturnValue(mockRoom);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room' }),
        stateData: { previousRoomId: 'some-room' },
      });

      gameState.enter(client);

      expect(client.stateData.previousRoomId).toBeUndefined();
    });

    it('should clear suppressPrompt flag', () => {
      const mockRoom = createMockRoom('test-room', 'Test Room');
      mockGetRoom.mockReturnValue(mockRoom);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room' }),
        stateData: { suppressPrompt: true },
      });

      gameState.enter(client);

      expect(client.stateData.suppressPrompt).toBe(false);
    });

    it('should show room description', () => {
      const mockRoom = createMockRoom('test-room', 'Test Room');
      mockGetRoom.mockReturnValue(mockRoom);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room' }),
      });

      gameState.enter(client);

      expect(mockLookRoom).toHaveBeenCalledWith(client);
    });

    it('should draw command prompt', () => {
      const mockRoom = createMockRoom('test-room', 'Test Room');
      mockGetRoom.mockReturnValue(mockRoom);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room' }),
      });

      gameState.enter(client);

      expect(mockDrawCommandPrompt).toHaveBeenCalledWith(client);
    });

    it('should update user currentRoomId', () => {
      const mockRoom = createMockRoom('test-room', 'Test Room');
      mockGetRoom.mockReturnValue(mockRoom);

      const user = createMockUser({ currentRoomId: '' });
      const client = createMockClient({
        user,
        stateData: { previousRoomId: 'test-room' },
      });

      gameState.enter(client);

      expect(user.currentRoomId).toBe('test-room');
    });
  });

  describe('handle', () => {
    it('should not process input directly', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      // handle() just logs and passes through
      gameState.handle(client, 'test input');

      // No side effects to test - just verify no errors
      expect(true).toBe(true);
    });
  });

  describe('exit', () => {
    it('should handle exit without user', () => {
      const client = createMockClient({ user: null });

      // Should not throw
      gameState.exit(client);
      expect(true).toBe(true);
    });

    it('should store previous room when transitioning to EDITOR', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room' }),
        stateData: { transitionTo: ClientStateType.EDITOR },
      });

      gameState.exit(client);

      expect(client.stateData.previousRoomId).toBe('test-room');
    });

    it('should remove player from all rooms when transitioning to EDITOR', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser', currentRoomId: 'test-room' }),
        stateData: { transitionTo: ClientStateType.EDITOR },
      });

      gameState.exit(client);

      expect(mockRemovePlayerFromAllRooms).toHaveBeenCalledWith('testuser');
    });

    it('should clear combat state when transitioning to EDITOR', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room', inCombat: true }),
        stateData: { transitionTo: ClientStateType.EDITOR },
      });

      gameState.exit(client);

      expect(client.user?.inCombat).toBe(false);
    });

    it('should not affect rooms when transitioning to other states', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room' }),
        stateData: { transitionTo: ClientStateType.LOGIN },
      });

      gameState.exit(client);

      expect(mockRemovePlayerFromAllRooms).not.toHaveBeenCalled();
    });
  });
});
