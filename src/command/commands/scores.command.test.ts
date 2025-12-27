/**
 * Unit tests for ScoresCommand
 * @module command/commands/scores.command.test
 */

import { ScoresCommand } from './scores.command';
import { createMockClient, createMockUser } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

const mockGetSnakeHighScores = jest.fn();

jest.mock('../../user/userManager', () => ({
  UserManager: {
    getInstance: jest.fn().mockReturnValue({
      getSnakeHighScores: (limit: number) => mockGetSnakeHighScores(limit),
    }),
  },
}));

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('ScoresCommand', () => {
  let scoresCommand: ScoresCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSnakeHighScores.mockReturnValue([]);
    scoresCommand = new ScoresCommand();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(scoresCommand.name).toBe('scores');
    });

    it('should have a description', () => {
      expect(scoresCommand.description).toBeDefined();
    });

    it('should have aliases', () => {
      expect(scoresCommand.aliases).toContain('highscores');
      expect(scoresCommand.aliases).toContain('leaderboard');
    });
  });

  describe('execute', () => {
    it('should show message when no high scores recorded', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockGetSnakeHighScores.mockReturnValue([]);

      scoresCommand.execute(client, '');

      expect(mockGetSnakeHighScores).toHaveBeenCalledWith(10);
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('No high scores recorded yet')
      );
    });

    it('should display high scores header', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockGetSnakeHighScores.mockReturnValue([{ username: 'player1', score: 100 }]);

      scoresCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('SNAKE GAME HIGH SCORES')
      );
    });

    it('should display player rankings', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockGetSnakeHighScores.mockReturnValue([
        { username: 'player1', score: 100 },
        { username: 'player2', score: 80 },
      ]);

      scoresCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('player1'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('player2'));
    });

    it('should highlight current player score', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockGetSnakeHighScores.mockReturnValue([
        { username: 'testuser', score: 150 },
        { username: 'other', score: 100 },
      ]);

      scoresCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('testuser'));
    });

    it('should work when client has no user', () => {
      const client = createMockClient({ user: null });
      mockGetSnakeHighScores.mockReturnValue([{ username: 'player1', score: 100 }]);

      scoresCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalled();
    });
  });
});
