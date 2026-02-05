/**
 * Unit tests for AbilitiesCommand
 * @module command/commands/abilities.command.test
 */

import { AbilitiesCommand } from './abilities.command';
import { createMockClient, createMockUser } from '../../test/helpers/mockFactories';
import { AbilityType } from '../../abilities/types';
import { ResourceType } from '../../types';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
  ColorType: {},
}));

jest.mock('../../utils/socketWriter', () => ({
  writeFormattedMessageToClient: jest.fn(),
}));

const mockGetCooldownRemaining = jest.fn();
const mockCanUseAbility = jest.fn();
const mockGetAbility = jest.fn();

const mockAbilityManager = {
  getCooldownRemaining: mockGetCooldownRemaining,
  canUseAbility: mockCanUseAbility,
  getAbility: mockGetAbility,
};

// Mock ClassAbilityService
const mockGetAbilitiesBySourceClass = jest.fn();
jest.mock('../../class/classAbilityService', () => ({
  ClassAbilityService: {
    getInstance: () => ({
      getAbilitiesBySourceClass: mockGetAbilitiesBySourceClass,
    }),
  },
}));

// Mock ClassManager
jest.mock('../../class/classManager', () => ({
  ClassManager: {
    getInstance: () => ({
      getClassName: (classId: string) => classId.charAt(0).toUpperCase() + classId.slice(1),
    }),
  },
}));

// Mock ResourceManager
jest.mock('../../resource/resourceManager', () => ({
  ResourceManager: {
    getInstance: () => ({
      getResourceType: jest.fn().mockReturnValue(ResourceType.MANA),
      getCurrentResource: jest.fn().mockReturnValue(50),
      calculateMaxResource: jest.fn().mockReturnValue(100),
    }),
  },
}));

// Mock ComboManager
jest.mock('../../combat/comboManager', () => ({
  ComboManager: {
    getInstance: () => ({
      getComboPoints: jest.fn().mockReturnValue(0),
      getComboTarget: jest.fn().mockReturnValue(null),
    }),
  },
}));

import { writeFormattedMessageToClient } from '../../utils/socketWriter';

const mockWriteFormattedMessageToClient = writeFormattedMessageToClient as jest.MockedFunction<
  typeof writeFormattedMessageToClient
>;

