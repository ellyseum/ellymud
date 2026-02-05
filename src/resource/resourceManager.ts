/**
 * Resource Manager - Singleton for managing character resources (mana, rage, energy, etc.)
 *
 * Handles resource calculation, modification, and tick processing for all resource types.
 * Different classes have different resource types with unique behaviors.
 *
 * @module resource/resourceManager
 */

import { User, ResourceType, CharacterClass } from '../types';
import { ClassManager } from '../class/classManager';
import {
  calculateMaxMana,
  calculateMaxKi,
  calculateMaxNature,
  getResourceDisplayAbbr,
  RAGE_MAX,
  ENERGY_MAX,
} from '../utils/statCalculator';
import { createContextLogger } from '../utils/logger';

const resourceLogger = createContextLogger('ResourceManager');

/**
 * Resource regen rates per tick (game timer tick, default 72 seconds)
 */
export const RESOURCE_REGEN_RATES = {
  /** Base mana regen per tick */
  MANA_BASE_REGEN: 4,
  /** Mana regen per 10 INT */
  MANA_INT_BONUS: 1,
  /** Mana meditation multiplier */
  MANA_MEDITATION_MULTIPLIER: 2,

  /** Energy regen per tick (fixed, fast) */
  ENERGY_REGEN: 25,

  /** Rage decay per tick out of combat */
  RAGE_DECAY: 5,
  /** Rage gained when dealing damage */
  RAGE_ON_HIT_DEALT: 10,
  /** Rage gained when taking damage */
  RAGE_ON_HIT_TAKEN: 15,

  /** Base ki regen per tick */
  KI_BASE_REGEN: 3,
  /** Ki regen per 10 WIS */
  KI_WIS_BONUS: 1,
  /** Ki meditation multiplier */
  KI_MEDITATION_MULTIPLIER: 3,

  /** Holy charge regen (1 charge per N ticks) */
  HOLY_TICKS_PER_CHARGE: 5, // 1 charge per ~6 minutes

  /** Base nature regen per tick */
  NATURE_BASE_REGEN: 3,
  /** Nature regen per 10 WIS */
  NATURE_WIS_BONUS: 1,
};

/**
 * Result of a resource modification operation
 */
export interface ResourceModifyResult {
  success: boolean;
  previousValue: number;
  newValue: number;
  maxValue: number;
  amountChanged: number;
}

export class ResourceManager {
  private classManager: ClassManager;
  private static instance: ResourceManager | null = null;
  /** Tracks holy charge progress per user (for charge-based resource system) */
  private holyChargeProgress: Map<string, number> = new Map();

