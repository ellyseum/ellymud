/**
 * Unit tests for ListFlagsCommand
 * @module command/commands/listflags.command.test
 */

import { ListFlagsCommand } from './listflags.command';
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
  getPlayerLogger: jest.fn().mockReturnValue({
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

describe('ListFlagsCommand', () => {
  let listFlagsCommand: ListFlagsCommand;
  let mockUserManager: ReturnType<typeof createMockUserManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserManager = createMockUserManager();
    mockUserManager.getFlags = jest.fn().mockReturnValue([]);
    mockIsAuthorized.mockReturnValue(false);
    listFlagsCommand = new ListFlagsCommand(mockUserManager);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(listFlagsCommand.name).toBe('listflags');
    });

    it('should have a description', () => {
      expect(listFlagsCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      listFlagsCommand.execute(client, '');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should list own flags when no argument provided', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockUserManager.getFlags = jest.fn().mockReturnValue(['flag1', 'flag2']);

      listFlagsCommand.execute(client, '');

      expect(mockUserManager.getFlags).toHaveBeenCalledWith('testuser');
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Flags for testuser')
      );
    });

    it('should show message when no flags are set', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockUserManager.getFlags = jest.fn().mockReturnValue([]);

      listFlagsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('no flags set')
      );
    });

    it('should display each flag', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockUserManager.getFlags = jest.fn().mockReturnValue(['admin', 'moderator']);

      listFlagsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('admin'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('moderator'));
    });

    it('should deny access to view other user flags without admin', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockIsAuthorized.mockReturnValue(false);

      listFlagsCommand.execute(client, 'otheruser');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('only list your own flags')
      );
    });

    it('should allow admin to view other user flags', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      mockIsAuthorized.mockReturnValue(true);
      mockUserManager.getFlags = jest.fn().mockReturnValue(['testflag']);

      listFlagsCommand.execute(client, 'otheruser');

      expect(mockUserManager.getFlags).toHaveBeenCalledWith('otheruser');
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Flags for otheruser')
      );
    });

    it('should show error when target user not found', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      mockIsAuthorized.mockReturnValue(true);
      mockUserManager.getFlags = jest.fn().mockReturnValue(null);

      listFlagsCommand.execute(client, 'nonexistent');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('not found'));
    });
  });
});
