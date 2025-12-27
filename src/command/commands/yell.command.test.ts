/**
 * Unit tests for YellCommand
 * @module command/commands/yell.command.test
 */

import { YellCommand } from './yell.command';
import { ConnectedClient } from '../../types';
import { createMockClient, createMockUser, createMockRoom } from '../../test/helpers/mockFactories';
import { Room } from '../../room/room';

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

const mockGetRoom = jest.fn();
const mockGetStartingRoomId = jest.fn();

jest.mock('../../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn().mockReturnValue({
      getRoom: (id: string) => mockGetRoom(id),
      getStartingRoomId: () => mockGetStartingRoomId(),
    }),
  },
}));

import { writeToClient, writeFormattedMessageToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;
const mockWriteFormattedMessageToClient = writeFormattedMessageToClient as jest.MockedFunction<
  typeof writeFormattedMessageToClient
>;

describe('YellCommand', () => {
  let yellCommand: YellCommand;
  let clients: Map<string, ConnectedClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    clients = new Map();
    mockGetStartingRoomId.mockReturnValue('start');
    yellCommand = new YellCommand(clients);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(yellCommand.name).toBe('yell');
    });

    it('should have a description', () => {
      expect(yellCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has forced transition', () => {
      const client = createMockClient({
        user: createMockUser(),
        stateData: { forcedTransition: true },
      });
      clients.set('test', client);

      yellCommand.execute(client, 'Hello!');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should show error if client has no user', () => {
      const client = createMockClient({ user: null });

      yellCommand.execute(client, 'Hello!');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('must be logged in')
      );
    });

    it('should show error if no message provided', () => {
      const room = createMockRoom('room1', 'Test Room');
      (room as Room & { exits: { direction: string; roomId: string }[] }).exits = [];
      mockGetRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'room1' }),
      });

      yellCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Yell what?'));
    });

    it('should show error if not in valid room', () => {
      mockGetRoom.mockReturnValue(undefined);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'room1' }),
      });

      yellCommand.execute(client, 'Hello!');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('not in a valid room')
      );
    });

    it('should yell message in uppercase', () => {
      const room = createMockRoom('room1', 'Test Room');
      (room as Room & { exits: { direction: string; roomId: string }[]; players: string[] }).exits =
        [];
      (
        room as Room & { exits: { direction: string; roomId: string }[]; players: string[] }
      ).players = [];
      mockGetRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser({ username: 'yeller', currentRoomId: 'room1' }),
      });

      yellCommand.execute(client, 'hello');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('HELLO!'));
    });

    it('should add exclamation mark if not present', () => {
      const room = createMockRoom('room1', 'Test Room');
      (room as Room & { exits: { direction: string; roomId: string }[]; players: string[] }).exits =
        [];
      (
        room as Room & { exits: { direction: string; roomId: string }[]; players: string[] }
      ).players = [];
      mockGetRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser({ username: 'yeller', currentRoomId: 'room1' }),
      });

      yellCommand.execute(client, 'hello');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringMatching(/HELLO!/));
    });

    it('should not add extra exclamation mark if already present', () => {
      const room = createMockRoom('room1', 'Test Room');
      (room as Room & { exits: { direction: string; roomId: string }[]; players: string[] }).exits =
        [];
      (
        room as Room & { exits: { direction: string; roomId: string }[]; players: string[] }
      ).players = [];
      mockGetRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser({ username: 'yeller', currentRoomId: 'room1' }),
      });

      yellCommand.execute(client, 'hello!');

      // Should be HELLO! not HELLO!!
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringMatching(/HELLO!'/));
    });

    it('should notify other players in the same room', () => {
      const room = createMockRoom('room1', 'Test Room');
      (room as Room & { exits: { direction: string; roomId: string }[]; players: string[] }).exits =
        [];
      (
        room as Room & { exits: { direction: string; roomId: string }[]; players: string[] }
      ).players = ['yeller', 'listener'];
      mockGetRoom.mockReturnValue(room);

      const sender = createMockClient({
        id: 'sender',
        user: createMockUser({ username: 'yeller', currentRoomId: 'room1' }),
        authenticated: true,
      });
      const receiver = createMockClient({
        id: 'receiver',
        user: createMockUser({ username: 'listener', currentRoomId: 'room1' }),
        authenticated: true,
      });
      clients.set('sender', sender);
      clients.set('receiver', receiver);

      yellCommand.execute(sender, 'hello');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        receiver,
        expect.stringContaining('yells')
      );
    });

    it('should notify players in adjacent rooms', () => {
      const currentRoom = createMockRoom('room1', 'Test Room');
      (
        currentRoom as Room & { exits: { direction: string; roomId: string }[]; players: string[] }
      ).exits = [{ direction: 'north', roomId: 'room2' }];
      (
        currentRoom as Room & { exits: { direction: string; roomId: string }[]; players: string[] }
      ).players = ['yeller'];

      const adjacentRoom = createMockRoom('room2', 'Adjacent Room');
      (
        adjacentRoom as Room & { exits: { direction: string; roomId: string }[]; players: string[] }
      ).exits = [{ direction: 'south', roomId: 'room1' }];
      (
        adjacentRoom as Room & { exits: { direction: string; roomId: string }[]; players: string[] }
      ).players = ['listener'];

      mockGetRoom.mockImplementation((id: string) => {
        if (id === 'room1') return currentRoom;
        if (id === 'room2') return adjacentRoom;
        return undefined;
      });

      const sender = createMockClient({
        id: 'sender',
        user: createMockUser({ username: 'yeller', currentRoomId: 'room1' }),
        authenticated: true,
      });
      const adjacentReceiver = createMockClient({
        id: 'adjacent',
        user: createMockUser({ username: 'listener', currentRoomId: 'room2' }),
        authenticated: true,
      });
      clients.set('sender', sender);
      clients.set('adjacent', adjacentReceiver);

      yellCommand.execute(sender, 'hello');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        adjacentReceiver,
        expect.stringContaining('hear someone yell from the south')
      );
    });
  });
});
