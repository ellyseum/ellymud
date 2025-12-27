/**
 * Unit tests for SudoCommand
 * @module command/commands/sudo.command.test
 */

import { createMockClient, createMockUser } from '../../test/helpers/mockFactories';

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue(
    JSON.stringify({
      admins: [
        { username: 'admin', level: 'super', addedBy: 'system', addedOn: '2023-01-01' },
        { username: 'testadmin', level: 'admin', addedBy: 'system', addedOn: '2023-01-01' },
      ],
    })
  ),
  writeFileSync: jest.fn(),
}));

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

jest.mock('../../utils/promptFormatter', () => ({
  drawCommandPrompt: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  createContextLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { SudoCommand } from './sudo.command';
import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('SudoCommand', () => {
  let sudoCommand: SudoCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance for testing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (SudoCommand as any).instance = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (SudoCommand as any).activeAdmins = new Set();
    sudoCommand = SudoCommand.getInstance();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(sudoCommand.name).toBe('sudo');
    });

    it('should have a description', () => {
      expect(sudoCommand.description).toBeDefined();
      expect(sudoCommand.description).toContain('admin');
    });
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = SudoCommand.getInstance();
      const instance2 = SudoCommand.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('isAuthorizedUser', () => {
    it('should return true for admin user', () => {
      expect(SudoCommand.isAuthorizedUser('admin')).toBe(true);
    });

    it('should return true for admin user (case insensitive)', () => {
      expect(SudoCommand.isAuthorizedUser('ADMIN')).toBe(true);
    });

    it('should return false for non-admin user without active sudo', () => {
      expect(SudoCommand.isAuthorizedUser('regularuser')).toBe(false);
    });
  });

  describe('isSuperAdmin', () => {
    it('should return true for admin user', () => {
      expect(sudoCommand.isSuperAdmin('admin')).toBe(true);
    });

    it('should return false for non-super admin', () => {
      expect(sudoCommand.isSuperAdmin('testadmin')).toBe(false);
    });
  });

  describe('isAuthorized', () => {
    it('should return true for admin user', () => {
      expect(sudoCommand.isAuthorized('admin')).toBe(true);
    });

    it('should return false for non-admin user without active sudo', () => {
      expect(sudoCommand.isAuthorized('regularuser')).toBe(false);
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      sudoCommand.execute(client, '');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should show error for non-admin user', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'regularuser' }),
      });

      sudoCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('not authorized')
      );
    });

    it('should handle admin user special case', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      sudoCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('admin user'));
    });

    it('should enable admin privileges for authorized user', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testadmin' }),
      });

      sudoCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('ADMIN'));
    });

    it('should deactivate admin if already active', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testadmin' }),
      });

      // First activation
      sudoCommand.execute(client, '');
      const callsAfterFirst = mockWriteToClient.mock.calls.length;

      // Second call should deactivate
      sudoCommand.execute(client, '');

      // Should have more calls after second execute
      expect(mockWriteToClient.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    });
  });
});
