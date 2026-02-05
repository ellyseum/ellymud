/**
 * Unit tests for TrainCommand
 * @module command/commands/train.command.test
 */

import { TrainCommand } from './train.command';
import { ClientStateType } from '../../types';
import { createMockClient, createMockUser, createMockRoom } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
  writeFormattedMessageToClient: jest.fn(),
}));

jest.mock('../../utils/formatters', () => ({
  formatUsername: jest.fn((name: string) => name),
}));

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
  createMechanicsLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { writeToClient, writeFormattedMessageToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;
const mockWriteFormattedMessageToClient = writeFormattedMessageToClient as jest.MockedFunction<
  typeof writeFormattedMessageToClient
>;

describe('TrainCommand', () => {
  let trainCommand: TrainCommand;
  let mockUserManager: {
    updateUserStats: jest.Mock;
  };
  let mockRoomManager: {
    getRoom: jest.Mock;
  };
  let mockClients: Map<string, ReturnType<typeof createMockClient>>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserManager = {
      updateUserStats: jest.fn(),
    };

    mockRoomManager = {
      getRoom: jest.fn(),
    };

    mockClients = new Map();

    trainCommand = new TrainCommand(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockUserManager as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockClients as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockRoomManager as any
    );
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(trainCommand.name).toBe('train');
    });

    it('should have a description', () => {
      expect(trainCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should show error when client has no user', () => {
      const client = createMockClient({ user: null });

      trainCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('must be logged in')
      );
    });

    it('should show error when not in training room', () => {
      const room = createMockRoom('tavern', 'Tavern', {
        flags: [],
      });
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser({
          currentRoomId: 'tavern',
        }),
      });

      trainCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('only train in a designated training room')
      );
    });

    it('should show error when room not found', () => {
      mockRoomManager.getRoom.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser({
          currentRoomId: 'nonexistent',
        }),
      });

      trainCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('only train in a designated training room')
      );
    });

    describe('train stats', () => {
      it('should enter editor state when in training room and using "train stats"', () => {
        const room = createMockRoom('training-room', 'Training Room', {
          flags: ['trainer'],
        });
        mockRoomManager.getRoom.mockReturnValue(room);

        const client = createMockClient({
          user: createMockUser({
            currentRoomId: 'training-room',
          }),
          state: ClientStateType.GAME,
          stateData: {},
        });

        trainCommand.execute(client, 'stats');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('Entering the editor')
        );
        expect(client.stateData.forcedTransition).toBe(ClientStateType.EDITOR);
      });

      it('should allow train stats from AUTHENTICATED state', () => {
        const room = createMockRoom('training-room', 'Training Room', {
          flags: ['trainer'],
        });
        mockRoomManager.getRoom.mockReturnValue(room);

        const client = createMockClient({
          user: createMockUser({
            currentRoomId: 'training-room',
          }),
          state: ClientStateType.AUTHENTICATED,
          stateData: {},
        });

        trainCommand.execute(client, 'stats');

        expect(client.stateData.forcedTransition).toBe(ClientStateType.EDITOR);
      });

      it('should show error when using train stats from invalid state', () => {
        const room = createMockRoom('training-room', 'Training Room', {
          flags: ['trainer'],
        });
        mockRoomManager.getRoom.mockReturnValue(room);

        const client = createMockClient({
          user: createMockUser({
            currentRoomId: 'training-room',
          }),
          state: ClientStateType.CONNECTING,
          stateData: {},
        });

        trainCommand.execute(client, 'stats');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('only use this command while in the game')
        );
      });

      it('should store previous room id when entering editor', () => {
        const room = createMockRoom('training-room', 'Training Room', {
          flags: ['trainer'],
        });
        mockRoomManager.getRoom.mockReturnValue(room);

        const client = createMockClient({
          user: createMockUser({
            currentRoomId: 'training-room',
          }),
          state: ClientStateType.GAME,
          stateData: {},
        });

        trainCommand.execute(client, 'stats');

        expect(client.stateData.previousRoomId).toBe('training-room');
      });
    });

    describe('level up', () => {
      it('should show error when not enough experience', () => {
        const room = createMockRoom('training-room', 'Training Room', {
          flags: ['trainer'],
        });
        mockRoomManager.getRoom.mockReturnValue(room);

        const client = createMockClient({
          user: createMockUser({
            currentRoomId: 'training-room',
            level: 1,
            experience: 500, // Need 1000 for level 1 -> 2
          }),
        });

        trainCommand.execute(client, '');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('do not have enough experience')
        );
      });

      it('should level up when enough experience', () => {
        const room = createMockRoom('training-room', 'Training Room', {
          flags: ['trainer'],
        });
        mockRoomManager.getRoom.mockReturnValue(room);

        const user = createMockUser({
          currentRoomId: 'training-room',
          level: 1,
          experience: 1000, // Exactly enough for level 1 -> 2
        });

        const client = createMockClient({ user });

        trainCommand.execute(client, '');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('feel stronger')
        );
        expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('level 2'));
        expect(user.level).toBe(2);
        expect(mockUserManager.updateUserStats).toHaveBeenCalledWith(user.username, {
          level: 2,
          maxHealth: 105,
          health: 105,
          maxMana: 53,
          mana: 53,
          unspentAttributePoints: 10,
        });
      });

      it('should level up from level 2 with correct experience', () => {
        const room = createMockRoom('training-room', 'Training Room', {
          flags: ['trainer'],
        });
        mockRoomManager.getRoom.mockReturnValue(room);

        // Level 2 requires 1500 exp, total needed is 1000 (level 1) + 1500 (level 2) = 2500
        const user = createMockUser({
          currentRoomId: 'training-room',
          level: 2,
          experience: 2500,
        });

        const client = createMockClient({ user });

        trainCommand.execute(client, '');

        expect(user.level).toBe(3);
      });

      it('should notify other players in the same room', () => {
        const room = createMockRoom('training-room', 'Training Room', {
          flags: ['trainer'],
        });
        mockRoomManager.getRoom.mockReturnValue(room);

        const user = createMockUser({
          currentRoomId: 'training-room',
          level: 1,
          experience: 1000,
        });

        const client = createMockClient({ user });

        const otherUser = createMockUser({
          username: 'otherguy',
          currentRoomId: 'training-room',
        });

        const otherClient = createMockClient({
          id: 'other-client-id',
          user: otherUser,
          authenticated: true,
        });

        mockClients.set('other-client-id', otherClient);

        trainCommand.execute(client, '');

        expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
          otherClient,
          expect.stringContaining('looks stronger')
        );
      });

      it('should not notify players in different rooms', () => {
        const room = createMockRoom('training-room', 'Training Room', {
          flags: ['trainer'],
        });
        mockRoomManager.getRoom.mockReturnValue(room);

        const user = createMockUser({
          currentRoomId: 'training-room',
          level: 1,
          experience: 1000,
        });

        const client = createMockClient({ user });

        const otherUser = createMockUser({
          username: 'otherguy',
          currentRoomId: 'different-room', // Different room
        });

        const otherClient = createMockClient({
          id: 'other-client-id',
          user: otherUser,
          authenticated: true,
        });

        mockClients.set('other-client-id', otherClient);

        trainCommand.execute(client, '');

        expect(mockWriteFormattedMessageToClient).not.toHaveBeenCalledWith(
          otherClient,
          expect.anything()
        );
      });

      it('should not notify unauthenticated clients', () => {
        const room = createMockRoom('training-room', 'Training Room', {
          flags: ['trainer'],
        });
        mockRoomManager.getRoom.mockReturnValue(room);

        const user = createMockUser({
          currentRoomId: 'training-room',
          level: 1,
          experience: 1000,
        });

        const client = createMockClient({ user });

        const otherClient = createMockClient({
          id: 'other-client-id',
          user: null,
          authenticated: false,
        });

        mockClients.set('other-client-id', otherClient);

        trainCommand.execute(client, '');

        expect(mockWriteFormattedMessageToClient).not.toHaveBeenCalledWith(
          otherClient,
          expect.anything()
        );
      });

      it('should not notify self', () => {
        const room = createMockRoom('training-room', 'Training Room', {
          flags: ['trainer'],
        });
        mockRoomManager.getRoom.mockReturnValue(room);

        const user = createMockUser({
          currentRoomId: 'training-room',
          level: 1,
          experience: 1000,
        });

        const client = createMockClient({ user });
        mockClients.set(client.id, client);

        trainCommand.execute(client, '');

        // writeFormattedMessageToClient should not be called for self
        expect(mockWriteFormattedMessageToClient).not.toHaveBeenCalledWith(
          client,
          expect.stringContaining('looks stronger')
        );
      });
    });

    describe('unknown arguments', () => {
      it('should show usage when unknown argument is provided', () => {
        const room = createMockRoom('training-room', 'Training Room', {
          flags: ['trainer'],
        });
        mockRoomManager.getRoom.mockReturnValue(room);

        const client = createMockClient({
          user: createMockUser({
            currentRoomId: 'training-room',
          }),
        });

        trainCommand.execute(client, 'unknown');

        expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Usage:'));
      });

      it('should handle "stats" case-insensitively', () => {
        const room = createMockRoom('training-room', 'Training Room', {
          flags: ['trainer'],
        });
        mockRoomManager.getRoom.mockReturnValue(room);

        const client = createMockClient({
          user: createMockUser({
            currentRoomId: 'training-room',
          }),
          state: ClientStateType.GAME,
          stateData: {},
        });

        trainCommand.execute(client, 'STATS');

        expect(client.stateData.forcedTransition).toBe(ClientStateType.EDITOR);
      });

      it('should trim whitespace from arguments', () => {
        const room = createMockRoom('training-room', 'Training Room', {
          flags: ['trainer'],
        });
        mockRoomManager.getRoom.mockReturnValue(room);

        const client = createMockClient({
          user: createMockUser({
            currentRoomId: 'training-room',
          }),
          state: ClientStateType.GAME,
          stateData: {},
        });

        trainCommand.execute(client, '  stats  ');

        expect(client.stateData.forcedTransition).toBe(ClientStateType.EDITOR);
      });
    });
  });
});
