/**
 * Unit tests for StatsCommand
 * @module command/commands/stats.command.test
 */

import { StatsCommand } from './stats.command';
import { User, GameItem } from '../../types';
import { createMockClient, createMockUser } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

jest.mock('../../utils/formatters', () => ({
  formatUsername: jest.fn((name: string) => name),
}));

jest.mock('../../utils/itemNameColorizer', () => ({
  colorizeItemName: jest.fn((name: string) => name),
}));

const mockCalculateAttack = jest.fn();
const mockCalculateDefense = jest.fn();
const mockCalculateStatBonuses = jest.fn();
const mockGetItemInstance = jest.fn();
const mockGetItem = jest.fn();

jest.mock('../../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn().mockReturnValue({
      calculateAttack: (user: User) => mockCalculateAttack(user),
      calculateDefense: (user: User) => mockCalculateDefense(user),
      calculateStatBonuses: (user: User) => mockCalculateStatBonuses(user),
      getItemInstance: (id: string) => mockGetItemInstance(id),
      getItem: (id: string) => mockGetItem(id),
    }),
  },
}));

// Mock ResourceManager to return mana values from user object
jest.mock('../../resource/resourceManager', () => ({
  ResourceManager: {
    getInstance: jest.fn().mockReturnValue({
      getResourceType: (user: User) =>
        user.mana !== undefined && user.maxMana !== undefined ? 'mana' : 'none',
      getCurrentResource: (user: User) => user.mana ?? 0,
      calculateMaxResource: (user: User) => user.maxMana ?? 0,
    }),
  },
}));

// Mock statCalculator
jest.mock('../../utils/statCalculator', () => ({
  getResourceDisplayAbbr: (resourceType: string) => (resourceType === 'mana' ? 'MP' : 'N/A'),
}));

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('StatsCommand', () => {
  let statsCommand: StatsCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCalculateAttack.mockReturnValue(10);
    mockCalculateDefense.mockReturnValue(5);
    mockCalculateStatBonuses.mockReturnValue({});
    mockGetItemInstance.mockReturnValue(null);
    mockGetItem.mockReturnValue(null);
    statsCommand = new StatsCommand();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(statsCommand.name).toBe('stats');
    });

    it('should have a description', () => {
      expect(statsCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should display character stats header', () => {
      const client = createMockClient({
        user: createMockUser({ experience: 500, level: 5 }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Your Character Stats')
      );
    });

    it('should display username', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'Hero', experience: 500, level: 5 }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Username: Hero')
      );
    });

    it('should display health', () => {
      const client = createMockClient({
        user: createMockUser({ health: 80, maxHealth: 100, experience: 500, level: 5 }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('80/100'));
    });

    it('should display mana', () => {
      const client = createMockClient({
        user: createMockUser({ mana: 40, maxMana: 50, experience: 500, level: 5 }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('40/50'));
    });

    it('should display level', () => {
      const client = createMockClient({
        user: createMockUser({ level: 10, experience: 500 }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Level: 10'));
    });

    it('should display experience', () => {
      const client = createMockClient({
        user: createMockUser({ experience: 1500, level: 5 }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Experience: 1500')
      );
    });

    it('should display combat stats header', () => {
      const client = createMockClient({
        user: createMockUser({ experience: 500, level: 5 }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Combat Stats')
      );
    });

    it('should display calculated attack value', () => {
      mockCalculateAttack.mockReturnValue(25);

      const client = createMockClient({
        user: createMockUser({ experience: 500, level: 5 }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Attack: 25'));
    });

    it('should display calculated defense value', () => {
      mockCalculateDefense.mockReturnValue(15);

      const client = createMockClient({
        user: createMockUser({ experience: 500, level: 5 }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Defense: 15')
      );
    });

    it('should display attributes section', () => {
      const client = createMockClient({
        user: createMockUser({ experience: 500, level: 5 }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Attributes'));
    });

    it('should display strength', () => {
      const client = createMockClient({
        user: createMockUser({ strength: 20, experience: 500, level: 5 }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Strength: 20')
      );
    });

    it('should display dexterity', () => {
      const client = createMockClient({
        user: createMockUser({ dexterity: 18, experience: 500, level: 5 }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Dexterity: 18')
      );
    });

    it('should display strength bonus from equipment', () => {
      mockCalculateStatBonuses.mockReturnValue({ strength: 5 });

      const client = createMockClient({
        user: createMockUser({ strength: 15, experience: 500, level: 5 }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Strength: 15 (+5)')
      );
    });

    it('should display dexterity bonus from equipment', () => {
      mockCalculateStatBonuses.mockReturnValue({ dexterity: 3 });

      const client = createMockClient({
        user: createMockUser({ dexterity: 12, experience: 500, level: 5 }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Dexterity: 12 (+3)')
      );
    });

    it('should display equipment section when equipment exists', () => {
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
          experience: 500,
          level: 5,
          equipment: {
            weapon: 'sword',
          },
        }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Equipment'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Iron Sword'));
    });

    it('should display equipment with custom name', () => {
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
          experience: 500,
          level: 5,
          equipment: {
            weapon: 'sword_instance',
          },
        }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Excalibur'));
    });

    it('should handle unknown equipped items', () => {
      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser({
          experience: 500,
          level: 5,
          equipment: {
            weapon: 'unknown_item',
          },
        }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('<unknown item>')
      );
    });

    it('should display account info section', () => {
      const client = createMockClient({
        user: createMockUser({ experience: 500, level: 5 }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Account Info')
      );
    });

    it('should display member since date', () => {
      const client = createMockClient({
        user: createMockUser({ experience: 500, level: 5 }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Member since:')
      );
    });

    it('should display last login date', () => {
      const client = createMockClient({
        user: createMockUser({ experience: 500, level: 5 }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Last login:')
      );
    });

    it('should format slot names correctly', () => {
      const mockItem: GameItem = {
        id: 'boots',
        name: 'Leather Boots',
        description: 'Boots',
        type: 'armor',
        value: 50,
      };

      mockGetItemInstance.mockReturnValue(null);
      mockGetItem.mockReturnValue(mockItem);

      const client = createMockClient({
        user: createMockUser({
          experience: 500,
          level: 5,
          equipment: {
            left_hand: 'boots',
          },
        }),
      });

      statsCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Left Hand:'));
    });

    it('should skip null equipment slots', () => {
      const client = createMockClient({
        user: createMockUser({
          experience: 500,
          level: 5,
          equipment: {
            weapon: null as unknown as string,
          },
        }),
      });

      statsCommand.execute(client, '');

      // Should not cause errors and not display weapon slot
      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should update user attack and defense values', () => {
      mockCalculateAttack.mockReturnValue(30);
      mockCalculateDefense.mockReturnValue(20);

      const user = createMockUser({ experience: 500, level: 5 });
      const client = createMockClient({ user });

      statsCommand.execute(client, '');

      expect(user.attack).toBe(30);
      expect(user.defense).toBe(20);
    });
  });
});
