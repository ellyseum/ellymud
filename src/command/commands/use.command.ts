import { ConnectedClient } from '../../types';
import { colorize } from '../../utils/colors';
import { writeFormattedMessageToClient } from '../../utils/socketWriter';
import { Command } from '../command.interface';
import { AbilityManager } from '../../abilities/abilityManager';
import { ItemManager } from '../../utils/itemManager';
import { getPlayerLogger } from '../../utils/logger';
import { questEventBus } from '../../quest/questEventHandler';

export class UseCommand implements Command {
  name = 'use';
  description = 'Use an item from your inventory';

  constructor(private abilityManager: AbilityManager) {}

  execute(client: ConnectedClient, args: string): void {
    if (!client.user) {
      writeFormattedMessageToClient(
        client,
        colorize('You must be logged in to use items.\r\n', 'red')
      );
      return;
    }

    const playerLogger = getPlayerLogger(client.user.username);
    const itemName = args.trim().toLowerCase();

    if (!itemName) {
      writeFormattedMessageToClient(client, colorize('Usage: use <item>\r\n', 'yellow'));
      this.showUsableItems(client);
      return;
    }

    const itemManager = ItemManager.getInstance();
    const inventoryItems = client.user.inventory?.items || [];

    const foundItemId = inventoryItems.find((id: string) => {
      const displayName = itemManager.getItemDisplayName(id);
      return displayName?.toLowerCase().includes(itemName);
    });

    if (!foundItemId) {
      writeFormattedMessageToClient(
        client,
        colorize(`You don't have a '${itemName}' in your inventory.\r\n`, 'red')
      );
      return;
    }

    playerLogger.info(`Using item: ${foundItemId}`);
    this.abilityManager.executeItemAbility(client, foundItemId);

    // Get the template ID for the quest event
    const instance = itemManager.getItemInstance(foundItemId);
    const templateId = instance?.templateId || foundItemId;

    // Emit quest event for item use
    questEventBus.emit('item:used', {
      client,
      itemId: templateId,
      instanceId: foundItemId,
    });
  }

  private showUsableItems(client: ConnectedClient): void {
    if (!client.user) return;

    const itemManager = ItemManager.getInstance();
    const inventoryItems = client.user.inventory?.items || [];
    const usableItems: string[] = [];

    for (const itemId of inventoryItems) {
      const instance = itemManager.getItemInstance(itemId);
      const template = instance
        ? itemManager.getItem(instance.templateId)
        : itemManager.getItem(itemId);

      if (template && (template as unknown as Record<string, unknown>).ability) {
        usableItems.push(template.name);
      }
    }

    if (usableItems.length === 0) {
      writeFormattedMessageToClient(client, colorize('You have no usable items.\r\n', 'gray'));
      return;
    }

    writeFormattedMessageToClient(client, colorize('\r\nUsable items:\r\n', 'white'));
    for (const name of usableItems) {
      writeFormattedMessageToClient(client, colorize(`  ${name}\r\n`, 'cyan'));
    }
  }
}
