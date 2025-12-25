import { Command } from '../command.interface';
import { ConnectedClient } from '../../types';
import { writeMessageToClient } from '../../utils/socketWriter';
import { colors } from '../../utils/colors';
import { RoomManager } from '../../room/roomManager';
import { UserManager } from '../../user/userManager';

export class DepositCommand implements Command {
  name = 'deposit';
  description = 'Deposit gold into the bank';
  usage = 'deposit <amount>';

  constructor(
    private roomManager: RoomManager,
    private userManager: UserManager
  ) {}

  async execute(client: ConnectedClient, args: string): Promise<void> {
    if (!client.user) return;

    const room = this.roomManager.getRoom(client.user.currentRoomId);
    if (!room || !room.flags.includes('bank')) {
      writeMessageToClient(
        client,
        `${colors.yellow}You can only deposit gold at a bank.${colors.reset}\r\n`
      );
      return;
    }

    if (!args) {
      writeMessageToClient(client, `${colors.yellow}Usage: deposit <amount>${colors.reset}\r\n`);
      return;
    }

    const amount = parseInt(args);
    if (isNaN(amount) || amount <= 0) {
      writeMessageToClient(client, `${colors.red}Invalid amount.${colors.reset}\r\n`);
      return;
    }

    if (client.user.inventory.currency.gold < amount) {
      writeMessageToClient(
        client,
        `${colors.red}You don't have that much gold.${colors.reset}\r\n`
      );
      return;
    }

    client.user.inventory.currency.gold -= amount;
    if (!client.user.bank) client.user.bank = { gold: 0, silver: 0, copper: 0 };
    client.user.bank.gold += amount;

    // Persist changes to user database
    this.userManager.updateUserStats(client.user.username, {
      inventory: client.user.inventory,
      bank: client.user.bank,
    });

    writeMessageToClient(
      client,
      `${colors.green}You deposited ${amount} gold. Bank balance: ${client.user.bank.gold}${colors.reset}\r\n`
    );
  }
}
