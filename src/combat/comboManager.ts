/**
 * Combo Point Manager - Tracks combo points for thief/rogue classes
 *
 * Manages combo point generation, consumption, and clearing.
 * Combo points are built on a specific target and reset when:
 * - Target dies
 * - Combat ends
 * - Player attacks a different target
 *
 * @module combat/comboManager
 */

import { User } from '../types';
import { MAX_COMBO_POINTS } from '../abilities/types';
import { createContextLogger } from '../utils/logger';

const comboLogger = createContextLogger('ComboManager');

/**
 * Result of a combo point operation
 */
export interface ComboPointResult {
  success: boolean;
  previousPoints: number;
  newPoints: number;
  targetId: string | undefined;
  message?: string;
}

/**
 * Singleton manager for combo point tracking
 */
export class ComboManager {
  private static instance: ComboManager | null = null;

  public static getInstance(): ComboManager {
    if (!ComboManager.instance) {
      ComboManager.instance = new ComboManager();
    }
    return ComboManager.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    ComboManager.instance = null;
  }

  private constructor() {
    comboLogger.info('ComboManager initialized');
  }

  /**
   * Get the current combo points for a user
   */
  public getComboPoints(user: User): number {
    return user.comboPoints ?? 0;
  }

  /**
   * Get the current combo target for a user
   */
  public getComboTarget(user: User): string | undefined {
    return user.comboTarget;
  }

  /**
   * Add combo points to a user's current target
   *
   * @param user - The user generating combo points
   * @param targetId - The target the points are being built on
   * @param amount - Number of points to add (typically 1-2)
   * @returns Result with previous and new point counts
   */
  public addComboPoints(user: User, targetId: string, amount: number): ComboPointResult {
    const previousPoints = user.comboPoints ?? 0;
    const previousTarget = user.comboTarget;

    // If attacking a different target, reset combo points
    if (previousTarget && previousTarget !== targetId) {
      comboLogger.debug(
        `${user.username} switched targets from ${previousTarget} to ${targetId}, resetting combo`
      );
      user.comboPoints = 0;
      user.comboTarget = targetId;
    }

    // Set the target
    user.comboTarget = targetId;

    // Add points, capped at MAX_COMBO_POINTS
    const newPoints = Math.min(MAX_COMBO_POINTS, (user.comboPoints ?? 0) + amount);
    user.comboPoints = newPoints;

    if (newPoints > previousPoints) {
      comboLogger.debug(
        `${user.username} gained ${amount} combo point(s) on ${targetId}: ${previousPoints} -> ${newPoints}`
      );
    }

    return {
      success: true,
      previousPoints: previousTarget === targetId ? previousPoints : 0,
      newPoints,
      targetId,
    };
  }

  /**
   * Consume all combo points for a finisher ability
   *
   * @param user - The user consuming combo points
   * @param targetId - The target the finisher is used on (must match combo target)
   * @returns Result with points consumed, or failure if target mismatch
   */
  public consumeComboPoints(user: User, targetId: string): ComboPointResult {
    const currentPoints = user.comboPoints ?? 0;
    const currentTarget = user.comboTarget;

    // Finishers require at least 1 combo point
    if (currentPoints === 0) {
      return {
        success: false,
        previousPoints: 0,
        newPoints: 0,
        targetId: currentTarget,
        message: 'You have no combo points.',
      };
    }

    // Finishers must target the same entity the combo was built on
    if (currentTarget && currentTarget !== targetId) {
      return {
        success: false,
        previousPoints: currentPoints,
        newPoints: currentPoints,
        targetId: currentTarget,
        message: `Your combo is built on a different target.`,
      };
    }

    // Consume all points
    user.comboPoints = 0;
    // Keep the target in case they want to build more points

    comboLogger.debug(`${user.username} consumed ${currentPoints} combo points on ${targetId}`);

    return {
      success: true,
      previousPoints: currentPoints,
      newPoints: 0,
      targetId,
    };
  }

  /**
   * Clear combo points for a user (called on combat end, target death, etc.)
   *
   * @param user - The user to clear combo for
   * @param reason - Reason for clearing (for logging)
   */
  public clearComboPoints(user: User, reason: string): void {
    const previousPoints = user.comboPoints ?? 0;
    const previousTarget = user.comboTarget;

    if (previousPoints > 0 || previousTarget) {
      user.comboPoints = 0;
      user.comboTarget = undefined;

      comboLogger.debug(
        `${user.username} combo cleared (${previousPoints} points on ${previousTarget}): ${reason}`
      );
    }
  }

  /**
   * Called when a target dies to clear combo points for all players targeting it
   *
   * @param targetId - The target that died
   * @param users - Array of users to check
   */
  public onTargetDeath(targetId: string, users: User[]): void {
    for (const user of users) {
      if (user.comboTarget === targetId) {
        this.clearComboPoints(user, 'target died');
      }
    }
  }

  /**
   * Called when combat ends for a user
   *
   * @param user - The user whose combat ended
   */
  public onCombatEnd(user: User): void {
    this.clearComboPoints(user, 'combat ended');
  }

  /**
   * Check if user has enough combo points for a finisher
   *
   * @param user - The user to check
   * @param minPoints - Minimum points required (default 1)
   */
  public hasComboPoints(user: User, minPoints: number = 1): boolean {
    return (user.comboPoints ?? 0) >= minPoints;
  }

  /**
   * Calculate finisher damage based on combo points
   *
   * @param user - The user using the finisher
   * @param baseDamage - Base damage of the finisher
   * @param damagePerPoint - Additional damage per combo point
   * @returns Calculated total damage
   */
  public calculateFinisherDamage(user: User, baseDamage: number, damagePerPoint: number): number {
    const comboPoints = user.comboPoints ?? 0;
    return baseDamage + damagePerPoint * comboPoints;
  }

  /**
   * Get a display string for combo points (for UI)
   *
   * @param user - The user to get display for
   * @returns String like "3" or empty if no combo points
   */
  public getComboDisplay(user: User): string {
    const points = user.comboPoints ?? 0;
    return points > 0 ? String(points) : '';
  }
}
