/**
 * Meditate Command - Enter meditating state for enhanced MP regeneration
 * @module command/commands/meditate
 */

import { ConnectedClient } from '../../types';
import { Command } from '../command.interface';
import { colorize } from '../../utils/colors';
import { writeFormattedMessageToClient } from '../../utils/socketWriter';

export class MeditateCommand implements Command {
  name = 'meditate';
  description = 'Meditate to regenerate mana faster';

  execute(client: ConnectedClient, _args: string): void {
    if (!client.user) {
      writeFormattedMessageToClient(
        client,
        colorize(`You must be logged in to meditate.\r\n`, 'red')
      );
      return;
    }

    if (client.user.inCombat) {
      writeFormattedMessageToClient(
        client,
        colorize(`You cannot meditate while in combat!\r\n`, 'red')
      );
      return;
    }

    if (client.user.isUnconscious) {
      writeFormattedMessageToClient(
        client,
        colorize(`You are unconscious and cannot meditate.\r\n`, 'red')
      );
      return;
    }

    if (client.user.isMeditating) {
      writeFormattedMessageToClient(client, colorize(`You are already meditating.\r\n`, 'yellow'));
      return;
    }

    if (client.user.isResting) {
      writeFormattedMessageToClient(
        client,
        colorize(`You stop resting and begin to meditate.\r\n`, 'cyan')
      );
      client.user.isResting = false;
      client.user.restingTicks = 0;
    }

    client.user.isMeditating = true;
    client.user.meditatingTicks = 0;

    writeFormattedMessageToClient(
      client,
      colorize(`You close your eyes and begin to meditate.\r\n`, 'blue')
    );
  }
}
