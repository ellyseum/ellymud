/**
 * Rest Command - Enter resting state for enhanced HP regeneration
 * @module command/commands/rest
 */

import { ConnectedClient } from '../../types';
import { Command } from '../command.interface';
import { colorize } from '../../utils/colors';
import { writeFormattedMessageToClient } from '../../utils/socketWriter';

export class RestCommand implements Command {
  name = 'rest';
  description = 'Rest to regenerate health faster';

  execute(client: ConnectedClient, _args: string): void {
    if (!client.user) {
      writeFormattedMessageToClient(client, colorize(`You must be logged in to rest.\r\n`, 'red'));
      return;
    }

    if (client.user.inCombat) {
      writeFormattedMessageToClient(
        client,
        colorize(`You cannot rest while in combat!\r\n`, 'red')
      );
      return;
    }

    if (client.user.isUnconscious) {
      writeFormattedMessageToClient(
        client,
        colorize(`You are unconscious and cannot rest.\r\n`, 'red')
      );
      return;
    }

    if (client.user.isResting) {
      writeFormattedMessageToClient(client, colorize(`You are already resting.\r\n`, 'yellow'));
      return;
    }

    if (client.user.isMeditating) {
      writeFormattedMessageToClient(
        client,
        colorize(`You stop meditating and begin to rest.\r\n`, 'cyan')
      );
      client.user.isMeditating = false;
      client.user.meditatingTicks = 0;
    }

    client.user.isResting = true;
    client.user.restingTicks = 0;

    writeFormattedMessageToClient(client, colorize(`You sit down and begin to rest.\r\n`, 'green'));
  }
}
