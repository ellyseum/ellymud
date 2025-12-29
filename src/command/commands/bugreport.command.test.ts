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

  describe('admin commands', () => {
    let mockSudoCommand: { isAuthorized: jest.Mock };

    beforeEach(() => {
      mockSudoCommand = {
        isAuthorized: jest.fn().mockReturnValue(true),
      };
      bugReportCommand.setSudoCommand(mockSudoCommand as never);
    });

    describe('solve command', () => {
      it('should show error when solving without report ID', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        bugReportCommand.execute(client, 'solve');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('Missing bug report ID to solve')
        );
      });

      it('should show error when solving non-existent report', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        bugReportCommand.execute(client, 'solve nonexistent-id');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('not found')
        );
      });

      it('should solve an existing bug report', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        // First create a bug report
        const reporterClient = createMockClient({
          user: createMockUser({ username: 'reporter' }),
        });
        bugReportCommand.execute(reporterClient, 'Test bug report');
        bugReportCommand.execute(reporterClient, 'confirm');
        jest.clearAllMocks();

        // Now solve it
        bugReportCommand.execute(client, 'solve test-uuid-1234 Fixed the issue');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('has been marked as solved')
        );
      });

      it('should solve a bug report without providing a reason', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        // First create a new command instance to have fresh state
        bugReportCommand = new BugReportCommand(mockUserManager);
        bugReportCommand.setSudoCommand(mockSudoCommand as never);

        const reporterClient = createMockClient({
          user: createMockUser({ username: 'reporter' }),
        });
        bugReportCommand.execute(reporterClient, 'Another bug');
        bugReportCommand.execute(reporterClient, 'confirm');
        jest.clearAllMocks();

        bugReportCommand.execute(client, 'solve test-uuid-1234');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('has been marked as solved')
        );
      });

      it('should show error when trying to solve already solved report', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        bugReportCommand = new BugReportCommand(mockUserManager);
        bugReportCommand.setSudoCommand(mockSudoCommand as never);

        // Create and solve a report
        const reporterClient = createMockClient({
          user: createMockUser({ username: 'reporter' }),
        });
        bugReportCommand.execute(reporterClient, 'Bug to solve twice');
        bugReportCommand.execute(reporterClient, 'confirm');
        bugReportCommand.execute(client, 'solve test-uuid-1234');
        jest.clearAllMocks();

        // Try to solve again
        bugReportCommand.execute(client, 'solve test-uuid-1234');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('already solved')
        );
      });
    });

    describe('reopen command', () => {
      it('should show error when reopening without report ID', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        bugReportCommand.execute(client, 'reopen');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('Missing bug report ID to reopen')
        );
      });

      it('should show error when reopening non-existent report', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        bugReportCommand.execute(client, 'reopen nonexistent-id');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('not found')
        );
      });

      it('should reopen a solved bug report', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        bugReportCommand = new BugReportCommand(mockUserManager);
        bugReportCommand.setSudoCommand(mockSudoCommand as never);

        // Create and solve a report
        const reporterClient = createMockClient({
          user: createMockUser({ username: 'reporter' }),
        });
        bugReportCommand.execute(reporterClient, 'Bug to reopen');
        bugReportCommand.execute(reporterClient, 'confirm');
        bugReportCommand.execute(client, 'solve test-uuid-1234');
        jest.clearAllMocks();

        // Reopen it
        bugReportCommand.execute(client, 'reopen test-uuid-1234');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('has been reopened')
        );
      });

      it('should show error when reopening already open report', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        bugReportCommand = new BugReportCommand(mockUserManager);
        bugReportCommand.setSudoCommand(mockSudoCommand as never);

        // Create a report (not solved)
        const reporterClient = createMockClient({
          user: createMockUser({ username: 'reporter' }),
        });
        bugReportCommand.execute(reporterClient, 'Open bug');
        bugReportCommand.execute(reporterClient, 'confirm');
        jest.clearAllMocks();

        // Try to reopen
        bugReportCommand.execute(client, 'reopen test-uuid-1234');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('already open')
        );
      });
    });

    describe('clear command', () => {
      it('should initiate clear operation', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        bugReportCommand.execute(client, 'clear');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('Clear Bug Reports Confirmation')
        );
        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('bugreport clear confirm')
        );
      });

      it('should require first confirmation step', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        // Start the clear
        bugReportCommand.execute(client, 'clear');
        jest.clearAllMocks();

        // Provide first confirmation
        bugReportCommand.execute(client, 'clear confirm');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('Final Clear Bug Reports Confirmation')
        );
        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('confirmreally')
        );
      });

      it('should show error when confirming without pending operation', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        bugReportCommand.execute(client, 'clear confirm');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('No pending clear operation found')
        );
      });

      it('should show error for confirmreally without first confirmation', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        bugReportCommand.execute(client, 'clear confirmreally');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('No pending clear operation found')
        );
      });

      it('should clear all reports after double confirmation', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        bugReportCommand = new BugReportCommand(mockUserManager);
        bugReportCommand.setSudoCommand(mockSudoCommand as never);

        // Create a report
        const reporterClient = createMockClient({
          user: createMockUser({ username: 'reporter' }),
        });
        bugReportCommand.execute(reporterClient, 'Bug to clear');
        bugReportCommand.execute(reporterClient, 'confirm');

        // Clear with double confirmation
        bugReportCommand.execute(client, 'clear');
        bugReportCommand.execute(client, 'clear confirm');
        jest.clearAllMocks();
        bugReportCommand.execute(client, 'clear confirmreally');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('All bug reports have been cleared')
        );
      });

      it('should cancel pending clear operation', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        // Start the clear
        bugReportCommand.execute(client, 'clear');
        jest.clearAllMocks();

        // Cancel it
        bugReportCommand.execute(client, 'cancel');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('Clear operation cancelled')
        );
      });
    });

    describe('admin list commands', () => {
      it('should list all bug reports for admin', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        bugReportCommand = new BugReportCommand(mockUserManager);
        bugReportCommand.setSudoCommand(mockSudoCommand as never);

        // Create a report
        const reporterClient = createMockClient({
          user: createMockUser({ username: 'reporter' }),
        });
        bugReportCommand.execute(reporterClient, 'Admin visible bug');
        bugReportCommand.execute(reporterClient, 'confirm');
        jest.clearAllMocks();

        // Admin lists all
        bugReportCommand.execute(client, 'list all');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('ALL Bug Reports')
        );
      });

      it('should list open bug reports for admin', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        bugReportCommand = new BugReportCommand(mockUserManager);
        bugReportCommand.setSudoCommand(mockSudoCommand as never);

        // Create a report
        const reporterClient = createMockClient({
          user: createMockUser({ username: 'reporter' }),
        });
        bugReportCommand.execute(reporterClient, 'Open bug for admin');
        bugReportCommand.execute(reporterClient, 'confirm');
        jest.clearAllMocks();

        // Admin lists open
        bugReportCommand.execute(client, 'list open');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('OPEN Bug Reports')
        );
      });

      it('should list closed bug reports for admin', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        bugReportCommand = new BugReportCommand(mockUserManager);
        bugReportCommand.setSudoCommand(mockSudoCommand as never);

        // Create and solve a report
        const reporterClient = createMockClient({
          user: createMockUser({ username: 'reporter' }),
        });
        bugReportCommand.execute(reporterClient, 'Closed bug for admin');
        bugReportCommand.execute(reporterClient, 'confirm');
        bugReportCommand.execute(client, 'solve test-uuid-1234 Fixed');
        jest.clearAllMocks();

        // Admin lists closed
        bugReportCommand.execute(client, 'list closed');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('CLOSED Bug Reports')
        );
      });
    });

    describe('admin delete', () => {
      it('should allow admin to delete any bug report', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        bugReportCommand = new BugReportCommand(mockUserManager);
        bugReportCommand.setSudoCommand(mockSudoCommand as never);

        // Create a report as another user
        const reporterClient = createMockClient({
          user: createMockUser({ username: 'reporter' }),
        });
        bugReportCommand.execute(reporterClient, 'Admin delete test');
        bugReportCommand.execute(reporterClient, 'confirm');
        jest.clearAllMocks();

        // Admin initiates delete
        bugReportCommand.execute(client, 'delete test-uuid-1234');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('Delete Bug Report Confirmation')
        );
      });

      it('should confirm and delete bug report', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        bugReportCommand = new BugReportCommand(mockUserManager);
        bugReportCommand.setSudoCommand(mockSudoCommand as never);

        // Create a report
        const reporterClient = createMockClient({
          user: createMockUser({ username: 'reporter' }),
        });
        bugReportCommand.execute(reporterClient, 'Bug to delete');
        bugReportCommand.execute(reporterClient, 'confirm');

        // Admin delete
        bugReportCommand.execute(client, 'delete test-uuid-1234');
        jest.clearAllMocks();
        bugReportCommand.execute(client, 'confirm');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('has been deleted')
        );
      });

      it('should cancel pending delete operation', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin' }),
        });

        bugReportCommand = new BugReportCommand(mockUserManager);
        bugReportCommand.setSudoCommand(mockSudoCommand as never);

        // Create a report
        const reporterClient = createMockClient({
          user: createMockUser({ username: 'reporter' }),
        });
        bugReportCommand.execute(reporterClient, 'Bug to not delete');
        bugReportCommand.execute(reporterClient, 'confirm');

        // Start delete then cancel
        bugReportCommand.execute(client, 'delete test-uuid-1234');
        jest.clearAllMocks();
        bugReportCommand.execute(client, 'cancel');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('Delete operation cancelled')
        );
      });
    });
  });

  describe('pending report confirmation', () => {
    it('should confirm and submit a pending bug report', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      // Create pending report
      bugReportCommand.execute(client, 'This is my bug report');
      jest.clearAllMocks();

      // Confirm it
      bugReportCommand.execute(client, 'confirm');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Bug Report Submitted')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('test-uuid-1234')
      );
    });

    it('should allow replacing pending report with new one', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      // Create first pending report
      bugReportCommand.execute(client, 'First bug');
      jest.clearAllMocks();

      // Create second pending report (replaces the first)
      bugReportCommand.execute(client, 'Second bug is the real one');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Second bug is the real one')
      );
    });
  });

  describe('user delete operations', () => {
    it('should not allow user to delete solved bug reports', () => {
      const mockSudoCommand = {
        isAuthorized: jest.fn().mockImplementation((username: string) => username === 'admin'),
      };

      bugReportCommand = new BugReportCommand(mockUserManager);
      bugReportCommand.setSudoCommand(mockSudoCommand as never);

      const userClient = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      // Create a report
      bugReportCommand.execute(userClient, 'User bug');
      bugReportCommand.execute(userClient, 'confirm');

      // Admin solves it
      const adminClient = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      bugReportCommand.execute(adminClient, 'solve test-uuid-1234');
      jest.clearAllMocks();

      // User tries to delete solved report
      bugReportCommand.execute(userClient, 'delete test-uuid-1234');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        userClient,
        expect.stringContaining('only delete your own open bug reports')
      );
    });

    it('should not allow user to delete another users report', () => {
      const mockSudoCommand = {
        isAuthorized: jest.fn().mockReturnValue(false),
      };

      bugReportCommand = new BugReportCommand(mockUserManager);
      bugReportCommand.setSudoCommand(mockSudoCommand as never);

      // User1 creates a report
      const user1Client = createMockClient({
        user: createMockUser({ username: 'user1' }),
      });
      bugReportCommand.execute(user1Client, 'User1 bug');
      bugReportCommand.execute(user1Client, 'confirm');
      jest.clearAllMocks();

      // User2 tries to delete it
      const user2Client = createMockClient({
        user: createMockUser({ username: 'user2' }),
      });
      bugReportCommand.execute(user2Client, 'delete test-uuid-1234');

      // User2 should get an error about not being able to delete (either 'not found' or 'only delete your own')
      expect(mockWriteToClient).toHaveBeenCalledWith(
        user2Client,
        expect.stringContaining('only delete your own open bug reports')
      );
    });

    it('should allow user to delete their own open report', () => {
      const mockSudoCommand = {
        isAuthorized: jest.fn().mockReturnValue(false),
      };

      bugReportCommand = new BugReportCommand(mockUserManager);
      bugReportCommand.setSudoCommand(mockSudoCommand as never);

      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      // Create a report
      bugReportCommand.execute(client, 'My own bug');
      bugReportCommand.execute(client, 'confirm');

      // Delete it
      bugReportCommand.execute(client, 'delete test-uuid-1234');
      jest.clearAllMocks();
      bugReportCommand.execute(client, 'confirm');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('has been deleted')
      );
    });
  });

  describe('cancel with report ID', () => {
    it('should cancel a specific bug report by ID', () => {
      const mockSudoCommand = {
        isAuthorized: jest.fn().mockReturnValue(false),
      };

      bugReportCommand = new BugReportCommand(mockUserManager);
      bugReportCommand.setSudoCommand(mockSudoCommand as never);

      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      // Create a report
      bugReportCommand.execute(client, 'Bug to cancel by ID');
      bugReportCommand.execute(client, 'confirm');
      jest.clearAllMocks();

      // Cancel it by ID
      bugReportCommand.execute(client, 'cancel test-uuid-1234');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('has been canceled')
      );
    });

    it('should show error when canceling non-existent report by ID', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      bugReportCommand.execute(client, 'cancel nonexistent-id');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('not found'));
    });

    it('should not allow non-admin to cancel solved report', () => {
      const mockSudoCommand = {
        isAuthorized: jest.fn().mockImplementation((username: string) => username === 'admin'),
      };

      bugReportCommand = new BugReportCommand(mockUserManager);
      bugReportCommand.setSudoCommand(mockSudoCommand as never);

      // Create and solve a report
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      bugReportCommand.execute(client, 'Bug that gets solved');
      bugReportCommand.execute(client, 'confirm');

      const adminClient = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      bugReportCommand.execute(adminClient, 'solve test-uuid-1234');
      jest.clearAllMocks();

      // Try to cancel
      bugReportCommand.execute(client, 'cancel test-uuid-1234');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('already been solved')
      );
    });

    it('should allow admin to cancel any report', () => {
      const mockSudoCommand = {
        isAuthorized: jest.fn().mockReturnValue(true),
      };

      bugReportCommand = new BugReportCommand(mockUserManager);
      bugReportCommand.setSudoCommand(mockSudoCommand as never);

      // User creates a report
      const userClient = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      bugReportCommand.execute(userClient, 'User bug for admin cancel');
      bugReportCommand.execute(userClient, 'confirm');
      jest.clearAllMocks();

      // Admin cancels it
      const adminClient = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      bugReportCommand.execute(adminClient, 'cancel test-uuid-1234');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        adminClient,
        expect.stringContaining('has been canceled')
      );
    });
  });

  describe('timeout expiration', () => {
    it('should expire old pending reports', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      // Create a pending report
      bugReportCommand.execute(client, 'Expiring bug report');
      jest.clearAllMocks();

      // Simulate time passing (10 minutes)
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 11 * 60 * 1000);

      // Any action triggers cleanup; trying to confirm should fail
      bugReportCommand.execute(client, 'confirm');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't have any pending")
      );

      jest.restoreAllMocks();
    });

    it('should expire old pending clear operations', () => {
      const mockSudoCommand = {
        isAuthorized: jest.fn().mockReturnValue(true),
      };

      bugReportCommand = new BugReportCommand(mockUserManager);
      bugReportCommand.setSudoCommand(mockSudoCommand as never);

      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      // Start clear operation
      bugReportCommand.execute(client, 'clear');
      jest.clearAllMocks();

      // Simulate time passing (2 minutes)
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 3 * 60 * 1000);

      // Try to confirm - should fail as operation expired
      bugReportCommand.execute(client, 'clear confirm');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('No pending clear operation found')
      );

      jest.restoreAllMocks();
    });

    it('should expire old pending delete operations', () => {
      const mockSudoCommand = {
        isAuthorized: jest.fn().mockReturnValue(false),
      };

      bugReportCommand = new BugReportCommand(mockUserManager);
      bugReportCommand.setSudoCommand(mockSudoCommand as never);

      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      // Create a report
      bugReportCommand.execute(client, 'Bug to delete with timeout');
      bugReportCommand.execute(client, 'confirm');

      // Start delete operation
      bugReportCommand.execute(client, 'delete test-uuid-1234');
      jest.clearAllMocks();

      // Simulate time passing (2 minutes)
      const originalNow = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(originalNow + 3 * 60 * 1000);

      // Try to confirm - should fail as operation expired
      bugReportCommand.execute(client, 'confirm');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't have any pending")
      );

      jest.restoreAllMocks();
    });
  });

  describe('sudo command from stateData', () => {
    it('should get sudo command from client stateData if not set', () => {
      const mockSudoFromState = {
        isAuthorized: jest.fn().mockReturnValue(true),
      };

      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
        stateData: {
          commands: new Map([['sudo', mockSudoFromState]]),
        },
      });

      bugReportCommand = new BugReportCommand(mockUserManager);
      bugReportCommand.execute(client, 'help');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Admin Commands')
      );
    });
  });

  describe('edge cases', () => {
    it('should handle client with null user in createPendingReport', () => {
      const client = createMockClient({ user: null });

      bugReportCommand.execute(client, 'some bug');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should handle listall with reports from multiple users', () => {
      const mockSudoCommand = {
        isAuthorized: jest.fn().mockReturnValue(true),
      };

      bugReportCommand = new BugReportCommand(mockUserManager);
      bugReportCommand.setSudoCommand(mockSudoCommand as never);

      // Create reports from multiple users
      const user1 = createMockClient({
        user: createMockUser({ username: 'user1' }),
      });
      const user2 = createMockClient({
        user: createMockUser({ username: 'user2' }),
      });

      bugReportCommand.execute(user1, 'Bug from user1');
      bugReportCommand.execute(user1, 'confirm');

      // Reset uuid mock for second report
      const uuidMock = jest.requireMock('uuid') as { v4: jest.Mock };
      uuidMock.v4.mockReturnValue('test-uuid-5678');

      bugReportCommand.execute(user2, 'Bug from user2');
      bugReportCommand.execute(user2, 'confirm');
      jest.clearAllMocks();

      // Admin lists all
      const adminClient = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      bugReportCommand.execute(adminClient, 'list');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        adminClient,
        expect.stringContaining('Bug Reports')
      );
    });

    it('should default to all filter when no filter provided for admin list', () => {
      const mockSudoCommand = {
        isAuthorized: jest.fn().mockReturnValue(true),
      };

      bugReportCommand = new BugReportCommand(mockUserManager);
      bugReportCommand.setSudoCommand(mockSudoCommand as never);

      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      bugReportCommand.execute(client, 'list');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('No all bug reports found')
      );
    });

    it('should show user-specific reports when non-admin uses list', () => {
      const mockSudoCommand = {
        isAuthorized: jest.fn().mockReturnValue(false),
      };

      bugReportCommand = new BugReportCommand(mockUserManager);
      bugReportCommand.setSudoCommand(mockSudoCommand as never);

      // Create a report
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      bugReportCommand.execute(client, 'My personal bug');
      bugReportCommand.execute(client, 'confirm');
      jest.clearAllMocks();

      // User lists their bugs
      bugReportCommand.execute(client, 'list');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Your ALL Bug Reports')
      );
    });
  });

  describe('admin notification', () => {
    it('should notify online admins when bug report is submitted', () => {
      const mockSudoCommand = {
        isAuthorized: jest.fn().mockImplementation((username: string) => username === 'admin'),
      };

      const adminClient = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockUserManager.getAllUsers.mockReturnValue([
        createMockUser({ username: 'admin' }),
        createMockUser({ username: 'testuser' }),
      ]);
      mockUserManager.getActiveUserSession.mockImplementation((username: string) => {
        if (username === 'admin') return adminClient;
        return undefined;
      });

      bugReportCommand = new BugReportCommand(mockUserManager);
      bugReportCommand.setSudoCommand(mockSudoCommand as never);

      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      bugReportCommand.execute(client, 'Bug that notifies admins');
      jest.clearAllMocks();
      bugReportCommand.execute(client, 'confirm');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        adminClient,
        expect.stringContaining('[ADMIN] New bug report')
      );
    });
  });

  describe('user notification on resolve/reopen', () => {
    it('should notify user when their report is solved', () => {
      // Reset uuid mock
      const uuidMock = jest.requireMock('uuid') as { v4: jest.Mock };
      uuidMock.v4.mockReturnValue('solve-notify-uuid');

      const mockSudoCommand = {
        isAuthorized: jest.fn().mockImplementation((username: string) => username === 'admin'),
      };

      const userClient = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      // Need to set up mock before creating command
      mockUserManager.getActiveUserSession.mockImplementation((username: string) => {
        if (username === 'testuser') return userClient;
        return undefined;
      });

      bugReportCommand = new BugReportCommand(mockUserManager);
      bugReportCommand.setSudoCommand(mockSudoCommand as never);

      // Create a report with the user client
      bugReportCommand.execute(userClient, 'Bug needing resolution');
      bugReportCommand.execute(userClient, 'confirm');
      jest.clearAllMocks();

      // Admin solves it using the correct report ID
      const adminClient = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      bugReportCommand.execute(adminClient, 'solve solve-notify-uuid All fixed now');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        userClient,
        expect.stringContaining('has resolved your bug report')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        userClient,
        expect.stringContaining('Resolution: All fixed now')
      );
    });

    it('should notify user when their report is reopened', () => {
      // Reset uuid mock
      const uuidMock = jest.requireMock('uuid') as { v4: jest.Mock };
      uuidMock.v4.mockReturnValue('reopen-notify-uuid');

      const mockSudoCommand = {
        isAuthorized: jest.fn().mockImplementation((username: string) => username === 'admin'),
      };

      const userClient = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      mockUserManager.getActiveUserSession.mockImplementation((username: string) => {
        if (username === 'testuser') return userClient;
        return undefined;
      });

      bugReportCommand = new BugReportCommand(mockUserManager);
      bugReportCommand.setSudoCommand(mockSudoCommand as never);

      // Create and solve a report
      bugReportCommand.execute(userClient, 'Bug to reopen');
      bugReportCommand.execute(userClient, 'confirm');

      const adminClient = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      bugReportCommand.execute(adminClient, 'solve reopen-notify-uuid');
      jest.clearAllMocks();

      // Reopen it
      bugReportCommand.execute(adminClient, 'reopen reopen-notify-uuid');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        userClient,
        expect.stringContaining('has reopened your bug report')
      );
    });

    it('should notify user when admin deletes their report', () => {
      // Reset uuid mock
      const uuidMock = jest.requireMock('uuid') as { v4: jest.Mock };
      uuidMock.v4.mockReturnValue('delete-notify-uuid');

      const mockSudoCommand = {
        isAuthorized: jest.fn().mockImplementation((username: string) => username === 'admin'),
      };

      const userClient = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      mockUserManager.getActiveUserSession.mockImplementation((username: string) => {
        if (username === 'testuser') return userClient;
        return undefined;
      });

      bugReportCommand = new BugReportCommand(mockUserManager);
      bugReportCommand.setSudoCommand(mockSudoCommand as never);

      // User creates a report (testuser is NOT admin)
      bugReportCommand.execute(userClient, 'Bug that admin will delete');
      bugReportCommand.execute(userClient, 'confirm');

      // Admin deletes it
      const adminClient = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      bugReportCommand.execute(adminClient, 'delete delete-notify-uuid');
      jest.clearAllMocks();
      bugReportCommand.execute(adminClient, 'confirm');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        userClient,
        expect.stringContaining('has deleted your bug report')
      );
    });

    it('should notify user when admin cancels their report', () => {
      // Reset uuid mock
      const uuidMock = jest.requireMock('uuid') as { v4: jest.Mock };
      uuidMock.v4.mockReturnValue('cancel-notify-uuid');

      const mockSudoCommand = {
        isAuthorized: jest.fn().mockImplementation((username: string) => username === 'admin'),
      };

      const userClient = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      mockUserManager.getActiveUserSession.mockImplementation((username: string) => {
        if (username === 'testuser') return userClient;
        return undefined;
      });

      bugReportCommand = new BugReportCommand(mockUserManager);
      bugReportCommand.setSudoCommand(mockSudoCommand as never);

      // User creates a report (testuser is NOT admin)
      bugReportCommand.execute(userClient, 'Bug that admin will cancel');
      bugReportCommand.execute(userClient, 'confirm');
      jest.clearAllMocks();

      // Admin cancels it
      const adminClient = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      bugReportCommand.execute(adminClient, 'cancel cancel-notify-uuid');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        userClient,
        expect.stringContaining('has canceled your bug report')
      );
    });
  });

  describe('loading and saving bug reports', () => {
    it('should handle JSON parse error on load', () => {
      const fs = jest.requireMock('fs') as { existsSync: jest.Mock; readFileSync: jest.Mock };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('invalid json');

      // Creating command should handle parse error gracefully
      const newCommand = new BugReportCommand(mockUserManager);
      expect(newCommand.name).toBe('bugreport');
    });

    it('should create default file if not exists', () => {
      const fs = jest.requireMock('fs') as {
        existsSync: jest.Mock;
        writeFileSync: jest.Mock;
      };
      fs.existsSync.mockReturnValue(false);

      new BugReportCommand(mockUserManager);

      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should load existing bug reports from file', () => {
      const fs = jest.requireMock('fs') as { existsSync: jest.Mock; readFileSync: jest.Mock };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(
        JSON.stringify({
          reports: [
            {
              id: 'existing-id',
              user: 'olduser',
              datetime: new Date().toISOString(),
              report: 'Old bug',
              logs: { raw: null, user: null },
              solved: false,
              solvedOn: null,
              solvedBy: null,
              solvedReason: null,
            },
          ],
        })
      );

      const mockSudoCommand = {
        isAuthorized: jest.fn().mockReturnValue(true),
      };

      const command = new BugReportCommand(mockUserManager);
      command.setSudoCommand(mockSudoCommand as never);

      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      jest.clearAllMocks();

      command.execute(client, 'list');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Old bug'));
    });
  });

  describe('findLatestRawLog', () => {
    it('should return raw log path when file exists', () => {
      const fs = jest.requireMock('fs') as { existsSync: jest.Mock };
      fs.existsSync.mockReturnValue(true);

      bugReportCommand = new BugReportCommand(mockUserManager);

      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      bugReportCommand.execute(client, 'Bug with raw log');
      bugReportCommand.execute(client, 'confirm');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Bug Report Submitted')
      );
    });

    it('should handle missing connection ID', () => {
      const mockConnection = {
        ...createMockClient().connection,
        getId: jest.fn().mockReturnValue(''),
      };

      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
        connection: mockConnection as never,
      });

      bugReportCommand = new BugReportCommand(mockUserManager);
      bugReportCommand.execute(client, 'Bug with no connection ID');
      bugReportCommand.execute(client, 'confirm');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Bug Report Submitted')
      );
    });
  });
});
