/**
 * Stat Calculator Utility
 *
 * Pure functions for calculating character stats, HP, and resources.
 * Implements the stat overhaul system with meaningful racial/class bonuses.
 *
 * Stat Scale:
 * - Base stats: 10 (all races start here before modifiers)
 * - Low: 0-30
 * - Average: 30-50
 * - Good: 50-70
 * - Excellent: 70-90
 * - Elite: 90-100
 * - Legendary: 100+ (very expensive to reach)
 */

import { User, Race, CharacterClass, ResourceType, CombatLevel } from '../types';

// ============================================================================
// Constants
// ============================================================================

/** Base stat value for all characters */
export const BASE_STAT_VALUE = 10;

/** Base HP value before modifiers */
export const BASE_HP = 20;

/** HP per point of constitution */
export const HP_PER_CON = 2;

/** HP per level */
export const HP_PER_LEVEL = 5;

/** Base mana value before modifiers */
export const BASE_MANA = 20;

/** Mana per point of intelligence */
export const MANA_PER_INT = 3;

/** Mana per point of wisdom */
export const MANA_PER_WIS = 2;

/** Fixed max for rage resource */
export const RAGE_MAX = 100;

/** Fixed max for energy resource */
export const ENERGY_MAX = 100;

/** Base ki before wisdom modifier */
export const BASE_KI = 50;

/** Ki per point of wisdom */
export const KI_PER_WIS = 2;

/** Base nature before wisdom modifier */
export const BASE_NATURE = 30;

/** Nature per point of wisdom */
export const NATURE_PER_WIS = 2;

// ============================================================================
// Stat Calculation
// ============================================================================

/**
 * Character stats interface
 */
