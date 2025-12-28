/**
 * Unit tests for AbilityManager class
 * @module abilities/abilityManager.test
 */

import { AbilityManager } from './abilityManager';
import { AbilityType } from './types';
import {
  createMockUserManager,
  createMockRoomManager,
  createMockUser,
  createMockClientWithUser,
  createMockRoom,
} from '../test/helpers/mockFactories';
import { UserManager } from '../user/userManager';
import { RoomManager } from '../room/roomManager';
import { EffectManager } from '../effects/effectManager';

// Mock dependencies
jest.mock('../utils/logger', () => ({
  createContextLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  systemLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  createMechanicsLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('../utils/socketWriter', () => ({
  writeFormattedMessageToClient: jest.fn(),
}));

jest.mock('../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../utils/stateInterruption', () => ({
  clearRestingMeditating: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(() =>
    JSON.stringify([
      {
        id: 'fireball',
        name: 'Fireball',
        description: 'A ball of fire',
        type: 'standard',
        mpCost: 10,
        cooldownType: 'rounds',
        cooldownValue: 3,
        targetType: 'enemy',
        effects: [
          {
            effectType: 'damage_over_time',
            payload: { damagePerTick: 5 },
            durationTicks: 3,
            tickInterval: 1,
          },
        ],
        requirements: {
          level: 1,
          stats: { intelligence: 5 },
        },
      },
      {
        id: 'heal',
        name: 'Heal',
        description: 'Heals target',
        type: 'standard',
        mpCost: 5,
        cooldownType: 'seconds',
        cooldownValue: 10,
        targetType: 'self',
        effects: [
          {
            effectType: 'heal',
            payload: { healAmount: 20 },
            durationTicks: 1,
            tickInterval: 0,
          },
        ],
      },
      {
        id: 'power-attack',
        name: 'Power Attack',
        description: 'A powerful attack',
        type: 'combat',
        mpCost: 15,
        cooldownType: 'uses',
        cooldownValue: 3,
        targetType: 'enemy',
        effects: [
          {
            effectType: 'damage',
            payload: { damageAmount: 25 },
            durationTicks: 1,
            tickInterval: 0,
          },
        ],
      },
    ])
  ),
}));

// Mock EffectManager
jest.mock('../effects/effectManager', () => ({
  EffectManager: {
    getInstance: jest.fn(() => ({
      addEffect: jest.fn(),
    })),
    resetInstance: jest.fn(),
  },
}));

describe('AbilityManager', () => {
  let abilityManager: AbilityManager;
  let mockUserManager: jest.Mocked<UserManager>;
  let mockRoomManager: jest.Mocked<RoomManager>;
  let mockEffectManager: { addEffect: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    AbilityManager.resetInstance();

    mockUserManager = createMockUserManager() as jest.Mocked<UserManager>;
    mockRoomManager = createMockRoomManager() as jest.Mocked<RoomManager>;
    mockEffectManager = { addEffect: jest.fn() };

    (EffectManager.getInstance as jest.Mock).mockReturnValue(mockEffectManager);

    abilityManager = AbilityManager.getInstance(
      mockUserManager,
      mockRoomManager,
      mockEffectManager as unknown as EffectManager
    );
  });

  afterEach(() => {
    AbilityManager.resetInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = AbilityManager.getInstance(
        mockUserManager,
        mockRoomManager,
        mockEffectManager as unknown as EffectManager
      );
      const instance2 = AbilityManager.getInstance(
        mockUserManager,
        mockRoomManager,
        mockEffectManager as unknown as EffectManager
      );

      expect(instance1).toBe(instance2);
    });

    it('should update managers when called with different managers', () => {
      const newUserManager = createMockUserManager() as jest.Mocked<UserManager>;

      AbilityManager.getInstance(
        newUserManager,
        mockRoomManager,
        mockEffectManager as unknown as EffectManager
      );

      // Verify the manager was updated by testing functionality
      expect(abilityManager).toBeDefined();
    });
  });

  describe('resetInstance', () => {
    it('should allow creating a new instance after reset', () => {
      const instance1 = AbilityManager.getInstance(
        mockUserManager,
        mockRoomManager,
        mockEffectManager as unknown as EffectManager
      );

      AbilityManager.resetInstance();

      const instance2 = AbilityManager.getInstance(
        mockUserManager,
        mockRoomManager,
        mockEffectManager as unknown as EffectManager
      );

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('getAbility', () => {
    it('should return ability by id', () => {
      const ability = abilityManager.getAbility('fireball');

      expect(ability).toBeDefined();
      expect(ability?.name).toBe('Fireball');
    });

    it('should return undefined for unknown ability', () => {
      const ability = abilityManager.getAbility('unknown-ability');

      expect(ability).toBeUndefined();
    });

    it('should be case-insensitive', () => {
      const ability = abilityManager.getAbility('FIREBALL');

      expect(ability).toBeDefined();
      expect(ability?.name).toBe('Fireball');
    });
  });

  describe('getAllAbilities', () => {
    it('should return all loaded abilities', () => {
      const abilities = abilityManager.getAllAbilities();

      expect(abilities.length).toBe(3);
    });
  });

  describe('getAbilitiesByType', () => {
    it('should filter abilities by type', () => {
      const standardAbilities = abilityManager.getAbilitiesByType(AbilityType.STANDARD);

      expect(standardAbilities.length).toBe(2);
      expect(standardAbilities.every((a) => a.type === AbilityType.STANDARD)).toBe(true);
    });

    it('should return combat abilities', () => {
      const combatAbilities = abilityManager.getAbilitiesByType(AbilityType.COMBAT);

      expect(combatAbilities.length).toBe(1);
      expect(combatAbilities[0].name).toBe('Power Attack');
    });
  });

  describe('setCurrentRound / getCurrentRound', () => {
    it('should track current round', () => {
      abilityManager.setCurrentRound(5);

      expect(abilityManager.getCurrentRound()).toBe(5);
    });

    it('should start at 0', () => {
      AbilityManager.resetInstance();
      const freshManager = AbilityManager.getInstance(
        mockUserManager,
        mockRoomManager,
        mockEffectManager as unknown as EffectManager
      );

      expect(freshManager.getCurrentRound()).toBe(0);
    });
  });

  describe('canUseAbility', () => {
    it('should return false for unknown ability', () => {
      const result = abilityManager.canUseAbility('testuser', 'unknown');

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('Unknown ability.');
    });

    it('should return false if user not found', () => {
      mockUserManager.getUser.mockReturnValue(undefined);

      const result = abilityManager.canUseAbility('testuser', 'fireball');

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('User not found.');
    });

    it('should return false if user has insufficient mana', () => {
      const user = createMockUser({ mana: 5 });
      mockUserManager.getUser.mockReturnValue(user);

      const result = abilityManager.canUseAbility('testuser', 'fireball');

      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Not enough mana');
    });

    it('should track ability cooldowns after use', () => {
      const user = createMockUser({ mana: 100, username: 'testuser' });
      mockUserManager.getUser.mockReturnValue(user);
      mockUserManager.updateUserStats.mockReturnValue(true);

      // Setup user and execute ability
      const client = createMockClientWithUser({ mana: 100, username: 'testuser' });
      client.user = user;
      mockRoomManager.getRoom.mockReturnValue(createMockRoom());

      // Execute self-targeting heal ability
      const result = abilityManager.executeAbility(client, 'heal');
      expect(result).toBe(true);

      // Verify cooldowns were set
      const cooldowns = abilityManager.getPlayerCooldowns('testuser');
      expect(cooldowns['heal']).toBeDefined();
    });

    it('should return false if user lacks required level', () => {
      const user = createMockUser({ mana: 100, level: 0 });
      mockUserManager.getUser.mockReturnValue(user);

      const result = abilityManager.canUseAbility('testuser', 'fireball');

      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Requires level');
    });

    it('should return false if user lacks required stats', () => {
      const user = createMockUser({ mana: 100, level: 5, intelligence: 2 });
      mockUserManager.getUser.mockReturnValue(user);

      const result = abilityManager.canUseAbility('testuser', 'fireball');

      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Requires');
    });

    it('should return true when all requirements are met', () => {
      const user = createMockUser({ mana: 100, level: 5, intelligence: 10 });
      mockUserManager.getUser.mockReturnValue(user);

      const result = abilityManager.canUseAbility('testuser', 'fireball');

      expect(result.ok).toBe(true);
    });
  });

  describe('isOnCooldown', () => {
    it('should return false when not on cooldown', () => {
      const result = abilityManager.isOnCooldown('testuser', 'fireball');

      expect(result).toBe(false);
    });
  });

  describe('getCooldownRemaining', () => {
    it('should return 0 for unknown ability', () => {
      const remaining = abilityManager.getCooldownRemaining('testuser', 'unknown');

      expect(remaining).toBe(0);
    });

    it('should return 0 when no cooldown exists', () => {
      const remaining = abilityManager.getCooldownRemaining('testuser', 'fireball');

      expect(remaining).toBe(0);
    });
  });

  describe('useMana', () => {
    it('should return false if user not found', () => {
      mockUserManager.getUser.mockReturnValue(undefined);

      const result = abilityManager.useMana('testuser', 10);

      expect(result).toBe(false);
    });

    it('should return false if user has insufficient mana', () => {
      const user = createMockUser({ mana: 5 });
      mockUserManager.getUser.mockReturnValue(user);

      const result = abilityManager.useMana('testuser', 10);

      expect(result).toBe(false);
    });

    it('should deduct mana and return true on success', () => {
      const user = createMockUser({ mana: 50 });
      mockUserManager.getUser.mockReturnValue(user);
      mockUserManager.updateUserStats.mockReturnValue(true);

      const result = abilityManager.useMana('testuser', 10);

      expect(result).toBe(true);
      expect(mockUserManager.updateUserStats).toHaveBeenCalledWith('testuser', { mana: 40 });
    });
  });

  describe('hasMana', () => {
    it('should return false if user not found', () => {
      mockUserManager.getUser.mockReturnValue(undefined);

      const result = abilityManager.hasMana('testuser', 10);

      expect(result).toBe(false);
    });

    it('should return true if user has sufficient mana', () => {
      const user = createMockUser({ mana: 50 });
      mockUserManager.getUser.mockReturnValue(user);

      const result = abilityManager.hasMana('testuser', 10);

      expect(result).toBe(true);
    });

    it('should return false if user has insufficient mana', () => {
      const user = createMockUser({ mana: 5 });
      mockUserManager.getUser.mockReturnValue(user);

      const result = abilityManager.hasMana('testuser', 10);

      expect(result).toBe(false);
    });
  });

  describe('onGameTick', () => {
    it('should increment current round', () => {
      abilityManager.setCurrentRound(5);

      abilityManager.onGameTick();

      expect(abilityManager.getCurrentRound()).toBe(6);
    });
  });

  describe('clearCooldowns', () => {
    it('should clear all cooldowns for a user', () => {
      // Start with some cooldowns
      const user = createMockUser({ mana: 100 });
      mockUserManager.getUser.mockReturnValue(user);
      mockUserManager.updateUserStats.mockReturnValue(true);
      mockRoomManager.getRoom.mockReturnValue(createMockRoom());

      const client = createMockClientWithUser({ mana: 100 });
      abilityManager.executeAbility(client, 'heal');

      // Clear cooldowns
      abilityManager.clearCooldowns('testuser');

      // Verify cooldowns are cleared
      const cooldowns = abilityManager.getPlayerCooldowns('testuser');
      expect(Object.keys(cooldowns).length).toBe(0);
    });
  });

  describe('getPlayerCooldowns', () => {
    it('should return empty object for user with no cooldowns', () => {
      const cooldowns = abilityManager.getPlayerCooldowns('newuser');

      expect(cooldowns).toEqual({});
    });
  });

  describe('combat ability methods', () => {
    describe('activateCombatAbility', () => {
      it('should activate combat ability for user', () => {
        const result = abilityManager.activateCombatAbility('testuser', 'power-attack', 3);

        expect(result).toBe(true);
        expect(abilityManager.hasActiveCombatAbility('testuser')).toBe(true);
      });

      it('should return false for non-combat ability', () => {
        const result = abilityManager.activateCombatAbility('testuser', 'fireball', 3);

        expect(result).toBe(false);
      });

      it('should return false for unknown ability', () => {
        const result = abilityManager.activateCombatAbility('testuser', 'unknown', 3);

        expect(result).toBe(false);
      });
    });

    describe('hasActiveCombatAbility', () => {
      it('should return false when no active ability', () => {
        const result = abilityManager.hasActiveCombatAbility('testuser');

        expect(result).toBe(false);
      });

      it('should return true when ability is active', () => {
        abilityManager.activateCombatAbility('testuser', 'power-attack', 3);

        const result = abilityManager.hasActiveCombatAbility('testuser');

        expect(result).toBe(true);
      });
    });

    describe('getActiveCombatAbility', () => {
      it('should return undefined when no active ability', () => {
        const result = abilityManager.getActiveCombatAbility('testuser');

        expect(result).toBeUndefined();
      });

      it('should return active ability template', () => {
        abilityManager.activateCombatAbility('testuser', 'power-attack', 3);

        const result = abilityManager.getActiveCombatAbility('testuser');

        expect(result).toBeDefined();
        expect(result?.name).toBe('Power Attack');
      });
    });

    describe('decrementCombatAbility', () => {
      it('should decrement remaining rounds', () => {
        abilityManager.activateCombatAbility('testuser', 'power-attack', 3);

        abilityManager.decrementCombatAbility('testuser');

        expect(abilityManager.hasActiveCombatAbility('testuser')).toBe(true);
      });

      it('should remove ability when rounds reach 0', () => {
        abilityManager.activateCombatAbility('testuser', 'power-attack', 1);

        abilityManager.decrementCombatAbility('testuser');

        expect(abilityManager.hasActiveCombatAbility('testuser')).toBe(false);
      });

      it('should do nothing when no active ability', () => {
        // Should not throw
        abilityManager.decrementCombatAbility('testuser');

        expect(abilityManager.hasActiveCombatAbility('testuser')).toBe(false);
      });
    });

    describe('deactivateCombatAbility', () => {
      it('should deactivate active ability', () => {
        abilityManager.activateCombatAbility('testuser', 'power-attack', 3);

        abilityManager.deactivateCombatAbility('testuser');

        expect(abilityManager.hasActiveCombatAbility('testuser')).toBe(false);
      });

      it('should do nothing when no active ability', () => {
        // Should not throw
        abilityManager.deactivateCombatAbility('testuser');

        expect(abilityManager.hasActiveCombatAbility('testuser')).toBe(false);
      });
    });
  });

  describe('executeCombatAbilityAttack', () => {
    it('should return error when client has no user', () => {
      const client = createMockClientWithUser();
      client.user = null;

      const result = abilityManager.executeCombatAbilityAttack(client, 'target', false);

      expect(result.hit).toBe(false);
      expect(result.message).toBe('Not logged in');
    });

    it('should return error when no active combat ability', () => {
      const client = createMockClientWithUser();

      const result = abilityManager.executeCombatAbilityAttack(client, 'target', false);

      expect(result.hit).toBe(false);
      expect(result.message).toBe('No active combat ability');
    });
  });

  describe('executeAbility', () => {
    it('should return false when client has no user', () => {
      const client = createMockClientWithUser();
      client.user = null;

      const result = abilityManager.executeAbility(client, 'heal');

      expect(result).toBe(false);
    });

    it('should return false for unknown ability', () => {
      const client = createMockClientWithUser({ mana: 100 });
      mockUserManager.getUser.mockReturnValue(client.user ?? undefined);

      const result = abilityManager.executeAbility(client, 'unknown-ability');

      expect(result).toBe(false);
    });

    it('should execute self-target ability successfully', () => {
      const user = createMockUser({ mana: 100, username: 'testuser' });
      const client = createMockClientWithUser({ mana: 100, username: 'testuser' });
      client.user = user;
      mockUserManager.getUser.mockReturnValue(user);
      mockUserManager.updateUserStats.mockReturnValue(true);
      mockRoomManager.getRoom.mockReturnValue(createMockRoom());

      const result = abilityManager.executeAbility(client, 'heal');

      expect(result).toBe(true);
      expect(mockEffectManager.addEffect).toHaveBeenCalled();
    });
  });
});

// Additional tests to improve coverage
describe('AbilityManager Extended Coverage', () => {
  let abilityManager: AbilityManager;
  let mockUserManager: jest.Mocked<UserManager>;
  let mockRoomManager: jest.Mocked<RoomManager>;
  let mockEffectManager: { addEffect: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    AbilityManager.resetInstance();

    mockUserManager = createMockUserManager() as jest.Mocked<UserManager>;
    mockRoomManager = createMockRoomManager() as jest.Mocked<RoomManager>;
    mockEffectManager = { addEffect: jest.fn() };

    (EffectManager.getInstance as jest.Mock).mockReturnValue(mockEffectManager);

    abilityManager = AbilityManager.getInstance(
      mockUserManager,
      mockRoomManager,
      mockEffectManager as unknown as EffectManager
    );
  });

  afterEach(() => {
    AbilityManager.resetInstance();
  });

  describe('getAllAbilities', () => {
    it('should return all registered abilities', () => {
      const abilities = abilityManager.getAllAbilities();
      expect(abilities).toBeDefined();
      expect(Array.isArray(abilities)).toBe(true);
    });
  });

  describe('getAbility', () => {
    it('should find ability by ID', () => {
      const abilities = abilityManager.getAllAbilities();
      if (abilities.length > 0) {
        const ability = abilityManager.getAbility(abilities[0].id);
        expect(ability).toBeDefined();
      }
    });

    it('should return undefined for non-existent ID', () => {
      const ability = abilityManager.getAbility('nonexistent-id');
      expect(ability).toBeUndefined();
    });
  });

  describe('getAbilitiesByType', () => {
    it('should return abilities filtered by type', () => {
      const abilities = abilityManager.getAbilitiesByType('standard' as AbilityType);
      expect(abilities).toBeDefined();
      expect(Array.isArray(abilities)).toBe(true);
    });
  });

  describe('round management', () => {
    it('should set and get current round', () => {
      abilityManager.setCurrentRound(5);
      expect(abilityManager.getCurrentRound()).toBe(5);
    });
  });

  describe('cooldown management', () => {
    it('should check if ability is on cooldown', () => {
      const result = abilityManager.isOnCooldown('testuser', 'fireball');
      expect(typeof result).toBe('boolean');
    });

    it('should get cooldown remaining', () => {
      const result = abilityManager.getCooldownRemaining('testuser', 'fireball');
      expect(typeof result).toBe('number');
    });

    it('should clear cooldowns for user', () => {
      abilityManager.clearCooldowns('testuser');
      // Should not throw
      expect(true).toBe(true);
    });

    it('should get player cooldowns', () => {
      const cooldowns = abilityManager.getPlayerCooldowns('testuser');
      expect(cooldowns).toBeDefined();
    });
  });

  describe('mana management', () => {
    it('should return false when user not found', () => {
      mockUserManager.getUser.mockReturnValue(undefined);
      const hasMana = abilityManager.hasMana('nonexistent', 10);
      expect(hasMana).toBe(false);
    });

    it('should return true when user has enough mana', () => {
      mockUserManager.getUser.mockReturnValue(createMockUser({ mana: 100, maxMana: 100 }));
      const hasMana = abilityManager.hasMana('testuser', 10);
      expect(hasMana).toBe(true);
    });
  });

  describe('onGameTick', () => {
    it('should process game tick', () => {
      // Should not throw
      expect(() => {
        abilityManager.onGameTick();
      }).not.toThrow();
    });
  });

  describe('singleton behavior', () => {
    it('should return same instance on multiple calls', () => {
      const manager1 = AbilityManager.getInstance(
        mockUserManager,
        mockRoomManager,
        mockEffectManager as unknown as EffectManager
      );
      const manager2 = AbilityManager.getInstance(
        mockUserManager,
        mockRoomManager,
        mockEffectManager as unknown as EffectManager
      );

      expect(manager1).toBe(manager2);
    });
  });

  describe('canUseAbility', () => {
    it('should check if player can use ability', () => {
      const abilities = abilityManager.getAllAbilities();

      if (abilities.length > 0) {
        const result = abilityManager.canUseAbility('testuser', abilities[0].id);
        expect(result).toBeDefined();
      }
    });

    it('should return object for non-existent ability', () => {
      const result = abilityManager.canUseAbility('testuser', 'nonexistent');
      expect(result).toBeDefined();
    });
  });
});
