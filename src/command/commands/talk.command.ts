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

    // Check for quest dialogues
    const dialogueResult = await getQuestDialoguesForNpc(client.user, targetNpc.templateId);

    if (dialogueResult.hasQuestDialogue) {
      // Set active conversation for reply command
      setActiveConversation(client.user.username, targetNpc.templateId, targetNpc.name);

      // Display quest dialogue
      displayQuestDialogue(client, targetNpc.name, dialogueResult);
    } else {
      // No quest dialogue - show default NPC description
      writeMessageToClient(client, colorize(`${targetNpc.name} looks at you.\r\n`, 'white'));
      writeMessageToClient(
        client,
        colorize(`${targetNpc.name} doesn't have anything to say to you.\r\n`, 'gray')
      );

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
