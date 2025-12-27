/**
 * Unit tests for UseCommand
 * @module command/commands/use.command.test
 */

import { UseCommand } from './use.command';
import { GameItem } from '../../types';
import { createMockClient, createMockUser } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeFormattedMessageToClient: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  getPlayerLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockGetItemInstance = jest.fn();
const mockGetItem = jest.fn();
const mockGetItemDisplayName = jest.fn();

jest.mock('../../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn().mockReturnValue({
      getItemInstance: (id: string) => mockGetItemInstance(id),
      getItem: (id: string) => mockGetItem(id),
      getItemDisplayName: (id: string) => mockGetItemDisplayName(id),
    }),
  },
}));

import { writeFormattedMessageToClient } from '../../utils/socketWriter';

const mockWriteFormattedMessageToClient = writeFormattedMessageToClient as jest.MockedFunction<
  typeof writeFormattedMessageToClient
>;

describe('UseCommand', () => {
  let useCommand: UseCommand;
  let mockAbilityManager: {
    executeItemAbility: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemInstance.mockReturnValue(null);
    mockGetItem.mockReturnValue(null);
    mockGetItemDisplayName.mockReturnValue(null);

    mockAbilityManager = {
      executeItemAbility: jest.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useCommand = new UseCommand(mockAbilityManager as any);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(useCommand.name).toBe('use');
    });

    it('should have a description', () => {
      expect(useCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should show error when client has no user', () => {
      const client = createMockClient({ user: null });

      useCommand.execute(client, 'potion');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('must be logged in')
      );
    });

    it('should show usage when no item is specified', () => {
      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      useCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Usage: use <item>')
      );
    });

    it('should show "no usable items" when inventory is empty', () => {
      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      useCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('no usable items')
      );
    });

    it('should show error when item not found in inventory', () => {
      mockGetItemDisplayName.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      useCommand.execute(client, 'potion');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't have a 'potion'")
      );
    });

    it('should execute item ability when item found', () => {
      mockGetItemDisplayName.mockReturnValue('Health Potion');

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['potion-1'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      useCommand.execute(client, 'health potion');

      expect(mockAbilityManager.executeItemAbility).toHaveBeenCalledWith(client, 'potion-1');
    });

    it('should find item by partial name match', () => {
      mockGetItemDisplayName.mockReturnValue('Greater Health Potion');

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['greater-potion-1'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      useCommand.execute(client, 'health');

      expect(mockAbilityManager.executeItemAbility).toHaveBeenCalledWith(
        client,
        'greater-potion-1'
      );
    });

    it('should show usable items list when no args and items have abilities', () => {
      const mockPotionTemplate: GameItem = {
        id: 'potion-template',
        name: 'Health Potion',
        description: 'A healing potion',
        type: 'consumable',
        value: 50,
      };

      // Item with ability (usable)
      const usableItem = {
        ...mockPotionTemplate,
        ability: { name: 'heal', power: 50 },
      };

      mockGetItemInstance.mockReturnValue({
        instanceId: 'potion-1',
        templateId: 'potion-template',
        properties: {},
      });
      mockGetItem.mockReturnValue(usableItem);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['potion-1'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      useCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Usable items:')
      );
      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Health Potion')
      );
    });

    it('should handle inventory with undefined items array', () => {
      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: undefined as unknown as string[],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      useCommand.execute(client, 'potion');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't have a 'potion'")
      );
    });

    it('should show legacy items with abilities', () => {
      const mockLegacyItem: GameItem = {
        id: 'scroll',
        name: 'Scroll of Fire',
        description: 'A fire scroll',
        type: 'consumable',
        value: 100,
      };

      const usableLegacyItem = {
        ...mockLegacyItem,
        ability: { name: 'fireball', power: 100 },
      };

      // Legacy item - no instance
      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(usableLegacyItem);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['scroll'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      useCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Usable items:')
      );
      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Scroll of Fire')
      );
    });

    it('should not show items without abilities in usable list', () => {
      const mockSword: GameItem = {
        id: 'sword',
        name: 'Iron Sword',
        description: 'A sword',
        type: 'weapon',
        value: 100,
        // No ability
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(mockSword);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      useCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('no usable items')
      );
    });

    it('should handle case-insensitive item search', () => {
      mockGetItemDisplayName.mockReturnValue('HEALTH POTION');

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['potion-1'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      useCommand.execute(client, 'health potion');

      expect(mockAbilityManager.executeItemAbility).toHaveBeenCalledWith(client, 'potion-1');
    });

    it('should trim whitespace from item name', () => {
      mockGetItemDisplayName.mockReturnValue('Health Potion');

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['potion-1'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      useCommand.execute(client, '  health potion  ');

      expect(mockAbilityManager.executeItemAbility).toHaveBeenCalledWith(client, 'potion-1');
    });

    it('should find first matching item in inventory', () => {
      mockGetItemDisplayName.mockImplementation((id: string) => {
        if (id === 'potion-1') return 'Health Potion';
        if (id === 'potion-2') return 'Health Potion';
        return null;
      });

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['potion-1', 'potion-2'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      useCommand.execute(client, 'health');

      // Should use first matching item
      expect(mockAbilityManager.executeItemAbility).toHaveBeenCalledWith(client, 'potion-1');
    });
  });
});
