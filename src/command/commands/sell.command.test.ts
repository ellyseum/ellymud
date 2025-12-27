/**
 * Unit tests for SellCommand
 * @module command/commands/sell.command.test
 */

import { SellCommand } from './sell.command';
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

describe('SellCommand', () => {
  let sellCommand: SellCommand;
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
    sellCommand = new SellCommand(mockRoomManager as any, mockUserManager as any);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(sellCommand.name).toBe('sell');
    });

    it('should have a description', () => {
      expect(sellCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', async () => {
      const client = createMockClient({ user: null });

      await sellCommand.execute(client, 'sword');

      expect(mockWriteMessageToClient).not.toHaveBeenCalled();
    });

    it('should show usage when no item specified', async () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      await sellCommand.execute(client, '');

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

      await sellCommand.execute(client, 'sword');

      expect(mockWriteMessageToClient).not.toHaveBeenCalled();
    });

    it('should show error when no merchant in room', async () => {
      const room = createMockRoom('shop', 'Shop');
      room.npcs = new Map();
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser(),
      });

      await sellCommand.execute(client, 'sword');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('no merchant')
      );
    });

    it('should show error when player does not have item', async () => {
      const mockMerchant = {
        isMerchant: () => true,
      };

      const room = createMockRoom('shop', 'Shop');
      room.npcs = new Map([['merchant-1', mockMerchant]]) as unknown as Map<
        string,
        import('../../combat/npc').NPC
      >;
      mockRoomManager.getRoom.mockReturnValue(room);

      // No matching item in inventory
      mockGetItemInstance.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      await sellCommand.execute(client, 'sword');

      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't have")
      );
    });

    it('should complete sale successfully', async () => {
      const mockMerchant = {
        isMerchant: () => true,
        addItem: jest.fn(),
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
        value: 100, // Base value of 100 gold
      });

      const user = createMockUser({
        inventory: {
          items: ['sword-instance-1'],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      });
      const client = createMockClient({ user });

      await sellCommand.execute(client, 'sword');

      expect(mockMerchant.addItem).toHaveBeenCalledWith('sword-instance-1');
      expect(user.inventory.currency.gold).toBe(50); // 50% of 100
      expect(user.inventory.items).not.toContain('sword-instance-1');
      expect(mockUserManager.updateUserInventory).toHaveBeenCalled();
      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('You sold')
      );
    });

    it('should return early when item instance is null after finding', async () => {
      const mockMerchant = {
        isMerchant: () => true,
      };

      const room = createMockRoom('shop', 'Shop');
      room.npcs = new Map([['merchant-1', mockMerchant]]) as unknown as Map<
        string,
        import('../../combat/npc').NPC
      >;
      mockRoomManager.getRoom.mockReturnValue(room);

      // First call returns instance (for finding), second returns null
      let callCount = 0;
      mockGetItemInstance.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            instanceId: 'sword-instance-1',
            templateId: 'sword-template',
          };
        }
        return null;
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
        value: 100,
      });

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword-instance-1'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      await sellCommand.execute(client, 'sword');

      // Should return early without completing sale
      expect(mockWriteMessageToClient).not.toHaveBeenCalledWith(
        client,
        expect.stringContaining('You sold')
      );
    });

    it('should return early when template is null', async () => {
      const mockMerchant = {
        isMerchant: () => true,
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
      });
      // First call returns template (for finding), second returns null
      let callCount = 0;
      mockGetItem.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            id: 'sword-template',
            name: 'Iron Sword',
            value: 100,
          };
        }
        return null;
      });

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword-instance-1'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      await sellCommand.execute(client, 'sword');

      // Should return early without completing sale
      expect(mockWriteMessageToClient).not.toHaveBeenCalledWith(
        client,
        expect.stringContaining('You sold')
      );
    });

    it('should find item using partial name match', async () => {
      const mockMerchant = {
        isMerchant: () => true,
        addItem: jest.fn(),
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
        name: 'Iron Sword of Power', // Full name
        value: 200,
      });

      const user = createMockUser({
        inventory: {
          items: ['sword-instance-1'],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      });
      const client = createMockClient({ user });

      // Search with partial name
      await sellCommand.execute(client, 'iron');

      expect(mockMerchant.addItem).toHaveBeenCalled();
      expect(user.inventory.currency.gold).toBe(100); // 50% of 200
    });
  });
});
