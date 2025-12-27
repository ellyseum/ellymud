/**
 * Unit tests for RenameCommand
 * @module command/commands/rename.command.test
 */

import { RenameCommand } from './rename.command';
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
const mockSaveItemInstances = jest.fn();
const mockAddItemHistory = jest.fn();

jest.mock('../../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn().mockReturnValue({
      getItemDisplayName: (id: string) => mockGetItemDisplayName(id),
      getItemInstance: (id: string) => mockGetItemInstance(id),
      getItem: (id: string) => mockGetItem(id),
      saveItemInstances: () => mockSaveItemInstances(),
      addItemHistory: (id: string, event: string, desc: string) =>
        mockAddItemHistory(id, event, desc),
    }),
  },
}));

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('RenameCommand', () => {
  let renameCommand: RenameCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemDisplayName.mockReturnValue('Test Item');
    mockGetItemInstance.mockReturnValue(null);
    mockGetItem.mockReturnValue(null);
    renameCommand = new RenameCommand();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(renameCommand.name).toBe('rename');
    });

    it('should have a description', () => {
      expect(renameCommand.description).toBeDefined();
      expect(renameCommand.description).toContain('custom name');
    });
  });

  describe('execute', () => {
    it('should return error if client has no user', () => {
      const client = createMockClient({ user: null });

      renameCommand.execute(client, 'sword newname');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('must be logged in')
      );
    });

    it('should show usage when no args provided', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      renameCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Usage: rename')
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

      renameCommand.execute(client, 'sword newname');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't have any items to rename")
      );
    });

    it('should show error when only item name provided without new name', () => {
      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['test-item'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      renameCommand.execute(client, 'sword');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Usage: rename')
      );
    });

    it('should show error when new name is too short', () => {
      mockGetItemDisplayName.mockReturnValue('sword');

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      renameCommand.execute(client, 'sword ab');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('at least 3 characters')
      );
    });

    it('should show error when new name is too long', () => {
      mockGetItemDisplayName.mockReturnValue('sword');

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      const longName = 'a'.repeat(31);
      renameCommand.execute(client, `sword ${longName}`);

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('at most 30 characters')
      );
    });

    it('should show error when new name contains forbidden characters', () => {
      mockGetItemDisplayName.mockReturnValue('sword');

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      renameCommand.execute(client, 'sword new<name>');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('forbidden characters')
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

      renameCommand.execute(client, 'sword newname');

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

      renameCommand.execute(client, 'sword newname');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Error: Item instance or properties not found')
      );
    });

    it('should successfully rename item', () => {
      mockGetItemDisplayName.mockReturnValue('sword');
      mockGetItemInstance.mockReturnValue({
        instanceId: 'sword-instance',
        templateId: 'sword-template',
        properties: { customName: null },
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
        type: 'weapon',
      });

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      renameCommand.execute(client, 'sword Excalibur');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("You've renamed")
      );
      expect(mockSaveItemInstances).toHaveBeenCalled();
      expect(mockAddItemHistory).toHaveBeenCalledWith(
        'sword',
        'rename',
        expect.stringContaining('Renamed to')
      );
    });

    it('should handle item with existing custom name', () => {
      mockGetItemDisplayName.mockReturnValue('sword');
      mockGetItemInstance.mockReturnValue({
        instanceId: 'sword-instance',
        templateId: 'sword-template',
        properties: { customName: 'Old Name' },
      });
      mockGetItem.mockReturnValue({
        id: 'sword-template',
        name: 'Iron Sword',
        type: 'weapon',
      });

      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: ['sword'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      renameCommand.execute(client, 'sword New Name');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("You've renamed")
      );
    });
  });
});
