import { ConnectedClient } from '../../types';
import { colorize } from '../../utils/colors';
import { writeMessageToClient, writeFormattedMessageToClient } from '../../utils/socketWriter';
import { Command } from '../command.interface';
import { formatUsername } from '../../utils/formatters';

/**
 * WhisperCommand - Send a private message to another player
 *
 * Usage: /whisper <player> <message>
 * Aliases: /t, /tell
 *
 * This is a slash command - must be invoked with '/' prefix.
 *
 * Messages are sent regardless of location - both players must be online.
 */
export class WhisperCommand implements Command {
  name = 'whisper';
  description = 'Send a private message to another player';
  isSlashCommand = true;

  constructor(private clients: Map<string, ConnectedClient>) {}

  execute(client: ConnectedClient, args: string): void {
    // Check for forced transitions before processing command
    if (client.stateData.forcedTransition) {
      return;
    }

    // Early return if user is not authenticated
    if (!client.user) {
      return;
    }

    // Parse arguments: first word is target, rest is message
    const trimmedArgs = args.trim();
    const spaceIndex = trimmedArgs.indexOf(' ');

    // No arguments provided
    if (!trimmedArgs) {
      writeMessageToClient(client, colorize('Whisper to whom?\r\n', 'yellow'));
      return;
    }

    // Only target provided, no message
    if (spaceIndex === -1) {
      writeMessageToClient(client, colorize('Whisper what?\r\n', 'yellow'));
      return;
    }

    const targetName = trimmedArgs.substring(0, spaceIndex);
    const message = trimmedArgs.substring(spaceIndex + 1);

    // Empty message after target
    if (!message.trim()) {
      writeMessageToClient(client, colorize('Whisper what?\r\n', 'yellow'));
      return;
    }

    // Find the target client
    const targetClient = this.findClientByUsername(targetName);

    if (!targetClient || !targetClient.user) {
      writeMessageToClient(
        client,
        colorize(`${formatUsername(targetName)} is not online.\r\n`, 'red')
      );
      return;
    }

    // Send confirmation to sender
    writeMessageToClient(
      client,
      colorize(
        `You whisper to ${formatUsername(targetClient.user.username)}: '${message}'\r\n`,
        'magenta'
      )
    );

    // Send message to recipient (unless whispering to self)
    if (targetClient !== client) {
      writeFormattedMessageToClient(
        targetClient,
        colorize(
          `${formatUsername(client.user.username)} whispers to you: '${message}'\r\n`,
          'magenta'
        )
      );
    }
  }

  /**
   * Find a client by username (case-insensitive)
   */
  private findClientByUsername(username: string): ConnectedClient | undefined {
    for (const c of this.clients.values()) {
      if (c.user && c.user.username.toLowerCase() === username.toLowerCase()) {
        return c;
      }
    }
    return undefined;
  }
}
