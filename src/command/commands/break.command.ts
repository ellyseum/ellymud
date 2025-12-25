import { Command } from '../command.interface';
import { ConnectedClient } from '../../types';
import { writeToClient } from '../../utils/socketWriter';
import { colorize } from '../../utils/colors';
import { CombatSystem } from '../../combat/combatSystem';
import { UserManager } from '../../user/userManager';
import { getPlayerLogger } from '../../utils/logger';
import { clearRestingMeditating } from '../../utils/stateInterruption';

export class BreakCommand implements Command {
  name = 'break';
  description = 'Stop combat, resting, or meditating';

  constructor(
    private combatSystem: CombatSystem,
    private userManager: UserManager
  ) {}

  execute(client: ConnectedClient, _args: string): void {
    if (!client.user) return;

    const playerLogger = getPlayerLogger(client.user.username);

    // Stop combat if in combat
    if (client.user.inCombat) {
      this.combatSystem.breakCombat(client);
      writeToClient(client, colorize('*Combat off*\r\n', 'yellow'));
      playerLogger.info(`Player ${client.user.username} broke away from combat`);
    }

    // Stop resting or meditating
    if (client.user.isResting || client.user.isMeditating) {
      const wasResting = client.user.isResting;
      const wasMeditating = client.user.isMeditating;

      // Clear the states silently (we'll show our own message)
      clearRestingMeditating(client, 'movement', true);

      if (wasResting) {
        writeToClient(client, colorize('You stop resting.\r\n', 'yellow'));
        playerLogger.info(`Player ${client.user.username} stopped resting`);
      }
      if (wasMeditating) {
        writeToClient(client, colorize('You stop meditating.\r\n', 'yellow'));
        playerLogger.info(`Player ${client.user.username} stopped meditating`);
      }
    }

    // Silently fail if nothing to break from
  }
}
