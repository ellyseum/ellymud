/**
 * Combat Formula Calculations
 *
 * Pure functions for calculating combat outcomes based on stats.
 * These formulas implement the stat overhaul system where:
 * - Stats are on a 0-100+ scale (base 10, race/class bonuses apply)
 * - Stats have meaningful impact on combat outcomes
 * - Equipment provides AC (armor class) and DR (damage reduction)
 */

import { User, GameItem, Race, CharacterClass, ArmorType } from '../types';

// ============================================================================
// Constants
// ============================================================================

/** Base hit chance before modifiers */
const BASE_HIT_CHANCE = 75;

/** Minimum hit chance (floor) */
const MIN_HIT_CHANCE = 25;

/** Maximum hit chance (cap) */
const MAX_HIT_CHANCE = 95;

/** Base dodge chance before modifiers */
const BASE_DODGE_CHANCE = 5;

/** Maximum dodge chance (cap) */
const MAX_DODGE_CHANCE = 50;

/** Base crit chance */
const BASE_CRIT_CHANCE = 5;

/** Maximum crit chance (cap) */
const MAX_CRIT_CHANCE = 40;

/** Critical hit damage multiplier */
export const CRIT_DAMAGE_MULTIPLIER = 1.5;

/** Base AC (armor class) */
const BASE_AC = 10;

/** Minimum damage dealt */
const MIN_DAMAGE = 1;

// ============================================================================
// Armor Type Properties
// ============================================================================

interface ArmorProperties {
  acBonus: number;
  drBonus: number;
}

/** Default AC/DR values by armor type */
const ARMOR_TYPE_DEFAULTS: Record<ArmorType, ArmorProperties> = {
  [ArmorType.CLOTH]: { acBonus: 0, drBonus: 0 },
  [ArmorType.LEATHER]: { acBonus: 5, drBonus: 2 },
  [ArmorType.STUDDED]: { acBonus: 10, drBonus: 4 },
  [ArmorType.CHAIN]: { acBonus: 15, drBonus: 6 },
  [ArmorType.PLATE]: { acBonus: 25, drBonus: 12 },
  [ArmorType.SHIELD]: { acBonus: 10, drBonus: 0 },
};

// ============================================================================
// Racial Dodge Bonuses
// ============================================================================

/** Default racial dodge bonuses */
const RACIAL_DODGE_DEFAULTS: Record<string, number> = {
  human: 0,
  elf: 5,
  dwarf: -5,
  halfling: 15,
  orc: -10,
  'half-elf': 3,
};

// ============================================================================
// Hit Chance Calculation
// ============================================================================

/**
 * Calculate hit chance for an attack
 *
 * Formula: Hit% = 75 + (DEX/5) + (Level diff * 2) - TargetDodge%
 * Capped between 25% and 95%
 *
 * @param attackerDex - Attacker's dexterity stat
 * @param attackerLevel - Attacker's level
 * @param targetDodge - Target's dodge percentage
 * @param targetLevel - Target's level
 * @returns Hit chance as a percentage (0-100)
 */
export function calculateHitChance(
  attackerDex: number,
  attackerLevel: number,
  targetDodge: number,
  targetLevel: number
): number {
  const dexBonus = Math.floor(attackerDex / 5);
  const levelDiff = attackerLevel - targetLevel;
  const levelBonus = levelDiff * 2;

  const hitChance = BASE_HIT_CHANCE + dexBonus + levelBonus - targetDodge;

  return Math.max(MIN_HIT_CHANCE, Math.min(MAX_HIT_CHANCE, hitChance));
}

// ============================================================================
// Dodge Chance Calculation
// ============================================================================

/**
 * Calculate dodge chance for a defender
 *
 * Formula: Dodge% = 5 + (AGI/5) + RacialDodge + ClassBonus
 * Capped between 0% and 50%
 *
 * @param defenderAgi - Defender's agility stat
 * @param racialDodge - Racial dodge bonus (e.g., Halfling +15%)
 * @param classBonus - Class dodge bonus
 * @returns Dodge chance as a percentage (0-100)
 */
export function calculateDodgeChance(
  defenderAgi: number,
  racialDodge: number = 0,
  classBonus: number = 0
): number {
  const agiBonus = Math.floor(defenderAgi / 5);

  const dodgeChance = BASE_DODGE_CHANCE + agiBonus + racialDodge + classBonus;

  return Math.max(0, Math.min(MAX_DODGE_CHANCE, dodgeChance));
}

/**
 * Get racial dodge bonus for a race
 */
export function getRacialDodgeBonus(raceId: string, raceData?: Race): number {
  // First check if race data has explicit dodge bonus
  if (raceData?.dodgeBonus !== undefined) {
    return raceData.dodgeBonus;
  }

  // Fall back to defaults
  return RACIAL_DODGE_DEFAULTS[raceId.toLowerCase()] ?? 0;
}

