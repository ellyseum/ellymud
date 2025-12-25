import { ConnectedClient } from '../../types';
import { colorize } from '../../utils/colors';
import { writeToClient } from '../../utils/socketWriter';
import { Command } from '../command.interface';
import { formatUsername } from '../../utils/formatters';

export class WhoCommand implements Command {
  name = 'who';
  description = 'Show online users';
  aliases = ['users', 'online'];

  constructor(private clients: Map<string, ConnectedClient>) {}

  execute(client: ConnectedClient, _args: string): void {
    // List all authenticated users with their connection types
    const onlineUsers = Array.from(this.clients.values())
      .filter((c) => c.authenticated && c.user)
      .map((c) => ({
        username: c.user!.username,
        connectionType: c.connection.getType(),
      }));

    writeToClient(client, colorize('=== Online Users ===\r\n', 'magenta'));
    if (onlineUsers.length === 0) {
      writeToClient(client, colorize('No users online.\r\n', 'yellow'));
    } else {
      onlineUsers.forEach((user) => {
        const connectionLabel = user.connectionType === 'websocket' ? 'web' : 'telnet';
        writeToClient(
          client,
          colorize(`- ${formatUsername(user.username)} `, 'green') +
            colorize(`[${connectionLabel}]\r\n`, 'cyan')
        );
      });
    }
    writeToClient(client, colorize('===================\r\n', 'magenta'));
  }
}
