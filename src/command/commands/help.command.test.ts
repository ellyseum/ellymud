/**
 * Unit tests for HelpCommand
 * @module command/commands/help.command.test
 */

import { HelpCommand } from './help.command';
import { Command } from '../command.interface';
import { createMockUser, createMockClient } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

// Helper to create a mock command
const createMockCommand = (name: string, description: string): Command =>
  ({
    name,
    description,
    execute: jest.fn(),
  }) as unknown as Command;

describe('HelpCommand', () => {
  let helpCommand: HelpCommand;
  let commands: Map<string, Command>;

  beforeEach(() => {
    jest.clearAllMocks();
    commands = new Map();
    helpCommand = new HelpCommand(commands);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(helpCommand.name).toBe('help');
    });

    it('should have a description', () => {
      expect(helpCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should output help header', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      helpCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Available Commands')
      );
    });

    it('should list registered commands', () => {
      commands.set('look', createMockCommand('look', 'Look around'));
      commands.set('inventory', createMockCommand('inventory', 'Show inventory'));
      helpCommand = new HelpCommand(commands);

      const client = createMockClient({
        user: createMockUser(),
      });

      helpCommand.execute(client, '');

      const allOutput = mockWriteToClient.mock.calls.map((call) => call[1]).join('');
      expect(allOutput).toContain('look');
      expect(allOutput).toContain('inventory');
    });

    it('should skip directional commands', () => {
      commands.set('north', createMockCommand('north', 'Go north'));
      commands.set('south', createMockCommand('south', 'Go south'));
      commands.set('look', createMockCommand('look', 'Look around'));
      helpCommand = new HelpCommand(commands);

      const client = createMockClient({
        user: createMockUser(),
      });

      helpCommand.execute(client, '');

      // Directional commands should be excluded
      const allOutput = mockWriteToClient.mock.calls.map((call) => call[1]).join('');
      expect(allOutput).toContain('look');
    });

    it('should handle empty command list', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      helpCommand.execute(client, '');

      // Should still output header without errors
      expect(mockWriteToClient).toHaveBeenCalled();
    });
  });
});