// ============================================================================
// Critical Hit Calculation
// ============================================================================

/**
 * Calculate critical hit chance
 *
 * Physical: Crit% = 5 + (DEX/10)
 * Spell: Crit% = 5 + (DEX/10) + (INT/20)
 * Capped between 5% and 40%
 *
 * @param attackerDex - Attacker's dexterity stat
 * @param attackerInt - Attacker's intelligence stat (for spells)
 * @param isSpell - Whether this is a spell attack
 * @param racialCritBonus - Racial crit bonus (e.g., Halfling +5%)
 * @returns Crit chance as a percentage (0-100)
 */
export function calculateCritChance(
  attackerDex: number,
  attackerInt: number = 0,
  isSpell: boolean = false,
  racialCritBonus: number = 0
): number {
  const dexBonus = Math.floor(attackerDex / 10);
  const intBonus = isSpell ? Math.floor(attackerInt / 20) : 0;

  const critChance = BASE_CRIT_CHANCE + dexBonus + intBonus + racialCritBonus;

  return Math.max(BASE_CRIT_CHANCE, Math.min(MAX_CRIT_CHANCE, critChance));
}

// ============================================================================
// Armor Class (AC) Calculation
// ============================================================================

/**
 * Calculate total Armor Class from equipment
 *
 * Formula: AC = BaseAC + ArmorBonus + (DEX/10) + ShieldBonus + SpellBonuses
 *
 * @param defenderDex - Defender's dexterity stat
 * @param equippedArmor - Array of equipped armor items
 * @param spellAcBonus - AC bonus from active spells
 * @returns Total AC value
 */
export function calculateArmorClass(
  defenderDex: number,
  equippedArmor: GameItem[],
  spellAcBonus: number = 0
): number {
  const dexBonus = Math.floor(defenderDex / 10);

  // Sum AC from all equipped armor
  let armorAc = 0;
  for (const armor of equippedArmor) {
    if (armor.acBonus !== undefined) {
      armorAc += armor.acBonus;
    } else if (armor.armorType) {
      // Use default AC for armor type if not specified
      armorAc += ARMOR_TYPE_DEFAULTS[armor.armorType]?.acBonus ?? 0;
    }
  }

  return BASE_AC + armorAc + dexBonus + spellAcBonus;
}

// ============================================================================
// Damage Reduction (DR) Calculation
// ============================================================================

/**
 * Calculate total Damage Reduction from equipment
 *
 * Formula: DR = ArmorDR + SpellDR + ClassDR
 *
 * @param equippedArmor - Array of equipped armor items
 * @param spellDrBonus - DR bonus from active spells
 * @param classDrBonus - DR bonus from class abilities
 * @returns Total DR value
 */
export function calculateDamageReduction(
  equippedArmor: GameItem[],
  spellDrBonus: number = 0,
  classDrBonus: number = 0
): number {
  // Sum DR from all equipped armor
  let armorDr = 0;
  for (const armor of equippedArmor) {
    if (armor.drBonus !== undefined) {
      armorDr += armor.drBonus;
    } else if (armor.armorType) {
      // Use default DR for armor type if not specified
      armorDr += ARMOR_TYPE_DEFAULTS[armor.armorType]?.drBonus ?? 0;
    }
  }

  return armorDr + spellDrBonus + classDrBonus;
}

// ============================================================================
// Physical Damage Calculation
// ============================================================================

/**
 * Calculate physical damage for an attack
 *
 * Formula:
 * BaseDamage = WeaponDamage + (STR/5)
 * FinalDamage = max(1, BaseDamage - DR)
 *
 * @param attackerStr - Attacker's strength stat
 * @param weaponMinDamage - Weapon's minimum damage
 * @param weaponMaxDamage - Weapon's maximum damage
 * @param targetDr - Target's damage reduction
 * @param isCrit - Whether this is a critical hit
 * @param isBash - Whether this is a bash attack (2x damage)
 * @returns Final damage dealt
 */
export function calculatePhysicalDamage(
  attackerStr: number,
  weaponMinDamage: number,
  weaponMaxDamage: number,
  targetDr: number,
  isCrit: boolean = false,
  isBash: boolean = false
): number {
  // Roll weapon damage
  const weaponDamage =
    weaponMinDamage + Math.floor(Math.random() * (weaponMaxDamage - weaponMinDamage + 1));

  // Add strength bonus
  const strBonus = Math.floor(attackerStr / 5);
  let baseDamage = weaponDamage + strBonus;

  // Apply bash multiplier (2x damage)
  if (isBash) {
    baseDamage *= 2;
  }

  // Apply crit multiplier (1.5x damage)
  if (isCrit) {
    baseDamage = Math.floor(baseDamage * CRIT_DAMAGE_MULTIPLIER);
  }

  // Apply damage reduction
  const finalDamage = Math.max(MIN_DAMAGE, baseDamage - targetDr);

  return finalDamage;
}

