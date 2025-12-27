/**
 * Unit tests for PlayedCommand
 * @module command/commands/played.command.test
 */

import { PlayedCommand } from './played.command';
import { User } from '../../types';
import {
  createMockClient,
  createMockUser,
  createMockUserManager,
} from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('PlayedCommand', () => {
  let playedCommand: PlayedCommand;
  let mockUserManager: ReturnType<typeof createMockUserManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserManager = createMockUserManager();
    playedCommand = new PlayedCommand(mockUserManager);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(playedCommand.name).toBe('played');
    });

    it('should have a description', () => {
      expect(playedCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      playedCommand.execute(client, '');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should return early if userManager returns undefined for user', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockUserManager.getUser.mockReturnValue(undefined);

      playedCommand.execute(client, '');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should display play time in hours, minutes, and seconds', () => {
      const user = createMockUser({
        username: 'testuser',
        totalPlayTime: 3661000, // 1 hour, 1 minute, 1 second in ms
      });
      const client = createMockClient({ user });
      mockUserManager.getUser.mockReturnValue(user);

      playedCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('1h 1m 1s'));
    });

    it('should handle zero play time', () => {
      const user = createMockUser({
        username: 'testuser',
        totalPlayTime: 0,
      });
      const client = createMockClient({ user });
      mockUserManager.getUser.mockReturnValue(user);

      playedCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('0h 0m 0s'));
    });

    it('should handle undefined play time as zero', () => {
      const user = createMockUser({
        username: 'testuser',
      });
      // Simulate undefined totalPlayTime by not setting it
      (user as Partial<User>).totalPlayTime = undefined;
      const client = createMockClient({ user });
      mockUserManager.getUser.mockReturnValue(user);

      playedCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('0h 0m 0s'));
    });

    it('should display correct formatting for large play times', () => {
      const user = createMockUser({
        username: 'testuser',
        totalPlayTime: 86400000 + 7200000 + 180000 + 45000, // 24h + 2h + 3m + 45s = 26h 3m 45s
      });
      const client = createMockClient({ user });
      mockUserManager.getUser.mockReturnValue(user);

      playedCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('26h 3m 45s'));
    });
  });
});
