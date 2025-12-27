/**
 * Unit tests for RestrictCommand
 * @module command/commands/restrict.command.test
 */

import { RestrictCommand } from './restrict.command';
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

describe('RestrictCommand', () => {
  let restrictCommand: RestrictCommand;
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
      updateUserStats: jest.fn(),
      getActiveUserSession: jest.fn().mockReturnValue(null),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    restrictCommand = new RestrictCommand(mockUserManager as any);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(restrictCommand.name).toBe('restrict');
    });

    it('should have a description', () => {
      expect(restrictCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      restrictCommand.execute(client, 'on testuser');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should show error when not authorized', () => {
      mockIsAuthorized.mockReturnValue(false);

      const client = createMockClient({
        user: createMockUser(),
      });

      restrictCommand.execute(client, 'on testuser');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('do not have permission')
      );
    });

    it('should show help when no action provided', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      restrictCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Movement Restriction Command')
      );
    });

    it('should show help when invalid action provided', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      restrictCommand.execute(client, 'invalid');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Usage:'));
    });

    it('should show error when target user not found', () => {
      mockUserManager.getUser.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser(),
      });

      restrictCommand.execute(client, 'on nonexistent');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('not found'));
    });

    describe('restrict on', () => {
      it('should restrict user movement', () => {
        const targetUser = createMockUser({ username: 'target' });
        mockUserManager.getUser.mockReturnValue(targetUser);

        const client = createMockClient({
          user: createMockUser(),
        });

        restrictCommand.execute(client, 'on target');

        expect(mockUserManager.updateUserStats).toHaveBeenCalledWith('target', {
          movementRestricted: true,
          movementRestrictedReason: 'You are unable to move.',
        });
        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('has been restricted')
        );
      });

      it('should restrict with custom reason', () => {
        const targetUser = createMockUser({ username: 'target' });
        mockUserManager.getUser.mockReturnValue(targetUser);

        const client = createMockClient({
          user: createMockUser(),
        });

        restrictCommand.execute(client, 'on target You are stuck in quicksand');

        expect(mockUserManager.updateUserStats).toHaveBeenCalledWith('target', {
          movementRestricted: true,
          movementRestrictedReason: 'You are stuck in quicksand',
        });
      });

      it('should default to self when no username provided', () => {
        const adminUser = createMockUser({ username: 'admin' });
        mockUserManager.getUser.mockReturnValue(adminUser);

        const client = createMockClient({ user: adminUser });

        restrictCommand.execute(client, 'on');

        expect(mockUserManager.updateUserStats).toHaveBeenCalledWith(
          'admin',
          expect.objectContaining({ movementRestricted: true })
        );
      });

      it('should notify target user if online', () => {
        const targetUser = createMockUser({ username: 'target' });
        mockUserManager.getUser.mockReturnValue(targetUser);

        const adminClient = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        const targetClient = createMockClient({
          user: createMockUser({ username: 'target' }),
        });

        mockUserManager.getActiveUserSession.mockReturnValue(targetClient);

        restrictCommand.execute(adminClient, 'on target');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          targetClient,
          expect.stringContaining('has been restricted')
        );
      });
    });

    describe('restrict off', () => {
      it('should remove movement restriction', () => {
        const targetUser = createMockUser({
          username: 'target',
          movementRestricted: true,
          movementRestrictedReason: 'Test reason',
        });
        mockUserManager.getUser.mockReturnValue(targetUser);

        const client = createMockClient({
          user: createMockUser(),
        });

        restrictCommand.execute(client, 'off target');

        expect(mockUserManager.updateUserStats).toHaveBeenCalledWith('target', {
          movementRestricted: false,
          movementRestrictedReason: undefined,
        });
        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('has been removed')
        );
      });

      it('should notify target user if online', () => {
        const targetUser = createMockUser({
          username: 'target',
          movementRestricted: true,
        });
        mockUserManager.getUser.mockReturnValue(targetUser);

        const adminClient = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        const targetClient = createMockClient({
          user: createMockUser({ username: 'target' }),
        });

        mockUserManager.getActiveUserSession.mockReturnValue(targetClient);

        restrictCommand.execute(adminClient, 'off target');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          targetClient,
          expect.stringContaining('has been removed')
        );
      });
    });

    describe('restrict status', () => {
      it('should show restricted status with reason', () => {
        const targetUser = createMockUser({
          username: 'target',
          movementRestricted: true,
          movementRestrictedReason: 'Test reason',
        });
        mockUserManager.getUser.mockReturnValue(targetUser);

        const client = createMockClient({
          user: createMockUser(),
        });

        restrictCommand.execute(client, 'status target');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('is restricted')
        );
        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('Test reason')
        );
      });

      it('should show restricted status without reason', () => {
        const targetUser = createMockUser({
          username: 'target',
          movementRestricted: true,
        });
        mockUserManager.getUser.mockReturnValue(targetUser);

        const client = createMockClient({
          user: createMockUser(),
        });

        restrictCommand.execute(client, 'status target');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('is restricted')
        );
      });

      it('should show unrestricted status', () => {
        const targetUser = createMockUser({
          username: 'target',
          movementRestricted: false,
        });
        mockUserManager.getUser.mockReturnValue(targetUser);

        const client = createMockClient({
          user: createMockUser(),
        });

        restrictCommand.execute(client, 'status target');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('not restricted')
        );
      });
    });
  });
});
