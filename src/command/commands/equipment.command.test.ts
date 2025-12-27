/**
 * Unit tests for EquipmentCommand
 * @module command/commands/equipment.command.test
 */

import { EquipmentCommand } from './equipment.command';
import { EquipmentSlot, GameItem } from '../../types';
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
  getPlayerLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockGetItemInstance = jest.fn();
const mockGetItem = jest.fn();
const mockCalculateStatBonuses = jest.fn();

jest.mock('../../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn().mockReturnValue({
      getItemInstance: (id: string) => mockGetItemInstance(id),
      getItem: (id: string) => mockGetItem(id),
      calculateStatBonuses: () => mockCalculateStatBonuses(),
    }),
  },
}));

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('EquipmentCommand', () => {
  let equipmentCommand: EquipmentCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemInstance.mockReturnValue(null);
    mockGetItem.mockReturnValue(null);
    mockCalculateStatBonuses.mockReturnValue({});
    equipmentCommand = new EquipmentCommand();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(equipmentCommand.name).toBe('equipment');
    });

    it('should have a description', () => {
      expect(equipmentCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      equipmentCommand.execute(client, '');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should display equipment header', () => {
      const client = createMockClient({
        user: createMockUser({ equipment: {} }),
      });

      equipmentCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Your Equipment')
      );
    });

    it('should display all equipment region headers', () => {
      const client = createMockClient({
        user: createMockUser({ equipment: {} }),
      });

      equipmentCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Head Region')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Torso Region')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Arms Region')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Weapons'));
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Lower Region')
      );
    });

    it('should display empty slots', () => {
      const client = createMockClient({
        user: createMockUser({ equipment: {} }),
      });

      equipmentCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('<empty>'));
    });

    it('should display equipped item from template', () => {
      const mockItem: GameItem = {
        id: 'sword',
        name: 'Iron Sword',
        description: 'A sword',
        type: 'weapon',
        value: 100,
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(mockItem);

      const client = createMockClient({
        user: createMockUser({
          equipment: {
            [EquipmentSlot.MAIN_HAND]: 'sword',
          },
        }),
      });

      equipmentCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Iron Sword'));
    });

    it('should display equipped item instance with custom name', () => {
      const mockTemplate: GameItem = {
        id: 'sword_template',
        name: 'Sword',
        description: 'A sword',
        type: 'weapon',
        value: 100,
      };

      mockGetItemInstance.mockReturnValue({
        id: 'sword_instance',
        templateId: 'sword_template',
        properties: { customName: 'Excalibur' },
      });
      mockGetItem.mockReturnValue(mockTemplate);

      const client = createMockClient({
        user: createMockUser({
          equipment: {
            [EquipmentSlot.MAIN_HAND]: 'sword_instance',
          },
        }),
      });

      equipmentCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Excalibur'));
    });

    it('should display stat bonuses from equipment', () => {
      mockCalculateStatBonuses.mockReturnValue({ strength: 5, dexterity: 3 });

      const client = createMockClient({
        user: createMockUser({ equipment: {} }),
      });

      equipmentCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Stat Bonuses')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Strength: +5')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Dexterity: +3')
      );
    });

    it('should display combat stats from equipment', () => {
      const client = createMockClient({
        user: createMockUser({
          equipment: {},
          attack: 15,
          defense: 10,
          strength: 10,
          constitution: 10,
        }),
      });

      equipmentCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Combat Stats from Equipment')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Attack:'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Defense:'));
    });

    it('should display help text for equip and unequip', () => {
      const client = createMockClient({
        user: createMockUser({ equipment: {} }),
      });

      equipmentCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('equip [item]')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('unequip [slot/item]')
      );
    });

    it('should handle unknown item in slot', () => {
      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser({
          equipment: {
            [EquipmentSlot.HEAD]: 'unknown_item',
          },
        }),
      });

      equipmentCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('<unknown item>')
      );
    });

    it('should initialize equipment if missing', () => {
      const user = createMockUser();
      delete (user as { equipment?: unknown }).equipment;
      const client = createMockClient({ user });

      equipmentCommand.execute(client, '');

      expect(user.equipment).toBeDefined();
    });
  });
});