  public static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    ResourceManager.instance = null;
  }

  private constructor() {
    this.classManager = ClassManager.getInstance();
  }

  /**
   * Get the resource type for a user based on their class
   */
  public getResourceType(user: User): ResourceType {
    const classId = user.classId ?? 'adventurer';
    const classData = this.classManager.getClass(classId);

    if (!classData) {
      return ResourceType.NONE;
    }

    return classData.resourceType ?? ResourceType.NONE;
  }

  /**
   * Get the display abbreviation for a user's resource
   * Returns empty string for NONE resource type
   */
  public getResourceDisplay(user: User): string {
    const resourceType = this.getResourceType(user);
    return getResourceDisplayAbbr(resourceType);
  }

  /**
   * Calculate the maximum resource value for a user
   */
  public calculateMaxResource(user: User): number {
    const resourceType = this.getResourceType(user);
    const classId = user.classId ?? 'adventurer';
    const classData = this.classManager.getClass(classId);

    switch (resourceType) {
      case ResourceType.NONE:
        return 0;

      case ResourceType.MANA:
        return calculateMaxMana(user.intelligence, user.wisdom);

      case ResourceType.RAGE:
        return classData?.resourceConfig?.maxFixed ?? RAGE_MAX;

      case ResourceType.ENERGY:
        return classData?.resourceConfig?.maxFixed ?? ENERGY_MAX;

      case ResourceType.KI:
        return calculateMaxKi(user.wisdom);

      case ResourceType.HOLY:
        return classData?.resourceConfig?.maxFixed ?? 5;

      case ResourceType.NATURE:
        return calculateMaxNature(user.wisdom);

      default:
        return 0;
    }
  }

  /**
   * Get the current resource value for a user
   * Falls back to mana for backward compatibility
   */
  public getCurrentResource(user: User): number {
    const resourceType = this.getResourceType(user);

    if (resourceType === ResourceType.NONE) {
      return 0;
    }

    // For mana type, use existing mana field for backward compatibility
    if (resourceType === ResourceType.MANA) {
      return user.mana ?? 0;
    }

    // For other resource types, use the generic resource field
    return user.resource ?? 0;
  }

  /**
   * Modify a user's resource by a given amount
   *
   * @param user - User to modify
   * @param amount - Amount to add (positive) or subtract (negative)
   * @param source - Source of the modification for logging
   * @returns Result with old/new values and whether modification succeeded
   */
  public modifyResource(
    user: User,
    amount: number,
    source: string = 'unknown'
  ): ResourceModifyResult {
    const resourceType = this.getResourceType(user);
    const maxResource = this.calculateMaxResource(user);
    const previousValue = this.getCurrentResource(user);

    if (resourceType === ResourceType.NONE) {
      return {
        success: false,
        previousValue: 0,
        newValue: 0,
        maxValue: 0,
        amountChanged: 0,
      };
    }

    // Calculate new value, clamped to [0, max]
    let newValue = previousValue + amount;
    newValue = Math.max(0, Math.min(maxResource, newValue));

    const actualChange = newValue - previousValue;

    // Update the user object
    if (resourceType === ResourceType.MANA) {
      user.mana = newValue;
      user.maxMana = maxResource;
    } else {
      user.resource = newValue;
      user.maxResource = maxResource;
    }

    if (actualChange !== 0) {
      resourceLogger.debug(
        `${user.username} ${resourceType} ${actualChange > 0 ? '+' : ''}${actualChange} (${previousValue} -> ${newValue}/${maxResource}) [${source}]`
      );
    }

    return {
      success: true,
      previousValue,
      newValue,
      maxValue: maxResource,
      amountChanged: actualChange,
    };
  }

  /**
   * Check if user has enough resource for an ability cost
   */
  public hasResource(user: User, cost: number): boolean {
    return this.getCurrentResource(user) >= cost;
  }

  /**
   * Spend resource (subtract if available)
   * Returns true if successful, false if not enough resource
   */
  public spendResource(user: User, cost: number, source: string = 'ability'): boolean {
    if (!this.hasResource(user, cost)) {
      return false;
    }

    this.modifyResource(user, -cost, source);
    return true;
  }

  /**
   * Process resource regeneration/decay for a single tick
   *
   * Called by GameTimerManager on each game tick.
   * Different resource types have different regen behaviors.
   *
   * @param user - User to process
   * @param inCombat - Whether the user is currently in combat
   * @returns Amount of resource changed
   */
  public processResourceTick(user: User, inCombat: boolean): number {
    const resourceType = this.getResourceType(user);

    if (resourceType === ResourceType.NONE) {
      return 0;
    }

    let regenAmount = 0;

    switch (resourceType) {
      case ResourceType.MANA:
        regenAmount = this.calculateManaRegen(user);
        break;

      case ResourceType.RAGE:
        // Rage decays out of combat, does NOT regen
        if (!inCombat) {
          const decayRate =
            this.getClassConfig(user)?.decayPerTick ?? RESOURCE_REGEN_RATES.RAGE_DECAY;
          regenAmount = -decayRate;
        }
        break;

      case ResourceType.ENERGY:
        // Energy regens constantly at a fixed rate
        regenAmount = RESOURCE_REGEN_RATES.ENERGY_REGEN;
        break;

      case ResourceType.KI:
        regenAmount = this.calculateKiRegen(user);
        break;

      case ResourceType.HOLY:
        // Holy uses charge system, handled separately
        regenAmount = this.processHolyCharge(user);
        break;

      case ResourceType.NATURE:
        regenAmount = this.calculateNatureRegen(user, inCombat);
        break;
    }

    if (regenAmount !== 0) {
      const result = this.modifyResource(user, regenAmount, 'tick_regen');
      return result.amountChanged;
    }

    return 0;
  }

  /**
   * Calculate mana regen amount for a tick
   */
  private calculateManaRegen(user: User): number {
    const baseRegen = RESOURCE_REGEN_RATES.MANA_BASE_REGEN;
    const intBonus = Math.floor(user.intelligence / 10) * RESOURCE_REGEN_RATES.MANA_INT_BONUS;

    let totalRegen = baseRegen + intBonus;

    // Meditation doubles mana regen
    if (user.isMeditating) {
      totalRegen *= RESOURCE_REGEN_RATES.MANA_MEDITATION_MULTIPLIER;
    }

    return totalRegen;
  }

  /**
   * Calculate ki regen amount for a tick
   */
  private calculateKiRegen(user: User): number {
    const baseRegen = RESOURCE_REGEN_RATES.KI_BASE_REGEN;
    const wisBonus = Math.floor(user.wisdom / 10) * RESOURCE_REGEN_RATES.KI_WIS_BONUS;

    let totalRegen = baseRegen + wisBonus;

    // Meditation triples ki regen
    if (user.isMeditating) {
      totalRegen *= RESOURCE_REGEN_RATES.KI_MEDITATION_MULTIPLIER;
    }

    return totalRegen;
  }

  /**
   * Calculate nature regen amount for a tick
   * Nature has bonus regen in outdoor rooms (not implemented yet)
   */
  private calculateNatureRegen(user: User, _inCombat: boolean): number {
    const baseRegen = RESOURCE_REGEN_RATES.NATURE_BASE_REGEN;
    const wisBonus = Math.floor(user.wisdom / 10) * RESOURCE_REGEN_RATES.NATURE_WIS_BONUS;

    // TODO: Add bonus for outdoor rooms when room flags are implemented
    return baseRegen + wisBonus;
  }

  /**
   * Process holy charge regeneration
   * Holy power uses charges that regen over time
   */
  private processHolyCharge(user: User): number {
    // Track partial charge progress using a Map to avoid type issues
    const progress = this.holyChargeProgress.get(user.username) ?? 0;
    const newProgress = progress + 1;

    if (newProgress >= RESOURCE_REGEN_RATES.HOLY_TICKS_PER_CHARGE) {
      // Reset progress and add a charge
      this.holyChargeProgress.set(user.username, 0);
      return 1;
    } else {
      // Increment progress
      this.holyChargeProgress.set(user.username, newProgress);
      return 0;
    }
  }

  /**
   * Handle rage building when dealing damage
   */
  public onDamageDealt(user: User, _damageAmount: number): void {
    const resourceType = this.getResourceType(user);

    if (resourceType === ResourceType.RAGE) {
      const gainAmount =
        this.getClassConfig(user)?.gainOnHitDealt ?? RESOURCE_REGEN_RATES.RAGE_ON_HIT_DEALT;
      this.modifyResource(user, gainAmount, 'damage_dealt');
    }
  }

  /**
   * Handle rage building when taking damage
   */
  public onDamageTaken(user: User, _damageAmount: number): void {
    const resourceType = this.getResourceType(user);

    if (resourceType === ResourceType.RAGE) {
      const gainAmount =
        this.getClassConfig(user)?.gainOnHitTaken ?? RESOURCE_REGEN_RATES.RAGE_ON_HIT_TAKEN;
      this.modifyResource(user, gainAmount, 'damage_taken');
    }
  }

  /**
   * Get resource configuration from class data
   */
  private getClassConfig(user: User): CharacterClass['resourceConfig'] | undefined {
    const classId = user.classId ?? 'adventurer';
    const classData = this.classManager.getClass(classId);
    return classData?.resourceConfig;
  }

  /**
   * Initialize resource for a user when they select a class
   * Sets resource to max for the new class
   */
  public initializeResource(user: User): void {
    const resourceType = this.getResourceType(user);
    const maxResource = this.calculateMaxResource(user);

    if (resourceType === ResourceType.NONE) {
      // Clear resource fields for no-resource classes
      user.resource = undefined;
      user.maxResource = undefined;
      return;
    }

    // For mana, also update legacy mana fields
    if (resourceType === ResourceType.MANA) {
      user.mana = maxResource;
      user.maxMana = maxResource;
    }

    // For all resource types, set the generic fields too
    user.resource = maxResource;
    user.maxResource = maxResource;

    resourceLogger.info(
      `Initialized ${resourceType} for ${user.username}: ${maxResource}/${maxResource}`
    );
  }

  /**
   * Fully restore a user's resource to max
   */
  public restoreResource(user: User): void {
    const maxResource = this.calculateMaxResource(user);
    const resourceType = this.getResourceType(user);

    if (resourceType === ResourceType.NONE) {
      return;
    }

    if (resourceType === ResourceType.MANA) {
      user.mana = maxResource;
      user.maxMana = maxResource;
    }

    user.resource = maxResource;
    user.maxResource = maxResource;
  }
}
