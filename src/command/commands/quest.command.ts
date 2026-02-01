/**
 * Quest Command
 *
 * View quest log, accept quests, and manage active quests.
 *
 * Usage:
 *   quest                  - Show active quests
 *   quest log              - Show active quests (alias)
 *   quest available        - Show available quests
 *   quest <id>             - Show details for a quest
 *   quest accept <id>      - Accept a quest
 *   quest abandon <id>     - Abandon an active quest
 *   quest completed        - Show completed quests
 *
 * @module command/commands/quest
 */

import { ConnectedClient } from '../../types';
import { colorize } from '../../utils/colors';
import { writeMessageToClient } from '../../utils/socketWriter';
import { Command } from '../command.interface';
import { getQuestManager } from '../../quest/questManager';

export class QuestCommand implements Command {
  name = 'quest';
  description = 'View quest log, accept or abandon quests';

  async execute(client: ConnectedClient, args: string): Promise<void> {
    if (!client.user) return;

    const questManager = getQuestManager();
    await questManager.ensureInitialized();

    // Parse arguments
    const argArray = args.trim().split(/\s+/);
    const subcommand = argArray[0]?.toLowerCase() || 'log';
    const param = argArray.slice(1).join(' ');

    switch (subcommand) {
      case 'log':
      case 'active':
        await this.showActiveQuests(client);
        break;

      case 'available':
      case 'avail':
        await this.showAvailableQuests(client);
        break;

      case 'accept':
      case 'start':
        if (!param) {
          writeMessageToClient(client, colorize('Usage: quest accept <quest_id>\r\n', 'red'));
          return;
        }
        await this.acceptQuest(client, param);
        break;

      case 'abandon':
      case 'drop':
        if (!param) {
          writeMessageToClient(client, colorize('Usage: quest abandon <quest_id>\r\n', 'red'));
          return;
        }
        await this.abandonQuest(client, param);
        break;

      case 'completed':
      case 'done':
        await this.showCompletedQuests(client);
        break;

      default:
        // Assume it's a quest ID for details
        await this.showQuestDetails(client, subcommand);
        break;
    }
  }

  private async showActiveQuests(client: ConnectedClient): Promise<void> {
    if (!client.user) return;

    const questManager = getQuestManager();
    const activeQuests = await questManager.getActiveQuests(client.user.username);

    if (activeQuests.length === 0) {
      writeMessageToClient(
        client,
        colorize(
          'You have no active quests. Use "quest available" to see what\'s available.\r\n',
          'yellow'
        )
      );
      return;
    }

    const lines: string[] = [];
    lines.push(colorize('=== Active Quests ===', 'cyan'));
    lines.push('');

    for (const active of activeQuests) {
      const quest = questManager.getQuest(active.questId);
      if (!quest) continue;

      const currentStep = quest.steps.find((s) => s.id === active.currentStepId);
      const stepProgress = active.stepProgress[active.currentStepId];

      lines.push(colorize(`[${quest.id}] ${quest.name}`, 'yellow'));
      lines.push(colorize(`  ${quest.description}`, 'white'));

      if (currentStep) {
        lines.push(colorize(`  Current: ${currentStep.name}`, 'cyan'));

        // Show objective progress
        if (stepProgress) {
          for (const [objId, progress] of Object.entries(stepProgress.objectives)) {
            const statusIcon = progress.completed
              ? colorize('[x]', 'green')
              : colorize('[ ]', 'gray');
            const progressText =
              progress.required > 1 ? ` (${progress.current}/${progress.required})` : '';
            lines.push(`    ${statusIcon} ${objId}${progressText}`);
          }
        }
      }

      lines.push('');
    }

    writeMessageToClient(client, lines.join('\r\n') + '\r\n');
  }

  private async showAvailableQuests(client: ConnectedClient): Promise<void> {
    if (!client.user) return;

    const questManager = getQuestManager();
    const available = await questManager.getAvailableQuests(client.user);

    if (available.length === 0) {
      writeMessageToClient(
        client,
        colorize('No quests are currently available to you.\r\n', 'yellow')
      );
      return;
    }

    const lines: string[] = [];
    lines.push(colorize('=== Available Quests ===', 'cyan'));
    lines.push('');

    for (const quest of available) {
      const levelReq = quest.prerequisites?.level ? ` (Lv. ${quest.prerequisites.level}+)` : '';
      const categoryTag = colorize(`[${quest.category}]`, 'gray');
      lines.push(colorize(`[${quest.id}] ${quest.name}${levelReq}`, 'yellow') + ' ' + categoryTag);
      lines.push(colorize(`  ${quest.description}`, 'white'));
      lines.push('');
    }

    lines.push(colorize('Use "quest accept <id>" to start a quest.', 'gray'));

    writeMessageToClient(client, lines.join('\r\n') + '\r\n');
  }

