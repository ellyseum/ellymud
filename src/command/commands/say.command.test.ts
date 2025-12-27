/**
 * Unit tests for SayCommand
 * @module command/commands/say.command.test
 */

import { SayCommand } from './say.command';
import { ConnectedClient } from '../../types';
import { createMockUser, createMockClient } from '../../test/helpers/mockFactories';

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

describe('SayCommand', () => {
  let sayCommand: SayCommand;
  let clients: Map<string, ConnectedClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    clients = new Map();
    sayCommand = new SayCommand(clients);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(sayCommand.name).toBe('say');
    });

    it('should have a description', () => {
      expect(sayCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has forced transition', () => {
      const client = createMockClient({
        user: createMockUser(),
        stateData: { forcedTransition: true },
      });
      clients.set('test', client);

      sayCommand.execute(client, 'Hello');

      expect(mockWriteMessageToClient).not.toHaveBeenCalled();
    });

    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      sayCommand.execute(client, 'Hello');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should show error if no message provided', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      sayCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Say what?'));
    });

    it('should send message to sender', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'speaker' }),
        authenticated: true,
      });
      clients.set('speaker', client);

      sayCommand.execute(client, 'Hello world');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('You say')
      );
    });

    it('should send message to other authenticated clients', () => {
      const sender = createMockClient({
        id: 'sender',
        user: createMockUser({ username: 'speaker' }),
        authenticated: true,
      });
      const receiver = createMockClient({
        id: 'receiver',
        user: createMockUser({ username: 'listener' }),
        authenticated: true,
      });
      clients.set('sender', sender);
      clients.set('receiver', receiver);

      sayCommand.execute(sender, 'Hello world');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        receiver,
        expect.stringContaining('says')
      );
    });

    it('should not send to unauthenticated clients', () => {
      const sender = createMockClient({
        id: 'sender',
        user: createMockUser({ username: 'speaker' }),
        authenticated: true,
      });
      const unauthenticatedClient = createMockClient({
        id: 'unauth',
        user: null,
        authenticated: false,
      });
      clients.set('sender', sender);
      clients.set('unauth', unauthenticatedClient);

      sayCommand.execute(sender, 'Hello world');

      // Should only send to the sender
      expect(mockWriteMessageToClient).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple receivers', () => {
      const sender = createMockClient({
        id: 'sender',
        user: createMockUser({ username: 'speaker' }),
        authenticated: true,
      });
      const receiver1 = createMockClient({
        id: 'receiver1',
        user: createMockUser({ username: 'listener1' }),
        authenticated: true,
      });
      const receiver2 = createMockClient({
        id: 'receiver2',
        user: createMockUser({ username: 'listener2' }),
        authenticated: true,
      });
      clients.set('sender', sender);
      clients.set('receiver1', receiver1);
      clients.set('receiver2', receiver2);

      sayCommand.execute(sender, 'Hello everyone');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledTimes(2);
    });
  });
});
