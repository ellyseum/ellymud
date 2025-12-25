/**
 * Merchant State Manager
 * Persists and restores merchant inventory state across server restarts
 */
import fs from 'fs';
import path from 'path';
import { systemLogger } from '../utils/logger';
import { MerchantInventoryState } from './merchant';

const DATA_DIR = path.join(process.cwd(), 'data');
const MERCHANT_STATE_FILE = path.join(DATA_DIR, 'merchant-state.json');

export class MerchantStateManager {
  private static instance: MerchantStateManager | null = null;
  private merchantStates: Map<string, MerchantInventoryState> = new Map();

  private constructor() {
    this.loadState();
  }

  public static getInstance(): MerchantStateManager {
    if (!MerchantStateManager.instance) {
      MerchantStateManager.instance = new MerchantStateManager();
    }
    return MerchantStateManager.instance;
  }

  /**
   * Load merchant states from file
   */
  private loadState(): void {
    try {
      if (fs.existsSync(MERCHANT_STATE_FILE)) {
        const data = fs.readFileSync(MERCHANT_STATE_FILE, 'utf-8');
        const states = JSON.parse(data) as MerchantInventoryState[];

        for (const state of states) {
          // Key by template ID since instance IDs change on restart
          this.merchantStates.set(state.npcTemplateId, state);
        }

        systemLogger.info(
          `[MerchantStateManager] Loaded ${this.merchantStates.size} merchant states`
        );
      } else {
        systemLogger.info('[MerchantStateManager] No saved merchant state found, starting fresh');
      }
    } catch (error) {
      systemLogger.error('[MerchantStateManager] Error loading merchant state:', error);
    }
  }

  /**
   * Save all merchant states to file
   */
  public saveState(): void {
    try {
      const states = Array.from(this.merchantStates.values());
      fs.writeFileSync(MERCHANT_STATE_FILE, JSON.stringify(states, null, 2));
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
