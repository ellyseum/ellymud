/**
 * Unit tests for ChangePasswordCommand
 * @module command/commands/changePassword.command.test
 */

import { ChangePasswordCommand } from './changePassword.command';
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

describe('ChangePasswordCommand', () => {
  let changePasswordCommand: ChangePasswordCommand;
  let mockUserManager: ReturnType<typeof createMockUserManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserManager = createMockUserManager();
    changePasswordCommand = new ChangePasswordCommand(mockUserManager);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(changePasswordCommand.name).toBe('changepassword');
    });

    it('should have a description', () => {
      expect(changePasswordCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      changePasswordCommand.execute(client, 'oldpass newpass');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should show usage if no arguments provided', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      changePasswordCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Usage:'));
    });

    it('should show usage if only one argument provided', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      changePasswordCommand.execute(client, 'oldpass');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Usage:'));
    });

    it('should show error if old password is incorrect', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockUserManager.authenticateUser.mockReturnValue(false);

      changePasswordCommand.execute(client, 'wrongpass newpass');

      expect(mockUserManager.authenticateUser).toHaveBeenCalledWith('testuser', 'wrongpass');
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Old password is incorrect')
      );
    });

    it('should change password successfully', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockUserManager.authenticateUser.mockReturnValue(true);
      mockUserManager.changeUserPassword = jest.fn().mockReturnValue(true);

      changePasswordCommand.execute(client, 'oldpass newpass');

      expect(mockUserManager.authenticateUser).toHaveBeenCalledWith('testuser', 'oldpass');
      expect(mockUserManager.changeUserPassword).toHaveBeenCalledWith('testuser', 'newpass');
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Password changed successfully')
      );
    });

    it('should show error if password change fails', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockUserManager.authenticateUser.mockReturnValue(true);
      mockUserManager.changeUserPassword = jest.fn().mockReturnValue(false);

      changePasswordCommand.execute(client, 'oldpass newpass');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Failed to change password')
      );
    });
  });
});
