import { Command } from '../command.interface';
import { ConnectedClient } from '../../types';
import { writeMessageToClient } from '../../utils/socketWriter';
import { colors } from '../../utils/colors';
import { RoomManager } from '../../room/roomManager';

export class BalanceCommand implements Command {
  name = 'balance';
  aliases = ['bank'];
  description = 'Check your bank balance';

  constructor(private roomManager: RoomManager) {}

  async execute(client: ConnectedClient, _args: string): Promise<void> {
    if (!client.user) return;

    const balance = client.user.bank ? client.user.bank.gold : 0;
    writeMessageToClient(client, `${colors.green}Bank Balance: ${balance} gold${colors.reset}\r\n`);
  }
}