export interface CharacterStats {
  strength: number;
  dexterity: number;
  agility: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

/**
 * Apply racial stat modifiers to base stats
 *
 * Race modifiers are on a 5x scale for meaningful impact.
 * Example: Orc has +20 STR, so their strength = 10 + 20 = 30
 *
 * @param baseStats - Base stats (typically all 10)
 * @param race - Race data with stat modifiers
 * @returns Stats with racial modifiers applied
 */
export function applyRacialModifiers(baseStats: CharacterStats, race: Race): CharacterStats {
  return {
    strength: baseStats.strength + race.statModifiers.strength,
    dexterity: baseStats.dexterity + race.statModifiers.dexterity,
    agility: baseStats.agility + race.statModifiers.agility,
    constitution: baseStats.constitution + race.statModifiers.constitution,
    intelligence: baseStats.intelligence + race.statModifiers.intelligence,
    wisdom: baseStats.wisdom + race.statModifiers.wisdom,
    charisma: baseStats.charisma + race.statModifiers.charisma,
  };
}

/**
 * Apply class stat bonuses to stats
 *
 * @param stats - Current stats
 * @param classData - Class data with stat bonuses
 * @returns Stats with class bonuses applied
 */
export function applyClassStatBonuses(
  stats: CharacterStats,
  classData: CharacterClass
): CharacterStats {
  const bonuses = classData.classStatBonuses ?? {};

  return {
    strength: stats.strength + (bonuses.strength ?? 0),
    dexterity: stats.dexterity + (bonuses.dexterity ?? 0),
    agility: stats.agility + (bonuses.agility ?? 0),
    constitution: stats.constitution + (bonuses.constitution ?? 0),
    intelligence: stats.intelligence + (bonuses.intelligence ?? 0),
    wisdom: stats.wisdom + (bonuses.wisdom ?? 0),
    charisma: stats.charisma + (bonuses.charisma ?? 0),
  };
}

/**
 * Calculate final stats from base + race + class
 *
 * @param raceData - Race data
 * @param classData - Class data
 * @returns Final calculated stats
 */
export function calculateFinalStats(raceData: Race, classData: CharacterClass): CharacterStats {
  // Start with base stats (all 10)
  const baseStats: CharacterStats = {
    strength: BASE_STAT_VALUE,
    dexterity: BASE_STAT_VALUE,
    agility: BASE_STAT_VALUE,
    constitution: BASE_STAT_VALUE,
    intelligence: BASE_STAT_VALUE,
    wisdom: BASE_STAT_VALUE,
    charisma: BASE_STAT_VALUE,
  };

  // Apply racial modifiers
  const withRace = applyRacialModifiers(baseStats, raceData);

  // Apply class bonuses
  const withClass = applyClassStatBonuses(withRace, classData);

  return withClass;
}

/**
 * Get total racial bonus for a stat
 */
export function getRacialStatBonus(raceData: Race, stat: keyof CharacterStats): number {
  return raceData.statModifiers[stat];
}

/**
 * Get total class bonus for a stat
 */
export function getClassStatBonus(classData: CharacterClass, stat: keyof CharacterStats): number {
  return classData.classStatBonuses?.[stat] ?? 0;
}

// ============================================================================
// HP Calculation
// ============================================================================

/**
 * Calculate maximum HP for a character
 *
 * Formula: Base HP = 20 + (CON * 2) + (Level * 5) + ClassBonus + RacialBonus
 *
 * @param constitution - Character's constitution stat
 * @param level - Character's level
 * @param classHpBonus - Class HP bonus (Fighter +10, Berserker +20, etc.)
 * @param racialHpBonus - Racial HP bonus (Orc +10, Dwarf +5)
 * @returns Maximum HP value
 */
export function calculateMaxHP(
  constitution: number,
  level: number,
  classHpBonus: number = 0,
  racialHpBonus: number = 0
): number {
  const baseHp = BASE_HP;
  const conHp = constitution * HP_PER_CON;
  const levelHp = level * HP_PER_LEVEL;

  return baseHp + conHp + levelHp + classHpBonus + racialHpBonus;
}

/**
 * Calculate max HP for a user with their race and class data
 */
export function calculateUserMaxHP(
  user: User,
  raceData?: Race,
  classData?: CharacterClass
): number {
  const classHpBonus = classData?.hpBonus ?? 0;
  const racialHpBonus = raceData?.hpBonus ?? 0;

  return calculateMaxHP(user.constitution, user.level, classHpBonus, racialHpBonus);
}

// ============================================================================
// Resource Calculation
// ============================================================================

/**
 * Calculate maximum mana
 *
 * Formula: Mana = 20 + (INT * 3) + (WIS * 2)
 *
 * @param intelligence - Character's intelligence stat
 * @param wisdom - Character's wisdom stat
 * @returns Maximum mana value
 */
export function calculateMaxMana(intelligence: number, wisdom: number): number {
  return BASE_MANA + intelligence * MANA_PER_INT + wisdom * MANA_PER_WIS;
}

/**
 * Calculate maximum ki
 *
 * Formula: Ki = 50 + (WIS * 2)
 *
 * @param wisdom - Character's wisdom stat
 * @returns Maximum ki value
 */
export function calculateMaxKi(wisdom: number): number {
  return BASE_KI + wisdom * KI_PER_WIS;
}

/**
 * Calculate maximum nature
 *
 * Formula: Nature = 30 + (WIS * 2)
 *
 * @param wisdom - Character's wisdom stat
 * @returns Maximum nature value
 */
export function calculateMaxNature(wisdom: number): number {
  return BASE_NATURE + wisdom * NATURE_PER_WIS;
}

/**
 * Calculate maximum resource based on resource type
 *
 * @param resourceType - Type of resource
 * @param user - User data with stats
 * @param classData - Class data for resource config
 * @returns Maximum resource value, or 0 for NONE
 */
export function calculateMaxResource(
  resourceType: ResourceType,
  user: User,
  classData?: CharacterClass
): number {
  switch (resourceType) {
    case ResourceType.NONE:
      return 0;

    case ResourceType.MANA:
      return calculateMaxMana(user.intelligence, user.wisdom);

    case ResourceType.RAGE:
      // Rage has fixed max of 100, or from config
      return classData?.resourceConfig?.maxFixed ?? RAGE_MAX;

    case ResourceType.ENERGY:
      // Energy has fixed max of 100, or from config
      return classData?.resourceConfig?.maxFixed ?? ENERGY_MAX;

    case ResourceType.KI:
      return calculateMaxKi(user.wisdom);

    case ResourceType.HOLY:
      // Holy uses charges, typically 3-5
      return classData?.resourceConfig?.maxFixed ?? 5;

    case ResourceType.NATURE:
      return calculateMaxNature(user.wisdom);

    default:
      return 0;
  }
}

/**
 * Get the display abbreviation for a resource type
 *
 * @param resourceType - Type of resource
 * @returns Display abbreviation (e.g., "MP", "RG", "EN")
 */
export function getResourceDisplayAbbr(resourceType: ResourceType): string {
  switch (resourceType) {
    case ResourceType.NONE:
      return '';
    case ResourceType.MANA:
      return 'MP';
    case ResourceType.RAGE:
      return 'RG';
    case ResourceType.ENERGY:
      return 'EN';
    case ResourceType.KI:
      return 'KI';
    case ResourceType.HOLY:
      return 'HO';
    case ResourceType.NATURE:
      return 'NA';
    default:
      return '';
  }
}

// ============================================================================
// Attribute Point Cost Calculation
// ============================================================================

/**
 * Calculate the cost to raise a stat by 1 point
 *
 * Cost is based on how far ABOVE your race's starting value, not absolute value.
 * This means racial bonuses represent natural aptitude.
 *
 * Formula: Cost = floor(EffectiveStat / 10) + 1
 * where EffectiveStat = currentStat - racialBonus - classBonus
 *
 * @param currentStat - Current stat value
 * @param racialBonus - Racial bonus for this stat
 * @param classBonus - Class bonus for this stat
 * @returns Attribute point cost to raise by 1
 */
export function calculateAttribCost(
  currentStat: number,
  racialBonus: number = 0,
  classBonus: number = 0
): number {
  // Calculate effective stat (distance from natural baseline)
  const effectiveStat = currentStat - racialBonus - classBonus;

  // Cost = floor(effective / 10) + 1
  // At effective 0-9: cost 1
  // At effective 10-19: cost 2
  // At effective 20-29: cost 3
  // etc.
  return Math.floor(effectiveStat / 10) + 1;
}

/**
 * Calculate total cost to raise a stat from current to target
 *
 * @param currentStat - Current stat value
 * @param targetStat - Target stat value
 * @param racialBonus - Racial bonus for this stat
 * @param classBonus - Class bonus for this stat
 * @returns Total attribute point cost
 */
export function calculateTotalAttribCost(
  currentStat: number,
  targetStat: number,
  racialBonus: number = 0,
  classBonus: number = 0
): number {
  if (targetStat <= currentStat) {
    return 0;
  }

  let totalCost = 0;
  for (let stat = currentStat; stat < targetStat; stat++) {
    totalCost += calculateAttribCost(stat, racialBonus, classBonus);
  }

  return totalCost;
}

// ============================================================================
// Stat Bonus Calculation
// ============================================================================

/**
 * Calculate the bonus derived from a stat value
 *
 * For most stats, every 10 points = +1 bonus
 *
 * @param statValue - The stat value
 * @param divisor - Points per bonus (default 10)
 * @returns Bonus value
 */
export function calculateStatBonus(statValue: number, divisor: number = 10): number {
  return Math.floor(statValue / divisor);
}

// ============================================================================
// Combat Level Helpers
// ============================================================================

/**
 * Get the combat level multiplier for attack speed calculation
 *
 * @param combatLevel - Combat proficiency level
 * @returns Multiplier (1.0 to 2.0)
 */
export function getCombatLevelMultiplier(combatLevel: CombatLevel): number {
  switch (combatLevel) {
    case CombatLevel.CASTER:
      return 1.0;
    case CombatLevel.SEMI_COMBAT:
      return 1.25;
    case CombatLevel.HYBRID:
      return 1.5;
    case CombatLevel.WARRIOR:
      return 1.75;
    case CombatLevel.ELITE:
      return 2.0;
    default:
      return 1.0;
  }
}

/**
 * Get the default combat level for a class
 * Falls back to SEMI_COMBAT if not specified
 */
export function getClassCombatLevel(classData?: CharacterClass): CombatLevel {
  return classData?.combatLevel ?? CombatLevel.SEMI_COMBAT;
}
