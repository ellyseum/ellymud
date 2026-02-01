/**
 * Quest Action Executor
 *
 * Executes quest actions like giving items, setting flags, teleporting, etc.
 *
 * @module quest/questActions
 */

import {
  QuestAction,
  SetFlagAction,
  RemoveFlagAction,
  SetQuestFlagAction,
  RemoveQuestFlagAction,
  MessageAction,
  GiveItemAction,
  RemoveItemAction,
  GiveXpAction,
  GiveCurrencyAction,
  TeleportAction,
  SpawnNpcAction,
  StartQuestAction,
  CompleteQuestAction,
  FailQuestAction,
} from './types';
import { ConnectedClient, User } from '../types';
import { writeMessageToClient } from '../utils/socketWriter';
import { colorize } from '../utils/colors';
import { createContextLogger } from '../utils/logger';
import { UserManager } from '../user/userManager';
import { ItemManager } from '../utils/itemManager';
import { getQuestManager } from './questManager';
import type { MerchantData } from '../combat/merchant';

const logger = createContextLogger('questActions');

/**
 * Context passed to action executors
 */
export interface ActionContext {
  client: ConnectedClient;
  user: User;
  questId: string;
  stepId: string;
}

/**
 * Execute a list of quest actions
 */
export async function executeActions(
  actions: QuestAction[],
  context: ActionContext
): Promise<void> {
  for (const action of actions) {
    try {
      // Handle delay if specified
      if (action.delay && action.delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, action.delay));
      }

      await executeAction(action, context);
    } catch (error) {
      logger.error(`Failed to execute action ${action.action}:`, error);
    }
  }
}

/**
 * Execute a single quest action
 */
export async function executeAction(action: QuestAction, context: ActionContext): Promise<void> {
  switch (action.action) {
    case 'setFlag':
      await executeSetFlag(action, context);
      break;
    case 'removeFlag':
      await executeRemoveFlag(action, context);
      break;
    case 'setQuestFlag':
      await executeSetQuestFlag(action, context);
      break;
    case 'removeQuestFlag':
      await executeRemoveQuestFlag(action, context);
      break;
    case 'message':
      executeMessage(action, context);
      break;
    case 'giveItem':
      await executeGiveItem(action, context);
      break;
    case 'removeItem':
      await executeRemoveItem(action, context);
      break;
    case 'giveXP':
      await executeGiveXp(action, context);
      break;
    case 'giveCurrency':
      await executeGiveCurrency(action, context);
      break;
    case 'teleport':
      await executeTeleport(action, context);
      break;
    case 'spawnNPC':
      await executeSpawnNpc(action, context);
      break;
    case 'startQuest':
      await executeStartQuest(action, context);
      break;
    case 'completeQuest':
      await executeCompleteQuest(action, context);
      break;
    case 'failQuest':
      await executeFailQuest(action, context);
      break;
    case 'advanceStep':
      // Handled by quest manager during objective updates
      logger.debug(`advanceStep action: ${action.stepId}`);
      break;
    case 'playSound':
      // Would be handled by WebSocket client
      logger.debug(`playSound action: ${action.sound}`);
      break;
    default:
      logger.warn(`Unknown action type: ${(action as QuestAction).action}`);
  }
}

// ============================================================================
// Flag Actions
// ============================================================================

async function executeSetFlag(action: SetFlagAction, context: ActionContext): Promise<void> {
  const { user } = context;
  if (!user.flags) {
    user.flags = [];
  }
  if (!user.flags.includes(action.flag)) {
    user.flags.push(action.flag);
    await saveUser(user);
    logger.debug(`Set flag ${action.flag} on user ${user.username}`);
  }
}

async function executeRemoveFlag(action: RemoveFlagAction, context: ActionContext): Promise<void> {
  const { user } = context;
  if (user.flags) {
    const index = user.flags.indexOf(action.flag);
    if (index >= 0) {
      user.flags.splice(index, 1);
      await saveUser(user);
      logger.debug(`Removed flag ${action.flag} from user ${user.username}`);
    }
  }
}

