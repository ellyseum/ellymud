/**
 * Unit tests for ResetNameCommand
 * @module command/commands/resetname.command.test
 */

import { ResetNameCommand } from './resetname.command';
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
}));

jest.mock('../../utils/logger', () => ({
  createContextLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockGetItemDisplayName = jest.fn();
const mockGetItemInstance = jest.fn();
const mockGetItem = jest.fn();
const mockRemoveCustomName = jest.fn();

jest.mock('../../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn().mockReturnValue({
      getItemDisplayName: (id: string) => mockGetItemDisplayName(id),
      getItemInstance: (id: string) => mockGetItemInstance(id),
      getItem: (id: string) => mockGetItem(id),
      removeCustomName: (id: string, username: string) => mockRemoveCustomName(id, username),
    }),
  },
}));

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('ResetNameCommand', () => {
  let resetNameCommand: ResetNameCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemDisplayName.mockReturnValue('Test Item');
    mockGetItemInstance.mockReturnValue(null);
    mockGetItem.mockReturnValue(null);
    mockRemoveCustomName.mockReturnValue(true);
    resetNameCommand = new ResetNameCommand();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(resetNameCommand.name).toBe('resetname');
    });

    it('should have a description', () => {
      expect(resetNameCommand.description).toBeDefined();
      expect(resetNameCommand.description).toContain('custom name');
    });
  });

  describe('execute', () => {
    it('should return error if client has no user', () => {
      const client = createMockClient({ user: null });

      resetNameCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('must be logged in')
      );
    });

    it('should show usage when no args provided', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      resetNameCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Usage: resetname')
      );
    });

    it('should show error when user has no items', () => {
      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      resetNameCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't have any items to reset names for")
      );
    });

    it('should show error when item not found in inventory', () => {
      mockGetItemDisplayName.mockReturnValue('other item');

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['other-item'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      resetNameCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't have an item called")
      );
    });

    it('should show error when item instance not found', () => {
      mockGetItemDisplayName.mockReturnValue('sword');
      mockGetItemInstance.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      resetNameCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Error: Item instance or properties not found')
      );
    });

    it('should show error when item has no custom name', () => {
      mockGetItemDisplayName.mockReturnValue('sword');
      mockGetItemInstance.mockReturnValue({
        instanceId: 'sword-instance',
        templateId: 'sword-template',
        properties: {},
      });

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      resetNameCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("doesn't have a custom name to reset")
      );
    });

    it('should show error when template not found', () => {
      mockGetItemDisplayName.mockReturnValue('sword');
      mockGetItemInstance.mockReturnValue({
        instanceId: 'sword-instance',
        templateId: 'sword-template',
        properties: { customName: 'Custom Sword' },
      });
      mockGetItem.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      resetNameCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Error: Item template not found')
      );
    });

    it('should successfully reset item name', () => {
      mockGetItemDisplayName.mockReturnValue('sword');
      mockGetItemInstance.mockReturnValue({
        instanceId: 'sword-instance',
        templateId: 'sword-template',
        properties: { customName: 'Custom Sword' },
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
        type: 'weapon',
      });
      mockRemoveCustomName.mockReturnValue(true);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      resetNameCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('remove the custom name')
      );
      expect(mockRemoveCustomName).toHaveBeenCalledWith('sword', 'testuser');
    });

    it('should show error when reset fails', () => {
      mockGetItemDisplayName.mockReturnValue('sword');
      mockGetItemInstance.mockReturnValue({
        instanceId: 'sword-instance',
        templateId: 'sword-template',
        properties: { customName: 'Custom Sword' },
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
        type: 'weapon',
      });
      mockRemoveCustomName.mockReturnValue(false);

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      resetNameCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("Failed to reset the item's name")
      );
    });
  });
});
