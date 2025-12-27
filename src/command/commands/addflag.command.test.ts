/**
 * Unit tests for AddFlagCommand
 * @module command/commands/addflag.command.test
 */

import { AddFlagCommand } from './addflag.command';
import { createMockClient, createMockUser } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  createContextLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
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

describe('AddFlagCommand', () => {
  let addFlagCommand: AddFlagCommand;
  let mockUserManager: {
    getUser: jest.Mock;
    updateUserStats: jest.Mock;
    getActiveUserSession: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthorized.mockReturnValue(true); // Default to authorized

    mockUserManager = {
      getUser: jest.fn(),
      updateUserStats: jest.fn().mockReturnValue(true),
      getActiveUserSession: jest.fn().mockReturnValue(null),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addFlagCommand = new AddFlagCommand(mockUserManager as any);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(addFlagCommand.name).toBe('addflag');
    });

    it('should have a description', () => {
      expect(addFlagCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      addFlagCommand.execute(client, 'testuser testflag');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should show error when not authorized', () => {
      mockIsAuthorized.mockReturnValue(false);

      const client = createMockClient({
        user: createMockUser(),
      });

      addFlagCommand.execute(client, 'testuser testflag');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('do not have permission')
      );
    });

    it('should show usage when no arguments provided', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      addFlagCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Usage:'));
    });

    it('should show usage when only username provided', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      addFlagCommand.execute(client, 'testuser');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Usage:'));
    });

    it('should show error when target user not found', () => {
      mockUserManager.getUser.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser(),
      });

      addFlagCommand.execute(client, 'nonexistent testflag');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('not found'));
    });

    it('should add flag with boolean true value', () => {
      const targetUser = createMockUser({ username: 'target', flags: [] });
      mockUserManager.getUser.mockReturnValue(targetUser);

      const client = createMockClient({
        user: createMockUser(),
      });

      addFlagCommand.execute(client, 'target canEdit true');

      expect(mockUserManager.updateUserStats).toHaveBeenCalledWith('target', {
        flags: ['canEdit:true'],
      });
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Set flag'));
    });

    it('should add flag with boolean false value', () => {
      const targetUser = createMockUser({ username: 'target', flags: [] });
      mockUserManager.getUser.mockReturnValue(targetUser);

      const client = createMockClient({
        user: createMockUser(),
      });

      addFlagCommand.execute(client, 'target isRestricted false');

      expect(mockUserManager.updateUserStats).toHaveBeenCalledWith('target', {
        flags: ['isRestricted:false'],
      });
    });

    it('should add flag with numeric value', () => {
      const targetUser = createMockUser({ username: 'target', flags: [] });
      mockUserManager.getUser.mockReturnValue(targetUser);

      const client = createMockClient({
        user: createMockUser(),
      });

      addFlagCommand.execute(client, 'target level 99');

      expect(mockUserManager.updateUserStats).toHaveBeenCalledWith('target', {
        flags: ['level:99'],
      });
    });

    it('should add flag with string value', () => {
      const targetUser = createMockUser({ username: 'target', flags: [] });
      mockUserManager.getUser.mockReturnValue(targetUser);

      const client = createMockClient({
        user: createMockUser(),
      });

      addFlagCommand.execute(client, 'target title Hero');

      expect(mockUserManager.updateUserStats).toHaveBeenCalledWith('target', {
        flags: ['title:Hero'],
      });
    });

    it('should add flag with multi-word string value', () => {
      const targetUser = createMockUser({ username: 'target', flags: [] });
      mockUserManager.getUser.mockReturnValue(targetUser);

      const client = createMockClient({
        user: createMockUser(),
      });

      addFlagCommand.execute(client, 'target title The Great Hero');

      expect(mockUserManager.updateUserStats).toHaveBeenCalledWith('target', {
        flags: ['title:The Great Hero'],
      });
    });

    it('should replace existing flag with same name', () => {
      const targetUser = createMockUser({ username: 'target', flags: ['canEdit:false'] });
      mockUserManager.getUser.mockReturnValue(targetUser);

      const client = createMockClient({
        user: createMockUser(),
      });

      addFlagCommand.execute(client, 'target canEdit true');

      expect(mockUserManager.updateUserStats).toHaveBeenCalledWith('target', {
        flags: ['canEdit:true'],
      });
    });

    it('should initialize flags array if not present', () => {
      const targetUser = createMockUser({ username: 'target' });
      delete (targetUser as { flags?: string[] }).flags;
      mockUserManager.getUser.mockReturnValue(targetUser);

      const client = createMockClient({
        user: createMockUser(),
      });

      addFlagCommand.execute(client, 'target testflag value');

      expect(mockUserManager.updateUserStats).toHaveBeenCalled();
    });

    it('should show warning when update fails', () => {
      const targetUser = createMockUser({ username: 'target', flags: [] });
      mockUserManager.getUser.mockReturnValue(targetUser);
      mockUserManager.updateUserStats.mockReturnValue(false);

      const client = createMockClient({
        user: createMockUser(),
      });

      addFlagCommand.execute(client, 'target testflag value');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Warning'));
    });

    it('should notify target user if online', () => {
      const targetUser = createMockUser({ username: 'target', flags: [] });
      mockUserManager.getUser.mockReturnValue(targetUser);

      const adminClient = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      const targetClient = createMockClient({
        user: createMockUser({ username: 'target' }),
      });

      mockUserManager.getActiveUserSession.mockReturnValue(targetClient);

      addFlagCommand.execute(adminClient, 'target testflag value');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        targetClient,
        expect.stringContaining('updated your account flags')
      );
    });

    it('should not notify self when adding flag to own account', () => {
      const user = createMockUser({ username: 'admin', flags: [] });
      mockUserManager.getUser.mockReturnValue(user);

      const client = createMockClient({ user });

      addFlagCommand.execute(client, 'admin testflag value');

      // Should not call getActiveUserSession for self
      expect(mockUserManager.getActiveUserSession).not.toHaveBeenCalled();
    });
  });
});
