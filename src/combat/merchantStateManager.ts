/**
 * Merchant State Manager
 * Persists and restores merchant inventory state across server restarts
 */
import { systemLogger } from '../utils/logger';
import { MerchantInventoryState } from './merchant';
import { getMerchantStateRepository } from '../persistence/RepositoryFactory';
import { IAsyncMerchantStateRepository } from '../persistence/interfaces';

export class MerchantStateManager {
  private static instance: MerchantStateManager | null = null;
  private merchantStates: Map<string, MerchantInventoryState> = new Map();
  private repository: IAsyncMerchantStateRepository;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    this.repository = getMerchantStateRepository();
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.loadState();
    this.initialized = true;
    this.initPromise = null;
  }

  public async ensureInitialized(): Promise<void> {
    if (this.initPromise) await this.initPromise;
  }

  public static getInstance(): MerchantStateManager {
    if (!MerchantStateManager.instance) {
      MerchantStateManager.instance = new MerchantStateManager();
    }
    return MerchantStateManager.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  public static resetInstance(): void {
    MerchantStateManager.instance = null;
  }

  /**
   * Load merchant states from repository
   */
  private async loadState(): Promise<void> {
    try {
      const states = await this.repository.findAll();
      for (const state of states) {
        this.merchantStates.set(state.npcTemplateId, state);
      }
      systemLogger.info(
        `[MerchantStateManager] Loaded ${this.merchantStates.size} merchant states`
      );
    } catch (error) {
      systemLogger.error('[MerchantStateManager] Error loading merchant state:', error);
    }
  }

  /**
   * Save all merchant states to repository
   */
  public async saveState(): Promise<void> {
    try {
      const states = Array.from(this.merchantStates.values());
      await this.repository.saveAll(states);
      systemLogger.info(`[MerchantStateManager] Saved ${states.length} merchant states`);
    } catch (error) {
      systemLogger.error('[MerchantStateManager] Error saving merchant state:', error);
    }
  }

  /**
   * Update a merchant's state
   */
  public updateMerchantState(state: MerchantInventoryState): void {
    this.merchantStates.set(state.npcTemplateId, state);
  }

  /**
   * Get saved state for a merchant by template ID
   */
  public getMerchantState(templateId: string): MerchantInventoryState | undefined {
    return this.merchantStates.get(templateId);
  }

  /**
   * Check if we have saved state for a merchant
   */
  public hasSavedState(templateId: string): boolean {
    return this.merchantStates.has(templateId);
  }

  /**
   * Clear a merchant's state (for testing/reset)
   */
  public clearMerchantState(templateId: string): void {
    this.merchantStates.delete(templateId);
  }
}
