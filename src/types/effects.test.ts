/**
 * Unit tests for effects types
 * @module types/effects.test
 */

import {
  EffectType,
  StackingBehavior,
  effectStackingRules,
  EffectPayload,
  ActiveEffect,
} from './effects';

describe('EffectType enum', () => {
  it('should have POISON type', () => {
    expect(EffectType.POISON).toBe('poison');
  });

  it('should have REGEN type', () => {
    expect(EffectType.REGEN).toBe('regen');
  });

  it('should have STUN type', () => {
    expect(EffectType.STUN).toBe('stun');
  });

  it('should have STRENGTH_BUFF type', () => {
    expect(EffectType.STRENGTH_BUFF).toBe('strength_buff');
  });

  it('should have AGILITY_BUFF type', () => {
    expect(EffectType.AGILITY_BUFF).toBe('agility_buff');
  });

  it('should have DEFENSE_BUFF type', () => {
    expect(EffectType.DEFENSE_BUFF).toBe('defense_buff');
  });

  it('should have ATTACK_BUFF type', () => {
    expect(EffectType.ATTACK_BUFF).toBe('attack_buff');
  });

  it('should have DAMAGE_OVER_TIME type', () => {
    expect(EffectType.DAMAGE_OVER_TIME).toBe('damage_over_time');
  });

  it('should have HEAL_OVER_TIME type', () => {
    expect(EffectType.HEAL_OVER_TIME).toBe('heal_over_time');
  });

  it('should have MOVEMENT_BLOCK type', () => {
    expect(EffectType.MOVEMENT_BLOCK).toBe('movement_block');
  });

  it('should have INSTANT_DAMAGE type', () => {
    expect(EffectType.INSTANT_DAMAGE).toBe('instant_damage');
  });

  it('should have INSTANT_HEAL type', () => {
    expect(EffectType.INSTANT_HEAL).toBe('instant_heal');
  });
});

describe('StackingBehavior enum', () => {
  it('should have REPLACE behavior', () => {
    expect(StackingBehavior.REPLACE).toBe(0);
  });

  it('should have REFRESH behavior', () => {
    expect(StackingBehavior.REFRESH).toBe(1);
  });

  it('should have STACK_DURATION behavior', () => {
    expect(StackingBehavior.STACK_DURATION).toBe(2);
  });

  it('should have STACK_INTENSITY behavior', () => {
    expect(StackingBehavior.STACK_INTENSITY).toBe(3);
  });

  it('should have STRONGEST_WINS behavior', () => {
    expect(StackingBehavior.STRONGEST_WINS).toBe(4);
  });

  it('should have IGNORE behavior', () => {
    expect(StackingBehavior.IGNORE).toBe(5);
  });
});

describe('effectStackingRules', () => {
  it('should have REFRESH for POISON', () => {
    expect(effectStackingRules[EffectType.POISON]).toBe(StackingBehavior.REFRESH);
  });

  it('should have REFRESH for REGEN', () => {
    expect(effectStackingRules[EffectType.REGEN]).toBe(StackingBehavior.REFRESH);
  });

  it('should have REFRESH for STUN', () => {
    expect(effectStackingRules[EffectType.STUN]).toBe(StackingBehavior.REFRESH);
  });

  it('should have STACK_INTENSITY for DAMAGE_OVER_TIME', () => {
    expect(effectStackingRules[EffectType.DAMAGE_OVER_TIME]).toBe(StackingBehavior.STACK_INTENSITY);
  });

  it('should have STACK_INTENSITY for HEAL_OVER_TIME', () => {
    expect(effectStackingRules[EffectType.HEAL_OVER_TIME]).toBe(StackingBehavior.STACK_INTENSITY);
  });

  it('should have STACK_INTENSITY for INSTANT_DAMAGE', () => {
    expect(effectStackingRules[EffectType.INSTANT_DAMAGE]).toBe(StackingBehavior.STACK_INTENSITY);
  });

  it('should have STACK_INTENSITY for INSTANT_HEAL', () => {
    expect(effectStackingRules[EffectType.INSTANT_HEAL]).toBe(StackingBehavior.STACK_INTENSITY);
  });

  it('should have rules for all common buff types', () => {
    expect(effectStackingRules[EffectType.STRENGTH_BUFF]).toBeDefined();
    expect(effectStackingRules[EffectType.AGILITY_BUFF]).toBeDefined();
    expect(effectStackingRules[EffectType.DEFENSE_BUFF]).toBeDefined();
    expect(effectStackingRules[EffectType.ATTACK_BUFF]).toBeDefined();
  });
});