describe('AbilitiesCommand', () => {
  let abilitiesCommand: AbilitiesCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCooldownRemaining.mockReturnValue(0);
    mockCanUseAbility.mockReturnValue({ ok: true });
    mockGetAbilitiesBySourceClass.mockReturnValue(new Map());
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

    it('should show message when no abilities (adventurer class)', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser', classId: 'adventurer' }),
      });
      mockGetAbilitiesBySourceClass.mockReturnValue(new Map());

      abilitiesCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('no abilities')
      );
    });

    it('should display abilities header when class has abilities', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'testuser',
          classId: 'magic_user',
          mana: 50,
          maxMana: 100,
        }),
      });
      const abilities = [
        {
          id: 'fireball',
          name: 'Fireball',
          description: 'A ball of fire',
          mpCost: 10,
          type: AbilityType.STANDARD,
        },
      ];
      mockGetAbilitiesBySourceClass.mockReturnValue(new Map([['magic_user', abilities]]));
      mockCanUseAbility.mockReturnValue({ ok: true });

      abilitiesCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Your Abilities')
      );
    });

    it('should display ready ability', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser', classId: 'magic_user' }),
      });
      const abilities = [
        {
          id: 'fireball',
          name: 'Fireball',
          description: 'A ball of fire',
          mpCost: 10,
          type: AbilityType.STANDARD,
        },
      ];
      mockGetAbilitiesBySourceClass.mockReturnValue(new Map([['magic_user', abilities]]));
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
        user: createMockUser({ username: 'testuser', classId: 'magic_user' }),
      });
      const abilities = [
        {
          id: 'fireball',
          name: 'Fireball',
          description: 'A ball of fire',
          mpCost: 10,
          type: AbilityType.STANDARD,
        },
      ];
      mockGetAbilitiesBySourceClass.mockReturnValue(new Map([['magic_user', abilities]]));
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
        user: createMockUser({ username: 'testuser', classId: 'magic_user' }),
      });
      const abilities = [
        {
          id: 'fireball',
          name: 'Fireball',
          description: 'A ball of fire',
          mpCost: 10,
          type: AbilityType.STANDARD,
        },
      ];
      mockGetAbilitiesBySourceClass.mockReturnValue(new Map([['magic_user', abilities]]));
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
        user: createMockUser({ username: 'testuser', classId: 'magic_user' }),
      });
      const abilities = [
        {
          id: 'fireball',
          name: 'Fireball',
          description: 'A ball of fire',
          mpCost: 25,
          type: AbilityType.STANDARD,
        },
      ];
      mockGetAbilitiesBySourceClass.mockReturnValue(new Map([['magic_user', abilities]]));

      abilitiesCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('25 MP')
      );
    });

    it('should display multiple abilities', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser', classId: 'magic_user' }),
      });
      const abilities = [
        {
          id: 'fireball',
          name: 'Fireball',
          description: 'A ball of fire',
          mpCost: 10,
          type: AbilityType.STANDARD,
        },
        {
          id: 'frost_bolt',
          name: 'Frost Bolt',
          description: 'A bolt of frost',
          mpCost: 15,
          type: AbilityType.STANDARD,
        },
      ];
      mockGetAbilitiesBySourceClass.mockReturnValue(new Map([['magic_user', abilities]]));
      mockCanUseAbility.mockReturnValue({ ok: true });

      abilitiesCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Fireball')
      );
      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Frost Bolt')
      );
    });

    it('should show class section header for current class', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser', classId: 'magic_user' }),
      });
      const abilities = [
        {
          id: 'fireball',
          name: 'Fireball',
          description: 'A ball of fire',
          mpCost: 10,
          type: AbilityType.STANDARD,
        },
      ];
      mockGetAbilitiesBySourceClass.mockReturnValue(new Map([['magic_user', abilities]]));

      abilitiesCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Magic_user')
      );
    });

    it('should show inherited abilities with (Inherited) marker', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser', classId: 'wizard' }),
      });
      // Wizard inherits from magic_user, so it shows both
      const wizardAbilities = [
        {
          id: 'meteor_storm',
          name: 'Meteor Storm',
          description: 'Rains meteors',
          mpCost: 40,
          type: AbilityType.STANDARD,
        },
      ];
      const inheritedAbilities = [
        {
          id: 'fireball',
          name: 'Fireball',
          description: 'A ball of fire',
          mpCost: 10,
          type: AbilityType.STANDARD,
        },
      ];
      mockGetAbilitiesBySourceClass.mockReturnValue(
        new Map([
          ['wizard', wizardAbilities],
          ['magic_user', inheritedAbilities],
        ])
      );

      abilitiesCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Inherited')
      );
    });

    it('should filter out non-castable ability types (COMBAT, PROC, ITEM)', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser', classId: 'fighter' }),
      });
      // Only STANDARD and FINISHER types should be shown
      const abilities = [
        {
          id: 'bash',
          name: 'Bash',
          description: 'A powerful strike',
          mpCost: 0,
          type: AbilityType.STANDARD,
        },
        {
          id: 'auto_attack',
          name: 'Auto Attack',
          description: 'Combat auto ability',
          mpCost: 0,
          type: AbilityType.COMBAT,
        },
      ];
      mockGetAbilitiesBySourceClass.mockReturnValue(new Map([['fighter', abilities]]));

      abilitiesCommand.execute(client, '');

      // Should only show Bash, not Auto Attack
      const callArg = mockWriteFormattedMessageToClient.mock.calls[0][1];
      expect(callArg).toContain('Bash');
      expect(callArg).not.toContain('Auto Attack');
    });

    it('should display finisher abilities', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser', classId: 'thief' }),
      });
      const abilities = [
        {
          id: 'eviscerate',
          name: 'Eviscerate',
          description: 'A devastating finisher',
          resourceCost: { type: ResourceType.ENERGY, amount: 35 },
          type: AbilityType.FINISHER,
          comboPointsConsumed: true,
        },
      ];
      mockGetAbilitiesBySourceClass.mockReturnValue(new Map([['thief', abilities]]));

      abilitiesCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Eviscerate')
      );
      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Finisher')
      );
    });

    it('should display combo point generator indicator', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser', classId: 'thief' }),
      });
      const abilities = [
        {
          id: 'sinister_strike',
          name: 'Sinister Strike',
          description: 'A quick strike',
          resourceCost: { type: ResourceType.ENERGY, amount: 40 },
          type: AbilityType.STANDARD,
          comboPointsGenerated: 1,
        },
      ];
      mockGetAbilitiesBySourceClass.mockReturnValue(new Map([['thief', abilities]]));

      abilitiesCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('+1 CP')
      );
    });

    it('should display resource cost for non-mana abilities', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser', classId: 'thief' }),
      });
      const abilities = [
        {
          id: 'sinister_strike',
          name: 'Sinister Strike',
          description: 'A quick strike',
          resourceCost: { type: ResourceType.ENERGY, amount: 40 },
          type: AbilityType.STANDARD,
        },
      ];
      mockGetAbilitiesBySourceClass.mockReturnValue(new Map([['thief', abilities]]));

      abilitiesCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('40 EN')
      );
    });
  });
});
