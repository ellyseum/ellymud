/**
 * Unit tests for LaughCommand
 * @module command/commands/laugh.command.test
 */

import { LaughCommand } from './laugh.command';
import { ConnectedClient } from '../../types';
import { createMockClient, createMockUser } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
  writeMessageToClient: jest.fn(),
  writeFormattedMessageToClient: jest.fn(),
}));

jest.mock('../../utils/formatters', () => ({
  formatUsername: jest.fn(
    (username: string) => username.charAt(0).toUpperCase() + username.slice(1)
  ),
}));

import {
  writeToClient,
  writeMessageToClient,
  writeFormattedMessageToClient,
} from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;
const mockWriteMessageToClient = writeMessageToClient as jest.MockedFunction<
  typeof writeMessageToClient
>;
const mockWriteFormattedMessageToClient = writeFormattedMessageToClient as jest.MockedFunction<
  typeof writeFormattedMessageToClient
>;

describe('LaughCommand', () => {
  let laughCommand: LaughCommand;
  let clients: Map<string, ConnectedClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    clients = new Map();
    laughCommand = new LaughCommand(clients);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(laughCommand.name).toBe('laugh');
    });

    it('should have a description', () => {
      expect(laughCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has forced transition', () => {
      const client = createMockClient({
        user: createMockUser(),
        stateData: { forcedTransition: true },
      });
      clients.set('test', client);

      laughCommand.execute(client, '');

      expect(mockWriteMessageToClient).not.toHaveBeenCalled();
    });

    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      laughCommand.execute(client, '');

      expect(mockWriteToClient).not.toHaveBeenCalled();
      expect(mockWriteMessageToClient).not.toHaveBeenCalled();
    });

    it('should laugh at room when no target specified', () => {
      const client = createMockClient({
        id: 'sender',
        user: createMockUser({ username: 'laugher', currentRoomId: 'room1' }),
        authenticated: true,
      });
      clients.set('sender', client);

      laughCommand.execute(client, '');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('You laugh')
      );
    });

    it('should notify other players in same room when laughing', () => {
      const sender = createMockClient({
        id: 'sender',
        user: createMockUser({ username: 'laugher', currentRoomId: 'room1' }),
        authenticated: true,
      });
      const receiver = createMockClient({
        id: 'receiver',
        user: createMockUser({ username: 'observer', currentRoomId: 'room1' }),
        authenticated: true,
      });
      clients.set('sender', sender);
      clients.set('receiver', receiver);

      laughCommand.execute(sender, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        receiver,
        expect.stringContaining('laughs')
      );
    });

    it('should not notify players in different rooms', () => {
      const sender = createMockClient({
        id: 'sender',
        user: createMockUser({ username: 'laugher', currentRoomId: 'room1' }),
        authenticated: true,
      });
      const otherRoom = createMockClient({
        id: 'other',
        user: createMockUser({ username: 'faraway', currentRoomId: 'room2' }),
        authenticated: true,
      });
      clients.set('sender', sender);
      clients.set('other', otherRoom);

      laughCommand.execute(sender, '');

      expect(mockWriteFormattedMessageToClient).not.toHaveBeenCalledWith(
        otherRoom,
        expect.anything()
      );
    });

    it('should show error when laughing at self', () => {
      const client = createMockClient({
        id: 'sender',
        user: createMockUser({ username: 'laugher', currentRoomId: 'room1' }),
        authenticated: true,
      });
      clients.set('sender', client);

      laughCommand.execute(client, 'laugher');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('yourself'));
    });

    it('should show error when target is not in room', () => {
      const client = createMockClient({
        id: 'sender',
        user: createMockUser({ username: 'laugher', currentRoomId: 'room1' }),
        authenticated: true,
      });
      clients.set('sender', client);

      laughCommand.execute(client, 'nobody');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('not here'));
    });

    it('should laugh at specific target', () => {
      const sender = createMockClient({
        id: 'sender',
        user: createMockUser({ username: 'laugher', currentRoomId: 'room1' }),
        authenticated: true,
      });
      const target = createMockClient({
        id: 'target',
        user: createMockUser({ username: 'target', currentRoomId: 'room1' }),
        authenticated: true,
      });
      clients.set('sender', sender);
      clients.set('target', target);

      laughCommand.execute(sender, 'target');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        sender,
        expect.stringContaining('You laugh at')
      );
      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        target,
        expect.stringContaining('laughs at you')
      );
    });

    it('should notify third parties when laughing at target', () => {
      const sender = createMockClient({
        id: 'sender',
        user: createMockUser({ username: 'laugher', currentRoomId: 'room1' }),
        authenticated: true,
      });
      const target = createMockClient({
        id: 'target',
        user: createMockUser({ username: 'victim', currentRoomId: 'room1' }),
        authenticated: true,
      });
      const observer = createMockClient({
        id: 'observer',
        user: createMockUser({ username: 'watcher', currentRoomId: 'room1' }),
        authenticated: true,
      });
      clients.set('sender', sender);
      clients.set('target', target);
      clients.set('observer', observer);

      laughCommand.execute(sender, 'victim');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        observer,
        expect.stringContaining('laughs at')
      );
    });
  });
});
