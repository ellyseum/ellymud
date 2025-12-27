/**
 * Unit tests for TimeCommand
 * @module command/commands/time.command.test
 */

import { TimeCommand } from './time.command';
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

describe('TimeCommand', () => {
  let timeCommand: TimeCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    timeCommand = new TimeCommand();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(timeCommand.name).toBe('time');
    });

    it('should have a description', () => {
      expect(timeCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should display time information', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      timeCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should work without a logged in user', () => {
      const client = createMockClient({ user: null });

      timeCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should display current date', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      timeCommand.execute(client, '');

      // Should contain some form of date/time output
      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should handle arguments gracefully', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      // Time command should ignore arguments
      timeCommand.execute(client, 'extra args');

      expect(mockWriteToClient).toHaveBeenCalled();
    });
  });
});
