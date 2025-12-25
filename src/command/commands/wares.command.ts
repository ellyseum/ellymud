import { Command } from '../command.interface';
import { ConnectedClient } from '../../types';
import { writeMessageToClient } from '../../utils/socketWriter';
import { colors } from '../../utils/colors';
import { RoomManager } from '../../room/roomManager';
import { ItemManager } from '../../utils/itemManager';

export class WaresCommand implements Command {
  name = 'wares';
  description = 'List items for sale by a merchant';
  aliases = ['list'];

  constructor(private roomManager: RoomManager) {}

  async execute(client: ConnectedClient, _args: string): Promise<void> {
    if (!client.user) return;

    const room = this.roomManager.getRoom(client.user.currentRoomId);
    if (!room) return;

    const merchant = Array.from(room.npcs.values()).find((npc) => npc.merchant);
    if (!merchant) {
      writeMessageToClient(client, `${colors.yellow}There is no merchant here.${colors.reset}`);
      return;
    }

    writeMessageToClient(client, `${colors.cyan}${merchant.name} is selling:${colors.reset}`);
    const itemManager = ItemManager.getInstance();
    merchant.inventory.forEach((id) => {
      const template = itemManager.getItem(id);
      if (template) {
        writeMessageToClient(
          client,
          `  ${template.name} - ${colors.yellow}${template.value} gold${colors.reset}`
        );
      }
    });
  }
}
