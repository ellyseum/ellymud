/**
 * Unit tests for RepairCommand
 * @module command/commands/repair.command.test
 */

import { RepairCommand } from './repair.command';
import { createMockClient, createMockUser } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

jest.mock('../../utils/itemNameColorizer', () => ({
  colorizeItemName: jest.fn((name: string) => name),
  stripColorCodes: jest.fn((text: string) => text),
}));

const mockGetItemDisplayName = jest.fn();
const mockGetItemInstance = jest.fn();
const mockGetItem = jest.fn();
const mockRepairItem = jest.fn();

jest.mock('../../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn().mockReturnValue({
      getItemDisplayName: (id: string) => mockGetItemDisplayName(id),
      getItemInstance: (id: string) => mockGetItemInstance(id),
      getItem: (id: string) => mockGetItem(id),
      repairItem: (id: string, amount: number) => mockRepairItem(id, amount),
    }),
  },
}));

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('RepairCommand', () => {
  let repairCommand: RepairCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemDisplayName.mockReturnValue('Test Item');
    mockGetItemInstance.mockReturnValue(null);
    mockGetItem.mockReturnValue(null);
    repairCommand = new RepairCommand();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(repairCommand.name).toBe('repair');
    });

    it('should have a description', () => {
      expect(repairCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return error if client has no user', () => {
      const client = createMockClient({ user: null });

      repairCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('must be logged in')
      );
    });

    it('should show prompt when no args provided', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      repairCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Which item would you like to repair')
      );
    });

    it('should show error when item not found', () => {
      mockGetItemDisplayName.mockReturnValue('other item');

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['other-item'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      repairCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't have an item called")
      );
    });

    it('should show error when item cannot be repaired', () => {
      mockGetItemDisplayName.mockReturnValue('sword');
      mockGetItemInstance.mockReturnValue({
        instanceId: 'sword-instance',
        templateId: 'sword-template',
        properties: {}, // No durability
      });

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      repairCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('cannot be repaired')
      );
    });

    it('should show message when item is already at max durability', () => {
      mockGetItemDisplayName.mockReturnValue('sword');
      mockGetItemInstance.mockReturnValue({
        instanceId: 'sword-instance',
        templateId: 'sword-template',
        properties: {
          durability: { current: 100, max: 100 },
        },
      });

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      repairCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('perfect condition')
      );
    });

    it('should show error when not enough gold', () => {
      mockGetItemDisplayName.mockReturnValue('sword');
      mockGetItemInstance.mockReturnValue({
        instanceId: 'sword-instance',
        templateId: 'sword-template',
        properties: {
          durability: { current: 50, max: 100 },
        },
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
        type: 'weapon',
        value: 100,
      });

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      repairCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('You need'));
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('gold to repair')
      );
    });

    it('should successfully repair item when conditions are met', () => {
      mockGetItemDisplayName.mockReturnValue('sword');
      mockGetItemInstance.mockReturnValue({
        instanceId: 'sword-instance',
        templateId: 'sword-template',
        properties: {
          durability: { current: 50, max: 100 },
        },
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
        type: 'weapon',
        value: 100,
      });

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword'],
            currency: { gold: 100, silver: 0, copper: 0 },
          },
        }),
      });

      repairCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('You repaired')
      );
      expect(mockRepairItem).toHaveBeenCalled();
    });

    it('should repair all items when using "all" argument', () => {
      mockGetItemDisplayName.mockReturnValue('sword');
      mockGetItemInstance.mockImplementation((id: string) => {
        if (id === 'sword') {
          return {
            instanceId: 'sword-instance',
            templateId: 'sword-template',
            properties: {
              durability: { current: 50, max: 100 },
            },
          };
        }
        return null;
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
        type: 'weapon',
        value: 100,
      });

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword'],
            currency: { gold: 100, silver: 0, copper: 0 },
          },
        }),
      });

      repairCommand.execute(client, 'all');

      expect(mockRepairItem).toHaveBeenCalled();
    });

    it('should show error when no items can be repaired', () => {
      mockGetItemInstance.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['item1', 'item2'],
            currency: { gold: 100, silver: 0, copper: 0 },
          },
        }),
      });

      repairCommand.execute(client, 'all');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't have any items that can be repaired")
      );
    });

    it('should show error when cannot afford to repair any items', () => {
      mockGetItemDisplayName.mockReturnValue('expensive-sword');
      mockGetItemInstance.mockReturnValue({
        instanceId: 'sword-instance',
        templateId: 'sword-template',
        properties: {
          durability: { current: 50, max: 100 },
        },
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Expensive Sword',
        type: 'weapon',
        value: 10000,
      });

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['expensive-sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      repairCommand.execute(client, 'all');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("couldn't afford to repair")
      );
    });
  });
});
