/**
 * Unit tests for BugReportCommand
 * @module command/commands/bugreport.command.test
 */

import { BugReportCommand } from './bugreport.command';
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

jest.mock('../../utils/logger', () => ({
  createContextLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readFileSync: jest.fn().mockReturnValue('{"reports":[]}'),
  writeFileSync: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-1234'),
}));

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('BugReportCommand', () => {
  let bugReportCommand: BugReportCommand;
  let mockUserManager: ReturnType<typeof createMockUserManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserManager = createMockUserManager();
    bugReportCommand = new BugReportCommand(mockUserManager);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(bugReportCommand.name).toBe('bugreport');
    });

    it('should have a description', () => {
      expect(bugReportCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      bugReportCommand.execute(client, 'test bug');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should show help when no arguments provided', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      bugReportCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Bug Report System')
      );
    });

    it('should show error for non-admin commands used by regular users', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      bugReportCommand.execute(client, 'solve test-id');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('only available to admins')
      );
    });

    it('should show error for clear command used by regular users', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      bugReportCommand.execute(client, 'clear');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('only available to admins')
      );
    });

    it('should show error for reopen command used by regular users', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      bugReportCommand.execute(client, 'reopen test-id');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('only available to admins')
      );
    });

    describe('creating bug reports', () => {
      it('should create pending report and show confirmation', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'testuser' }),
        });

        bugReportCommand.execute(client, 'My sword disappeared!');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('Bug Report Confirmation')
        );
        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('My sword disappeared!')
        );
      });

      it('should show error when confirming without pending report', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'testuser' }),
        });

        bugReportCommand.execute(client, 'confirm');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining("don't have any pending")
        );
      });

      it('should cancel pending report', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'testuser' }),
        });

        // First create pending report
        bugReportCommand.execute(client, 'test bug');
        jest.clearAllMocks();

        // Then cancel
        bugReportCommand.execute(client, 'cancel');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('cancelled')
        );
      });

      it('should show no pending operations when cancelling without any', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'testuser' }),
        });

        bugReportCommand.execute(client, 'cancel');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining("don't have any pending operations")
        );
      });
    });

    describe('listing bug reports', () => {
      it('should list user bug reports', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'testuser' }),
        });

        bugReportCommand.execute(client, 'list');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('No all bug reports found')
        );
      });

      it('should list open bug reports', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'testuser' }),
        });

        bugReportCommand.execute(client, 'list open');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('No open bug reports found')
        );
      });

      it('should list closed bug reports', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'testuser' }),
        });

        bugReportCommand.execute(client, 'list closed');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('No closed bug reports found')
        );
      });
    });

    describe('deleting bug reports', () => {
      it('should show error when deleting without ID', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'testuser' }),
        });

        bugReportCommand.execute(client, 'delete');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('Missing bug report ID')
        );
      });

      it('should show error when deleting non-existent report', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'testuser' }),
        });

        bugReportCommand.execute(client, 'delete nonexistent-id');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('not found')
        );
      });
    });
  });

  describe('setSudoCommand', () => {
    it('should set the sudo command reference', () => {
      const mockSudoCommand = {
        isAuthorized: jest.fn().mockReturnValue(true),
      };

      bugReportCommand.setSudoCommand(mockSudoCommand as never);

      // Verify by trying to use an admin command
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      bugReportCommand.execute(client, 'help');

      // Should show admin help since user is authorized
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Admin Commands')
      );
    });
  });
});
