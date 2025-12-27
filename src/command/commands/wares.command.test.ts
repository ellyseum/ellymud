/**
 * Unit tests for WaresCommand
 * @module command/commands/wares.command.test
 */

import { WaresCommand } from './wares.command';
import {
  createMockClient,
  createMockUser,
  createMockRoom,
  createMockRoomManager,
  createMockNPC,
} from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colors: {
    yellow: '',
    cyan: '',
    gray: '',
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

describe('WaresCommand', () => {
  let waresCommand: WaresCommand;
  let mockRoomManager: ReturnType<typeof createMockRoomManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRoomManager = createMockRoomManager();
    waresCommand = new WaresCommand(mockRoomManager);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(waresCommand.name).toBe('wares');
    });

    it('should have a description', () => {
      expect(waresCommand.description).toBeDefined();
    });

    it('should have aliases', () => {
      expect(waresCommand.aliases).toContain('shop');
      expect(waresCommand.aliases).toContain('merchandise');
      expect(waresCommand.aliases).toContain('list');
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', async () => {
      const client = createMockClient({ user: null });

      await waresCommand.execute(client, '');

      expect(mockWriteMessageToClient).not.toHaveBeenCalled();
    });

    it('should return early if room is not found', async () => {
      mockRoomManager.getRoom.mockReturnValue(undefined);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'room1' }),
      });

      await waresCommand.execute(client, '');

      expect(mockWriteMessageToClient).not.toHaveBeenCalled();
    });

    it('should show message when no merchant in room', async () => {
      const room = createMockRoom('room1', 'Test Room');
      room.npcs = new Map();
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'room1' }),
      });

      await waresCommand.execute(client, '');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('no merchant here')
      );
    });

    it('should show message when NPC is not a merchant', async () => {
      const room = createMockRoom('room1', 'Test Room');
      const npc = createMockNPC({ name: 'Guard' });
      npc.isMerchant = jest.fn().mockReturnValue(false);
      room.npcs = new Map([['npc1', npc]]);
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'room1' }),
      });

      await waresCommand.execute(client, '');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('no merchant here')
      );
    });

    it('should display merchant name and wares', async () => {
      const room = createMockRoom('room1', 'Test Room');
      const merchant = createMockNPC({ name: 'Shopkeeper Bob' });
      merchant.isMerchant = jest.fn().mockReturnValue(true);
      (merchant as unknown as { getInventoryGrouped: jest.Mock }).getInventoryGrouped = jest
        .fn()
        .mockReturnValue(
          new Map([
            ['sword', { template: { name: 'Iron Sword', value: 100 }, count: 2 }],
            ['potion', { template: { name: 'Health Potion', value: 25 }, count: 1 }],
          ])
        );
      room.npcs = new Map([['merchant1', merchant]]);
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'room1' }),
      });

      await waresCommand.execute(client, '');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Shopkeeper Bob')
      );
      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Iron Sword')
      );
      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Health Potion')
      );
    });

    it('should show nothing for sale when merchant has empty inventory', async () => {
      const room = createMockRoom('room1', 'Test Room');
      const merchant = createMockNPC({ name: 'Shopkeeper' });
      merchant.isMerchant = jest.fn().mockReturnValue(true);
      (merchant as unknown as { getInventoryGrouped: jest.Mock }).getInventoryGrouped = jest
        .fn()
        .mockReturnValue(new Map());
      room.npcs = new Map([['merchant1', merchant]]);
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'room1' }),
      });

      await waresCommand.execute(client, '');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Nothing for sale')
      );
    });

    it('should display item count when more than one', async () => {
      const room = createMockRoom('room1', 'Test Room');
      const merchant = createMockNPC({ name: 'Shopkeeper' });
      merchant.isMerchant = jest.fn().mockReturnValue(true);
      (merchant as unknown as { getInventoryGrouped: jest.Mock }).getInventoryGrouped = jest
        .fn()
        .mockReturnValue(
          new Map([['sword', { template: { name: 'Iron Sword', value: 100 }, count: 5 }]])
        );
      room.npcs = new Map([['merchant1', merchant]]);
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'room1' }),
      });

      await waresCommand.execute(client, '');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('(x5)')
      );
    });
  });
});
