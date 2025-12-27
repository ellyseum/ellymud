/**
 * Unit tests for EffectManager class
 * @module effects/effectManager.test
 */

import { EffectManager } from './effectManager';
import { EffectType, StackingBehavior } from '../types/effects';
import {
  createMockUserManager,
  createMockRoomManager,
  createMockClientWithUser,
} from '../test/helpers/mockFactories';
import { UserManager } from '../user/userManager';
import { RoomManager } from '../room/roomManager';

// Mock dependencies
jest.mock('../utils/logger', () => ({
  createMechanicsLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
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
}));

jest.mock('../utils/socketWriter', () => ({
  writeFormattedMessageToClient: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(() => JSON.stringify([])),
  writeFileSync: jest.fn(),
}));

// Mock CombatSystem
jest.mock('../combat/combatSystem', () => ({
  CombatSystem: {
    getInstance: jest.fn(() => ({
      findClientByUsername: jest.fn().mockReturnValue(null),
      breakCombat: jest.fn(),
      cleanupDeadEntity: jest.fn(),
    })),
    resetInstance: jest.fn(),
  },
}));

// Mock ItemManager
jest.mock('../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn(() => ({
      getItem: jest.fn(),
      getItemInstance: jest.fn(),
    })),
    resetInstance: jest.fn(),
  },
}));

