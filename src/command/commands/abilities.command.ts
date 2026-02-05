import { ConnectedClient, ResourceType } from '../../types';
import { colorize, ColorType } from '../../utils/colors';
import { writeFormattedMessageToClient } from '../../utils/socketWriter';
import { Command } from '../command.interface';
import { AbilityManager } from '../../abilities/abilityManager';
import { AbilityType, AbilityTemplate } from '../../abilities/types';
import { ClassAbilityService } from '../../class/classAbilityService';
import { ClassManager } from '../../class/classManager';
import { ResourceManager } from '../../resource/resourceManager';
import { ComboManager } from '../../combat/comboManager';
import { getResourceDisplayAbbr } from '../../utils/statCalculator';

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

    const user = client.user;
    const username = user.username;
    const classAbilityService = ClassAbilityService.getInstance();
    const classManager = ClassManager.getInstance();
    const resourceManager = ResourceManager.getInstance();
    const comboManager = ComboManager.getInstance();

    // Get abilities grouped by source class
    const abilitiesByClass = classAbilityService.getAbilitiesBySourceClass(
      user,
      this.abilityManager
    );

    // Filter to only show standard and finisher abilities (not combat, proc, or item)
    const filterDisplayable = (abilities: AbilityTemplate[]): AbilityTemplate[] => {
      return abilities.filter(
        (a) => a.type === AbilityType.STANDARD || a.type === AbilityType.FINISHER
      );
    };

    // Count total displayable abilities
    let totalAbilities = 0;
    for (const [, abilities] of abilitiesByClass) {
      totalAbilities += filterDisplayable(abilities).length;
    }

    if (totalAbilities === 0) {
      writeFormattedMessageToClient(
        client,
        colorize('You have no abilities. Train to a class to learn some!\r\n', 'gray')
      );
      return;
    }

    // Build output as single string
    const lines: string[] = [];
    lines.push(colorize('\r\n=== Your Abilities ===', 'white'));

    // Show resource info
    const resourceType = resourceManager.getResourceType(user);
    if (resourceType !== ResourceType.NONE) {
      const currentResource = resourceManager.getCurrentResource(user);
      const maxResource = resourceManager.calculateMaxResource(user);
      const resourceAbbr = getResourceDisplayAbbr(resourceType);
      lines.push(colorize(`${resourceAbbr}: ${currentResource}/${maxResource}`, 'blue'));
    }

    // Show combo points for energy users (thief tree)
    if (resourceType === ResourceType.ENERGY) {
      const comboPoints = comboManager.getComboPoints(user);
      const comboTarget = comboManager.getComboTarget(user);
      if (comboPoints > 0 && comboTarget) {
        lines.push(colorize(`Combo Points: ${comboPoints}/5`, 'yellow'));
      }
    }

    lines.push('');

    // Display abilities grouped by source class
    for (const [classId, abilities] of abilitiesByClass) {
      const displayableAbilities = filterDisplayable(abilities);
      if (displayableAbilities.length === 0) continue;

      const className = classManager.getClassName(classId);
      const isCurrentClass = classId === (user.classId ?? 'adventurer');

      if (isCurrentClass) {
        lines.push(colorize(`-- ${className} --`, 'white'));
      } else {
        lines.push(colorize(`-- ${className} (Inherited) --`, 'gray'));
      }

      for (const ability of displayableAbilities) {
        const cooldown = this.abilityManager.getCooldownRemaining(username, ability.id);
        const canUse = this.abilityManager.canUseAbility(username, ability.id);

        let statusColor: ColorType;
        let statusText: string;

        if (!canUse.ok) {
          statusColor = 'red';
          if (cooldown > 0) {
            statusText = `[${cooldown} rounds]`;
          } else {
            // Truncate long reason messages
            const reason = canUse.reason ?? 'Unavailable';
            statusText = reason.length > 30 ? `[${reason.substring(0, 27)}...]` : `[${reason}]`;
          }
        } else {
          statusColor = 'green';
          statusText = '[Ready]';
        }

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

        // Add combo indicator for combo abilities
        let comboStr = '';
        if (ability.comboPointsGenerated) {
          comboStr = colorize(` [+${ability.comboPointsGenerated} CP]`, 'yellow');
        } else if (ability.comboPointsConsumed) {
          comboStr = colorize(' [Finisher]', 'yellow');
        }

        lines.push(
          colorize(`${ability.name}`, 'cyan') +
            colorize(` (${costStr})`, 'blue') +
            comboStr +
            ' ' +
            colorize(statusText, statusColor)
        );
        lines.push(colorize(`  ${ability.description}`, 'gray'));
      }

      lines.push('');
    }

    writeFormattedMessageToClient(client, lines.join('\r\n') + '\r\n');
  }
}
