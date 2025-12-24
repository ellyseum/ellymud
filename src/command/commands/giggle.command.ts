import { ConnectedClient } from '../../types';
import { colorize } from '../../utils/colors';
import {
  writeToClient,
  writeMessageToClient,
  writeFormattedMessageToClient,
} from '../../utils/socketWriter';
import { Command } from '../command.interface';
import { formatUsername } from '../../utils/formatters';

export class GiggleCommand implements Command {
  name = 'giggle';
  description = 'Giggle at someone or the room';

  constructor(private clients: Map<string, ConnectedClient>) {}

  execute(client: ConnectedClient, args: string): void {
    if (client.stateData.forcedTransition) return;
    if (!client.user) return;

    const username = client.user.username;
    const currentRoomId = client.user.currentRoomId || 'start';
    const targetName = args.trim();

    if (targetName) {
      this.giggleAtTarget(client, username, currentRoomId, targetName);
    } else {
      this.giggleAtRoom(client, username, currentRoomId);
    }
  }

  private giggleAtRoom(client: ConnectedClient, username: string, currentRoomId: string): void {
    this.clients.forEach((c) => {
      if (c.authenticated && c.user && c.user.currentRoomId === currentRoomId) {
        if (c === client) {
          writeMessageToClient(c, colorize(`You giggle.\r\n`, 'green'));
        } else {
          writeFormattedMessageToClient(
            c,
            colorize(`${formatUsername(username)} giggles.\r\n`, 'cyan')
          );
        }
      }
    });
  }

  private giggleAtTarget(
    client: ConnectedClient,
    username: string,
    currentRoomId: string,
    targetName: string
  ): void {
    // Prevent giggling at self
    if (targetName.toLowerCase() === username.toLowerCase()) {
      writeToClient(client, colorize(`You giggle at yourself. How odd.\r\n`, 'yellow'));
      return;
    }

    const target = this.findPlayerInRoom(targetName, currentRoomId);

    if (!target || !target.user) {
      writeToClient(
        client,
        colorize(`Giggle at whom? ${this.formatTargetName(targetName)} is not here.\r\n`, 'yellow')
      );
      return;
    }

    const targetUsername = target.user.username;

    this.clients.forEach((c) => {
      if (c.authenticated && c.user && c.user.currentRoomId === currentRoomId) {
        if (c === client) {
          writeMessageToClient(
            c,
            colorize(`You giggle at ${formatUsername(targetUsername)}.\r\n`, 'green')
          );
        } else if (c === target) {
          writeFormattedMessageToClient(
            c,
            colorize(`${formatUsername(username)} giggles at you.\r\n`, 'cyan')
          );
        } else {
          writeFormattedMessageToClient(
            c,
            colorize(
              `${formatUsername(username)} giggles at ${formatUsername(targetUsername)}.\r\n`,
              'cyan'
            )
          );
        }
      }
    });
  }

  private findPlayerInRoom(username: string, roomId: string): ConnectedClient | undefined {
    for (const c of this.clients.values()) {
      if (
        c.authenticated &&
        c.user &&
        c.user.username.toLowerCase() === username.toLowerCase() &&
        c.user.currentRoomId === roomId
      ) {
        return c;
      }
    }
    return undefined;
  }

  private formatTargetName(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }
}
