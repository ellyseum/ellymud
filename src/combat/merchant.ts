import { MerchantStockConfig, RestockPeriodUnit, NPCInventoryItem } from '../types';
import { NPC, NPCData } from './npc';
import { ItemManager } from '../utils/itemManager';
import { createContextLogger } from '../utils/logger';

const merchantLogger = createContextLogger('Merchant');

// Extended NPC data for merchants
export interface MerchantData extends NPCData {
  merchant: true;
  inventory?: NPCInventoryItem[]; // New format: inventory items with spawn rates
  stockConfig?: MerchantStockConfig[]; // Detailed stock configuration
}

// Persisted merchant inventory state
export interface MerchantInventoryState {
  npcInstanceId: string;
  npcTemplateId: string;
  actualInventory: string[]; // Item instance IDs
  stockConfig: MerchantStockConfig[];
}

export class Merchant extends NPC {
  // Stock configuration (defines what CAN be stocked and restock rules)
  public stockConfig: MerchantStockConfig[] = [];
  // Actual inventory - item INSTANCE IDs that the merchant currently has for sale
  public actualInventory: string[] = [];

  constructor(
    name: string,
    health: number,
    maxHealth: number,
    damage: [number, number] = [1, 3],
    isHostile: boolean = false,
    isPassive: boolean = true, // Merchants are typically passive
    experienceValue: number = 0, // Merchants typically give no XP
    description?: string,
    attackTexts?: string[],
    deathMessages?: string[],
    templateId?: string,
    instanceId?: string,
    npcInventory: NPCInventoryItem[] = [],
    stockConfig: MerchantStockConfig[] = [],
    actualInventory: string[] = []
  ) {
    // Call parent NPC constructor (pass inventory for NPC drops if merchant dies)
    super(
      name,
      health,
      maxHealth,
      damage,
      isHostile,
      isPassive,
      experienceValue,
      description,
      attackTexts,
      deathMessages,
      templateId,
      instanceId,
      npcInventory
    );

    this.stockConfig = stockConfig;
    this.actualInventory = actualInventory;

    // If we have inventory but no stock config, convert NPCInventoryItem to MerchantStockConfig
    if (npcInventory.length > 0 && stockConfig.length === 0) {
      this.stockConfig = npcInventory.map((item) => {
        // Calculate max stock from itemCount
        let maxStock = 1;
        if (typeof item.itemCount === 'number') {
          maxStock = item.itemCount;
        } else {
          maxStock = item.itemCount.max;
        }

        // Convert spawnPeriod (seconds) to restockPeriod (hours by default)
        const restockPeriodHours = item.spawnPeriod
          ? Math.max(1, Math.floor(item.spawnPeriod / 3600))
          : 24;

        return {
          templateId: item.itemId,
          maxStock,
          restockAmount: maxStock, // Restock to full
          restockPeriod: restockPeriodHours,
          restockUnit: 'hours' as RestockPeriodUnit,
        };
      });
    }
  }

  /**
   * Check if this NPC is a merchant (always true for Merchant class)
   */
  public isMerchant(): boolean {
    return true;
  }

  /**
   * Factory method to create Merchant from NPC data
   */
  static fromMerchantData(data: MerchantData): Merchant {
    return new Merchant(
      data.name,
      data.health,
      data.maxHealth,
      data.damage,
      data.isHostile,
      data.isPassive,
      data.experienceValue,
      data.description,
      data.attackTexts,
      data.deathMessages,
      data.id,
      undefined, // instanceId - will be generated
      data.inventory || [],
      data.stockConfig || [],
      [] // actualInventory - will be populated on initialization
    );
  }

  /**
   * Convert restock period to milliseconds
   */
  private restockPeriodToMs(period: number, unit: RestockPeriodUnit): number {
    switch (unit) {
      case 'minutes':
        return period * 60 * 1000;
      case 'hours':
        return period * 60 * 60 * 1000;
      case 'days':
        return period * 24 * 60 * 60 * 1000;
      case 'weeks':
        return period * 7 * 24 * 60 * 60 * 1000;
      default:
        return period * 60 * 1000;
    }
  }

  /**
   * Initialize inventory from stock config (first time setup)
   */
  public initializeInventory(): void {
    const itemManager = ItemManager.getInstance();
    this.actualInventory = [];

    for (const config of this.stockConfig) {
      // Create initial stock up to maxStock
      for (let i = 0; i < config.maxStock; i++) {
        if (!itemManager.canCreateInstance(config.templateId)) {
          merchantLogger.warn(
            `Cannot create ${config.templateId} for ${this.name}: global limit reached`
          );
          break;
        }

        const instance = itemManager.createItemInstance(config.templateId, `merchant:${this.name}`);
        if (instance) {
          this.actualInventory.push(instance.instanceId);
        }
      }

      // Set initial lastRestock
      config.lastRestock = new Date().toISOString();
    }

    merchantLogger.info(`Initialized ${this.name} with ${this.actualInventory.length} items`);
  }

