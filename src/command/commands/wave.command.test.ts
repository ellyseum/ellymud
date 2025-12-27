/**
 * Unit tests for WaveCommand
 * @module command/commands/wave.command.test
 */

import { WaveCommand } from './wave.command';
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

describe('WaveCommand', () => {
  let waveCommand: WaveCommand;
  let clients: Map<string, ConnectedClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    clients = new Map();
    waveCommand = new WaveCommand(clients);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(waveCommand.name).toBe('wave');
    });

    it('should have a description', () => {
      expect(waveCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has forced transition', () => {
      const client = createMockClient({
        user: createMockUser(),
        stateData: { forcedTransition: true },
      });
      clients.set('test', client);

      waveCommand.execute(client, '');

      expect(mockWriteMessageToClient).not.toHaveBeenCalled();
    });

    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      waveCommand.execute(client, '');

      expect(mockWriteToClient).not.toHaveBeenCalled();
      expect(mockWriteMessageToClient).not.toHaveBeenCalled();
    });

    it('should wave at room when no target specified', () => {
      const client = createMockClient({
        id: 'sender',
        user: createMockUser({ username: 'waver', currentRoomId: 'room1' }),
        authenticated: true,
      });
      clients.set('sender', client);

      waveCommand.execute(client, '');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('You wave')
      );
    });

    it('should notify other players in same room when waving', () => {
      const sender = createMockClient({
        id: 'sender',
        user: createMockUser({ username: 'waver', currentRoomId: 'room1' }),
        authenticated: true,
      });
      const receiver = createMockClient({
        id: 'receiver',
        user: createMockUser({ username: 'observer', currentRoomId: 'room1' }),
        authenticated: true,
      });
      clients.set('sender', sender);
      clients.set('receiver', receiver);

      waveCommand.execute(sender, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        receiver,
        expect.stringContaining('waves')
      );
    });

    it('should not notify players in different rooms', () => {
      const sender = createMockClient({
        id: 'sender',
        user: createMockUser({ username: 'waver', currentRoomId: 'room1' }),
        authenticated: true,
      });
      const otherRoom = createMockClient({
        id: 'other',
        user: createMockUser({ username: 'faraway', currentRoomId: 'room2' }),
        authenticated: true,
      });
      clients.set('sender', sender);
      clients.set('other', otherRoom);

      waveCommand.execute(sender, '');

      expect(mockWriteFormattedMessageToClient).not.toHaveBeenCalledWith(
        otherRoom,
        expect.anything()
      );
    });

    it('should show error when waving at self', () => {
      const client = createMockClient({
        id: 'sender',
        user: createMockUser({ username: 'waver', currentRoomId: 'room1' }),
        authenticated: true,
      });
      clients.set('sender', client);

      waveCommand.execute(client, 'waver');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('yourself'));
    });

    it('should show error when target is not in room', () => {
      const client = createMockClient({
        id: 'sender',
        user: createMockUser({ username: 'waver', currentRoomId: 'room1' }),
        authenticated: true,
      });
      clients.set('sender', client);

      waveCommand.execute(client, 'nobody');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('not here'));
    });

    it('should wave at specific target', () => {
      const sender = createMockClient({
        id: 'sender',
        user: createMockUser({ username: 'waver', currentRoomId: 'room1' }),
        authenticated: true,
      });
      const target = createMockClient({
        id: 'target',
        user: createMockUser({ username: 'target', currentRoomId: 'room1' }),
        authenticated: true,
      });
      clients.set('sender', sender);
      clients.set('target', target);

      waveCommand.execute(sender, 'target');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        sender,
        expect.stringContaining('You wave at')
      );
      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        target,
        expect.stringContaining('waves at you')
      );
    });
  });
});