/**
 * Calculate unarmed (fists) damage
 *
 * @param attackerStr - Attacker's strength stat
 * @param targetDr - Target's damage reduction
 * @param isCrit - Whether this is a critical hit
 * @returns Final damage dealt
 */
export function calculateUnarmedDamage(
  attackerStr: number,
  targetDr: number,
  isCrit: boolean = false
): number {
  // Unarmed base damage: 1-3
  return calculatePhysicalDamage(attackerStr, 1, 3, targetDr, isCrit, false);
}

// ============================================================================
// Spell Damage Calculation
// ============================================================================

/**
 * Calculate spell damage
 *
 * Formula: BaseDamage = SpellBase + (INT/4) + (WIS/8)
 * Spells bypass AC and DR (physical only)
 *
 * @param spellMinDamage - Spell's minimum base damage
 * @param spellMaxDamage - Spell's maximum base damage
 * @param casterInt - Caster's intelligence stat
 * @param casterWis - Caster's wisdom stat
 * @param isCrit - Whether this is a critical hit
 * @returns Final spell damage dealt
 */
export function calculateSpellDamage(
  spellMinDamage: number,
  spellMaxDamage: number,
  casterInt: number,
  casterWis: number,
  isCrit: boolean = false
): number {
  // Roll spell base damage
  const spellDamage =
    spellMinDamage + Math.floor(Math.random() * (spellMaxDamage - spellMinDamage + 1));

  // Add INT and WIS bonuses
  const intBonus = Math.floor(casterInt / 4);
  const wisBonus = Math.floor(casterWis / 8);

  let finalDamage = spellDamage + intBonus + wisBonus;

  // Apply crit multiplier
  if (isCrit) {
    finalDamage = Math.floor(finalDamage * CRIT_DAMAGE_MULTIPLIER);
  }

  return Math.max(MIN_DAMAGE, finalDamage);
}

// ============================================================================
// Combat Roll Functions
// ============================================================================

/**
 * Roll to determine if an attack hits
 *
 * @param hitChance - Hit chance percentage (0-100)
 * @returns true if hit, false if miss
 */
export function rollToHit(hitChance: number): boolean {
  return Math.random() * 100 < hitChance;
}

/**
 * Roll to determine if target dodges
 *
 * @param dodgeChance - Dodge chance percentage (0-100)
 * @returns true if dodged, false otherwise
 */
export function rollToDodge(dodgeChance: number): boolean {
  return Math.random() * 100 < dodgeChance;
}

/**
 * Roll to determine if attack is a critical hit
 * Note: Bash attacks cannot crit (always returns false)
 *
 * @param critChance - Crit chance percentage (0-100)
 * @param isBash - Whether this is a bash attack
 * @returns true if crit, false otherwise
 */
export function rollToCrit(critChance: number, isBash: boolean = false): boolean {
  // Bash attacks cannot crit
  if (isBash) {
    return false;
  }
  return Math.random() * 100 < critChance;
}

// ============================================================================
// AC-based Hit Check
// ============================================================================

/**
 * Check if a physical attack connects based on AC
 *
 * Roll d100. Required = 50 + (AttackerAccuracy - DefenderAC)
 * If roll >= required: hit
 *
 * @param attackerAccuracy - Attacker's accuracy (typically from DEX/level)
 * @param defenderAC - Defender's armor class
 * @returns true if attack connects, false if deflected by armor
 */
export function checkAcHit(attackerAccuracy: number, defenderAC: number): boolean {
  const roll = Math.floor(Math.random() * 100) + 1; // 1-100
  const required = 50 + (attackerAccuracy - defenderAC);
  return roll >= required;
}

// ============================================================================
// Helper Functions for User Stats
// ============================================================================

/**
 * Calculate dodge chance for a user with their race and class data
 */
export function calculateUserDodgeChance(
  user: User,
  raceData?: Race,
  classData?: CharacterClass
): number {
  const racialDodge = getRacialDodgeBonus(user.raceId ?? 'human', raceData);
  const classBonus = classData?.dodgeBonus ?? 0;

  return calculateDodgeChance(user.agility, racialDodge, classBonus);
}

/**
 * Calculate crit chance for a user
 */
export function calculateUserCritChance(
  user: User,
  raceData?: Race,
  isSpell: boolean = false
): number {
  const racialCritBonus = raceData?.bonuses?.critChance ? raceData.bonuses.critChance * 100 : 0;

  return calculateCritChance(user.dexterity, user.intelligence, isSpell, racialCritBonus);
}
