import { Command } from '../command.interface';
import { ConnectedClient } from '../../types';
import { writeMessageToClient } from '../../utils/socketWriter';
import { colors } from '../../utils/colors';
import { RoomManager } from '../../room/roomManager';

export class BalanceCommand implements Command {
  name = 'balance';
  description = 'Check your bank balance';

  constructor(private roomManager: RoomManager) {}

  async execute(client: ConnectedClient, _args: string): Promise<void> {
    if (!client.user) return;

    const room = this.roomManager.getRoom(client.user.currentRoomId);
    if (!room || !room.flags.includes('bank')) {
      writeMessageToClient(
        client,
        `${colors.yellow}You can only check your balance at a bank.${colors.reset}`
      );
      return;
    }

    const balance = client.user.bank ? client.user.bank.gold : 0;
    writeMessageToClient(client, `${colors.green}Bank Balance: ${balance} gold${colors.reset}`);
  }
}
