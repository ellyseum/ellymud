/**
 * Attack Speed System (Combat Energy)
 *
 * Determines attacks per round based on character stats, class, and weapon.
 * Uses an energy system where leftover energy carries between rounds.
 *
 * Formula:
 * BaseEnergy = (300 + (Level * 20) + (AGI * 8)) * CombatLevelMultiplier + HasteBonuses
 * AttacksThisRound = floor((BaseEnergy + LeftoverEnergy) / WeaponEnergyCost)
 * LeftoverEnergy = (BaseEnergy + LeftoverEnergy) % WeaponEnergyCost
 */

import { User, CombatLevel, CombatEnergyState, GameItem } from '../types';
import { getCombatLevelMultiplier } from '../utils/statCalculator';

// ============================================================================
// Constants
// ============================================================================

/** Base energy value before stat/level modifiers */
const BASE_ENERGY = 300;

/** Energy gained per level */
const ENERGY_PER_LEVEL = 20;

/** Energy gained per point of AGI */
const ENERGY_PER_AGI = 8;

/** Minimum attacks per round (always at least 1) */
const MIN_ATTACKS_PER_ROUND = 1;

/** Maximum attacks per round (prevent runaway) */
const MAX_ATTACKS_PER_ROUND = 10;

// ============================================================================
// Default Weapon Energy Costs
// ============================================================================

/**
 * Default energy costs by weapon category.
 * Lower cost = more attacks per round.
 */
export const DEFAULT_WEAPON_ENERGY_COSTS = {
  FISTS: 200, // Very fast, low damage
  DAGGER: 250, // Fast, many attacks
  SHORT_SWORD: 350, // Quick and balanced
  LONG_SWORD: 450, // Standard melee
  MACE_AXE: 500, // Solid damage per hit
  TWO_HANDED: 650, // Heavy, fewer swings
  STAFF: 400, // Caster weapon
  BOW: 500, // Ranged weapon
} as const;

/** Default energy cost when weapon doesn't specify */
export const DEFAULT_WEAPON_COST = DEFAULT_WEAPON_ENERGY_COSTS.LONG_SWORD;

// ============================================================================
// Haste/Slow Effects
// ============================================================================

/**
 * Energy modifiers from buffs/debuffs
 */
export const ENERGY_MODIFIERS = {
  HASTE_SPELL: 200,
  SLOW_DEBUFF: -200,
  BERSERKER_FRENZY: 150,
} as const;

// ============================================================================
// Combat Energy Tracker
// ============================================================================

/**
 * Tracks combat energy state for a single combat session.
 * Manages leftover energy that carries between rounds.
 */
export class CombatEnergyTracker {
  private leftoverEnergy: number = 0;
  private isBashing: boolean = false;

  constructor(private username: string) {}

  /**
   * Get the username this tracker is for
   */
  public getUsername(): string {
    return this.username;
  }

  /**
   * Get current leftover energy
   */
  public getLeftoverEnergy(): number {
    return this.leftoverEnergy;
  }

  /**
   * Set bashing mode for this round
   */
  public setBashing(bashing: boolean): void {
    this.isBashing = bashing;
  }

  /**
   * Check if currently in bash mode
   */
  public getIsBashing(): boolean {
    return this.isBashing;
  }

  /**
   * Calculate attacks for this round and update leftover energy
   *
   * @param baseEnergy - Base energy for this round
   * @param weaponCost - Energy cost per attack
   * @returns Number of attacks to perform this round
   */
  public calculateAttacks(baseEnergy: number, weaponCost: number): number {
    // In bash mode, weapon cost is doubled
    const effectiveCost = this.isBashing ? weaponCost * 2 : weaponCost;

    const totalEnergy = baseEnergy + this.leftoverEnergy;
    const attacks = Math.floor(totalEnergy / effectiveCost);
    this.leftoverEnergy = totalEnergy % effectiveCost;

    // Clamp to valid range
    const clampedAttacks = Math.max(
      MIN_ATTACKS_PER_ROUND,
      Math.min(MAX_ATTACKS_PER_ROUND, attacks)
    );

    return clampedAttacks;
  }

