/**
 * Quest Dialogue System
 *
 * Handles NPC dialogues that are part of quests.
 * Integrates with the talk command to show quest-specific dialogue options.
 *
 * @module quest/questDialogue
 */

import { ConnectedClient, User } from '../types';
import { NpcDialogue, DialogueOption } from './types';
import { getQuestManager } from './questManager';
import { executeDialogueActions, meetsDialogueRequirements } from './questEventHandler';
import { writeMessageToClient } from '../utils/socketWriter';
import { colorize } from '../utils/colors';

/**
 * Result of getting quest dialogues for an NPC
 */
export interface QuestDialogueResult {
  hasQuestDialogue: boolean;
  dialogues: Array<{
    questId: string;
    questName: string;
    stepId: string;
    dialogue: NpcDialogue;
    availableOptions: Array<{
      index: number;
      option: DialogueOption;
    }>;
  }>;
}

/**
 * Get quest dialogues available for a user when talking to an NPC
 *
 * @param user - The user talking to the NPC
 * @param npcTemplateId - The NPC template ID
 * @returns Quest dialogue information
 */
export async function getQuestDialoguesForNpc(
  user: User,
  npcTemplateId: string
): Promise<QuestDialogueResult> {
  const questManager = getQuestManager();
  await questManager.ensureInitialized();

  const questDialogues = await questManager.getQuestDialogues(user.username, npcTemplateId);

  const result: QuestDialogueResult = {
    hasQuestDialogue: false,
    dialogues: [],
  };

  for (const { questId, stepId, dialogue } of questDialogues) {
    const quest = questManager.getQuest(questId);
    if (!quest) continue;

    // Filter options based on requirements
    const availableOptions: Array<{ index: number; option: DialogueOption }> = [];

    for (let i = 0; i < dialogue.options.length; i++) {
      const option = dialogue.options[i];
      if (meetsDialogueRequirements(user, option.requires, stepId)) {
        availableOptions.push({ index: i, option });
      }
    }

    // Only include if there are available options
    if (availableOptions.length > 0) {
      result.hasQuestDialogue = true;
      result.dialogues.push({
        questId,
        questName: quest.name,
        stepId,
        dialogue,
        availableOptions,
      });
    }
  }

  return result;
}

/**
 * Display quest dialogue to a player
 *
 * @param client - The connected client
 * @param npcName - Display name of the NPC
 * @param dialogueResult - Result from getQuestDialoguesForNpc
 */
export function displayQuestDialogue(
  client: ConnectedClient,
  npcName: string,
  dialogueResult: QuestDialogueResult
): void {
  if (!dialogueResult.hasQuestDialogue) {
    return;
  }

  const lines: string[] = [];

  // For each quest with dialogue for this NPC
  for (const { questName, dialogue, availableOptions } of dialogueResult.dialogues) {
    // Show greeting
    lines.push(colorize(`${npcName} says: "${dialogue.greeting}"`, 'white'));
    lines.push('');

    // Show quest context
    lines.push(colorize(`[Quest: ${questName}]`, 'yellow'));
    lines.push('');

    // Show available options
    lines.push(colorize('Choose a response:', 'cyan'));
    for (let i = 0; i < availableOptions.length; i++) {
      const { option } = availableOptions[i];
      lines.push(colorize(`  ${i + 1}. ${option.text}`, 'white'));
    }
    lines.push('');
  }

  // If multiple quests have dialogues, show all
  // The player will use "reply <number>" to select

  lines.push(colorize('Type "reply <number>" to respond.', 'gray'));

  writeMessageToClient(client, lines.join('\r\n') + '\r\n');
}

/**
 * Handle a player's dialogue response
 *
 * @param client - The connected client
 * @param npcTemplateId - The NPC template ID
 * @param optionNumber - The option number (1-based from player input)
 * @returns True if response was handled
 */
export async function handleDialogueResponse(
  client: ConnectedClient,
  npcTemplateId: string,
  optionNumber: number
): Promise<boolean> {
  if (!client.user) return false;

  const dialogueResult = await getQuestDialoguesForNpc(client.user, npcTemplateId);

  if (!dialogueResult.hasQuestDialogue) {
    return false;
  }

  // Flatten all available options with their quest context
  const allOptions: Array<{
    questId: string;
    stepId: string;
    originalIndex: number;
    option: DialogueOption;
  }> = [];

  for (const { questId, stepId, availableOptions } of dialogueResult.dialogues) {
    for (const { index, option } of availableOptions) {
      allOptions.push({ questId, stepId, originalIndex: index, option });
    }
  }

  // Convert to 0-based index
  const selectedIndex = optionNumber - 1;

  if (selectedIndex < 0 || selectedIndex >= allOptions.length) {
    writeMessageToClient(
      client,
      colorize(`Invalid option. Choose 1-${allOptions.length}.\r\n`, 'red')
    );
    return false;
  }

  const selected = allOptions[selectedIndex];

  // Execute the dialogue actions
  await executeDialogueActions(
    client,
    selected.questId,
    selected.stepId,
    npcTemplateId,
    selected.originalIndex
  );

  return true;
}

/**
 * Store the current NPC the player is talking to
 * Used for the reply command to know which NPC to respond to
 */
const activeConversations = new Map<
  string,
  { npcTemplateId: string; npcName: string; timestamp: number }
>();

// Conversation timeout (5 minutes)
const CONVERSATION_TIMEOUT = 5 * 60 * 1000;

/**
 * Set the active conversation for a user
 */
export function setActiveConversation(
  username: string,
  npcTemplateId: string,
  npcName: string
): void {
  activeConversations.set(username.toLowerCase(), {
    npcTemplateId,
    npcName,
    timestamp: Date.now(),
  });
}

/**
 * Get the active conversation for a user
 */
export function getActiveConversation(
  username: string
): { npcTemplateId: string; npcName: string } | null {
  const conversation = activeConversations.get(username.toLowerCase());

  if (!conversation) {
    return null;
  }

  // Check if conversation has timed out
  if (Date.now() - conversation.timestamp > CONVERSATION_TIMEOUT) {
    activeConversations.delete(username.toLowerCase());
    return null;
  }

  return { npcTemplateId: conversation.npcTemplateId, npcName: conversation.npcName };
}

/**
 * Clear the active conversation for a user
 */
export function clearActiveConversation(username: string): void {
  activeConversations.delete(username.toLowerCase());
}

/**
 * Cleanup old conversations periodically
 */
export function cleanupOldConversations(): void {
  const now = Date.now();
  for (const [username, conversation] of activeConversations) {
    if (now - conversation.timestamp > CONVERSATION_TIMEOUT) {
      activeConversations.delete(username);
    }
  }
}

// Cleanup old conversations every minute
setInterval(cleanupOldConversations, 60 * 1000);
