/**
 * Class Manager - Singleton for managing character classes
 * Handles class loading, requirements checking, and class advancement
 * @module class/classManager
 */

import { CharacterClass, User } from '../types';
import { getClassRepository } from '../persistence/RepositoryFactory';
import { IAsyncClassRepository } from '../persistence/interfaces';
import { createContextLogger } from '../utils/logger';

const classLogger = createContextLogger('ClassManager');

export interface ClassAdvancementResult {
  success: boolean;
  message: string;
  newClass?: CharacterClass;
}

export class ClassManager {
  private classes: Map<string, CharacterClass> = new Map();
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private repository: IAsyncClassRepository;

  private static instance: ClassManager | null = null;

  public static getInstance(): ClassManager {
    if (!ClassManager.instance) {
      ClassManager.instance = new ClassManager();
    }
    return ClassManager.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    ClassManager.instance = null;
  }

  private constructor(repository?: IAsyncClassRepository) {
    this.repository = repository ?? getClassRepository();
    this.initPromise = this.initialize();
  }

  /**
   * Async initialization - loads classes from repository
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.loadClasses();
    this.initialized = true;
    this.initPromise = null;
  }

  /**
   * Ensure the manager is initialized before performing operations
   */
  public async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  private async loadClasses(): Promise<void> {
    try {
      const classList = await this.repository.findAll();
      this.classes.clear();
      for (const cls of classList) {
        this.classes.set(cls.id, cls);
      }
      classLogger.info(`Loaded ${this.classes.size} classes`);
    } catch (error) {
      classLogger.error('Error loading classes:', error);
      this.classes.clear();
    }
  }

  /**
   * Get a class by its ID
   */
  public getClass(classId: string): CharacterClass | undefined {
    return this.classes.get(classId);
  }

  /**
   * Get all available classes
   */
  public getAllClasses(): CharacterClass[] {
    return Array.from(this.classes.values());
  }

  /**
   * Check if a class exists
   */
  public classExists(classId: string): boolean {
    return this.classes.has(classId);
  }

  /**
   * Get classes available for advancement from current class
   */
  public getAvailableAdvancements(currentClassId: string): CharacterClass[] {
    const currentClass = this.classes.get(currentClassId);
    if (!currentClass || currentClass.availableAdvancement.length === 0) {
      return [];
    }

    return currentClass.availableAdvancement
      .map((id) => this.classes.get(id))
      .filter((cls): cls is CharacterClass => cls !== undefined);
  }

  /**
   * Check if a user can advance to a specific class
   */
  public canAdvanceToClass(
    user: User,
    targetClassId: string,
    hasTrainerNpc: boolean,
    trainerType?: string
  ): { canAdvance: boolean; reason: string } {
    const targetClass = this.classes.get(targetClassId);
    if (!targetClass) {
      return { canAdvance: false, reason: 'Class does not exist.' };
    }

    // Check level requirement
    if (user.level < targetClass.requirements.level) {
      return {
        canAdvance: false,
        reason: `You must be level ${targetClass.requirements.level} to become a ${targetClass.name}. You are level ${user.level}.`,
      };
    }

    // Check previous class requirement
    const currentClassId = user.classId ?? 'adventurer';
    if (
      targetClass.requirements.previousClass &&
      currentClassId !== targetClass.requirements.previousClass
    ) {
      const requiredClass = this.classes.get(targetClass.requirements.previousClass);
      return {
        canAdvance: false,
        reason: `You must be a ${requiredClass?.name ?? targetClass.requirements.previousClass} to become a ${targetClass.name}.`,
      };
    }

    // Check if current class can advance to target class
    const currentClass = this.classes.get(currentClassId);
    if (!currentClass?.availableAdvancement.includes(targetClassId)) {
      return {
        canAdvance: false,
        reason: `A ${currentClass?.name ?? currentClassId} cannot become a ${targetClass.name}.`,
      };
    }

    // Check quest flag requirement (tier 2)
    if (targetClass.requirements.questFlag) {
      const userQuestFlags = user.questFlags ?? [];
      if (!userQuestFlags.includes(targetClass.requirements.questFlag)) {
        return {
          canAdvance: false,
          reason: `You have not completed the ${targetClass.name} trial quest.`,
        };
      }
    }

    // Check trainer NPC requirement
    if (targetClass.requirements.trainerType) {
      if (!hasTrainerNpc) {
        return {
          canAdvance: false,
          reason: `You need to find a ${targetClass.name} trainer to learn this class.`,
        };
      }
      if (trainerType && trainerType !== targetClass.requirements.trainerType) {
        return {
          canAdvance: false,
          reason: `This trainer cannot teach you to become a ${targetClass.name}.`,
        };
      }
    }

    return { canAdvance: true, reason: 'All requirements met.' };
  }

  /**
   * Get class stat bonuses
   */
  public getClassStatBonuses(classId: string): CharacterClass['statBonuses'] | null {
    const cls = this.classes.get(classId);
    if (!cls) return null;
    return cls.statBonuses;
  }

  /**
   * Calculate total stat bonuses from class history
   * This sums up bonuses from all classes the user has been
   */
  public getTotalClassBonuses(classHistory: string[]): CharacterClass['statBonuses'] {
    const totals = {
      maxHealth: 0,
      maxMana: 0,
      attack: 0,
      defense: 0,
    };

    for (const classId of classHistory) {
      const bonuses = this.getClassStatBonuses(classId);
      if (bonuses) {
        totals.maxHealth += bonuses.maxHealth;
        totals.maxMana += bonuses.maxMana;
        totals.attack += bonuses.attack;
        totals.defense += bonuses.defense;
      }
    }

    return totals;
  }

  /**
   * Get display name for a class
   */
  public getClassName(classId: string): string {
    const cls = this.classes.get(classId);
    return cls?.name ?? classId;
  }

  /**
   * Get class tier
   */
  public getClassTier(classId: string): number {
    const cls = this.classes.get(classId);
    return cls?.tier ?? 0;
  }

  /**
   * Get all tier 1 classes (for display purposes)
   */
  public getTier1Classes(): CharacterClass[] {
    return Array.from(this.classes.values()).filter((cls) => cls.tier === 1);
  }

  /**
   * Get all tier 2 classes (for display purposes)
   */
  public getTier2Classes(): CharacterClass[] {
    return Array.from(this.classes.values()).filter((cls) => cls.tier === 2);
  }
}
