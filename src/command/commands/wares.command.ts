import { Command } from '../command.interface';
import { ConnectedClient } from '../../types';
import { writeMessageToClient } from '../../utils/socketWriter';
import { colors } from '../../utils/colors';
import { RoomManager } from '../../room/roomManager';
import { Merchant } from '../../combat/merchant';

export class WaresCommand implements Command {
  name = 'wares';
  description = 'List items for sale by a merchant';
  aliases = ['shop', 'merchandise', 'list'];

  constructor(private roomManager: RoomManager) {}

  async execute(client: ConnectedClient, _args: string): Promise<void> {
    if (!client.user) return;

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

    // Build the entire output as a single string to avoid prompt redraws between lines
    const lines: string[] = [];
    lines.push(`${colors.cyan}${merchant.name} is selling:${colors.reset}`);

    // Get grouped inventory (item name -> count) for display
    const groupedInventory = merchant.getInventoryGrouped();

    if (groupedInventory.size === 0) {
      lines.push(`${colors.gray}  Nothing for sale.${colors.reset}`);
    } else {
      for (const [, { template, count }] of groupedInventory) {
        if (!template) continue;
        const countDisplay = count > 1 ? ` (x${count})` : '';
        lines.push(
          `  ${template.name}${countDisplay} - ${colors.yellow}${template.value} gold${colors.reset}`
        );
      }
    }

    writeMessageToClient(client, lines.join('\r\n') + '\r\n');
  }
}
