/**
 * Shared NPC death handling utilities
 * Used by both combat.ts and effectManager.ts to handle NPC drops
 */
import { RoomManager } from '../room/roomManager';
import { ItemManager } from '../utils/itemManager';
import { createMechanicsLogger } from '../utils/logger';
import { NPC } from './npc';

const deathLogger = createMechanicsLogger('NPCDeath');

export interface DropResult {
  instanceId: string;
  templateId: string;
  itemName: string;
}

/**
 * Generate and place NPC drops in the room
 * @param npc The NPC that died
 * @param roomId The room where the NPC died
 * @param roomManager RoomManager instance
 * @param itemManager ItemManager instance
 * @returns Array of dropped items with their details
 */
export function handleNpcDrops(
  npc: NPC,
  roomId: string,
  roomManager: RoomManager,
  itemManager: ItemManager
): DropResult[] {
  const drops: DropResult[] = [];

  // Check if NPC has generateDrops method
  if (typeof npc.generateDrops !== 'function') {
    deathLogger.debug(`NPC ${npc.name} does not have generateDrops method`);
    return drops;
  }

  // Generate drops from NPC inventory
  const droppedItemIds = npc.generateDrops();
  deathLogger.info(`NPC ${npc.name} (${npc.instanceId}) generated ${droppedItemIds.length} drops`);

  if (droppedItemIds.length === 0) {
    return drops;
  }

  const room = roomManager.getRoom(roomId);
  if (!room) {
    deathLogger.warn(`Cannot drop items: room ${roomId} not found`);
    return drops;
  }

  // Add dropped items to room
  for (const instanceId of droppedItemIds) {
    const instance = itemManager.getItemInstance(instanceId);
    if (instance) {
      room.addItemInstance(instanceId, instance.templateId);
      const template = itemManager.getItem(instance.templateId);
      if (template) {
        drops.push({
          instanceId,
          templateId: instance.templateId,
          itemName: template.name,
        });
        deathLogger.debug(`Added ${template.name} (${instanceId}) to room ${roomId}`);
      }
    }
  }

  // Save item instances after drops
  if (drops.length > 0) {
    itemManager.saveItemInstances();
  }

  return drops;
}
