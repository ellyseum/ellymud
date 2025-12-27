/**
 * Unit tests for CastCommand
 * @module command/commands/cast.command.test
 */

import { CastCommand } from './cast.command';
import { createMockClient, createMockUser } from '../../test/helpers/mockFactories';
import { AbilityType } from '../../abilities/types';

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

const mockGetAbility = jest.fn();
const mockGetAbilitiesByType = jest.fn();
const mockExecuteAbility = jest.fn();
const mockBreakCombat = jest.fn();

const mockAbilityManager = {
  getAbility: mockGetAbility,
  getAbilitiesByType: mockGetAbilitiesByType,
  executeAbility: mockExecuteAbility,
};

const mockCombatSystem = {
  breakCombat: mockBreakCombat,
};

import { writeFormattedMessageToClient } from '../../utils/socketWriter';

const mockWriteFormattedMessageToClient = writeFormattedMessageToClient as jest.MockedFunction<
  typeof writeFormattedMessageToClient
>;

describe('CastCommand', () => {
  let castCommand: CastCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAbility.mockReturnValue(null);
    mockGetAbilitiesByType.mockReturnValue([]);
    castCommand = new CastCommand(mockAbilityManager as never, mockCombatSystem as never);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(castCommand.name).toBe('cast');
    });

    it('should have a description', () => {
      expect(castCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should show error if client has no user', () => {
      const client = createMockClient({ user: null });

      castCommand.execute(client, 'fireball');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('must be logged in')
      );
    });

    it('should show usage if no ability specified', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockGetAbilitiesByType.mockReturnValue([]);

      castCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Usage:')
      );
    });

    it('should show error for unknown ability', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockGetAbility.mockReturnValue(null);
      mockGetAbilitiesByType.mockReturnValue([]);

      castCommand.execute(client, 'unknownspell');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Unknown ability')
      );
    });

    it('should show error for non-standard ability', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockGetAbility.mockReturnValue({
        id: 'passive',
        name: 'Passive Ability',
        type: AbilityType.PROC,
        description: 'A passive ability',
        mpCost: 0,
      });

      castCommand.execute(client, 'passive');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('cannot be cast directly')
      );
    });

    it('should execute ability successfully', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockGetAbility.mockReturnValue({
        id: 'fireball',
        name: 'Fireball',
        type: AbilityType.STANDARD,
        description: 'A ball of fire',
        mpCost: 10,
      });

      castCommand.execute(client, 'fireball');

      expect(mockExecuteAbility).toHaveBeenCalledWith(client, 'fireball', undefined);
    });

    it('should execute ability with target', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockGetAbility.mockReturnValue({
        id: 'fireball',
        name: 'Fireball',
        type: AbilityType.STANDARD,
        description: 'A ball of fire',
        mpCost: 10,
      });

      castCommand.execute(client, 'fireball goblin');

      expect(mockExecuteAbility).toHaveBeenCalledWith(client, 'fireball', 'goblin');
    });

    it('should break combat when casting ability while in combat', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser', inCombat: true }),
      });
      mockGetAbility.mockReturnValue({
        id: 'fireball',
        name: 'Fireball',
        type: AbilityType.STANDARD,
        description: 'A ball of fire',
        mpCost: 10,
      });

      castCommand.execute(client, 'fireball');

      expect(mockBreakCombat).toHaveBeenCalledWith(client);
    });

    it('should not break combat if not in combat', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser', inCombat: false }),
      });
      mockGetAbility.mockReturnValue({
        id: 'fireball',
        name: 'Fireball',
        type: AbilityType.STANDARD,
        description: 'A ball of fire',
        mpCost: 10,
      });

      castCommand.execute(client, 'fireball');

      expect(mockBreakCombat).not.toHaveBeenCalled();
    });

    it('should show available abilities when ability not found', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockGetAbility.mockReturnValue(null);
      mockGetAbilitiesByType.mockReturnValue([
        { id: 'fireball', name: 'Fireball', description: 'A ball of fire', mpCost: 10 },
      ]);

      castCommand.execute(client, 'unknown');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Available abilities')
      );
      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('fireball')
      );
    });

    it('should show no abilities message when none available', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockGetAbility.mockReturnValue(null);
      mockGetAbilitiesByType.mockReturnValue([]);

      castCommand.execute(client, 'unknown');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('No abilities available')
      );
    });
  });
});
