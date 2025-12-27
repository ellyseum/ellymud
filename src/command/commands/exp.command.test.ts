/**
 * Unit tests for ExpCommand
 * @module command/commands/exp.command.test
 */

import { ExpCommand } from './exp.command';
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

describe('ExpCommand', () => {
  let expCommand: ExpCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    expCommand = new ExpCommand();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(expCommand.name).toBe('exp');
    });

    it('should have a description', () => {
      expect(expCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should show error if client has no user', () => {
      const client = createMockClient({ user: null });

      expCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('must be logged in')
      );
    });

    it('should display experience for level 1 player with 0 exp', () => {
      const client = createMockClient({
        user: createMockUser({ level: 1, experience: 0 }),
      });

      expCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('0/1000 experience points')
      );
    });

    it('should display remaining experience to next level', () => {
      const client = createMockClient({
        user: createMockUser({ level: 1, experience: 500 }),
      });

      expCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('500/1000 experience points')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('500 more experience')
      );
    });

    it('should show training message when player has enough exp to level up', () => {
      const client = createMockClient({
        user: createMockUser({ level: 1, experience: 1000 }),
      });

      expCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Seek training for advancement')
      );
    });

    it('should show training message when player has more than enough exp', () => {
      const client = createMockClient({
        user: createMockUser({ level: 1, experience: 1500 }),
      });

      expCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Seek training for advancement')
      );
    });

    it('should calculate correct exp for level 2 player', () => {
      // Level 2 needs 1500 exp for next level
      // Total exp to reach level 2 is 1000
      // So at level 2 with 1200 total exp, progress is 200/1500
      const client = createMockClient({
        user: createMockUser({ level: 2, experience: 1200 }),
      });

      expCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('200/1500 experience points')
      );
    });

    it('should calculate correct exp for higher level player', () => {
      // Level 3 needs 2250 exp for next level
      // Total exp to reach level 3 is 1000 + 1500 = 2500
      // So at level 3 with 3000 total exp, progress is 500/2250
      const client = createMockClient({
        user: createMockUser({ level: 3, experience: 3000 }),
      });

      expCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('500/2250 experience points')
      );
    });

    it('should show 1 remaining exp when almost at level up', () => {
      // Level 1 with 999 exp (1 away from 1000 needed)
      const client = createMockClient({
        user: createMockUser({ level: 1, experience: 999 }),
      });

      expCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('1 more experience')
      );
    });
  });
});
