/**
 * Class Ability Service - Resolves which abilities a class can use
 *
 * Handles class-ability binding, inheritance, and ability learning.
 * Different classes have unique ability pools that define their playstyle.
 *
 * @module class/classAbilityService
 */

import { User } from '../types';
import { AbilityTemplate } from '../abilities/types';
import { ClassManager } from './classManager';
import { AbilityManager } from '../abilities/abilityManager';
import { createContextLogger } from '../utils/logger';

const abilityServiceLogger = createContextLogger('ClassAbilityService');

/**
 * Service for managing class-ability relationships
 */
export class ClassAbilityService {
  private static instance: ClassAbilityService | null = null;
  private classManager: ClassManager;

  public static getInstance(): ClassAbilityService {
    if (!ClassAbilityService.instance) {
      ClassAbilityService.instance = new ClassAbilityService();
    }
    return ClassAbilityService.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    ClassAbilityService.instance = null;
  }

  private constructor() {
    this.classManager = ClassManager.getInstance();
  }

  /**
   * Get all ability IDs available to a user based on their class and inheritance
   *
   * @param user - The user to check abilities for
   * @returns Array of ability IDs the user can use
   */
  public getAvailableAbilityIds(user: User): string[] {
    const classId = user.classId ?? 'adventurer';
    const classData = this.classManager.getClass(classId);

    if (!classData) {
      return [];
    }

    // Start with current class abilities
    const abilityIds = new Set<string>(classData.abilities ?? []);

    // If inherited abilities enabled, walk up the class history
    if (classData.inheritedAbilities && user.classHistory) {
      for (const historyClassId of user.classHistory) {
        if (historyClassId === classId) continue; // Skip current class
        const historyClass = this.classManager.getClass(historyClassId);
        if (historyClass?.abilities) {
          for (const abilityId of historyClass.abilities) {
            abilityIds.add(abilityId);
          }
        }
      }
    }

    return Array.from(abilityIds);
  }

  /**
   * Get full AbilityTemplate objects available to a user
   *
   * @param user - The user to check abilities for
   * @param abilityManager - AbilityManager instance to resolve templates
   * @returns Array of AbilityTemplate objects
   */
  public getAvailableAbilities(user: User, abilityManager: AbilityManager): AbilityTemplate[] {
    const abilityIds = this.getAvailableAbilityIds(user);
    const abilities: AbilityTemplate[] = [];

    for (const abilityId of abilityIds) {
      const ability = abilityManager.getAbility(abilityId);
      if (ability) {
        abilities.push(ability);
      }
    }

    return abilities;
  }

  /**
   * Check if a user's class can use a specific ability
   *
   * @param user - The user to check
   * @param ability - The ability to check
   * @returns Object with canUse boolean and optional reason
   */
  public canClassUseAbility(
    user: User,
    ability: AbilityTemplate
  ): { canUse: boolean; reason?: string } {
    // If no class restrictions, anyone can use it
    if (!ability.classRestrictions || ability.classRestrictions.length === 0) {
      return { canUse: true };
    }

    const classId = user.classId ?? 'adventurer';

    // Check if current class is in the restriction list
    if (ability.classRestrictions.includes(classId)) {
      return { canUse: true };
    }

    // Check if any class in history is in the restriction list (for inherited abilities)
    if (user.classHistory) {
      for (const historyClassId of user.classHistory) {
        if (ability.classRestrictions.includes(historyClassId)) {
          // Verify that current class allows inherited abilities
          const currentClass = this.classManager.getClass(classId);
          if (currentClass?.inheritedAbilities) {
            return { canUse: true };
          }
        }
      }
    }

    // Build a readable list of allowed classes
    const allowedClassNames = ability.classRestrictions
      .map((id) => this.classManager.getClassName(id))
      .join(', ');

    return {
      canUse: false,
      reason: `Only ${allowedClassNames} can use this ability.`,
    };
  }

  /**
   * Called when a user changes class to update their available abilities
   *
   * @param user - The user who changed class
   * @param newClassId - The new class ID
   */
  public onClassChange(user: User, newClassId: string): void {
    const newClass = this.classManager.getClass(newClassId);

    if (!newClass) {
      abilityServiceLogger.warn(`Class change to unknown class: ${newClassId}`);
      return;
    }

    const newAbilityCount = newClass.abilities?.length ?? 0;

    abilityServiceLogger.info(
      `${user.username} changed to ${newClass.name}, now has access to ${newAbilityCount} class abilities` +
        (newClass.inheritedAbilities ? ' (plus inherited abilities)' : '')
    );
  }

  /**
   * Get the inheritance chain for a class (for displaying ability sources)
   *
   * @param classId - The class to get inheritance for
   * @returns Array of class IDs in inheritance order (current first)
   */
  public getClassInheritanceChain(classId: string): string[] {
    const chain: string[] = [classId];
    const classData = this.classManager.getClass(classId);

    if (!classData?.inheritedAbilities) {
      return chain;
    }

    // Walk up the requirements chain
    let currentClass = classData;
    while (currentClass.requirements.previousClass) {
      const parentId = currentClass.requirements.previousClass;
      chain.push(parentId);
      const parentClass = this.classManager.getClass(parentId);
      if (!parentClass) break;
      currentClass = parentClass;
    }

    return chain;
  }

  /**
   * Get abilities grouped by the class they come from (for UI display)
   *
   * @param user - The user to check
   * @param abilityManager - AbilityManager instance
   * @returns Map of class ID to array of abilities from that class
   */
  public getAbilitiesBySourceClass(
    user: User,
    abilityManager: AbilityManager
  ): Map<string, AbilityTemplate[]> {
    const result = new Map<string, AbilityTemplate[]>();
    const classId = user.classId ?? 'adventurer';
    const classData = this.classManager.getClass(classId);

    if (!classData) {
      return result;
    }

    // Add current class abilities
    const currentClassAbilities: AbilityTemplate[] = [];
    for (const abilityId of classData.abilities ?? []) {
      const ability = abilityManager.getAbility(abilityId);
      if (ability) {
        currentClassAbilities.push(ability);
      }
    }
    if (currentClassAbilities.length > 0) {
      result.set(classId, currentClassAbilities);
    }

    // Add inherited abilities if enabled
    if (classData.inheritedAbilities && user.classHistory) {
      for (const historyClassId of user.classHistory) {
        if (historyClassId === classId) continue;
        const historyClass = this.classManager.getClass(historyClassId);
        if (!historyClass?.abilities) continue;

        const inheritedAbilities: AbilityTemplate[] = [];
        for (const abilityId of historyClass.abilities) {
          const ability = abilityManager.getAbility(abilityId);
          if (ability) {
            inheritedAbilities.push(ability);
          }
        }
        if (inheritedAbilities.length > 0) {
          result.set(historyClassId, inheritedAbilities);
        }
      }
    }

    return result;
  }
}
