// NPC interaction service instantiates NPCs from templates
import { INPCInteractionService } from '../interfaces';
import { Room } from '../room';
import { NPC, NPCData } from '../../combat/npc';
import { Merchant, MerchantData } from '../../combat/merchant';
import { MerchantStateManager } from '../../combat/merchantStateManager';
import { systemLogger } from '../../utils/logger';

export class NPCInteractionService implements INPCInteractionService {
  private roomManager: {
    updateRoom: (room: Room) => void;
  };

  constructor(roomManager: { updateRoom: (room: Room) => void }) {
    this.roomManager = roomManager;
  }

  /**
   * Create an NPC or Merchant instance from template data
   * @param npcTemplate The NPC template data
   * @returns NPC or Merchant instance
   */
  private createNpcInstance(npcTemplate: NPCData): NPC {
    // Check if this is a merchant NPC
    if (npcTemplate.merchant) {
      const merchant = Merchant.fromMerchantData(npcTemplate as MerchantData);

      // Check for saved inventory state
      const stateManager = MerchantStateManager.getInstance();
      systemLogger.info(`[Merchant] Looking up state for template ID: ${npcTemplate.id}`);
      systemLogger.info(
        `[Merchant] Has saved state: ${stateManager.hasSavedState(npcTemplate.id)}`
      );
      const savedState = stateManager.getMerchantState(npcTemplate.id);

      if (savedState) {
        // Restore from saved state
        systemLogger.info(
          `[Merchant] Found saved state with ${savedState.actualInventory.length} items`
        );
        merchant.restoreInventory(savedState);
        systemLogger.info(`[Merchant] Restored inventory for ${merchant.name} from saved state`);
      } else {
        // Initialize fresh inventory (creates new item instances)
        systemLogger.info(
          `[Merchant] No saved state, initializing fresh inventory for ${merchant.name}`
        );
        merchant.initializeInventory();

        // Save the initial state so it persists
        const inventoryState = merchant.getInventoryState();
        stateManager.updateMerchantState(inventoryState);
        stateManager.saveState();
        systemLogger.info(`[Merchant] Saved initial inventory state for ${merchant.name}`);
      }

      return merchant;
    }
    return NPC.fromNPCData(npcTemplate);
  }

  /**
   * Instantiate NPCs from templates and add them to the room
   * @param room The room to add NPCs to
   * @param npcTemplateIds Array of NPC template IDs
   * @param npcData Map of NPC template data
   */
  public instantiateNpcsFromTemplates(
    room: Room,
    npcTemplateIds: string[],
    npcData: Map<string, NPCData>
  ): void {
    if (!npcTemplateIds.length) return;

    systemLogger.info(`Instantiating ${npcTemplateIds.length} NPC(s) for room ${room.id}`);

    for (const templateId of npcTemplateIds) {
      // Check if the template exists in our NPC data
      const npcTemplate = npcData.get(templateId);
      if (npcTemplate) {
        // Create a new NPC instance from the template
        const npc = this.createNpcInstance(npcTemplate);

        // Add the NPC to the room
        room.addNPC(npc);
        const npcType = npc.isMerchant() ? 'Merchant' : 'NPC';
        systemLogger.info(
          `Added ${npcType} instance ${npc.instanceId} (template: ${templateId}) to room ${room.id}`
        );
      } else {
        // If template doesn't exist, log a warning and try to create a basic NPC
        systemLogger.warn(`NPC template '${templateId}' not found in data, creating basic NPC`);
        const defaultNpc = new NPC(
          templateId, // Use template ID as name
          10, // health
          10, // maxHealth
          [1, 2], // damage range
          false, // isHostile
          false, // isPassive
          50 // experienceValue
        );
        room.addNPC(defaultNpc);
        systemLogger.info(
          `Added default NPC instance ${defaultNpc.instanceId} (template: ${templateId}) to room ${room.id}`
        );
      }
    }
  }

  /**
   * Initialize NPCs in a specific room
   */
  public initializeNPCsInRoom(room: Room): void {
    // Load NPC data from JSON
    const npcData = NPC.loadNPCData();

    // Clear existing NPCs first
    room.npcs.clear();

    // Add NPCs based on room type or ID
    if (room.id === 'start') {
      // Add 2 cats to the starting room
      for (let i = 0; i < 2; i++) {
        // Check if cat is defined in our NPC data
        if (npcData.has('cat')) {
          const npcTemplate = npcData.get('cat')!;
          const npc = this.createNpcInstance(npcTemplate);
          room.addNPC(npc);
        } else {
          systemLogger.warn('Cat NPC not found in data, using default values');
          const catNPC = new NPC('cat', 10, 10, [1, 3], false, false, 75);
          room.addNPC(catNPC);
        }
      }

      // Add a dog to the room
      if (npcData.has('dog')) {
        const npcTemplate = npcData.get('dog')!;
        const npc = this.createNpcInstance(npcTemplate);
        room.addNPC(npc);
      }
    }

    // Update the room to persist NPC changes
    this.roomManager.updateRoom(room);
  }
}
