import { StackingBehavior } from '../types/effects';

/**
 * Types of abilities in the game
 */
export enum AbilityType {
  STANDARD = 'standard',
  COMBAT = 'combat',
  PROC = 'proc',
  ITEM = 'item',
}

/**
 * How ability cooldowns are tracked
 */
export enum CooldownType {
  ROUNDS = 'rounds',
  SECONDS = 'seconds',
  USES = 'uses',
}

/**
 * Valid targets for abilities
 */
export enum TargetType {
  SELF = 'self',
  ENEMY = 'enemy',
  ALLY = 'ally',
  ROOM = 'room',
}

/**
 * Effect configuration within an ability
 */
export interface AbilityEffect {
  effectType: string; // Matches EffectType enum values from types/effects.ts
  payload: {
    damagePerTick?: number;
    healPerTick?: number;
    damageAmount?: number;
    healAmount?: number;
    statModifiers?: { [stat: string]: number };
    blockMovement?: boolean;
    blockCombat?: boolean;
    metadata?: { [key: string]: unknown };
  };
  durationTicks: number;
  tickInterval: number;
  stackingBehavior?: StackingBehavior;
  name?: string;
  description?: string;
}

/**
 * Requirements to use an ability
 */
export interface AbilityRequirements {
  level?: number;
  stats?: { [stat: string]: number };
}

/**
 * Template defining an ability
 */
export interface AbilityTemplate {
  id: string;
  name: string;
  description: string;
  type: AbilityType;
  mpCost: number;
  cooldownType: CooldownType;
  cooldownValue: number;
  targetType: TargetType;
  effects: AbilityEffect[];
  requirements?: AbilityRequirements;
  procChance?: number;
  consumesItem?: boolean;
}

/**
 * Cooldown state for a single ability
 */
export interface AbilityCooldownState {
  lastUsedRound?: number;
  lastUsedTimestamp?: number;
  usesRemaining?: number;
}

/**
 * All cooldowns for a player
 */
export interface PlayerCooldowns {
  [abilityId: string]: AbilityCooldownState;
}