describe('EffectPayload interface', () => {
  it('should allow creating payload with damage', () => {
    const payload: EffectPayload = {
      damagePerTick: 10,
    };
    expect(payload.damagePerTick).toBe(10);
  });

  it('should allow creating payload with healing', () => {
    const payload: EffectPayload = {
      healPerTick: 5,
    };
    expect(payload.healPerTick).toBe(5);
  });

  it('should allow creating payload with stat modifiers', () => {
    const payload: EffectPayload = {
      statModifiers: {
        strength: 5,
        agility: -2,
      },
    };
    expect(payload.statModifiers?.strength).toBe(5);
    expect(payload.statModifiers?.agility).toBe(-2);
  });

  it('should allow creating payload with movement block', () => {
    const payload: EffectPayload = {
      blockMovement: true,
    };
    expect(payload.blockMovement).toBe(true);
  });

  it('should allow creating payload with combat block', () => {
    const payload: EffectPayload = {
      blockCombat: true,
    };
    expect(payload.blockCombat).toBe(true);
  });

  it('should allow creating payload with metadata', () => {
    const payload: EffectPayload = {
      metadata: {
        source: 'spell',
        caster: 'wizard',
      },
    };
    expect(payload.metadata?.source).toBe('spell');
    expect(payload.metadata?.caster).toBe('wizard');
  });
});

describe('ActiveEffect interface', () => {
  it('should allow creating a complete active effect', () => {
    const effect: ActiveEffect = {
      id: 'effect-001',
      type: EffectType.POISON,
      name: 'Poison',
      description: 'A deadly poison',
      durationTicks: 10,
      remainingTicks: 10,
      isTimeBased: false,
      tickInterval: 1,
      lastTickApplied: 0,
      payload: {
        damagePerTick: 5,
      },
      targetId: 'player1',
      isPlayerEffect: true,
    };

    expect(effect.id).toBe('effect-001');
    expect(effect.type).toBe(EffectType.POISON);
    expect(effect.name).toBe('Poison');
    expect(effect.durationTicks).toBe(10);
    expect(effect.isPlayerEffect).toBe(true);
  });

  it('should allow time-based effects', () => {
    const effect: ActiveEffect = {
      id: 'effect-002',
      type: EffectType.REGEN,
      name: 'Regeneration',
      description: 'Heals over time',
      durationTicks: 60,
      remainingTicks: 60,
      isTimeBased: true,
      tickInterval: 0,
      realTimeIntervalMs: 1000,
      lastTickApplied: 0,
      lastRealTimeApplied: Date.now(),
      payload: {
        healPerTick: 3,
      },
      targetId: 'player2',
      isPlayerEffect: true,
    };

    expect(effect.isTimeBased).toBe(true);
    expect(effect.realTimeIntervalMs).toBe(1000);
  });

  it('should allow effects on NPCs', () => {
    const effect: ActiveEffect = {
      id: 'effect-003',
      type: EffectType.STUN,
      name: 'Stun',
      description: 'Unable to act',
      durationTicks: 3,
      remainingTicks: 3,
      isTimeBased: false,
      tickInterval: 0,
      lastTickApplied: 0,
      payload: {
        blockCombat: true,
        blockMovement: true,
      },
      targetId: 'goblin-001',
      isPlayerEffect: false,
    };

    expect(effect.isPlayerEffect).toBe(false);
    expect(effect.targetId).toBe('goblin-001');
  });

  it('should allow effects with custom stacking behavior', () => {
    const effect: ActiveEffect = {
      id: 'effect-004',
      type: EffectType.STRENGTH_BUFF,
      name: 'Giant Strength',
      description: 'Increases strength',
      durationTicks: 20,
      remainingTicks: 20,
      isTimeBased: false,
      tickInterval: 0,
      lastTickApplied: 0,
      payload: {
        statModifiers: {
          strength: 10,
        },
      },
      targetId: 'player3',
      isPlayerEffect: true,
      sourceId: 'potion-001',
      stackingBehavior: StackingBehavior.STRONGEST_WINS,
    };

    expect(effect.stackingBehavior).toBe(StackingBehavior.STRONGEST_WINS);
    expect(effect.sourceId).toBe('potion-001');
  });
});
