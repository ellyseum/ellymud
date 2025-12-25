import { Command } from '../command.interface';
import { ConnectedClient } from '../../types';
import { writeMessageToClient } from '../../utils/socketWriter';
import { colors } from '../../utils/colors';
import { RoomManager } from '../../room/roomManager';
import { ItemManager } from '../../utils/itemManager';
import { Merchant } from '../../combat/merchant';
import { MerchantStateManager } from '../../combat/merchantStateManager';

export class SellCommand implements Command {
  name = 'sell';
  description = 'Sell an item to a merchant';
  usage = 'sell <item name>';

  constructor(private roomManager: RoomManager) {}

  async execute(client: ConnectedClient, args: string): Promise<void> {
    if (!client.user) return;
    if (!args) {
      writeMessageToClient(client, `${colors.yellow}Usage: sell <item name>${colors.reset}\r\n`);
      return;
    }

    const room = this.roomManager.getRoom(client.user.currentRoomId);
    if (!room) return;

    // Find merchant in room (must be a Merchant instance)
    const merchant = Array.from(room.npcs.values()).find((npc) => npc.isMerchant()) as
      | Merchant
      | undefined;
    if (!merchant) {
      writeMessageToClient(client, `${colors.yellow}There is no merchant here.${colors.reset}\r\n`);
      return;
    }

    const itemName = args.toLowerCase();
    const itemManager = ItemManager.getInstance();

    const itemIndex = client.user.inventory.items.findIndex((instanceId) => {
      const item = itemManager.getItemInstance(instanceId);
      if (!item) return false;
      const template = itemManager.getItem(item.templateId);
      return template && template.name.toLowerCase().includes(itemName);
    });

    if (itemIndex === -1) {
      writeMessageToClient(client, `${colors.yellow}You don't have that item.${colors.reset}\r\n`);
      return;
    }

    const instanceId = client.user.inventory.items[itemIndex];
    const item = itemManager.getItemInstance(instanceId);

    if (!item) return;
    const template = itemManager.getItem(item.templateId);
    if (!template) return;

    const value = Math.floor(template.value * 0.5); // 50% sell price

    // Remove from player inventory
    client.user.inventory.items.splice(itemIndex, 1);
    client.user.inventory.currency.gold += value;

    // Add history entry to the item
    if (item.history) {
      item.history.push({
        timestamp: new Date(),
        event: 'sold',
        details: `Sold by ${client.user.username} to ${merchant.name} for ${value} gold`,
      });
    }

    // Update item creator to reflect merchant ownership
    item.createdBy = `merchant:${merchant.name}`;

    // Add the actual item instance to merchant's inventory (not just template)
    merchant.addItem(instanceId);

    // Save merchant state for persistence across restarts
    const stateManager = MerchantStateManager.getInstance();
    stateManager.updateMerchantState(merchant.getInventoryState());
    stateManager.saveState();

    // Save item instance changes
    itemManager.saveItemInstances();

    writeMessageToClient(
      client,
      `${colors.green}You sold ${template.name} for ${value} gold.${colors.reset}\r\n`
    );
  }
}
