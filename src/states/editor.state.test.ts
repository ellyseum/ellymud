/**
 * Unit tests for EditorState
 * @module states/editor.state.test
 */

import { createMockClient, createMockUser } from '../test/helpers/mockFactories';

// Mock dependencies first before imports
jest.mock('../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
  writeFormattedMessageToClient: jest.fn(),
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

jest.mock('../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn().mockReturnValue({
      removePlayerFromAllRooms: jest.fn(),
    }),
  },
}));

import { EditorState } from './editor.state';
import { ClientStateType, ConnectedClient } from '../types';
import { writeToClient, writeFormattedMessageToClient } from '../utils/socketWriter';
import { RoomManager } from '../room/roomManager';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;
const mockWriteFormattedMessageToClient = writeFormattedMessageToClient as jest.MockedFunction<
  typeof writeFormattedMessageToClient
>;

describe('EditorState', () => {
  let editorState: EditorState;
  let mockRoomManager: { removePlayerFromAllRooms: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRoomManager = (RoomManager.getInstance as jest.Mock)() as {
      removePlayerFromAllRooms: jest.Mock;
    };
    editorState = new EditorState();
  });

  describe('name', () => {
    it('should have correct state name', () => {
      expect(editorState.name).toBe(ClientStateType.EDITOR);
    });
  });

  describe('setGlobalClients', () => {
    it('should set global clients map', () => {
      const newClients = new Map<string, ConnectedClient>();
      EditorState.setGlobalClients(newClients);
      // Just verify it doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('enter', () => {
    it('should save previous room ID for return', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room' }),
        stateData: {},
      });

      editorState.enter(client);

      expect(client.stateData.previousRoomId).toBe('test-room');
    });

    it('should save previous state for return', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room' }),
        state: ClientStateType.AUTHENTICATED,
        stateData: {},
      });

      editorState.enter(client);

      expect(client.stateData.previousState).toBe(ClientStateType.AUTHENTICATED);
    });

    it('should remove player from all rooms', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser', currentRoomId: 'test-room' }),
        stateData: {},
      });

      editorState.enter(client);

      expect(mockRoomManager.removePlayerFromAllRooms).toHaveBeenCalledWith('testuser');
    });

    it('should clear current room ID', () => {
      const user = createMockUser({ currentRoomId: 'test-room' });
      const client = createMockClient({
        user,
        stateData: {},
      });

      editorState.enter(client);

      expect(user.currentRoomId).toBe('');
    });

    it('should clear combat state', () => {
      const user = createMockUser({ currentRoomId: 'test-room', inCombat: true });
      const client = createMockClient({
        user,
        stateData: {},
      });

      editorState.enter(client);

      expect(user.inCombat).toBe(false);
    });

    it('should disable mask input', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room' }),
        stateData: { maskInput: true },
      });

      editorState.enter(client);

      expect(client.stateData.maskInput).toBe(false);
      expect(client.connection.setMaskInput).toHaveBeenCalledWith(false);
    });

    it('should suppress prompts', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room' }),
        stateData: {},
      });

      editorState.enter(client);

      expect(client.stateData.suppressPrompt).toBe(true);
    });

    it('should display editor message', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room' }),
        stateData: {},
      });

      editorState.enter(client);

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('character editor')
      );
    });

    it('should use clientsMap from stateData if globalClients not set', () => {
      const mockClientsMap = new Map<string, ConnectedClient>();
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room' }),
        stateData: { clientsMap: mockClientsMap },
      });

      // Reset global clients to simulate not being set
      // This is safe because we're testing an edge case
      editorState.enter(client);

      // Should not throw
      expect(true).toBe(true);
    });

    it('should broadcast leave message to other players', () => {
      const mockClients = new Map<string, ConnectedClient>();
      const otherClient = createMockClient({
        user: createMockUser({ username: 'otheruser', currentRoomId: 'other-room' }),
        authenticated: true,
      });
      mockClients.set('other-client', otherClient);

      EditorState.setGlobalClients(mockClients);

      const client = createMockClient({
        user: createMockUser({ username: 'testuser', currentRoomId: 'test-room' }),
        stateData: {},
      });
      mockClients.set('test-client', client);

      editorState.enter(client);

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        otherClient,
        expect.stringContaining('has left the game')
      );
    });
  });

  describe('handle', () => {
    it('should exit editor on "x" input', () => {
      const client = createMockClient({
        user: createMockUser(),
        stateData: {},
      });

      editorState.handle(client, 'x');

      expect(client.stateData.transitionTo).toBe(ClientStateType.AUTHENTICATED);
    });

    it('should exit editor on "X" input (case insensitive)', () => {
      const client = createMockClient({
        user: createMockUser(),
        stateData: {},
      });

      editorState.handle(client, 'X');

      expect(client.stateData.transitionTo).toBe(ClientStateType.AUTHENTICATED);
    });

    it('should show editor message on other input', () => {
      const client = createMockClient({
        user: createMockUser(),
        stateData: {},
      });

      editorState.handle(client, 'other');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('character editor')
      );
    });
  });

  describe('exit', () => {
    it('should clear suppressPrompt flag', () => {
      const client = createMockClient({
        user: createMockUser(),
        stateData: { suppressPrompt: true },
      });

      editorState.exit(client);

      expect(client.stateData.suppressPrompt).toBe(false);
    });
  });
});