  /**
   * Restore inventory from persisted state
   */
  public restoreInventory(state: MerchantInventoryState): void {
    const itemManager = ItemManager.getInstance();

    this.stockConfig = state.stockConfig.map((c) => ({ ...c }));
    this.actualInventory = [...state.actualInventory];

    // Verify all item instances still exist (cleanup any orphaned references)
    this.actualInventory = this.actualInventory.filter((instanceId) => {
      const instance = itemManager.getItemInstance(instanceId);
      if (!instance) {
        merchantLogger.warn(
          `Removing orphaned item instance ${instanceId} from merchant ${this.name}`
        );
        return false;
      }
      return true;
    });

    merchantLogger.info(
      `Restored inventory for ${this.name}: ${this.actualInventory.length} items`
    );
  }

  /**
   * Check if merchant needs restocking and restock if necessary
   * @returns true if any items were restocked
   */
  public checkRestock(): boolean {
    const itemManager = ItemManager.getInstance();
    const now = Date.now();
    let restocked = false;

    for (const config of this.stockConfig) {
      const lastRestockTime = config.lastRestock ? new Date(config.lastRestock).getTime() : 0;
      const restockIntervalMs = this.restockPeriodToMs(config.restockPeriod, config.restockUnit);

      // Check if enough time has passed for a restock
      if (now - lastRestockTime < restockIntervalMs) {
        continue;
      }

      // Count current stock of this item type
      let currentStock = 0;
      for (const instanceId of this.actualInventory) {
        const instance = itemManager.getItemInstance(instanceId);
        if (instance && instance.templateId === config.templateId) {
          currentStock++;
        }
      }

      // Restock if below maxStock
      const toRestock = Math.min(config.restockAmount, config.maxStock - currentStock);

      for (let i = 0; i < toRestock; i++) {
        if (!itemManager.canCreateInstance(config.templateId)) {
          merchantLogger.debug(
            `Cannot restock ${config.templateId} for ${this.name}: global limit reached`
          );
          break;
        }

        const instance = itemManager.createItemInstance(
          config.templateId,
          `merchant:${this.name}:restock`
        );
        if (instance) {
          this.actualInventory.push(instance.instanceId);
          restocked = true;
        }
      }

      config.lastRestock = new Date().toISOString();
    }

    if (restocked) {
      merchantLogger.info(`Restocked items for ${this.name}`);
    }

    return restocked;
  }

  /**
   * Add an item instance to inventory (when player sells to merchant)
   */
  public addItem(instanceId: string): void {
    this.actualInventory.push(instanceId);
  }

  /**
   * Remove an item instance from inventory (when player buys from merchant)
   * @returns true if item was found and removed
   */
  public removeItem(instanceId: string): boolean {
    const index = this.actualInventory.indexOf(instanceId);
    if (index === -1) return false;

    this.actualInventory.splice(index, 1);
    return true;
  }

  /**
   * Get the current inventory state for persistence
   */
  public getInventoryState(): MerchantInventoryState {
    return {
      npcInstanceId: this.instanceId,
      npcTemplateId: this.templateId,
      actualInventory: [...this.actualInventory],
      stockConfig: this.stockConfig.map((c) => ({ ...c })),
    };
  }

  /**
   * Find an item in inventory by name (partial match)
   * @returns The instance ID if found, undefined otherwise
   */
  public findItemByName(itemName: string): string | undefined {
    const itemManager = ItemManager.getInstance();
    const searchName = itemName.toLowerCase();

    for (const instanceId of this.actualInventory) {
      const instance = itemManager.getItemInstance(instanceId);
      if (!instance) continue;

      const template = itemManager.getItem(instance.templateId);
      if (template && template.name.toLowerCase().includes(searchName)) {
        return instanceId;
      }
    }

    return undefined;
  }

  /**
   * Get all items grouped by template for display
   * @returns Map of templateId -> { template, count, instanceIds }
   */
  public getInventoryGrouped(): Map<
    string,
    { template: ReturnType<ItemManager['getItem']>; count: number; instanceIds: string[] }
  > {
    const itemManager = ItemManager.getInstance();
    const grouped = new Map<
      string,
      { template: ReturnType<ItemManager['getItem']>; count: number; instanceIds: string[] }
    >();

    for (const instanceId of this.actualInventory) {
      const instance = itemManager.getItemInstance(instanceId);
      if (!instance) continue;

      const template = itemManager.getItem(instance.templateId);
      if (!template) continue;

      const existing = grouped.get(instance.templateId);
      if (existing) {
        existing.count++;
        existing.instanceIds.push(instanceId);
      } else {
        grouped.set(instance.templateId, {
          template,
          count: 1,
          instanceIds: [instanceId],
        });
      }
    }

    return grouped;
  }
}