// Mock npcDeathHandler
jest.mock('../combat/npcDeathHandler', () => ({
  handleNpcDrops: jest.fn().mockReturnValue([]),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

// Mock GameTimerManager
jest.mock('../timer/gameTimerManager', () => ({
  GameTimerManager: {
    getInstance: jest.fn(() => ({
      getTickCount: jest.fn().mockReturnValue(0),
    })),
    resetInstance: jest.fn(),
  },
}));

describe('EffectManager', () => {
  let effectManager: EffectManager;
  let mockUserManager: jest.Mocked<UserManager>;
  let mockRoomManager: jest.Mocked<RoomManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    EffectManager.resetInstance();

    mockUserManager = createMockUserManager() as jest.Mocked<UserManager>;
    mockRoomManager = createMockRoomManager() as jest.Mocked<RoomManager>;

    effectManager = EffectManager.getInstance(mockUserManager, mockRoomManager);
  });

  afterEach(() => {
    jest.useRealTimers();
    EffectManager.resetInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = EffectManager.getInstance(mockUserManager, mockRoomManager);
      const instance2 = EffectManager.getInstance(mockUserManager, mockRoomManager);

      expect(instance1).toBe(instance2);
    });

    it('should update managers when called with different managers', () => {
      const newUserManager = createMockUserManager() as jest.Mocked<UserManager>;

      EffectManager.getInstance(newUserManager, mockRoomManager);

      expect(effectManager).toBeDefined();
    });
  });

  describe('resetInstance', () => {
    it('should allow creating a new instance after reset', () => {
      const instance1 = EffectManager.getInstance(mockUserManager, mockRoomManager);

      EffectManager.resetInstance();

      const instance2 = EffectManager.getInstance(mockUserManager, mockRoomManager);

      expect(instance1).not.toBe(instance2);
    });

    it('should stop the real-time processor on reset', () => {
      // The processor is started in getInstance
      EffectManager.resetInstance();

      // A new instance should be able to be created without issues
      const newInstance = EffectManager.getInstance(mockUserManager, mockRoomManager);
      expect(newInstance).toBeDefined();
    });
  });

  describe('stopRealTimeProcessor', () => {
    it('should stop the interval timer', () => {
      effectManager.stopRealTimeProcessor();
      effectManager.stopRealTimeProcessor(); // Should not throw when called twice
    });
  });

  describe('addEffect', () => {
    it('should add an instant effect to a player', () => {
      const client = createMockClientWithUser({ username: 'testuser' });
      mockUserManager.getActiveUserSession.mockReturnValue(client);

      effectManager.addEffect('testuser', true, {
        type: EffectType.INSTANT_HEAL,
        name: 'Test Heal',
        description: 'A test heal effect',
        durationTicks: 0,
        tickInterval: 0,
        payload: { healAmount: 10 },
        targetId: 'testuser',
        isPlayerEffect: true,
        sourceId: 'source',
        isTimeBased: false,
      });

      // Instant effects are applied immediately but not stored
      const effects = effectManager.getEffectsForTarget('testuser', true);
      expect(effects.length).toBe(0); // Instant effects don't persist
    });

    it('should add a duration-based effect to a player', () => {
      const client = createMockClientWithUser({ username: 'testuser' });
      mockUserManager.getActiveUserSession.mockReturnValue(client);

      effectManager.addEffect('testuser', true, {
        type: EffectType.DAMAGE_OVER_TIME,
        name: 'Test DoT',
        description: 'A test damage over time effect',
        durationTicks: 5,
        tickInterval: 1,
        payload: { damagePerTick: 5 },
        targetId: 'testuser',
        isPlayerEffect: true,
        sourceId: 'source',
        isTimeBased: false,
      });

      const effects = effectManager.getEffectsForTarget('testuser', true);
      expect(effects.length).toBe(1);
      expect(effects[0].name).toBe('Test DoT');
    });

    it('should add an effect to an NPC', () => {
      effectManager.addEffect('npc-instance-1', false, {
        type: EffectType.DAMAGE_OVER_TIME,
        name: 'Poison',
        description: 'Deals poison damage',
        durationTicks: 3,
        tickInterval: 1,
        payload: { damagePerTick: 10 },
        targetId: 'npc-instance-1',
        isPlayerEffect: false,
        sourceId: 'player1',
        isTimeBased: false,
      });

      const effects = effectManager.getEffectsForTarget('npc-instance-1', false);
      expect(effects.length).toBe(1);
    });

    it('should handle REFRESH stacking behavior', () => {
      const client = createMockClientWithUser({ username: 'testuser' });
      mockUserManager.getActiveUserSession.mockReturnValue(client);

      // Add first effect
      effectManager.addEffect('testuser', true, {
        type: EffectType.DAMAGE_OVER_TIME,
        name: 'Effect 1',
        description: 'First effect',
        durationTicks: 5,
        tickInterval: 1,
        payload: { damagePerTick: 5 },
        targetId: 'testuser',
        isPlayerEffect: true,
        sourceId: 'source',
        stackingBehavior: StackingBehavior.REFRESH,
        isTimeBased: false,
      });

      // Add second effect of same type - should replace
      effectManager.addEffect('testuser', true, {
        type: EffectType.DAMAGE_OVER_TIME,
        name: 'Effect 2',
        description: 'Second effect',
        durationTicks: 10,
        tickInterval: 1,
        payload: { damagePerTick: 10 },
        targetId: 'testuser',
        isPlayerEffect: true,
        sourceId: 'source',
        stackingBehavior: StackingBehavior.REFRESH,
        isTimeBased: false,
      });

      const effects = effectManager.getEffectsForTarget('testuser', true);
      expect(effects.length).toBe(1);
      expect(effects[0].name).toBe('Effect 2');
    });

    it('should handle STACK_INTENSITY stacking behavior', () => {
      const client = createMockClientWithUser({ username: 'testuser' });
      mockUserManager.getActiveUserSession.mockReturnValue(client);

      // Add first effect
      effectManager.addEffect('testuser', true, {
        type: EffectType.DAMAGE_OVER_TIME,
        name: 'Stacking Effect 1',
        description: 'First stacking effect',
        durationTicks: 5,
        tickInterval: 1,
        payload: { damagePerTick: 5 },
        targetId: 'testuser',
        isPlayerEffect: true,
        sourceId: 'source',
        stackingBehavior: StackingBehavior.STACK_INTENSITY,
        isTimeBased: false,
      });

      // Add second effect - should stack
      effectManager.addEffect('testuser', true, {
        type: EffectType.DAMAGE_OVER_TIME,
        name: 'Stacking Effect 2',
        description: 'Second stacking effect',
        durationTicks: 5,
        tickInterval: 1,
        payload: { damagePerTick: 5 },
        targetId: 'testuser',
        isPlayerEffect: true,
        sourceId: 'source',
        stackingBehavior: StackingBehavior.STACK_INTENSITY,
        isTimeBased: false,
      });

      const effects = effectManager.getEffectsForTarget('testuser', true);
      expect(effects.length).toBe(2);
    });

    it('should handle IGNORE stacking behavior', () => {
      const client = createMockClientWithUser({ username: 'testuser' });
      mockUserManager.getActiveUserSession.mockReturnValue(client);

      // Add first effect
      effectManager.addEffect('testuser', true, {
        type: EffectType.DAMAGE_OVER_TIME,
        name: 'First',
        description: 'First effect',
        durationTicks: 5,
        tickInterval: 1,
        payload: { damagePerTick: 5 },
        targetId: 'testuser',
        isPlayerEffect: true,
        sourceId: 'source',
        stackingBehavior: StackingBehavior.IGNORE,
        isTimeBased: false,
      });

      // Add second effect - should be ignored
      effectManager.addEffect('testuser', true, {
        type: EffectType.DAMAGE_OVER_TIME,
        name: 'Second',
        description: 'Second effect - should be ignored',
        durationTicks: 10,
        tickInterval: 1,
        payload: { damagePerTick: 10 },
        targetId: 'testuser',
        isPlayerEffect: true,
        sourceId: 'source',
        stackingBehavior: StackingBehavior.IGNORE,
        isTimeBased: false,
      });

      const effects = effectManager.getEffectsForTarget('testuser', true);
      expect(effects.length).toBe(1);
      expect(effects[0].name).toBe('First');
    });
  });

  describe('removeEffect', () => {
    it('should remove an effect by id', () => {
      const client = createMockClientWithUser({ username: 'testuser' });
      mockUserManager.getActiveUserSession.mockReturnValue(client);

      effectManager.addEffect('testuser', true, {
        type: EffectType.DAMAGE_OVER_TIME,
        name: 'Test',
        description: 'Test effect',
        durationTicks: 5,
        tickInterval: 1,
        payload: { damagePerTick: 5 },
        targetId: 'testuser',
        isPlayerEffect: true,
        sourceId: 'source',
        isTimeBased: false,
      });

      const effects = effectManager.getEffectsForTarget('testuser', true);
      expect(effects.length).toBe(1);

      effectManager.removeEffect(effects[0].id);

      const remainingEffects = effectManager.getEffectsForTarget('testuser', true);
      expect(remainingEffects.length).toBe(0);
    });

    it('should remove an NPC effect by id', () => {
      effectManager.addEffect('npc-1', false, {
        type: EffectType.DAMAGE_OVER_TIME,
        name: 'NPC Effect',
        description: 'Test NPC effect',
        durationTicks: 5,
        tickInterval: 1,
        payload: { damagePerTick: 5 },
        targetId: 'npc-1',
        isPlayerEffect: false,
        sourceId: 'player1',
        isTimeBased: false,
      });

      const effects = effectManager.getEffectsForTarget('npc-1', false);
      expect(effects.length).toBe(1);

      effectManager.removeEffect(effects[0].id);

      const remainingEffects = effectManager.getEffectsForTarget('npc-1', false);
      expect(remainingEffects.length).toBe(0);
    });

    it('should handle removing non-existent effect', () => {
      // Should not throw
      effectManager.removeEffect('non-existent-id');
    });
  });

  describe('getEffectsForTarget', () => {
    it('should return empty array for target with no effects', () => {
      const effects = effectManager.getEffectsForTarget('unknown', true);
      expect(effects).toEqual([]);
    });

    it('should return player effects', () => {
      const client = createMockClientWithUser({ username: 'player1' });
      mockUserManager.getActiveUserSession.mockReturnValue(client);

      effectManager.addEffect('player1', true, {
        type: EffectType.DAMAGE_OVER_TIME,
        name: 'Player Effect',
        description: 'Test',
        durationTicks: 5,
        tickInterval: 1,
        payload: { damagePerTick: 5 },
        targetId: 'player1',
        isPlayerEffect: true,
        sourceId: 'source',
        isTimeBased: false,
      });

      const effects = effectManager.getEffectsForTarget('player1', true);
      expect(effects.length).toBe(1);
    });

    it('should return NPC effects', () => {
      effectManager.addEffect('npc-1', false, {
        type: EffectType.DAMAGE_OVER_TIME,
        name: 'NPC Effect',
        description: 'Test',
        durationTicks: 5,
        tickInterval: 1,
        payload: { damagePerTick: 5 },
        targetId: 'npc-1',
        isPlayerEffect: false,
        sourceId: 'player1',
        isTimeBased: false,
      });

      const effects = effectManager.getEffectsForTarget('npc-1', false);
      expect(effects.length).toBe(1);
    });
  });

  describe('getStatModifiers', () => {
    it('should return empty object for target with no effects', () => {
      const modifiers = effectManager.getStatModifiers('unknown', true);
      expect(modifiers).toEqual({});
    });

    it('should combine stat modifiers from multiple effects', () => {
      const client = createMockClientWithUser({ username: 'player1' });
      mockUserManager.getActiveUserSession.mockReturnValue(client);

      effectManager.addEffect('player1', true, {
        type: EffectType.STRENGTH_BUFF,
        name: 'Strength Buff',
        description: 'Increases strength',
        durationTicks: 5,
        tickInterval: 1,
        payload: { statModifiers: { strength: 5, dexterity: 2 } },
        targetId: 'player1',
        isPlayerEffect: true,
        sourceId: 'source',
        isTimeBased: false,
      });

      effectManager.addEffect('player1', true, {
        type: EffectType.DAMAGE_OVER_TIME,
        name: 'Weakness',
        description: 'Decreases strength',
        durationTicks: 5,
        tickInterval: 1,
        payload: { statModifiers: { strength: -3 } },
        targetId: 'player1',
        isPlayerEffect: true,
        sourceId: 'source',
        stackingBehavior: StackingBehavior.STACK_INTENSITY,
        isTimeBased: false,
      });

      const modifiers = effectManager.getStatModifiers('player1', true);
      expect(modifiers.strength).toBe(2); // 5 + (-3) = 2
      expect(modifiers.dexterity).toBe(2);
    });
  });

  describe('isActionBlocked', () => {
    it('should return false when no effects block the action', () => {
      expect(effectManager.isActionBlocked('player1', true, 'movement')).toBe(false);
      expect(effectManager.isActionBlocked('player1', true, 'combat')).toBe(false);
    });

    it('should return true when movement is blocked', () => {
      const client = createMockClientWithUser({ username: 'player1' });
      mockUserManager.getActiveUserSession.mockReturnValue(client);

      effectManager.addEffect('player1', true, {
        type: EffectType.STUN,
        name: 'Stun',
        description: 'Stunned',
        durationTicks: 5,
        tickInterval: 1,
        payload: { blockMovement: true },
        targetId: 'player1',
        isPlayerEffect: true,
        sourceId: 'source',
        isTimeBased: false,
      });

      expect(effectManager.isActionBlocked('player1', true, 'movement')).toBe(true);
    });

    it('should return true when combat is blocked', () => {
      const client = createMockClientWithUser({ username: 'player1' });
      mockUserManager.getActiveUserSession.mockReturnValue(client);

      effectManager.addEffect('player1', true, {
        type: EffectType.STUN,
        name: 'Fear',
        description: 'Feared',
        durationTicks: 5,
        tickInterval: 1,
        payload: { blockCombat: true },
        targetId: 'player1',
        isPlayerEffect: true,
        sourceId: 'source',
        isTimeBased: false,
      });

      expect(effectManager.isActionBlocked('player1', true, 'combat')).toBe(true);
    });
  });

  describe('processGameTick', () => {
    it('should decrement remaining ticks on effects', () => {
      const client = createMockClientWithUser({ username: 'player1' });
      mockUserManager.getActiveUserSession.mockReturnValue(client);

      effectManager.addEffect('player1', true, {
        type: EffectType.DAMAGE_OVER_TIME,
        name: 'DoT',
        description: 'Test',
        durationTicks: 5,
        tickInterval: 1,
        payload: { damagePerTick: 5 },
        targetId: 'player1',
        isPlayerEffect: true,
        sourceId: 'source',
        isTimeBased: false,
      });

      const initialEffects = effectManager.getEffectsForTarget('player1', true);
      expect(initialEffects[0].remainingTicks).toBe(5);

      effectManager.processGameTick(1);

      const afterTickEffects = effectManager.getEffectsForTarget('player1', true);
      expect(afterTickEffects[0].remainingTicks).toBe(4);
    });

    it('should remove expired effects', () => {
      const client = createMockClientWithUser({ username: 'player1' });
      mockUserManager.getActiveUserSession.mockReturnValue(client);

      effectManager.addEffect('player1', true, {
        type: EffectType.DAMAGE_OVER_TIME,
        name: 'Short DoT',
        description: 'Test',
        durationTicks: 1,
        tickInterval: 1,
        payload: { damagePerTick: 5 },
        targetId: 'player1',
        isPlayerEffect: true,
        sourceId: 'source',
        isTimeBased: false,
      });

      effectManager.processGameTick(1);

      const effects = effectManager.getEffectsForTarget('player1', true);
      expect(effects.length).toBe(0);
    });
  });

  describe('events', () => {
    it('should emit effectAdded event when effect is added', (done) => {
      const client = createMockClientWithUser({ username: 'player1' });
      mockUserManager.getActiveUserSession.mockReturnValue(client);

      effectManager.on('effectAdded', (data) => {
        expect(data.targetId).toBe('player1');
        expect(data.isPlayer).toBe(true);
        expect(data.effect.name).toBe('Test Effect');
        done();
      });

      effectManager.addEffect('player1', true, {
        type: EffectType.DAMAGE_OVER_TIME,
        name: 'Test Effect',
        description: 'Test',
        durationTicks: 5,
        tickInterval: 1,
        payload: { damagePerTick: 5 },
        targetId: 'player1',
        isPlayerEffect: true,
        sourceId: 'source',
        isTimeBased: false,
      });
    });

    it('should emit effectRemoved event when effect is removed', (done) => {
      const client = createMockClientWithUser({ username: 'player1' });
      mockUserManager.getActiveUserSession.mockReturnValue(client);

      effectManager.on('effectRemoved', (data) => {
        expect(data.targetId).toBe('player1');
        expect(data.isPlayer).toBe(true);
        done();
      });

      effectManager.addEffect('player1', true, {
        type: EffectType.DAMAGE_OVER_TIME,
        name: 'Test',
        description: 'Test',
        durationTicks: 5,
        tickInterval: 1,
        payload: { damagePerTick: 5 },
        targetId: 'player1',
        isPlayerEffect: true,
        sourceId: 'source',
        isTimeBased: false,
      });

      const effects = effectManager.getEffectsForTarget('player1', true);
      effectManager.removeEffect(effects[0].id);
    });
  });
});
