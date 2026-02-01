/**
 * Race Manager - Singleton for managing character races
 * Handles race loading, stat modifier calculation, and race bonuses
 * @module race/raceManager
 */

import { Race } from '../types';
import { getRaceRepository } from '../persistence/RepositoryFactory';
import { IAsyncRaceRepository } from '../persistence/interfaces';
import { createContextLogger } from '../utils/logger';

const raceLogger = createContextLogger('RaceManager');

export class RaceManager {
  private races: Map<string, Race> = new Map();
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private repository: IAsyncRaceRepository;

  private static instance: RaceManager | null = null;

  public static getInstance(): RaceManager {
    if (!RaceManager.instance) {
      RaceManager.instance = new RaceManager();
    }
    return RaceManager.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    RaceManager.instance = null;
  }

  private constructor(repository?: IAsyncRaceRepository) {
    this.repository = repository ?? getRaceRepository();
    this.initPromise = this.initialize();
  }

  /**
   * Async initialization - loads races from repository
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.loadRaces();
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

  private async loadRaces(): Promise<void> {
    try {
      const raceList = await this.repository.findAll();
      this.races.clear();
      for (const race of raceList) {
        this.races.set(race.id, race);
      }
      raceLogger.info(`Loaded ${this.races.size} races`);
    } catch (error) {
      raceLogger.error('Error loading races:', error);
      this.races.clear();
    }
  }

  /**
   * Get a race by its ID
   */
  public getRace(raceId: string): Race | undefined {
    return this.races.get(raceId);
  }

  /**
   * Get all available races
   */
  public getAllRaces(): Race[] {
    return Array.from(this.races.values());
  }

  /**
   * Check if a race exists
   */
  public raceExists(raceId: string): boolean {
    return this.races.has(raceId);
  }

  /**
   * Get stat modifiers for a race
   */
  public getStatModifiers(raceId: string): Race['statModifiers'] | null {
    const race = this.races.get(raceId);
    if (!race) return null;
    return race.statModifiers;
  }

  /**
   * Apply race stat modifiers to base stats
   */
  public applyStatModifiers(
    baseStats: {
      strength: number;
      dexterity: number;
      agility: number;
      constitution: number;
      wisdom: number;
      intelligence: number;
      charisma: number;
    },
    raceId: string
  ): typeof baseStats {
    const modifiers = this.getStatModifiers(raceId);
    if (!modifiers) return baseStats;

    return {
      strength: baseStats.strength + modifiers.strength,
      dexterity: baseStats.dexterity + modifiers.dexterity,
      agility: baseStats.agility + modifiers.agility,
      constitution: baseStats.constitution + modifiers.constitution,
      wisdom: baseStats.wisdom + modifiers.wisdom,
      intelligence: baseStats.intelligence + modifiers.intelligence,
      charisma: baseStats.charisma + modifiers.charisma,
    };
  }

  /**
   * Get race bonuses
   */
  public getRaceBonuses(raceId: string): Race['bonuses'] | null {
    const race = this.races.get(raceId);
    if (!race) return null;
    return race.bonuses;
  }

  /**
   * Calculate XP with race bonus applied
   */
  public applyXpBonus(baseXp: number, raceId: string): number {
    const bonuses = this.getRaceBonuses(raceId);
    if (!bonuses || !bonuses.xpGain) return baseXp;
    return Math.floor(baseXp * (1 + bonuses.xpGain));
  }

  /**
   * Calculate max health with race bonus applied
   */
  public applyHealthBonus(baseHealth: number, raceId: string): number {
    const bonuses = this.getRaceBonuses(raceId);
    if (!bonuses || !bonuses.maxHealth) return baseHealth;
    return Math.floor(baseHealth * (1 + bonuses.maxHealth));
  }

  /**
   * Calculate max mana with race bonus applied
   */
  public applyManaBonus(baseMana: number, raceId: string): number {
    const bonuses = this.getRaceBonuses(raceId);
    if (!bonuses || !bonuses.maxMana) return baseMana;
    return Math.floor(baseMana * (1 + bonuses.maxMana));
  }

  /**
   * Get display name for a race
   */
  public getRaceName(raceId: string): string {
    const race = this.races.get(raceId);
    return race?.name ?? raceId;
  }
}
