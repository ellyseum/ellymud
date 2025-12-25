import { Command } from '../command.interface';
import { ConnectedClient } from '../../types';
import { writeMessageToClient } from '../../utils/socketWriter';
import { colors } from '../../utils/colors';
import { RoomManager } from '../../room/roomManager';
import { ItemManager } from '../../utils/itemManager';
import { Merchant } from '../../combat/merchant';
import { MerchantStateManager } from '../../combat/merchantStateManager';

export class BuyCommand implements Command {
  name = 'buy';
  description = 'Buy an item from a merchant';
  usage = 'buy <item name>';

  constructor(private roomManager: RoomManager) {}

  async execute(client: ConnectedClient, args: string): Promise<void> {
    if (!client.user) return;
    if (!args) {
      writeMessageToClient(client, `${colors.yellow}Usage: buy <item name>${colors.reset}\r\n`);
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

    const itemManager = ItemManager.getInstance();
    const itemName = args.toLowerCase();

    // Find item in merchant's actual inventory using merchant's method
    const foundInstanceId = merchant.findItemByName(itemName);
    if (!foundInstanceId) {
      writeMessageToClient(
        client,
        `${colors.yellow}The merchant doesn't have that.${colors.reset}\r\n`
      );
      return;
    }

    // Get the item instance and template
    const foundInstance = itemManager.getItemInstance(foundInstanceId);
    if (!foundInstance) {
      writeMessageToClient(
        client,
        `${colors.yellow}The merchant doesn't have that.${colors.reset}\r\n`
      );
      return;
    }
    const foundTemplate = itemManager.getItem(foundInstance.templateId);
    if (!foundTemplate) {
      writeMessageToClient(client, `${colors.yellow}Item data not found.${colors.reset}\r\n`);
      return;
    }

    if (client.user.inventory.currency.gold < foundTemplate.value) {
      writeMessageToClient(
        client,
        `${colors.red}You can't afford that. It costs ${foundTemplate.value} gold.${colors.reset}\r\n`
      );
      return;
    }

    // Transaction - remove from merchant, add to player
    merchant.removeItem(foundInstanceId);
    client.user.inventory.currency.gold -= foundTemplate.value;
    client.user.inventory.items.push(foundInstanceId);

    // Save merchant state for persistence across restarts
    const stateManager = MerchantStateManager.getInstance();
    stateManager.updateMerchantState(merchant.getInventoryState());
    stateManager.saveState();

    // Add history entry to the item
    const instance = itemManager.getItemInstance(foundInstanceId);
    if (instance && instance.history) {
      instance.history.push({
        timestamp: new Date(),
        event: 'purchased',
        details: `Purchased by ${client.user.username} from ${merchant.name} for ${foundTemplate.value} gold`,
      });
      itemManager.saveItemInstances();
    }

    writeMessageToClient(
      client,
      `${colors.green}You bought ${foundTemplate.name} for ${foundTemplate.value} gold.${colors.reset}\r\n`
    );
  }
}
