/**
 * Unit tests for BuyCommand
 * @module command/commands/buy.command.test
 */

import { BuyCommand } from './buy.command';
import { createMockClient, createMockUser, createMockRoom } from '../../test/helpers/mockFactories';

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

const mockGetItemInstance = jest.fn();
const mockGetItem = jest.fn();
const mockSaveItemInstances = jest.fn();

jest.mock('../../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn().mockReturnValue({
      getItemInstance: (id: string) => mockGetItemInstance(id),
      getItem: (id: string) => mockGetItem(id),
      saveItemInstances: () => mockSaveItemInstances(),
    }),
  },
}));

const mockSaveState = jest.fn();
const mockUpdateMerchantState = jest.fn();

jest.mock('../../combat/merchantStateManager', () => ({
  MerchantStateManager: {
    getInstance: jest.fn().mockReturnValue({
      saveState: () => mockSaveState(),
      updateMerchantState: (state: unknown) => mockUpdateMerchantState(state),
    }),
  },
}));

import { writeMessageToClient } from '../../utils/socketWriter';

const mockWriteMessageToClient = writeMessageToClient as jest.MockedFunction<
  typeof writeMessageToClient
>;

describe('BuyCommand', () => {
  let buyCommand: BuyCommand;
  let mockRoomManager: {
    getRoom: jest.Mock;
  };
  let mockUserManager: {
    updateUserInventory: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRoomManager = {
      getRoom: jest.fn(),
    };

    mockUserManager = {
      updateUserInventory: jest.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buyCommand = new BuyCommand(mockRoomManager as any, mockUserManager as any);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(buyCommand.name).toBe('buy');
    });

    it('should have a description', () => {
      expect(buyCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', async () => {
      const client = createMockClient({ user: null });

      await buyCommand.execute(client, 'sword');

      expect(mockWriteMessageToClient).not.toHaveBeenCalled();
    });

    it('should show usage when no item specified', async () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      await buyCommand.execute(client, '');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Usage:')
      );
    });

    it('should return early when room not found', async () => {
      mockRoomManager.getRoom.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser(),
      });

      await buyCommand.execute(client, 'sword');

      // Should return early without message (just silently returns)
      expect(mockWriteMessageToClient).not.toHaveBeenCalled();
    });

    it('should show error when no merchant in room', async () => {
      const room = createMockRoom('shop', 'Shop');
      room.npcs = new Map();
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser(),
      });

      await buyCommand.execute(client, 'sword');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('no merchant')
      );
    });

    it('should show error when merchant does not have item', async () => {
      const mockMerchant = {
        isMerchant: () => true,
        findItemByName: jest.fn().mockReturnValue(null),
      };

      const room = createMockRoom('shop', 'Shop');
      room.npcs = new Map([['merchant-1', mockMerchant]]) as unknown as Map<
        string,
        import('../../combat/npc').NPC
      >;
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser(),
      });

      await buyCommand.execute(client, 'sword');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("doesn't have")
      );
    });

    it('should show error when item instance not found', async () => {
      const mockMerchant = {
        isMerchant: () => true,
        findItemByName: jest.fn().mockReturnValue('sword-instance-1'),
      };

      const room = createMockRoom('shop', 'Shop');
      room.npcs = new Map([['merchant-1', mockMerchant]]) as unknown as Map<
        string,
        import('../../combat/npc').NPC
      >;
      mockRoomManager.getRoom.mockReturnValue(room);

      mockGetItemInstance.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser(),
      });

      await buyCommand.execute(client, 'sword');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("doesn't have")
      );
    });

    it('should show error when item template not found', async () => {
      const mockMerchant = {
        isMerchant: () => true,
        findItemByName: jest.fn().mockReturnValue('sword-instance-1'),
      };

      const room = createMockRoom('shop', 'Shop');
      room.npcs = new Map([['merchant-1', mockMerchant]]) as unknown as Map<
        string,
        import('../../combat/npc').NPC
      >;
      mockRoomManager.getRoom.mockReturnValue(room);

      mockGetItemInstance.mockReturnValue({
        instanceId: 'sword-instance-1',
        templateId: 'sword-template',
        history: [],
      });
      mockGetItem.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser(),
      });

      await buyCommand.execute(client, 'sword');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('data not found')
      );
    });

    it('should show error when player cannot afford item', async () => {
      const mockMerchant = {
        isMerchant: () => true,
        findItemByName: jest.fn().mockReturnValue('sword-instance-1'),
      };

      const room = createMockRoom('shop', 'Shop');
      room.npcs = new Map([['merchant-1', mockMerchant]]) as unknown as Map<
        string,
        import('../../combat/npc').NPC
      >;
      mockRoomManager.getRoom.mockReturnValue(room);

      mockGetItemInstance.mockReturnValue({
        instanceId: 'sword-instance-1',
        templateId: 'sword-template',
        history: [],
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
        value: 100, // Costs 100 gold
      });

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: [],
            currency: { gold: 50, silver: 0, copper: 0 }, // Only have 50 gold
          },
        }),
      });

      await buyCommand.execute(client, 'sword');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("can't afford")
      );
    });

    it('should complete purchase successfully', async () => {
      const mockMerchant = {
        isMerchant: () => true,
        findItemByName: jest.fn().mockReturnValue('sword-instance-1'),
        removeItem: jest.fn(),
        name: 'Test Merchant',
        getInventoryState: jest.fn().mockReturnValue({}),
      };

      const room = createMockRoom('shop', 'Shop');
      room.npcs = new Map([['merchant-1', mockMerchant]]) as unknown as Map<
        string,
        import('../../combat/npc').NPC
      >;
      mockRoomManager.getRoom.mockReturnValue(room);

      mockGetItemInstance.mockReturnValue({
        instanceId: 'sword-instance-1',
        templateId: 'sword-template',
        history: [],
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
        value: 50,
      });

      const user = createMockUser({
        inventory: {
          items: [],
          currency: { gold: 100, silver: 0, copper: 0 },
        },
      });
      const client = createMockClient({ user });

      await buyCommand.execute(client, 'sword');

      expect(mockMerchant.removeItem).toHaveBeenCalledWith('sword-instance-1');
      expect(user.inventory.currency.gold).toBe(50); // 100 - 50
      expect(user.inventory.items).toContain('sword-instance-1');
      expect(mockUserManager.updateUserInventory).toHaveBeenCalled();
      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('You bought')
      );
    });
  });
});
