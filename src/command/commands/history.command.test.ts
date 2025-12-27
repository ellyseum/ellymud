/**
 * Unit tests for HistoryCommand
 * @module command/commands/history.command.test
 */

import { HistoryCommand } from './history.command';
import { createMockClient, createMockUser } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('HistoryCommand', () => {
  let historyCommand: HistoryCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    historyCommand = new HistoryCommand();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(historyCommand.name).toBe('history');
    });

    it('should have a description', () => {
      expect(historyCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      historyCommand.execute(client, '');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should display empty history message when commandHistory is undefined', () => {
      const user = createMockUser();
      delete user.commandHistory;
      const client = createMockClient({ user });

      historyCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('No command history')
      );
    });

    it('should display empty history message when no commands', () => {
      const client = createMockClient({
        user: createMockUser({ commandHistory: [] }),
      });

      historyCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('No commands in history')
      );
    });

    it('should display command history', () => {
      const client = createMockClient({
        user: createMockUser({
          commandHistory: ['look', 'stats', 'inventory'],
        }),
      });

      historyCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('look'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('stats'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('inventory'));
    });

    it('should display history header', () => {
      const client = createMockClient({
        user: createMockUser({
          commandHistory: ['look'],
        }),
      });

      historyCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Command History')
      );
    });

    it('should number history entries', () => {
      const client = createMockClient({
        user: createMockUser({
          commandHistory: ['look', 'stats'],
        }),
      });

      historyCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('1. look'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('2. stats'));
    });

    it('should handle large history', () => {
      const history = Array(30)
        .fill(null)
        .map((_, i) => `command${i + 1}`);
      const client = createMockClient({
        user: createMockUser({
          commandHistory: history,
        }),
      });

      historyCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('command1'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('command30'));
    });

    it('should display footer', () => {
      const client = createMockClient({
        user: createMockUser({
          commandHistory: ['look'],
        }),
      });

      historyCommand.execute(client, '');

      // Should have footer separator
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('==='));
    });
  });
});
