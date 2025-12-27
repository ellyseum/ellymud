/**
 * Unit tests for DepositCommand
 * @module command/commands/deposit.command.test
 */

import { DepositCommand } from './deposit.command';
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

describe('DepositCommand', () => {
  let depositCommand: DepositCommand;
  let mockRoomManager: ReturnType<typeof createMockRoomManager>;
  let mockUserManager: ReturnType<typeof createMockUserManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRoomManager = createMockRoomManager();
    mockUserManager = createMockUserManager();
    depositCommand = new DepositCommand(mockRoomManager, mockUserManager);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(depositCommand.name).toBe('deposit');
    });

    it('should have a description', () => {
      expect(depositCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', async () => {
      const client = createMockClient({ user: null });

      await depositCommand.execute(client, '100');

      expect(mockWriteMessageToClient).not.toHaveBeenCalled();
    });

    it('should show error if not in a bank room', async () => {
      const room = createMockRoom('town', 'Town Square');
      (room as { flags: string[] }).flags = [];
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'town' }),
      });

      await depositCommand.execute(client, '100');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('only deposit gold at a bank')
      );
    });

    it('should show error if room is null', async () => {
      mockRoomManager.getRoom.mockReturnValue(undefined);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'town' }),
      });

      await depositCommand.execute(client, '100');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('only deposit gold at a bank')
      );
    });

    it('should show usage if no amount provided', async () => {
      const room = createMockRoom('bank', 'Bank');
      (room as { flags: string[] }).flags = ['bank'];
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'bank' }),
      });

      await depositCommand.execute(client, '');

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

      await depositCommand.execute(client, 'abc');

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

      await depositCommand.execute(client, '0');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Invalid amount')
      );
    });

    it('should show error if not enough gold', async () => {
      const room = createMockRoom('bank', 'Bank');
      (room as { flags: string[] }).flags = ['bank'];
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser({
          currentRoomId: 'bank',
          inventory: { items: [], currency: { gold: 50, silver: 0, copper: 0 } },
        }),
      });

      await depositCommand.execute(client, '100');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't have that much gold")
      );
    });

    it('should successfully deposit gold', async () => {
      const room = createMockRoom('bank', 'Bank');
      (room as { flags: string[] }).flags = ['bank'];
      mockRoomManager.getRoom.mockReturnValue(room);

      const user = createMockUser({
        username: 'testuser',
        currentRoomId: 'bank',
        inventory: { items: [], currency: { gold: 100, silver: 0, copper: 0 } },
      });
      const client = createMockClient({ user });

      await depositCommand.execute(client, '50');

      expect(user.inventory.currency.gold).toBe(50);
      expect(user.bank?.gold).toBe(50);
      expect(mockUserManager.updateUserStats).toHaveBeenCalledWith('testuser', {
        inventory: user.inventory,
        bank: user.bank,
      });
      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('deposited 50 gold')
      );
    });

    it('should initialize bank if it does not exist', async () => {
      const room = createMockRoom('bank', 'Bank');
      (room as { flags: string[] }).flags = ['bank'];
      mockRoomManager.getRoom.mockReturnValue(room);

      const user = createMockUser({
        username: 'testuser',
        currentRoomId: 'bank',
        inventory: { items: [], currency: { gold: 100, silver: 0, copper: 0 } },
      });
      delete (user as { bank?: unknown }).bank;
      const client = createMockClient({ user });

      await depositCommand.execute(client, '25');

      expect(user.bank).toBeDefined();
      expect(user.bank?.gold).toBe(25);
    });
  });
});
