/**
 * Unit tests for WhoCommand
 * @module command/commands/who.command.test
 */

import { WhoCommand } from './who.command';
import { ConnectedClient } from '../../types';
import {
  createMockClient,
  createMockUser,
  createMockConnection,
} from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

jest.mock('../../utils/formatters', () => ({
  formatUsername: jest.fn((name: string) => name.charAt(0).toUpperCase() + name.slice(1)),
}));

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('WhoCommand', () => {
  let whoCommand: WhoCommand;
  let clientsMap: Map<string, ConnectedClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    clientsMap = new Map();
    whoCommand = new WhoCommand(clientsMap);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(whoCommand.name).toBe('who');
    });

    it('should have a description', () => {
      expect(whoCommand.description).toBeDefined();
    });

    it('should have aliases', () => {
      expect(whoCommand.aliases).toContain('users');
      expect(whoCommand.aliases).toContain('online');
    });
  });

  describe('execute', () => {
    it('should display header', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      whoCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Online Users')
      );
    });

    it('should display no players when none are online', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      whoCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('No users online')
      );
    });

    it('should display authenticated players', () => {
      const player1 = createMockClient({
        id: 'player1',
        user: createMockUser({ username: 'Alice' }),
        authenticated: true,
        connection: createMockConnection('telnet'),
      });
      const player2 = createMockClient({
        id: 'player2',
        user: createMockUser({ username: 'Bob' }),
        authenticated: true,
        connection: createMockConnection('websocket'),
      });

      clientsMap.set('player1', player1);
      clientsMap.set('player2', player2);

      const client = createMockClient({
        user: createMockUser(),
      });

      whoCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Alice'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Bob'));
    });

    it('should not display unauthenticated players', () => {
      const authPlayer = createMockClient({
        id: 'auth',
        user: createMockUser({ username: 'Alice' }),
        authenticated: true,
        connection: createMockConnection(),
      });
      const unauthPlayer = createMockClient({
        id: 'unauth',
        user: null,
        authenticated: false,
      });

      clientsMap.set('auth', authPlayer);
      clientsMap.set('unauth', unauthPlayer);

      const client = createMockClient({
        user: createMockUser(),
      });

      whoCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Alice'));
    });

    it('should show connection type for players', () => {
      const telnetPlayer = createMockClient({
        id: 'telnet',
        user: createMockUser({ username: 'TelnetUser' }),
        authenticated: true,
        connection: createMockConnection('telnet'),
      });

      clientsMap.set('telnet', telnetPlayer);

      const client = createMockClient({
        user: createMockUser(),
      });

      whoCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('telnet'));
    });

    it('should show web label for websocket connections', () => {
      const webPlayer = createMockClient({
        id: 'web',
        user: createMockUser({ username: 'WebUser' }),
        authenticated: true,
        connection: createMockConnection('websocket'),
      });

      clientsMap.set('web', webPlayer);

      const client = createMockClient({
        user: createMockUser(),
      });

      whoCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('web'));
    });

    it('should display footer', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      whoCommand.execute(client, '');

      // Should have footer separator
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('==='));
    });

    it('should handle multiple players correctly', () => {
      for (let i = 0; i < 5; i++) {
        const player = createMockClient({
          id: `player${i}`,
          user: createMockUser({ username: `Player${i + 1}` }),
          authenticated: true,
          connection: createMockConnection(),
        });
        clientsMap.set(`player${i}`, player);
      }

      const client = createMockClient({
        user: createMockUser(),
      });

      whoCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Player1'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Player5'));
    });
  });
});
