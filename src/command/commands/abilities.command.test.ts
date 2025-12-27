/**
 * Unit tests for AbilitiesCommand
 * @module command/commands/abilities.command.test
 */

import { AbilitiesCommand } from './abilities.command';
import { createMockClient, createMockUser } from '../../test/helpers/mockFactories';
import { AbilityType } from '../../abilities/types';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeFormattedMessageToClient: jest.fn(),
}));

const mockGetAbilitiesByType = jest.fn();
const mockGetCooldownRemaining = jest.fn();
const mockCanUseAbility = jest.fn();

const mockAbilityManager = {
  getAbilitiesByType: mockGetAbilitiesByType,
  getCooldownRemaining: mockGetCooldownRemaining,
  canUseAbility: mockCanUseAbility,
};

import { writeFormattedMessageToClient } from '../../utils/socketWriter';

const mockWriteFormattedMessageToClient = writeFormattedMessageToClient as jest.MockedFunction<
  typeof writeFormattedMessageToClient
>;

describe('AbilitiesCommand', () => {
  let abilitiesCommand: AbilitiesCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAbilitiesByType.mockReturnValue([]);
    mockGetCooldownRemaining.mockReturnValue(0);
    mockCanUseAbility.mockReturnValue({ ok: true });
    abilitiesCommand = new AbilitiesCommand(mockAbilityManager as never);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(abilitiesCommand.name).toBe('abilities');
    });

    it('should have a description', () => {
      expect(abilitiesCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should show error if client has no user', () => {
      const client = createMockClient({ user: null });

      abilitiesCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('must be logged in')
      );
    });

    it('should show message when no abilities', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockGetAbilitiesByType.mockReturnValue([]);

      abilitiesCommand.execute(client, '');

      expect(mockGetAbilitiesByType).toHaveBeenCalledWith(AbilityType.STANDARD);
      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('no abilities')
      );
    });

    it('should display abilities header', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser', mana: 50, maxMana: 100 }),
      });
      mockGetAbilitiesByType.mockReturnValue([
        { id: 'fireball', name: 'Fireball', description: 'A ball of fire', mpCost: 10 },
      ]);
      mockCanUseAbility.mockReturnValue({ ok: true });

      abilitiesCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Your Abilities')
      );
    });

    it('should display mana status', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser', mana: 50, maxMana: 100 }),
      });
      mockGetAbilitiesByType.mockReturnValue([
        { id: 'fireball', name: 'Fireball', description: 'A ball of fire', mpCost: 10 },
      ]);

      abilitiesCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('50/100')
      );
    });

    it('should display ready ability', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockGetAbilitiesByType.mockReturnValue([
        { id: 'fireball', name: 'Fireball', description: 'A ball of fire', mpCost: 10 },
      ]);
      mockCanUseAbility.mockReturnValue({ ok: true });
      mockGetCooldownRemaining.mockReturnValue(0);

      abilitiesCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Fireball')
      );
      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Ready')
      );
    });

    it('should display ability on cooldown', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockGetAbilitiesByType.mockReturnValue([
        { id: 'fireball', name: 'Fireball', description: 'A ball of fire', mpCost: 10 },
      ]);
      mockCanUseAbility.mockReturnValue({ ok: false, reason: 'On cooldown' });
      mockGetCooldownRemaining.mockReturnValue(3);

      abilitiesCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('3 rounds')
      );
    });

    it('should display ability that cannot be used with reason', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockGetAbilitiesByType.mockReturnValue([
        { id: 'fireball', name: 'Fireball', description: 'A ball of fire', mpCost: 10 },
      ]);
      mockCanUseAbility.mockReturnValue({ ok: false, reason: 'Not enough mana' });
      mockGetCooldownRemaining.mockReturnValue(0);

      abilitiesCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Not enough mana')
      );
    });

    it('should display ability MP cost', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockGetAbilitiesByType.mockReturnValue([
        { id: 'fireball', name: 'Fireball', description: 'A ball of fire', mpCost: 25 },
      ]);

      abilitiesCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('25 MP')
      );
    });

    it('should display multiple abilities', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      mockGetAbilitiesByType.mockReturnValue([
        { id: 'fireball', name: 'Fireball', description: 'A ball of fire', mpCost: 10 },
        { id: 'heal', name: 'Heal', description: 'Heals the target', mpCost: 15 },
      ]);
      mockCanUseAbility.mockReturnValue({ ok: true });

      abilitiesCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Fireball')
      );
      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Heal')
      );
    });
  });
});