async function executeSetQuestFlag(
  action: SetQuestFlagAction,
  context: ActionContext
): Promise<void> {
  const { user } = context;
  if (!user.questFlags) {
    user.questFlags = [];
  }
  if (!user.questFlags.includes(action.flag)) {
    user.questFlags.push(action.flag);
    await saveUser(user);
    logger.debug(`Set quest flag ${action.flag} on user ${user.username}`);
  }
}

async function executeRemoveQuestFlag(
  action: RemoveQuestFlagAction,
  context: ActionContext
): Promise<void> {
  const { user } = context;
  if (user.questFlags) {
    const index = user.questFlags.indexOf(action.flag);
    if (index >= 0) {
      user.questFlags.splice(index, 1);
      await saveUser(user);
      logger.debug(`Removed quest flag ${action.flag} from user ${user.username}`);
    }
  }
}

// ============================================================================
// Message Action
// ============================================================================

function executeMessage(action: MessageAction, context: ActionContext): void {
  const { client } = context;
  let text = action.text;

  // Apply color if specified
  if (action.color) {
    // colorize takes (text, color) order
    text = colorize(text, action.color as Parameters<typeof colorize>[1]);
  }

  // Ensure proper line ending
  if (!text.endsWith('\r\n')) {
    text += '\r\n';
  }

  writeMessageToClient(client, text);
}

// ============================================================================
// Item Actions
// ============================================================================

async function executeGiveItem(action: GiveItemAction, context: ActionContext): Promise<void> {
  const { client, user } = context;
  const count = action.count || 1;

  const itemManager = ItemManager.getInstance();

  for (let i = 0; i < count; i++) {
    // Check if item template exists
    const template = itemManager.getItem(action.itemId);
    if (!template) {
      logger.warn(`Item template not found: ${action.itemId}`);
      writeMessageToClient(
        client,
        colorize(`Quest reward item not found: ${action.itemId}\r\n`, 'red')
      );
      return;
    }

    // Create instance and add to inventory
    const instance = itemManager.createItemInstance(action.itemId, 'quest');
    if (instance) {
      user.inventory.items.push(instance.instanceId);
      logger.debug(`Gave item ${action.itemId} to ${user.username}`);
    }
  }

  await saveUser(user);

  // Notify player
  const itemName = itemManager.getItem(action.itemId)?.name || action.itemId;
  const countText = count > 1 ? ` x${count}` : '';
  writeMessageToClient(client, colorize(`Received: ${itemName}${countText}\r\n`, 'green'));
}

async function executeRemoveItem(action: RemoveItemAction, context: ActionContext): Promise<void> {
  const { user } = context;
  const count = action.count || 1;

  const itemManager = ItemManager.getInstance();
  let removed = 0;

  // Find and remove instances of this item
  for (let i = user.inventory.items.length - 1; i >= 0 && removed < count; i--) {
    const instanceId = user.inventory.items[i];
    const instance = itemManager.getItemInstance(instanceId);
    if (instance && instance.templateId === action.itemId) {
      user.inventory.items.splice(i, 1);
      itemManager.deleteItemInstance(instanceId);
      removed++;
    }
  }

  if (removed > 0) {
    await saveUser(user);
    logger.debug(`Removed ${removed}x ${action.itemId} from ${user.username}`);
  }
}

// ============================================================================
// Experience & Currency Actions
// ============================================================================

async function executeGiveXp(action: GiveXpAction, context: ActionContext): Promise<void> {
  const { client, user } = context;

  user.experience += action.amount;
  await saveUser(user);

  writeMessageToClient(client, colorize(`You gained ${action.amount} experience!\r\n`, 'yellow'));
  logger.debug(`Gave ${action.amount} XP to ${user.username}`);

  // TODO: Check for level up and handle it
}

