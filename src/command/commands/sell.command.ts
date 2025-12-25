import { Command } from '../command.interface';
import { ConnectedClient } from '../../types';
import { writeMessageToClient } from '../../utils/socketWriter';
import { colors } from '../../utils/colors';
import { RoomManager } from '../../room/roomManager';
import { ItemManager } from '../../utils/itemManager';

export class SellCommand implements Command {
  name = 'sell';
  description = 'Sell an item to a merchant';
  usage = 'sell <item name>';

  constructor(private roomManager: RoomManager) {}

  async execute(client: ConnectedClient, args: string): Promise<void> {
    if (!client.user) return;
    if (!args) {
      writeMessageToClient(client, `${colors.yellow}Usage: sell <item name>${colors.reset}`);
      return;
    }

    const room = this.roomManager.getRoom(client.user.currentRoomId);
    if (!room) return;

    const merchant = Array.from(room.npcs.values()).find((npc) => npc.merchant);
    if (!merchant) {
      writeMessageToClient(client, `${colors.yellow}There is no merchant here.${colors.reset}`);
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
      writeMessageToClient(client, `${colors.yellow}You don't have that item.${colors.reset}`);
      return;
    }

    const instanceId = client.user.inventory.items[itemIndex];
    const item = itemManager.getItemInstance(instanceId);

    if (!item) return;
    const template = itemManager.getItem(item.templateId);
    if (!template) return;

    const value = Math.floor(template.value * 0.5); // 50% sell price

    client.user.inventory.items.splice(itemIndex, 1);
    client.user.inventory.currency.gold += value;

    // Remove the item instance from the game
    itemManager.deleteItemInstance(instanceId);

    writeMessageToClient(
      client,
      `${colors.green}You sold ${template.name} for ${value} gold.${colors.reset}`
    );
  }
}
