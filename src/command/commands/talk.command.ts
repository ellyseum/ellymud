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
  setActiveQuestOffer,
  getActiveQuestOffer,
  clearActiveQuestOffer,
} from '../../quest/questDialogue';
import { questEventBus } from '../../quest/questEventHandler';
import { getQuestManager } from '../../quest/questManager';
import { QuestDefinition } from '../../quest/types';

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
      // this NPC is the giver of any AVAILABLE quest(s). If exactly one, auto-
      // accept (existing behavior). If multiple, show a numbered menu and
      // accept on `reply <n>`.
      const questManager = getQuestManager();
      const available = await questManager.getAvailableQuests(client.user);
      const offers = available.filter((q) => q.questGiver === targetNpc.templateId);

      if (offers.length === 1) {
        await acceptQuestOffer(client, targetNpc.templateId, offers[0]);
      } else if (offers.length > 1) {
        // Multi-quest offer — render menu, stash state, ReplyCommand handles selection.
        clearActiveConversation(client.user.username);
        setActiveQuestOffer(
          client.user.username,
          offers.map((q) => q.id),
          targetNpc.templateId,
          targetNpc.name
        );
        writeMessageToClient(
          client,
          colorize(`\r\n${targetNpc.name} has several things you could help with:\r\n`, 'cyan')
        );
        offers.forEach((q, i) => {
          writeMessageToClient(
            client,
            colorize(`  ${i + 1}. ${q.name} — ${q.description}\r\n`, 'white')
          );
        });
        writeMessageToClient(
          client,
          colorize('\r\nUse "reply <number>" to accept one.\r\n', 'dim')
        );
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
 * Accept a single offered quest, skipping a redundant first-step talk_to_npc
 * objective when it points at the same NPC the player just talked to. Shared
 * between the single-offer path in TalkCommand and the menu-selection path
 * in ReplyCommand.
 */
async function acceptQuestOffer(
  client: ConnectedClient,
  npcTemplateId: string,
  quest: QuestDefinition
): Promise<void> {
  if (!client.user) return;
  const firstStep = quest.steps[0];
  const firstObjective = firstStep?.objectives?.[0];
  const isFirstStepRedundantTalk =
    firstObjective?.type === 'talk_to_npc' &&
    (firstObjective as { npcTemplateId?: string }).npcTemplateId === npcTemplateId;
  const startingStep = isFirstStepRedundantTalk ? quest.steps[1]?.id : undefined;

  const result = await getQuestManager().startQuest(client.user, quest.id, { startingStep });
  if (result.success) {
    writeMessageToClient(client, colorize(`\r\n"${quest.description}"\r\n`, 'cyan'));
    writeMessageToClient(client, colorize(`Quest accepted: ${quest.name}\r\n`, 'brightYellow'));
  } else if (result.error) {
    writeMessageToClient(
      client,
      colorize(`\r\nCan't accept ${quest.name}: ${result.error}\r\n`, 'yellow')
    );
  }
}

/**
 * Reply Command
 *
 * Select a dialogue option in an active conversation OR pick a quest from a
 * multi-quest offer menu.
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
    const optionNum = parseInt(argString, 10);
    if (isNaN(optionNum) || optionNum < 1) {
      writeMessageToClient(client, colorize('Usage: reply <number>\r\n', 'red'));
      return;
    }

    // Quest-offer menu has priority: if the player just saw a multi-quest
    // menu (talk command set this), the next reply is a quest selection.
    const offer = getActiveQuestOffer(client.user.username);
    if (offer) {
      const idx = optionNum - 1;
      if (idx < 0 || idx >= offer.questIds.length) {
        writeMessageToClient(
          client,
          colorize(`Pick a number between 1 and ${offer.questIds.length}.\r\n`, 'red')
        );
        return;
      }
      const questId = offer.questIds[idx];
      const quest = getQuestManager().getQuest(questId);
      if (!quest) {
        writeMessageToClient(client, colorize(`That offer is no longer available.\r\n`, 'yellow'));
        clearActiveQuestOffer(client.user.username);
        return;
      }
      clearActiveQuestOffer(client.user.username);
      await acceptQuestOffer(client, offer.npcTemplateId, quest);
      return;
    }

    // Otherwise: standard active-conversation flow
    const active = getActiveConversation(client.user.username);
    if (!active) {
      writeMessageToClient(
        client,
        colorize('You are not in a conversation. Use "talk <npc>" first.\r\n', 'yellow')
      );
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
