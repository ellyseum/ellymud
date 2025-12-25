import { Command } from '../command.interface';
import { ConnectedClient } from '../../types';
import { writeMessageToClient } from '../../utils/socketWriter';
import { colors } from '../../utils/colors';
import { RoomManager } from '../../room/roomManager';

export class WithdrawCommand implements Command {
  name = 'withdraw';
  description = 'Withdraw gold from the bank';
  usage = 'withdraw <amount>';

  constructor(private roomManager: RoomManager) {}

  async execute(client: ConnectedClient, args: string): Promise<void> {
    if (!client.user) return;

    const room = this.roomManager.getRoom(client.user.currentRoomId);
    if (!room || !room.flags.includes('bank')) {
      writeMessageToClient(
        client,
        `${colors.yellow}You can only withdraw gold at a bank.${colors.reset}`
      );
      return;
    }

    if (!args) {
      writeMessageToClient(client, `${colors.yellow}Usage: withdraw <amount>${colors.reset}`);
      return;
    }

    const amount = parseInt(args);
    if (isNaN(amount) || amount <= 0) {
      writeMessageToClient(client, `${colors.red}Invalid amount.${colors.reset}`);
      return;
    }

    if (!client.user.bank || client.user.bank.gold < amount) {
      writeMessageToClient(
        client,
        `${colors.red}You don't have that much gold in the bank.${colors.reset}`
      );
      return;
    }

    client.user.bank.gold -= amount;
    client.user.inventory.currency.gold += amount;

    writeMessageToClient(
      client,
      `${colors.green}You withdrew ${amount} gold. Bank balance: ${client.user.bank.gold}${colors.reset}`
    );
  }
}
