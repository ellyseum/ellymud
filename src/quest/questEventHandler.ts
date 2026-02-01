/**
 * Quest Event Handler
 *
 * Subscribes to game events and updates quest progress.
 * Acts as a bridge between the game systems and the quest manager.
 *
 * @module quest/questEventHandler
 */

import { EventEmitter } from 'events';
import { getQuestManager } from './questManager';
import { executeActions, ActionContext, applyRewards } from './questActions';
import { ConnectedClient, User } from '../types';
import { createContextLogger } from '../utils/logger';
import { writeMessageToClient } from '../utils/socketWriter';
import { colorize } from '../utils/colors';

const logger = createContextLogger('questEventHandler');

/**
 * Global quest event bus
 * Game systems emit events here, quest handler listens
 */
export const questEventBus = new EventEmitter();

// Increase max listeners since many systems may subscribe
questEventBus.setMaxListeners(50);

/**
 * Initialize quest event handlers
 * Call this during server startup
 */
export function initQuestEventHandlers(): void {
  logger.info('Initializing quest event handlers');

  // NPC death events (from combat system)
  questEventBus.on(
    'npc:death',
    async (data: { killer: ConnectedClient; npcTemplateId: string }) => {
      try {
        if (!data.killer.user) return;
        await handleQuestEvent(data.killer, 'npc:death', { npcTemplateId: data.npcTemplateId });
      } catch (error) {
        logger.error('Error handling npc:death event:', error);
      }
    }
  );

  // Room enter events (from movement)
  questEventBus.on(
    'room:enter',
    async (data: { client: ConnectedClient; roomId: string; previousRoomId?: string }) => {
      try {
        if (!data.client.user) return;
        await handleQuestEvent(data.client, 'room:enter', {
          roomId: data.roomId,
          previousRoomId: data.previousRoomId,
        });
      } catch (error) {
        logger.error('Error handling room:enter event:', error);
      }
    }
  );

  // Item pickup events
  questEventBus.on(
    'item:pickup',
    async (data: { client: ConnectedClient; itemId: string; instanceId: string }) => {
      try {
        if (!data.client.user) return;
        await handleQuestEvent(data.client, 'item:pickup', {
          itemId: data.itemId,
          instanceId: data.instanceId,
        });
      } catch (error) {
        logger.error('Error handling item:pickup event:', error);
      }
    }
  );

  // Item used events
  questEventBus.on(
    'item:used',
    async (data: { client: ConnectedClient; itemId: string; instanceId: string }) => {
      try {
        if (!data.client.user) return;
        await handleQuestEvent(data.client, 'item:used', {
          itemId: data.itemId,
          instanceId: data.instanceId,
        });
      } catch (error) {
        logger.error('Error handling item:used event:', error);
      }
    }
  );

  // Item equipped events
  questEventBus.on(
    'item:equipped',
    async (data: { client: ConnectedClient; itemId: string; instanceId: string; slot: string }) => {
      try {
        if (!data.client.user) return;
        await handleQuestEvent(data.client, 'item:equipped', {
          itemId: data.itemId,
          instanceId: data.instanceId,
          slot: data.slot,
        });
      } catch (error) {
        logger.error('Error handling item:equipped event:', error);
      }
    }
  );

  // Item delivered to NPC events
  questEventBus.on(
    'item:delivered',
    async (data: {
      client: ConnectedClient;
      itemId: string;
      instanceId: string;
      npcTemplateId: string;
    }) => {
      try {
        if (!data.client.user) return;
        await handleQuestEvent(data.client, 'item:delivered', {
          itemId: data.itemId,
          instanceId: data.instanceId,
          npcTemplateId: data.npcTemplateId,
        });
      } catch (error) {
        logger.error('Error handling item:delivered event:', error);
      }
    }
  );

  // NPC talked events
  questEventBus.on(
    'npc:talked',
    async (data: { client: ConnectedClient; npcTemplateId: string; dialogueOption?: string }) => {
      try {
        if (!data.client.user) return;
        await handleQuestEvent(data.client, 'npc:talked', {
          npcTemplateId: data.npcTemplateId,
          dialogueOption: data.dialogueOption,
        });
      } catch (error) {
        logger.error('Error handling npc:talked event:', error);
      }
    }
  );

  // Player level up events
  questEventBus.on(
    'player:levelup',
    async (data: { client: ConnectedClient; level: number; previousLevel: number }) => {
      try {
        if (!data.client.user) return;
        await handleQuestEvent(data.client, 'player:levelup', {
          level: data.level,
          previousLevel: data.previousLevel,
        });
      } catch (error) {
        logger.error('Error handling player:levelup event:', error);
      }
    }
  );

  logger.info('Quest event handlers initialized');
}