async function executeGiveCurrency(
  action: GiveCurrencyAction,
  context: ActionContext
): Promise<void> {
  const { client, user } = context;

  if (action.gold) user.inventory.currency.gold += action.gold;
  if (action.silver) user.inventory.currency.silver += action.silver;
  if (action.copper) user.inventory.currency.copper += action.copper;

  await saveUser(user);

  const parts: string[] = [];
  if (action.gold) parts.push(`${action.gold} gold`);
  if (action.silver) parts.push(`${action.silver} silver`);
  if (action.copper) parts.push(`${action.copper} copper`);

  if (parts.length > 0) {
    writeMessageToClient(client, colorize(`You received ${parts.join(', ')}!\r\n`, 'yellow'));
  }
}

// ============================================================================
// Movement & Spawn Actions
// ============================================================================

async function executeTeleport(action: TeleportAction, context: ActionContext): Promise<void> {
  const { client, user } = context;

  // Import dynamically to avoid circular dependencies
  const { RoomManager } = await import('../room/roomManager');
  // Pass empty map - getInstance will return existing singleton
  const roomManager = RoomManager.getInstance(new Map());

  const targetRoom = roomManager.getRoom(action.roomId);
  if (!targetRoom) {
    logger.warn(`Teleport failed: room ${action.roomId} not found`);
    return;
  }

  // Remove from current room
  const currentRoom = roomManager.getRoom(user.currentRoomId);
  if (currentRoom) {
    currentRoom.removePlayer(user.username);
  }

  // Move to new room
  user.currentRoomId = action.roomId;
  targetRoom.addPlayer(user.username);
  await saveUser(user);

  writeMessageToClient(client, colorize('You are teleported...\r\n\r\n', 'cyan'));

  // Show new room by getting its description
  writeMessageToClient(client, targetRoom.getDescriptionExcludingPlayer(user.username));
}

async function executeSpawnNpc(action: SpawnNpcAction, context: ActionContext): Promise<void> {
  const { user } = context;
  const roomId = action.roomId || user.currentRoomId;

  // Import dynamically to avoid circular dependencies
  const { RoomManager } = await import('../room/roomManager');
  const { NPC } = await import('../combat/npc');
  const { Merchant } = await import('../combat/merchant');
  const crypto = await import('crypto');

  // Pass empty map - getInstance will return existing singleton
  const roomManager = RoomManager.getInstance(new Map());
  const room = roomManager.getRoom(roomId);

  if (!room) {
    logger.warn(`SpawnNPC failed: room ${roomId} not found`);
    return;
  }

  try {
    // Load NPC data
    const npcData = NPC.loadNPCData();
    const npcTemplate = npcData.get(action.npcTemplateId);

    if (!npcTemplate) {
      logger.warn(`SpawnNPC failed: NPC template ${action.npcTemplateId} not found`);
      return;
    }

    // Generate a unique instance ID
    const instanceId = `${action.npcTemplateId}-${Date.now()}-${crypto.randomInt(1000)}`;

    // Check if this is a merchant NPC
    const isMerchantNpc = 'merchant' in npcTemplate && npcTemplate.merchant === true;

    let npc: InstanceType<typeof NPC>;
    if (isMerchantNpc) {
      // Create a Merchant instance
      const merchantData: MerchantData = {
        ...(npcTemplate as MerchantData),
        id: action.npcTemplateId,
      };
      npc = new Merchant(
        merchantData.name,
        merchantData.health,
        merchantData.maxHealth,
        merchantData.damage,
        merchantData.isHostile,
        merchantData.isPassive,
        merchantData.experienceValue,
        merchantData.description,
        merchantData.attackTexts,
        merchantData.deathMessages,
        action.npcTemplateId,
        instanceId,
        merchantData.inventory || [],
        merchantData.stockConfig || [],
        []
      );
      (npc as InstanceType<typeof Merchant>).initializeInventory();
    } else {
      // Create a regular NPC
      npc = new NPC(
        npcTemplate.name,
        npcTemplate.health,
        npcTemplate.maxHealth,
        npcTemplate.damage,
        npcTemplate.isHostile,
        npcTemplate.isPassive,
        npcTemplate.experienceValue,
        npcTemplate.description,
        npcTemplate.attackTexts,
        npcTemplate.deathMessages,
        action.npcTemplateId,
        instanceId,
        npcTemplate.inventory || []
      );
    }

    // Add NPC to room
    room.addNPC(npc);
    logger.debug(`Spawned NPC ${action.npcTemplateId} in room ${roomId}`);
  } catch (error) {
    logger.error(`Failed to spawn NPC ${action.npcTemplateId}:`, error);
  }
}

