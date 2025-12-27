/**
 * Unit tests for WithdrawCommand
 * @module command/commands/withdraw.command.test
 */

import { WithdrawCommand } from './withdraw.command';
import {
  createMockClient,
  createMockUser,
  createMockRoom,
  createMockRoomManager,
  createMockUserManager,
} from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colors: {
    yellow: '',
    red: '',
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

describe('WithdrawCommand', () => {
  let withdrawCommand: WithdrawCommand;
  let mockRoomManager: ReturnType<typeof createMockRoomManager>;
  let mockUserManager: ReturnType<typeof createMockUserManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRoomManager = createMockRoomManager();
    mockUserManager = createMockUserManager();
    withdrawCommand = new WithdrawCommand(mockRoomManager, mockUserManager);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(withdrawCommand.name).toBe('withdraw');
    });

    it('should have a description', () => {
      expect(withdrawCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', async () => {
      const client = createMockClient({ user: null });

      await withdrawCommand.execute(client, '100');

      expect(mockWriteMessageToClient).not.toHaveBeenCalled();
    });

    it('should show error if not in a bank room', async () => {
      const room = createMockRoom('town', 'Town Square');
      (room as { flags: string[] }).flags = [];
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'town' }),
      });

      await withdrawCommand.execute(client, '100');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('only withdraw gold at a bank')
      );
    });

    it('should show error if room is null', async () => {
      mockRoomManager.getRoom.mockReturnValue(undefined);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'town' }),
      });

      await withdrawCommand.execute(client, '100');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('only withdraw gold at a bank')
      );
    });

    it('should show usage if no amount provided', async () => {
      const room = createMockRoom('bank', 'Bank');
      (room as { flags: string[] }).flags = ['bank'];
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'bank' }),
      });

      await withdrawCommand.execute(client, '');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Usage:')
      );
    });

    it('should show error for invalid amount', async () => {
      const room = createMockRoom('bank', 'Bank');
      (room as { flags: string[] }).flags = ['bank'];
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'bank' }),
      });

      await withdrawCommand.execute(client, 'abc');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Invalid amount')
      );
    });

    it('should show error for zero or negative amount', async () => {
      const room = createMockRoom('bank', 'Bank');
      (room as { flags: string[] }).flags = ['bank'];
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'bank' }),
      });

      await withdrawCommand.execute(client, '-5');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Invalid amount')
      );
    });

    it('should show error if not enough gold in bank', async () => {
      const room = createMockRoom('bank', 'Bank');
      (room as { flags: string[] }).flags = ['bank'];
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser({
          currentRoomId: 'bank',
          bank: { gold: 50, silver: 0, copper: 0 },
        }),
      });

      await withdrawCommand.execute(client, '100');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't have that much gold in the bank")
      );
    });

    it('should show error if bank is not initialized', async () => {
      const room = createMockRoom('bank', 'Bank');
      (room as { flags: string[] }).flags = ['bank'];
      mockRoomManager.getRoom.mockReturnValue(room);

      const user = createMockUser({ currentRoomId: 'bank' });
      delete (user as { bank?: unknown }).bank;
      const client = createMockClient({ user });

      await withdrawCommand.execute(client, '100');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't have that much gold in the bank")
      );
    });

    it('should successfully withdraw gold', async () => {
      const room = createMockRoom('bank', 'Bank');
      (room as { flags: string[] }).flags = ['bank'];
      mockRoomManager.getRoom.mockReturnValue(room);

      const user = createMockUser({
        username: 'testuser',
        currentRoomId: 'bank',
        inventory: { items: [], currency: { gold: 10, silver: 0, copper: 0 } },
        bank: { gold: 100, silver: 0, copper: 0 },
      });
      const client = createMockClient({ user });

      await withdrawCommand.execute(client, '50');

      expect(user.bank?.gold).toBe(50);
      expect(user.inventory.currency.gold).toBe(60);
      expect(mockUserManager.updateUserStats).toHaveBeenCalledWith('testuser', {
        inventory: user.inventory,
        bank: user.bank,
      });
      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('withdrew 50 gold')
      );
    });
  });
});