/**
 * Handle a quest-related game event
 */
async function handleQuestEvent(
  client: ConnectedClient,
  eventType: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!client.user) return;

  const questManager = getQuestManager();
  await questManager.ensureInitialized();

  // Update objectives based on this event
  const results = await questManager.updateObjective(client.user.username, eventType, data);

  // Process results
  for (const result of results) {
    if (result.objectiveCompleted) {
      writeMessageToClient(client, colorize('Objective complete!\r\n', 'green'));
    }

    if (result.stepCompleted) {
      writeMessageToClient(client, colorize('Quest step complete!\r\n', 'yellow'));
    }

    if (result.questCompleted) {
      writeMessageToClient(client, colorize('*** Quest Complete! ***\r\n', 'cyan'));

      // Apply rewards if any
      if (result.rewards) {
        // Apply rewards directly with minimal context
        const context: ActionContext = {
          client,
          user: client.user,
          questId: '',
          stepId: '',
        };
        await applyRewards(result.rewards, context);
      }
    }
  }
}

/**
 * Emit a quest event from game systems
 * Convenience wrapper around questEventBus.emit
 */
export function emitQuestEvent(event: string, data: Record<string, unknown>): void {
  questEventBus.emit(event, data);
}

/**
 * Execute dialogue actions when a player selects a dialogue option
 */
export async function executeDialogueActions(
  client: ConnectedClient,
  questId: string,
  stepId: string,
  npcTemplateId: string,
  optionIndex: number
): Promise<void> {
  if (!client.user) return;

  const questManager = getQuestManager();
  const quest = questManager.getQuest(questId);
  if (!quest) return;

  const step = quest.steps.find((s) => s.id === stepId);
  if (!step || !step.npcDialogues) return;

  const dialogue = step.npcDialogues[npcTemplateId];
  if (!dialogue || optionIndex >= dialogue.options.length) return;

  const option = dialogue.options[optionIndex];

  // Show NPC response
  writeMessageToClient(client, colorize(`\r\n"${option.response}"\r\n`, 'white'));

  // Execute actions if any
  if (option.actions && option.actions.length > 0) {
    const context: ActionContext = {
      client,
      user: client.user,
      questId,
      stepId,
    };
    await executeActions(option.actions, context);
  }

  // Emit talked event to update objective progress
  questEventBus.emit('npc:talked', {
    client,
    npcTemplateId,
    dialogueOption: option.text,
  });
}

/**
 * Check if a user meets dialogue requirements
 */
export function meetsDialogueRequirements(
  user: User,
  requires:
    | {
        flags?: string[];
        questFlags?: string[];
        level?: number;
        classId?: string;
        raceId?: string;
        items?: string[];
        activeStep?: string;
      }
    | undefined,
  activeStepId?: string
): boolean {
  if (!requires) return true;

  // Check flags
  if (requires.flags) {
    for (const flag of requires.flags) {
      if (!user.flags?.includes(flag)) {
        return false;
      }
    }
  }

  // Check quest flags
  if (requires.questFlags) {
    for (const flag of requires.questFlags) {
      if (!user.questFlags?.includes(flag)) {
        return false;
      }
    }
  }

  // Check level
  if (requires.level && user.level < requires.level) {
    return false;
  }

  // Check class
  if (requires.classId && user.classId !== requires.classId) {
    return false;
  }

  // Check race
  if (requires.raceId && user.raceId !== requires.raceId) {
    return false;
  }

  // Check items
  if (requires.items) {
    // TODO: Implement proper item checking via ItemManager
    // For now, just check if instanceIds are in inventory
    for (const itemId of requires.items) {
      // This would need to check templateId, not instanceId
      // Simplified check for now
      logger.debug(`Item requirement check not fully implemented: ${itemId}`);
    }
  }

  // Check active step
  if (requires.activeStep && activeStepId !== requires.activeStep) {
    return false;
  }

  return true;
}