// ============================================================================
// Quest Chain Actions
// ============================================================================

async function executeStartQuest(action: StartQuestAction, context: ActionContext): Promise<void> {
  const { user, client } = context;
  const questManager = getQuestManager();

  const result = await questManager.startQuest(user, action.questId);
  if (result.success) {
    const quest = questManager.getQuest(action.questId);
    writeMessageToClient(
      client,
      colorize(`New quest started: ${quest?.name || action.questId}\r\n`, 'yellow')
    );
  } else {
    logger.warn(`Failed to auto-start quest ${action.questId}: ${result.error}`);
  }
}

async function executeCompleteQuest(
  action: CompleteQuestAction,
  context: ActionContext
): Promise<void> {
  // The completeQuest action just signals completion
  // Actual completion is handled by questManager.completeQuest
  // which is called during objective checking when last step completes
  logger.debug(`CompleteQuest action triggered for ${context.questId}`);

  // If called directly (not through objective completion), complete now
  const questManager = getQuestManager();
  const rewards = await questManager.completeQuest(context.user.username, context.questId);

  if (rewards) {
    // Apply rewards
    await applyRewards(rewards, context);
  }
}

async function executeFailQuest(action: FailQuestAction, context: ActionContext): Promise<void> {
  const { user, client } = context;
  const questManager = getQuestManager();

  await questManager.failQuest(user.username, context.questId, action.reason);

  const quest = questManager.getQuest(context.questId);
  writeMessageToClient(
    client,
    colorize(`Quest failed: ${quest?.name || context.questId}\r\n`, 'red')
  );
  if (action.reason) {
    writeMessageToClient(client, colorize(`Reason: ${action.reason}\r\n`, 'red'));
  }
}

// ============================================================================
// Helpers
// ============================================================================

async function saveUser(_user: User): Promise<void> {
  const userManager = UserManager.getInstance();
  // The user object is a reference in the UserManager array,
  // so we just need to trigger a save
  userManager.forceSave();
}

/**
 * Apply quest completion rewards
 */
export async function applyRewards(
  rewards: {
    experience?: number;
    questFlags?: string[];
    flags?: string[];
    items?: Array<{ itemId: string; count?: number }>;
    currency?: { gold?: number; silver?: number; copper?: number };
    message?: string;
  },
  context: ActionContext
): Promise<void> {
  const { client } = context;

  // Experience
  if (rewards.experience) {
    await executeGiveXp({ action: 'giveXP', amount: rewards.experience }, context);
  }

  // Quest flags
  if (rewards.questFlags) {
    for (const flag of rewards.questFlags) {
      await executeSetQuestFlag({ action: 'setQuestFlag', flag }, context);
    }
  }

  // User flags
  if (rewards.flags) {
    for (const flag of rewards.flags) {
      await executeSetFlag({ action: 'setFlag', flag }, context);
    }
  }

  // Items
  if (rewards.items) {
    for (const item of rewards.items) {
      await executeGiveItem(
        { action: 'giveItem', itemId: item.itemId, count: item.count },
        context
      );
    }
  }

  // Currency
  if (rewards.currency) {
    await executeGiveCurrency(
      {
        action: 'giveCurrency',
        gold: rewards.currency.gold,
        silver: rewards.currency.silver,
        copper: rewards.currency.copper,
      },
      context
    );
  }

  // Completion message
  if (rewards.message) {
    writeMessageToClient(client, colorize(rewards.message + '\r\n', 'green'));
  }
}
