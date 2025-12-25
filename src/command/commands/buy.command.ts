import { Command } from '../command.interface';
import { ConnectedClient } from '../../types';
import { writeMessageToClient } from '../../utils/socketWriter';
import { colors } from '../../utils/colors';
import { RoomManager } from '../../room/roomManager';
import { ItemManager } from '../../utils/itemManager';

export class BuyCommand implements Command {
  name = 'buy';
  description = 'Buy an item from a merchant';
  usage = 'buy <item name>';

  constructor(private roomManager: RoomManager) {}

  async execute(client: ConnectedClient, args: string): Promise<void> {
    if (!client.user) return;
    if (!args) {
      writeMessageToClient(client, `${colors.yellow}Usage: buy <item name>${colors.reset}`);
      return;
    }

    const room = this.roomManager.getRoom(client.user.currentRoomId);
    if (!room) return;

    // Find merchant in room
    const merchant = Array.from(room.npcs.values()).find((npc) => npc.merchant);
    if (!merchant) {
      writeMessageToClient(client, `${colors.yellow}There is no merchant here.${colors.reset}`);
      return;
    }

    const itemName = args.toLowerCase();
    // Find item in merchant inventory
    // Note: merchant.inventory contains template IDs
    const itemManager = ItemManager.getInstance();
    const itemTemplateId = merchant.inventory.find((id) => {
      const template = itemManager.getItem(id);
      return template && template.name.toLowerCase().includes(itemName);
    });

    if (!itemTemplateId) {
      writeMessageToClient(
        client,
        `${colors.yellow}The merchant doesn't have that.${colors.reset}`
      );
      return;
    }

    const template = itemManager.getItem(itemTemplateId);
    if (!template) return;

    if (client.user.inventory.currency.gold < template.value) {
      writeMessageToClient(
        client,
        `${colors.red}You can't afford that. It costs ${template.value} gold.${colors.reset}`
      );
      return;
    }

    // Transaction
    client.user.inventory.currency.gold -= template.value;
    const newItem = itemManager.createItemInstance(itemTemplateId, client.user.username);
    if (!newItem) {
      writeMessageToClient(client, `${colors.red}Failed to create item.${colors.reset}`);
      return;
    }
    client.user.inventory.items.push(newItem.instanceId);

    writeMessageToClient(
      client,
      `${colors.green}You bought ${template.name} for ${template.value} gold.${colors.reset}`
    );
  }
}
