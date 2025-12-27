/**
 * Unit tests for RemoveFlagCommand
 * @module command/commands/removeflag.command.test
 */

import { RemoveFlagCommand } from './removeflag.command';
import { createMockClient, createMockUser } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

const mockIsAuthorized = jest.fn();

jest.mock('./sudo.command', () => ({
  SudoCommand: {
    getInstance: jest.fn().mockReturnValue({
      isAuthorized: (username: string) => mockIsAuthorized(username),
    }),
  },
}));

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('RemoveFlagCommand', () => {
  let removeFlagCommand: RemoveFlagCommand;
  let mockUserManager: {
    getUser: jest.Mock;
    removeFlag: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthorized.mockReturnValue(true); // Default to authorized

    mockUserManager = {
      getUser: jest.fn(),
      removeFlag: jest.fn().mockReturnValue(true),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    removeFlagCommand = new RemoveFlagCommand(mockUserManager as any);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(removeFlagCommand.name).toBe('removeflag');
    });

    it('should have a description', () => {
      expect(removeFlagCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      removeFlagCommand.execute(client, 'testuser testflag');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should show error when not authorized', () => {
      mockIsAuthorized.mockReturnValue(false);

      const client = createMockClient({
        user: createMockUser(),
      });

      removeFlagCommand.execute(client, 'testuser testflag');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('do not have permission')
      );
    });

    it('should show usage when no arguments provided', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      removeFlagCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Usage:'));
    });

    it('should show usage when only username provided', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      removeFlagCommand.execute(client, 'testuser');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Usage:'));
    });

    it('should remove flag successfully', () => {
      mockUserManager.removeFlag.mockReturnValue(true);

      const client = createMockClient({
        user: createMockUser(),
      });

      removeFlagCommand.execute(client, 'testuser testflag');

      expect(mockUserManager.removeFlag).toHaveBeenCalledWith('testuser', 'testflag');
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('removed from user')
      );
    });

    it('should show error when user not found', () => {
      mockUserManager.removeFlag.mockReturnValue(false);
      mockUserManager.getUser.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser(),
      });

      removeFlagCommand.execute(client, 'nonexistent testflag');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('not found'));
    });

    it('should show error when flag not found on existing user', () => {
      mockUserManager.removeFlag.mockReturnValue(false);
      mockUserManager.getUser.mockReturnValue(createMockUser({ username: 'testuser' }));

      const client = createMockClient({
        user: createMockUser(),
      });

      removeFlagCommand.execute(client, 'testuser nonexistentflag');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('not found for user')
      );
    });

    it('should handle whitespace in arguments', () => {
      mockUserManager.removeFlag.mockReturnValue(true);

      const client = createMockClient({
        user: createMockUser(),
      });

      removeFlagCommand.execute(client, '  testuser   testflag  ');

      expect(mockUserManager.removeFlag).toHaveBeenCalledWith('testuser', 'testflag');
    });
  });
});