  private async showCompletedQuests(client: ConnectedClient): Promise<void> {
    if (!client.user) return;

    const questManager = getQuestManager();
    const completed = await questManager.getCompletedQuests(client.user.username);

    if (completed.length === 0) {
      writeMessageToClient(
        client,
        colorize('You have not completed any quests yet.\r\n', 'yellow')
      );
      return;
    }

    const lines: string[] = [];
    lines.push(colorize('=== Completed Quests ===', 'cyan'));
    lines.push('');

    for (const record of completed) {
      const quest = questManager.getQuest(record.questId);
      const questName = quest?.name || record.questId;
      const date = new Date(record.completedAt).toLocaleDateString();
      const countText = record.completionCount > 1 ? ` (x${record.completionCount})` : '';

      lines.push(colorize(`[x] ${questName}${countText}`, 'green'));
      lines.push(colorize(`    Completed: ${date}`, 'gray'));
    }

    writeMessageToClient(client, lines.join('\r\n') + '\r\n');
  }

  private async showQuestDetails(client: ConnectedClient, questId: string): Promise<void> {
    if (!client.user) return;

    const questManager = getQuestManager();
    const quest = questManager.getQuest(questId);

    if (!quest) {
      writeMessageToClient(client, colorize(`Quest "${questId}" not found.\r\n`, 'red'));
      return;
    }

    const activeQuests = await questManager.getActiveQuests(client.user.username);
    const isActive = activeQuests.some((q) => q.questId === questId);

    const lines: string[] = [];
    lines.push(colorize(`=== ${quest.name} ===`, 'cyan'));
    lines.push('');
    lines.push(colorize(quest.longDescription || quest.description, 'white'));
    lines.push('');
    lines.push(colorize(`Category: ${quest.category}`, 'gray'));

    if (quest.recommendedLevel) {
      lines.push(
        colorize(
          `Recommended Level: ${quest.recommendedLevel.min}-${quest.recommendedLevel.max}`,
          'gray'
        )
      );
    }

    if (quest.repeatable) {
      lines.push(colorize('This quest can be repeated.', 'gray'));
    }

    lines.push('');
    lines.push(colorize('Steps:', 'yellow'));
    for (let i = 0; i < quest.steps.length; i++) {
      const step = quest.steps[i];
      lines.push(colorize(`  ${i + 1}. ${step.name}`, 'white'));
    }

    if (quest.rewards) {
      lines.push('');
      lines.push(colorize('Rewards:', 'yellow'));
      if (quest.rewards.experience) {
        lines.push(colorize(`  Experience: ${quest.rewards.experience}`, 'white'));
      }
      if (quest.rewards.currency) {
        const parts: string[] = [];
        if (quest.rewards.currency.gold) parts.push(`${quest.rewards.currency.gold} gold`);
        if (quest.rewards.currency.silver) parts.push(`${quest.rewards.currency.silver} silver`);
        if (quest.rewards.currency.copper) parts.push(`${quest.rewards.currency.copper} copper`);
        if (parts.length > 0) {
          lines.push(colorize(`  Currency: ${parts.join(', ')}`, 'white'));
        }
      }
      if (quest.rewards.items && quest.rewards.items.length > 0) {
        lines.push(colorize(`  Items: ${quest.rewards.items.length} item(s)`, 'white'));
      }
    }

    lines.push('');
    if (isActive) {
      lines.push(colorize('[This quest is currently active]', 'green'));
    } else {
      lines.push(colorize('Use "quest accept ' + questId + '" to start this quest.', 'gray'));
    }

    writeMessageToClient(client, lines.join('\r\n') + '\r\n');
  }

  private async acceptQuest(client: ConnectedClient, questId: string): Promise<void> {
    if (!client.user) return;

    const questManager = getQuestManager();
    const result = await questManager.startQuest(client.user, questId);

    if (result.success) {
      const quest = questManager.getQuest(questId);
      writeMessageToClient(
        client,
        colorize(`Quest accepted: ${quest?.name || questId}\r\n`, 'green')
      );

      // Show first step
      if (quest && quest.steps.length > 0) {
        writeMessageToClient(client, colorize(`Objective: ${quest.steps[0].name}\r\n`, 'yellow'));
      }
    } else {
      writeMessageToClient(client, colorize(`Cannot accept quest: ${result.error}\r\n`, 'red'));
    }
  }

  private async abandonQuest(client: ConnectedClient, questId: string): Promise<void> {
    if (!client.user) return;

    const questManager = getQuestManager();
    const success = await questManager.abandonQuest(client.user.username, questId);

    if (success) {
      const quest = questManager.getQuest(questId);
      writeMessageToClient(
        client,
        colorize(`Quest abandoned: ${quest?.name || questId}\r\n`, 'yellow')
      );
    } else {
      writeMessageToClient(
        client,
        colorize(`You don't have an active quest with ID "${questId}".\r\n`, 'red')
      );
    }
  }
}
