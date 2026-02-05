/**
 * Enum defining the different types of effects that can be applied to entities
 */
export enum EffectType {
  POISON = 'poison',
  REGEN = 'regen',
  STUN = 'stun',
  STRENGTH_BUFF = 'strength_buff',
  AGILITY_BUFF = 'agility_buff',
  DEFENSE_BUFF = 'defense_buff',
  ATTACK_BUFF = 'attack_buff',
  DAMAGE_OVER_TIME = 'damage_over_time',
  HEAL_OVER_TIME = 'heal_over_time',
  MOVEMENT_BLOCK = 'movement_block',
  INSTANT_DAMAGE = 'instant_damage',
  INSTANT_HEAL = 'instant_heal',

  // === Class Ability System Effects ===
  /** Haste - Increases combat energy/attack speed */
  HASTE = 'haste',
  /** Damage Reduction - Flat damage reduction per hit */
  DAMAGE_REDUCTION = 'damage_reduction',
  /** Absorb Shield - Absorbs X damage before expiring */
  ABSORB = 'absorb',
  /** Taunt - Forces enemies to attack the taunter */
  TAUNT = 'taunt',
  /** Stealth - Hidden from enemies */
  STEALTH = 'stealth',
  /** Slow - Reduces combat energy/attack speed */
  SLOW = 'slow',
  /** Fear - Forces target to flee */
  FEAR = 'fear',
  /** Silence - Prevents spellcasting */
  SILENCE = 'silence',
  /** Bleed - Physical damage over time */
  BLEED = 'bleed',
}

/**
 * Enum defining how effects of the same type interact with each other
 */
export enum StackingBehavior {
  REPLACE, // New effect completely replaces old of same type
  REFRESH, // New effect replaces old, resetting duration (with new payload)
  STACK_DURATION, // Add duration of new effect to old
  STACK_INTENSITY, // Both effects run independently
  STRONGEST_WINS, // Only the effect with the 'strongest' payload applies
  IGNORE, // New effect is ignored if one of same type exists
}

/**
 * Interface defining the possible payload data for effects
 */
export interface EffectPayload {
  damagePerTick?: number; // Damage dealt each tick
  healPerTick?: number; // Healing applied each tick
  damageAmount?: number; // Alternate name for time-based effects
  healAmount?: number; // Alternate name for time-based effects
  statModifiers?: {
    // Stat modifications
    [stat: string]: number; // e.g., { agility: 5, strength: -2 }
  };
  blockMovement?: boolean; // Whether movement is blocked
  blockCombat?: boolean; // Whether combat is blocked
  metadata?: {
    // Custom metadata for specialized effects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any; // Custom data associated with the effect
  };
  // Add more payload options as needed
}

/**
 * Interface representing an active effect instance
 */
export interface ActiveEffect {
  id: string; // Unique instance ID (uuid)
  type: EffectType; // Type of effect
  name: string; // User-friendly name
  description: string; // Description of what the effect does
  durationTicks: number; // Total duration in game ticks
  remainingTicks: number; // Remaining ticks before expiry

  isTimeBased: boolean; // True if triggers on real time instead of game ticks
  tickInterval: number; // How often tick-based effects trigger (0 for passive)
  realTimeIntervalMs?: number; // How often time-based effects trigger (ms)

  lastTickApplied: number; // Game tick when last triggered
  lastRealTimeApplied?: number; // Timestamp when last triggered (for time-based)

  payload: EffectPayload; // Effect-specific data
  targetId: string; // Username or NPC ID
  isPlayerEffect: boolean; // Whether target is a player

  sourceId?: string; // Who/what caused the effect (optional)
  stackingBehavior?: StackingBehavior; // How this effect stacks (overrides default)
}

/**
 * Mapping of effect types to their default stacking behavior
 */
export const effectStackingRules: { [key in EffectType]?: StackingBehavior } = {
  [EffectType.POISON]: StackingBehavior.REFRESH,
  [EffectType.REGEN]: StackingBehavior.REFRESH,
  [EffectType.STUN]: StackingBehavior.REFRESH,
  [EffectType.STRENGTH_BUFF]: StackingBehavior.REFRESH,
  [EffectType.AGILITY_BUFF]: StackingBehavior.REFRESH,
  [EffectType.DEFENSE_BUFF]: StackingBehavior.REFRESH,
  [EffectType.ATTACK_BUFF]: StackingBehavior.REFRESH,
  [EffectType.DAMAGE_OVER_TIME]: StackingBehavior.STACK_INTENSITY,
  [EffectType.HEAL_OVER_TIME]: StackingBehavior.STACK_INTENSITY,
  [EffectType.MOVEMENT_BLOCK]: StackingBehavior.REFRESH,
  [EffectType.INSTANT_DAMAGE]: StackingBehavior.STACK_INTENSITY, // Each cast applies damage
  [EffectType.INSTANT_HEAL]: StackingBehavior.STACK_INTENSITY, // Each cast applies healing

  // === Class Ability System Effects ===
  [EffectType.HASTE]: StackingBehavior.STRONGEST_WINS, // Only strongest haste applies
  [EffectType.DAMAGE_REDUCTION]: StackingBehavior.STRONGEST_WINS, // Only strongest DR applies
  [EffectType.ABSORB]: StackingBehavior.STACK_INTENSITY, // Multiple shields can stack
  [EffectType.TAUNT]: StackingBehavior.REPLACE, // New taunt replaces old
  [EffectType.STEALTH]: StackingBehavior.IGNORE, // Can't stack stealth
  [EffectType.SLOW]: StackingBehavior.STRONGEST_WINS, // Only strongest slow applies
  [EffectType.FEAR]: StackingBehavior.REFRESH, // Refresh duration
  [EffectType.SILENCE]: StackingBehavior.REFRESH, // Refresh duration
  [EffectType.BLEED]: StackingBehavior.STACK_INTENSITY, // Bleeds stack
  // Default: REFRESH if not specified in this map
};
