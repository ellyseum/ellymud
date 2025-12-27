/**
 * Unit tests for BalanceCommand
 * @module command/commands/balance.command.test
 */

import { BalanceCommand } from './balance.command';
import { RoomManager } from '../../room/roomManager';
import {
  createMockUser,
  createMockClient,
  createMockRoomManager,
} from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colors: {
    green: '',
    reset: '',
  },
}));

jest.mock('../../utils/socketWriter', () => ({
  writeMessageToClient: jest.fn(),
}));

import { writeMessageToClient } from '../../utils/socketWriter';

const mockWriteMessageToClient = writeMessageToClient as jest.MockedFunction<
  typeof writeMessageToClient
>;

describe('BalanceCommand', () => {
  let balanceCommand: BalanceCommand;
  let mockRoomManager: RoomManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRoomManager = createMockRoomManager();
    balanceCommand = new BalanceCommand(mockRoomManager);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(balanceCommand.name).toBe('balance');
    });

    it('should have bank as alias', () => {
      expect(balanceCommand.aliases).toContain('bank');
    });

    it('should have a description', () => {
      expect(balanceCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', async () => {
      const client = createMockClient({ user: null });

      await balanceCommand.execute(client, '');

      expect(mockWriteMessageToClient).not.toHaveBeenCalled();
    });

    it('should show bank balance', async () => {
      const client = createMockClient({
        user: createMockUser({ bank: { gold: 100, silver: 0, copper: 0 } }),
      });

      await balanceCommand.execute(client, '');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(client, expect.stringContaining('100'));
    });

    it('should show 0 if no bank', async () => {
      const client = createMockClient({
        user: createMockUser({ bank: undefined }),
      });

      await balanceCommand.execute(client, '');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(client, expect.stringContaining('0'));
    });
  });
});
