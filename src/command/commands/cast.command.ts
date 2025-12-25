import { ConnectedClient } from '../../types';
import { colorize } from '../../utils/colors';
import { writeFormattedMessageToClient } from '../../utils/socketWriter';
import { Command } from '../command.interface';
import { AbilityManager } from '../../abilities/abilityManager';
import { AbilityType } from '../../abilities/types';
import { getPlayerLogger } from '../../utils/logger';
import { CombatSystem } from '../../combat/combatSystem';

export class CastCommand implements Command {
  name = 'cast';
  description = 'Cast an ability at a target';

  constructor(
    private abilityManager: AbilityManager,
    private combatSystem?: CombatSystem
  ) {}

  execute(client: ConnectedClient, args: string): void {
    if (!client.user) {
      writeFormattedMessageToClient(
        client,
        colorize('You must be logged in to cast abilities.\r\n', 'red')
      );
      return;
    }

    const playerLogger = getPlayerLogger(client.user.username);
    const parts = args.trim().split(/\s+/);
    const abilityId = parts[0]?.toLowerCase();
    const targetId = parts[1];

    if (!abilityId) {
      writeFormattedMessageToClient(
        client,
        colorize('Usage: cast <ability> [target]\r\n', 'yellow')
      );
      this.showAvailableAbilities(client);
      return;
    }

    const ability = this.abilityManager.getAbility(abilityId);
    if (!ability) {
      writeFormattedMessageToClient(client, colorize(`Unknown ability: ${abilityId}\r\n`, 'red'));
      this.showAvailableAbilities(client);
      return;
    }

    if (ability.type !== AbilityType.STANDARD) {
      writeFormattedMessageToClient(
        client,
        colorize(`${ability.name} cannot be cast directly.\r\n`, 'yellow')
      );
      return;
    }

    // Break combat when casting an ability - player must re-engage or re-cast
    if (client.user.inCombat && this.combatSystem) {
      this.combatSystem.breakCombat(client);
    }

    playerLogger.info(`Casting ${ability.name}${targetId ? ` on ${targetId}` : ''}`);
    this.abilityManager.executeAbility(client, abilityId, targetId);
  }

  private showAvailableAbilities(client: ConnectedClient): void {
    const abilities = this.abilityManager.getAbilitiesByType(AbilityType.STANDARD);
    if (abilities.length === 0) {
      writeFormattedMessageToClient(client, colorize('No abilities available.\r\n', 'gray'));
      return;
    }

    writeFormattedMessageToClient(client, colorize('\r\nAvailable abilities:\r\n', 'white'));
    for (const ability of abilities) {
      writeFormattedMessageToClient(
        client,
        colorize(`  ${ability.id}`, 'cyan') +
          colorize(` - ${ability.description} `, 'gray') +
          colorize(`(${ability.mpCost} MP)\r\n`, 'blue')
      );
    }
  }
}
