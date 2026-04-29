/**
 * Talk Command
 *
 * Talk to NPCs in the current room. Supports quest dialogues.
 *
 * Usage:
 *   talk <npc>              - Start conversation with NPC
 *   talk                    - Resume conversation if one is active
 *   reply <number>          - Select a dialogue option
 *
 * @module command/commands/talk
 */

import { ConnectedClient } from '../../types';
import { colorize } from '../../utils/colors';
import { writeMessageToClient } from '../../utils/socketWriter';
import { Command } from '../command.interface';
import { RoomManager } from '../../room/roomManager';
import { NPC } from '../../combat/npc';
import {
  getQuestDialoguesForNpc,
  displayQuestDialogue,
  handleDialogueResponse,
  setActiveConversation,
  getActiveConversation,
  clearActiveConversation,
} from '../../quest/questDialogue';
import { questEventBus } from '../../quest/questEventHandler';
import { getQuestManager } from '../../quest/questManager';

export class TalkCommand implements Command {
  name = 'talk';
  description = 'Talk to an NPC in the room';

  constructor(private roomManager: RoomManager) {}

  async execute(client: ConnectedClient, args: string): Promise<void> {
    if (!client.user) return;

    const argString = args.trim();

    if (!argString) {
      // Check for active conversation
      const active = getActiveConversation(client.user.username);
      if (active) {
        // Re-display the dialogue
        const result = await getQuestDialoguesForNpc(client.user, active.npcTemplateId);
        if (result.hasQuestDialogue) {
          displayQuestDialogue(client, active.npcName, result);
          return;
        }
      }

      writeMessageToClient(client, colorize('Talk to whom? Usage: talk <npc name>\r\n', 'yellow'));
      return;
    }

    // Get current room
    const room = this.roomManager.getRoom(client.user.currentRoomId);
    if (!room) {
      writeMessageToClient(client, colorize('You are nowhere.\r\n', 'red'));
      return;
    }

    // Find matching NPC in the room
    const targetName = argString.toLowerCase();
    let targetNpc: NPC | undefined;

    for (const npc of room.npcs.values()) {
      if (
        npc.name.toLowerCase() === targetName ||
        npc.name.toLowerCase().includes(targetName) ||
        npc.templateId.toLowerCase() === targetName
      ) {
        targetNpc = npc;
        break;
      }
    }

    if (!targetNpc) {
      writeMessageToClient(
        client,
        colorize(`There is no "${argString}" here to talk to.\r\n`, 'red')
      );
      return;
    }

    // Check for quest dialogues for an active quest
    const dialogueResult = await getQuestDialoguesForNpc(client.user, targetNpc.templateId);

    if (dialogueResult.hasQuestDialogue) {
      // Set active conversation for reply command
      setActiveConversation(client.user.username, targetNpc.templateId, targetNpc.name);

      // Display quest dialogue
      displayQuestDialogue(client, targetNpc.name, dialogueResult);
    } else {
      // No active quest dialogue. Before falling back to flavor, check whether
      // this NPC is the giver of any AVAILABLE quest. If so, auto-offer it —
      // saves the player from having to discover `quest available` /
      // `quest accept <id>` on their own.
      const questManager = getQuestManager();
      const available = await questManager.getAvailableQuests(client.user);
      const offered = available.find((q) => q.questGiver === targetNpc.templateId);

      if (offered) {
        // Auto-accept and skip the first step if it's a `talk_to_npc` step
        // pointing at this same NPC (otherwise the player would have to
        // immediately re-talk to advance — bad UX).
        const firstStep = offered.steps[0];
        const firstObjective = firstStep?.objectives?.[0];
        const isFirstStepRedundantTalk =
          firstObjective?.type === 'talk_to_npc' &&
          (firstObjective as { npcTemplateId?: string }).npcTemplateId === targetNpc.templateId;
        const startingStep = isFirstStepRedundantTalk ? offered.steps[1]?.id : undefined;

        const result = await questManager.startQuest(client.user, offered.id, { startingStep });
        if (result.success) {
          writeMessageToClient(
            client,
            colorize(`\r\n${targetNpc.name} explains: "${offered.description}"\r\n`, 'cyan')
          );
          writeMessageToClient(
            client,
            colorize(`Quest accepted: ${offered.name}\r\n`, 'brightYellow')
          );
        } else if (result.error) {
          writeMessageToClient(
            client,
            colorize(
              `\r\n${targetNpc.name} would offer you a quest, but: ${result.error}\r\n`,
              'yellow'
            )
          );
        }
      } else {
        // No quest dialogue and no quest to offer — show NPC's default flavor.
        const npcData = NPC.loadNPCData();
        const template = npcData.get(targetNpc.templateId);
        const defaultDialogue = template?.dialogue;

        if (defaultDialogue) {
          writeMessageToClient(
            client,
            colorize(`\r\n${targetNpc.name} says, "${defaultDialogue}"\r\n\r\n`, 'cyan')
          );
        } else {
          writeMessageToClient(client, colorize(`${targetNpc.name} looks at you.\r\n`, 'white'));
          writeMessageToClient(
            client,
            colorize(`${targetNpc.name} doesn't have anything to say to you.\r\n`, 'gray')
          );
        }
      }

      // Still emit the talked event (might satisfy simple talk objectives)
      questEventBus.emit('npc:talked', {
        client,
        npcTemplateId: targetNpc.templateId,
      });
    }
  }
}

/**
 * Reply Command
 *
 * Select a dialogue option in an active conversation.
 *
 * Usage:
 *   reply <number>          - Select option by number
 */
export class ReplyCommand implements Command {
  name = 'reply';
  description = 'Reply to an NPC in a conversation';

  async execute(client: ConnectedClient, args: string): Promise<void> {
    if (!client.user) return;

    const argString = args.trim();

    // Check for active conversation
    const active = getActiveConversation(client.user.username);
    if (!active) {
      writeMessageToClient(
        client,
        colorize('You are not in a conversation. Use "talk <npc>" first.\r\n', 'yellow')
      );
      return;
    }

    // Parse the option number
    const optionNum = parseInt(argString, 10);
    if (isNaN(optionNum) || optionNum < 1) {
      writeMessageToClient(client, colorize('Usage: reply <number>\r\n', 'red'));
      return;
    }

    // Handle the dialogue response
    const handled = await handleDialogueResponse(client, active.npcTemplateId, optionNum);

    if (!handled) {
      writeMessageToClient(
        client,
        colorize('Invalid option or conversation has ended.\r\n', 'red')
      );
      clearActiveConversation(client.user.username);
    }
  }
}