  /**
   * Reset the tracker (end of combat)
   */
  public reset(): void {
    this.leftoverEnergy = 0;
    this.isBashing = false;
  }

  /**
   * Get current state for inspection/debugging
   */
  public getState(): CombatEnergyState {
    return {
      baseEnergy: 0, // Will be filled by caller
      leftoverEnergy: this.leftoverEnergy,
      isBashing: this.isBashing,
    };
  }
}

// ============================================================================
// Energy Calculation Functions
// ============================================================================

/**
 * Calculate base combat energy for a character
 *
 * Formula: (300 + (Level * 20) + (AGI * 8)) * CombatLevelMultiplier + HasteBonuses
 *
 * @param level - Character level
 * @param agility - Character agility stat
 * @param combatLevel - Class combat proficiency level
 * @param hasteBonus - Additional energy from haste effects
 * @returns Base energy value for this round
 */
export function calculateBaseEnergy(
  level: number,
  agility: number,
  combatLevel: CombatLevel,
  hasteBonus: number = 0
): number {
  const levelBonus = level * ENERGY_PER_LEVEL;
  const agiBonus = agility * ENERGY_PER_AGI;
  const multiplier = getCombatLevelMultiplier(combatLevel);

  const baseEnergy = (BASE_ENERGY + levelBonus + agiBonus) * multiplier;

  return Math.floor(baseEnergy + hasteBonus);
}

/**
 * Calculate base energy for a user
 */
export function calculateUserBaseEnergy(
  user: User,
  combatLevel: CombatLevel,
  hasteBonus: number = 0
): number {
  return calculateBaseEnergy(user.level, user.agility, combatLevel, hasteBonus);
}

/**
 * Get the energy cost for a weapon
 *
 * @param weapon - Weapon item (or undefined for unarmed)
 * @returns Energy cost per attack
 */
export function getWeaponEnergyCost(weapon?: GameItem): number {
  if (!weapon) {
    return DEFAULT_WEAPON_ENERGY_COSTS.FISTS;
  }

  // Use explicit energy cost if defined
  if (weapon.energyCost !== undefined) {
    return weapon.energyCost;
  }

  // Otherwise fall back to default based on weapon type or name
  return DEFAULT_WEAPON_COST;
}

/**
 * Calculate attacks per round with full context
 *
 * @param user - Character data
 * @param weapon - Equipped weapon
 * @param combatLevel - Class combat proficiency
 * @param tracker - Energy tracker for this combat
 * @param hasteBonus - Haste effect bonus
 * @returns Number of attacks to perform this round
 */
export function calculateAttacksPerRound(
  user: User,
  weapon: GameItem | undefined,
  combatLevel: CombatLevel,
  tracker: CombatEnergyTracker,
  hasteBonus: number = 0
): number {
  const baseEnergy = calculateUserBaseEnergy(user, combatLevel, hasteBonus);
  const weaponCost = getWeaponEnergyCost(weapon);

  return tracker.calculateAttacks(baseEnergy, weaponCost);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Estimate average attacks per round (for display purposes)
 *
 * Doesn't account for leftover energy carryover.
 */
export function estimateAttacksPerRound(
  level: number,
  agility: number,
  combatLevel: CombatLevel,
  weaponCost: number,
  hasteBonus: number = 0
): number {
  const baseEnergy = calculateBaseEnergy(level, agility, combatLevel, hasteBonus);
  const attacks = Math.floor(baseEnergy / weaponCost);
  return Math.max(MIN_ATTACKS_PER_ROUND, Math.min(MAX_ATTACKS_PER_ROUND, attacks));
}

/**
 * Get a human-readable attack speed description
 */
export function getAttackSpeedDescription(attacksPerRound: number): string {
  if (attacksPerRound <= 1) return 'slow';
  if (attacksPerRound <= 2) return 'normal';
  if (attacksPerRound <= 3) return 'fast';
  if (attacksPerRound <= 5) return 'very fast';
  return 'extremely fast';
}
