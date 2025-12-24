import { ConnectedClient } from '../../types';
import { colorize, ColorType } from '../../utils/colors';
import { writeFormattedMessageToClient } from '../../utils/socketWriter';
import { Command } from '../command.interface';
import { AbilityManager } from '../../abilities/abilityManager';
import { AbilityType } from '../../abilities/types';

export class AbilitiesCommand implements Command {
  name = 'abilities';
  description = 'List your available abilities and cooldowns';

  constructor(private abilityManager: AbilityManager) {}

  execute(client: ConnectedClient, _args: string): void {
    if (!client.user) {
      writeFormattedMessageToClient(
        client,
        colorize('You must be logged in to view abilities.\r\n', 'red')
      );
      return;
    }

    const username = client.user.username;
    const abilities = this.abilityManager.getAbilitiesByType(AbilityType.STANDARD);

    if (abilities.length === 0) {
      writeFormattedMessageToClient(client, colorize('You have no abilities.\r\n', 'gray'));
      return;
    }

    writeFormattedMessageToClient(client, colorize('\r\n=== Your Abilities ===\r\n', 'white'));
    writeFormattedMessageToClient(
      client,
      colorize(`Mana: ${client.user.mana}/${client.user.maxMana}\r\n\r\n`, 'blue')
    );

    for (const ability of abilities) {
      const cooldown = this.abilityManager.getCooldownRemaining(username, ability.id);
      const canUse = this.abilityManager.canUseAbility(username, ability.id);

      let statusColor: ColorType;
      let statusText: string;

      if (!canUse.ok) {
        statusColor = 'red';
        if (cooldown > 0) {
          statusText = `[${cooldown} rounds]`;
        } else {
          statusText = `[${canUse.reason}]`;
        }
      } else {
        statusColor = 'green';
        statusText = '[Ready]';
      }

      writeFormattedMessageToClient(
        client,
        colorize(`${ability.name}`, 'cyan') +
          colorize(` (${ability.mpCost} MP) `, 'blue') +
          colorize(statusText, statusColor) +
          '\r\n' +
          colorize(`  ${ability.description}\r\n`, 'gray')
      );
    }

    writeFormattedMessageToClient(client, '\r\n');
  }
}
