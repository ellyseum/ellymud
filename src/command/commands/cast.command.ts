import { ConnectedClient } from '../../types';
import { colorize } from '../../utils/colors';
import { writeFormattedMessageToClient } from '../../utils/socketWriter';
import { Command } from '../command.interface';
import { AbilityManager } from '../../abilities/abilityManager';
import { AbilityType } from '../../abilities/types';
import { getPlayerLogger } from '../../utils/logger';
import { CombatSystem } from '../../combat/combatSystem';
import { ClassAbilityService } from '../../class/classAbilityService';
import { getResourceDisplayAbbr } from '../../utils/statCalculator';

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

    // Check if ability type is castable
    if (ability.type !== AbilityType.STANDARD && ability.type !== AbilityType.FINISHER) {
      writeFormattedMessageToClient(
        client,
        colorize(`${ability.name} cannot be cast directly.\r\n`, 'yellow')
      );
      return;
    }

    // Check class restrictions before any other checks
    const classAbilityService = ClassAbilityService.getInstance();
    const classCheck = classAbilityService.canClassUseAbility(client.user, ability);
    if (!classCheck.canUse) {
      writeFormattedMessageToClient(
        client,
        colorize(`Cannot cast ${ability.name}: ${classCheck.reason}\r\n`, 'red')
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
    if (!client.user) return;

    const classAbilityService = ClassAbilityService.getInstance();
    const availableAbilities = classAbilityService.getAvailableAbilities(
      client.user,
      this.abilityManager
    );

    // Filter to standard and finisher abilities only
    const castableAbilities = availableAbilities.filter(
      (a) => a.type === AbilityType.STANDARD || a.type === AbilityType.FINISHER
    );

    if (castableAbilities.length === 0) {
      writeFormattedMessageToClient(
        client,
        colorize('You have no abilities to cast. Train to a class to learn some!\r\n', 'gray')
      );
      return;
    }

    const lines: string[] = [];
    lines.push(colorize('\r\nAvailable abilities:', 'white'));

    for (const ability of castableAbilities) {
      // Build cost string
      let costStr: string;
      if (ability.resourceCost) {
        const abbr = getResourceDisplayAbbr(ability.resourceCost.type);
        costStr = `${ability.resourceCost.amount} ${abbr}`;
      } else if (ability.mpCost > 0) {
        costStr = `${ability.mpCost} MP`;
      } else {
        costStr = 'Free';
      }

      lines.push(
        colorize(`  ${ability.id}`, 'cyan') +
          colorize(` - ${ability.description} `, 'gray') +
          colorize(`(${costStr})`, 'blue')
      );
    }

    writeFormattedMessageToClient(client, lines.join('\r\n') + '\r\n');
  }
}
