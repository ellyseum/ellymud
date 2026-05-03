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
import { getResourceDisplayAbbr } from '../utils/statCalculator';
import { createContextLogger } from '../utils/logger';
import { getStat } from '../ruleset/safeAccess';
import { RulesetRegistry } from '../ruleset/rulesetRegistry';
import { NO_RESOURCE, ResourcePoolDefinition } from '../ruleset/resourceTypes';

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
  /** Per-user, per-pool, per-cadence accumulator for `every_n_ticks` rules. */
  private regenProgress: Map<string, number> = new Map();

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
   * Calculate the maximum resource value for a user. Reads the active
   * ruleset's pool definition; per-class `resourceConfig.maxFixed` wins
   * over the pool default so existing class-level overrides survive
   * (e.g., a class can declare its own max for a shared pool).
   */
  public calculateMaxResource(user: User): number {
    const resourceType = this.getResourceType(user);
    if (resourceType === NO_RESOURCE) return 0;

    const pool = RulesetRegistry.getInstance().getResourcePool(resourceType);
    if (!pool) return 0;

    const classId = user.classId ?? 'adventurer';
    const classData = this.classManager.getClass(classId);
    const classOverride = classData?.resourceConfig?.maxFixed;
    if (typeof classOverride === 'number') return classOverride;

    return computeMaxFromPool(user, pool);
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
    if (resourceType === NO_RESOURCE) return 0;

    const pool = RulesetRegistry.getInstance().getResourcePool(resourceType);
    if (!pool) return 0;

    let regenAmount = 0;

    // Out-of-combat decay (rage today): defined on the pool, not in regen.
    if (!inCombat && typeof pool.decayPerTickOutOfCombat === 'number') {
      const classDecay = this.getClassConfig(user)?.decayPerTick;
      regenAmount = -(classDecay ?? pool.decayPerTickOutOfCombat);
    }

    // Tick regen amount, if any. The pool's meditation multiplier scales the
    // amount when the player is meditating (matches today's mana/ki behavior).
    if (pool.regen.tickRegen) {
      const tickAmount = this.evaluateTickRegen(user, pool);
      regenAmount += tickAmount;
    }

    if (regenAmount !== 0) {
      const result = this.modifyResource(user, regenAmount, 'tick_regen');
      return result.amountChanged;
    }
    return 0;
  }

  /**
   * Per-fire amount for a regen rule. Used by the tick path here and by the
   * timer-driven sub/full regen path that hands us a specific schedule slot.
   */
  public applyRegen(
    user: User,
    pool: ResourcePoolDefinition,
    cadence: 'tickRegen' | 'subRegen' | 'fullRegen'
  ): number {
    const rule = pool.regen[cadence];
    if (!rule) return 0;
    return evaluateRegenRule(user, rule, this.cadenceProgressKey(user, pool, cadence));
  }

  private evaluateTickRegen(user: User, pool: ResourcePoolDefinition): number {
    const base = evaluateRegenRule(
      user,
      pool.regen.tickRegen!,
      this.cadenceProgressKey(user, pool, 'tickRegen')
    );
    if (user.isMeditating && typeof pool.meditationMultiplier === 'number') {
      return base * pool.meditationMultiplier;
    }
    return base;
  }

  /** Per-user, per-pool, per-cadence progress key for `every_n_ticks` rules. */
  private cadenceProgressKey(
    user: User,
    pool: ResourcePoolDefinition,
    cadence: 'tickRegen' | 'subRegen' | 'fullRegen'
  ): { get: () => number; set: (v: number) => void } {
    const key = `${user.username}|${pool.id}|${cadence}`;
    return {
      get: () => this.regenProgress.get(key) ?? 0,
      set: (v) => this.regenProgress.set(key, v),
    };
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

function computeMaxFromPool(user: User, pool: ResourcePoolDefinition): number {
  const sizing = pool.sizing;
  if (sizing.kind === 'fixed') return sizing.value;
  // sizing.kind === 'derived'
  let total = sizing.base;
  for (const term of sizing.terms) {
    total += getStat(user, term.statId) * term.perPoint;
  }
  return total;
}

/**
 * Compute the per-fire amount of a regen rule. `progress` is provided by the
 * caller for `every_n_ticks` rules so the accumulator can be persisted per
 * (user, pool, cadence) tuple. Other regen kinds ignore it.
 */
function evaluateRegenRule(
  user: User,
  rule: NonNullable<ResourcePoolDefinition['regen']['tickRegen']>,
  progress: { get: () => number; set: (v: number) => void }
): number {
  if (rule.kind === 'none') return 0;

  if (rule.kind === 'percent') {
    // The pool max isn't known here without circular access; the caller is
    // expected to scale by max separately if needed. For now `percent` returns
    // the fractional rate and callers multiply by max — currently unused by
    // the default fantasy ruleset.
    return rule.perTickPct;
  }

  if (rule.kind === 'flat') {
    let total = rule.perTick;
    if (rule.statBonuses) {
      for (const term of rule.statBonuses) {
        const summed = term.statIds.reduce((s, id) => s + getStat(user, id), 0);
        total += Math.floor(summed / term.divisor) * term.bonus;
      }
    }
    return total;
  }

  // every_n_ticks
  const next = progress.get() + 1;
  if (next >= rule.ticksPerCharge) {
    progress.set(0);
    return rule.chargesPerInterval;
  }
  progress.set(next);
  return 0;
}
