import { ConnectedClient, ResourceType } from '../../types';
import { colorize } from '../../utils/colors';
import { formatUsername } from '../../utils/formatters';
import { ItemManager } from '../../utils/itemManager';
import { colorizeItemName } from '../../utils/itemNameColorizer';
import { writeToClient } from '../../utils/socketWriter';
import { Command } from '../command.interface';
import { RaceManager } from '../../race/raceManager';
import { ClassManager } from '../../class/classManager';
import { ResourceManager } from '../../resource/resourceManager';
import { getResourceDisplayAbbr } from '../../utils/statCalculator';

/**
 * Calculate the experience required for a given level using exponential scaling.
 */
function getExpRequiredForLevel(level: number): number {
  return Math.floor(1000 * Math.pow(1.5, level - 1));
}

/**
 * Calculate total experience needed to reach a given level from level 1.
 */
function getTotalExpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += getExpRequiredForLevel(i);
  }
  return total;
}

export class StatsCommand implements Command {
  name = 'stats';
  description = 'Show your character stats';
  private itemManager: ItemManager;
  private raceManager: RaceManager;
  private classManager: ClassManager;

  constructor() {
    this.itemManager = ItemManager.getInstance();
    this.raceManager = RaceManager.getInstance();
    this.classManager = ClassManager.getInstance();
  }

  execute(client: ConnectedClient, _args: string): void {
    if (!client.user) return;

    const user = client.user;

    // Calculate combat stats based on equipment
    const attackValue = this.itemManager.calculateAttack(user);
    const defenseValue = this.itemManager.calculateDefense(user);
    const statBonuses = this.itemManager.calculateStatBonuses(user);

    // Update the user's calculated stats
    user.attack = attackValue;
    user.defense = defenseValue;

    // Get race and class info
    const raceId = user.raceId ?? 'human';
    const classId = user.classId ?? 'adventurer';
    const raceName = this.raceManager.getRaceName(raceId);
    const className = this.classManager.getClassName(classId);
    const classTier = this.classManager.getClassTier(classId);

    // Calculate XP progress
    const currentLevel = user.level;
    const totalExpForCurrentLevel = getTotalExpForLevel(currentLevel);
    const expNeeded = getExpRequiredForLevel(currentLevel);
    // Ensure progress is non-negative (handles edge cases where XP tracking is off)
    const expProgress = Math.max(0, user.experience - totalExpForCurrentLevel);
    const expPercentage = Math.min(100, Math.floor((expProgress / expNeeded) * 100));

    writeToClient(client, colorize('=== Your Character Stats ===\r\n', 'magenta'));
    writeToClient(client, colorize(`Username: ${formatUsername(user.username)}\r\n`, 'cyan'));

    // Race and Class
    writeToClient(client, colorize(`Race: ${raceName}\r\n`, 'yellow'));
    writeToClient(
      client,
      colorize(`Class: ${className}`, 'yellow') + colorize(` (Tier ${classTier})\r\n`, 'dim')
    );

    // Health and Resource
    writeToClient(client, colorize(`Health: ${user.health}/${user.maxHealth}\r\n`, 'green'));

    // Display resource if class uses one (via ResourceManager for consistency)
    const resourceManager = ResourceManager.getInstance();
    const resourceType = resourceManager.getResourceType(user);
    if (resourceType !== ResourceType.NONE) {
      const currentResource = resourceManager.getCurrentResource(user);
      const maxResource = resourceManager.calculateMaxResource(user);
      const resourceAbbr = getResourceDisplayAbbr(resourceType);
      writeToClient(
        client,
        colorize(`${resourceAbbr}: ${currentResource}/${maxResource}\r\n`, 'blue')
      );
    }

    // Level and XP Progress
    writeToClient(client, colorize(`Level: ${user.level}\r\n`, 'yellow'));
    writeToClient(
      client,
      colorize(`Experience: ${user.experience} `, 'blue') +
        colorize(
          `(${expProgress}/${expNeeded} to level ${currentLevel + 1} - ${expPercentage}%)\r\n`,
          'dim'
        )
    );

    // Create XP progress bar
    const barLength = 20;
    const progressRatio = Math.max(0, Math.min(1, expProgress / expNeeded));
    const filledLength = Math.floor(progressRatio * barLength);
    const emptyLength = barLength - filledLength;
    const progressBar = '[' + '='.repeat(filledLength) + '-'.repeat(emptyLength) + ']';
    writeToClient(client, colorize(`${progressBar}\r\n`, 'cyan'));

    // Unspent attribute points
    const unspentPoints = user.unspentAttributePoints ?? 0;
    if (unspentPoints > 0) {
      writeToClient(
        client,
        colorize(`\r\nUnspent Attribute Points: ${unspentPoints}\r\n`, 'brightYellow') +
          colorize(`(Use "train stats" in a training room to allocate)\r\n`, 'dim')
      );
    }

    // Display combat stats
    writeToClient(client, colorize('\r\n=== Combat Stats ===\r\n', 'magenta'));
    writeToClient(client, colorize(`Attack: ${attackValue}\r\n`, 'red'));
    writeToClient(client, colorize(`Defense: ${defenseValue}\r\n`, 'blue'));

    // Display race bonuses if applicable
    const raceBonuses = this.raceManager.getRaceBonuses(raceId);
    if (raceBonuses) {
      const bonusLines: string[] = [];
      if (raceBonuses.xpGain) bonusLines.push(`+${Math.floor(raceBonuses.xpGain * 100)}% XP Gain`);
      if (raceBonuses.maxHealth)
        bonusLines.push(`+${Math.floor(raceBonuses.maxHealth * 100)}% Max HP`);
      if (raceBonuses.maxMana) bonusLines.push(`+${Math.floor(raceBonuses.maxMana * 100)}% Max MP`);
      if (raceBonuses.critChance)
        bonusLines.push(`+${Math.floor(raceBonuses.critChance * 100)}% Crit`);
      if (raceBonuses.attack) bonusLines.push(`+${Math.floor(raceBonuses.attack * 100)}% Attack`);

      if (bonusLines.length > 0) {
        writeToClient(client, colorize(`Race Bonus: ${bonusLines.join(', ')}\r\n`, 'cyan'));
      }
    }

    // Display the character attributes/statistics with any bonuses from equipment
    writeToClient(client, colorize('\r\n=== Attributes ===\r\n', 'magenta'));
    writeToClient(
      client,
      colorize(
        `Strength: ${user.strength}${statBonuses.strength ? ` (+${statBonuses.strength})` : ''}\r\n`,
        'white'
      )
    );
    writeToClient(
      client,
      colorize(
        `Dexterity: ${user.dexterity}${statBonuses.dexterity ? ` (+${statBonuses.dexterity})` : ''}\r\n`,
        'white'
      )
    );
    writeToClient(
      client,
      colorize(
        `Agility: ${user.agility}${statBonuses.agility ? ` (+${statBonuses.agility})` : ''}\r\n`,
        'white'
      )
    );
    writeToClient(
      client,
      colorize(
        `Constitution: ${user.constitution}${statBonuses.constitution ? ` (+${statBonuses.constitution})` : ''}\r\n`,
        'white'
      )
    );
    writeToClient(
      client,
      colorize(
        `Wisdom: ${user.wisdom}${statBonuses.wisdom ? ` (+${statBonuses.wisdom})` : ''}\r\n`,
        'white'
      )
    );
    writeToClient(
      client,
      colorize(
        `Intelligence: ${user.intelligence}${statBonuses.intelligence ? ` (+${statBonuses.intelligence})` : ''}\r\n`,
        'white'
      )
    );
    writeToClient(
      client,
      colorize(
        `Charisma: ${user.charisma}${statBonuses.charisma ? ` (+${statBonuses.charisma})` : ''}\r\n`,
        'white'
      )
    );

    // Display class history if they've advanced
    const classHistory = user.classHistory ?? ['adventurer'];
    if (classHistory.length > 1) {
      writeToClient(client, colorize('\r\n=== Class History ===\r\n', 'magenta'));
      const historyStr = classHistory.map((id) => this.classManager.getClassName(id)).join(' → ');
      writeToClient(client, colorize(`${historyStr}\r\n`, 'dim'));
    }

    // Display equipment if any
    if (user.equipment && Object.keys(user.equipment).length > 0) {
      writeToClient(client, colorize('\r\n=== Equipment ===\r\n', 'magenta'));

      for (const [slot, itemId] of Object.entries(user.equipment)) {
        if (!itemId) continue;

        // Convert slot key to display name
        const slotDisplayName = slot
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');

        // Check if it's an item instance first
        const instance = this.itemManager.getItemInstance(itemId);

        if (instance) {
          // It's an item instance, get the template and check for custom name
          const template = this.itemManager.getItem(instance.templateId);

          if (template) {
            let displayName = template.name;

            // Use custom name if available
            if (instance.properties?.customName) {
              displayName = colorizeItemName(instance.properties.customName);
            }

            writeToClient(client, colorize(`${slotDisplayName}: ${displayName}\r\n`, 'cyan'));
          } else {
            writeToClient(client, colorize(`${slotDisplayName}: <unknown item>\r\n`, 'red'));
          }
        } else {
          // Try as a legacy item
          const item = this.itemManager.getItem(itemId);
          if (item) {
            writeToClient(client, colorize(`${slotDisplayName}: ${item.name}\r\n`, 'cyan'));
          } else {
            writeToClient(client, colorize(`${slotDisplayName}: <unknown item>\r\n`, 'red'));
          }
        }
      }
    }

    writeToClient(client, colorize('\r\n=== Account Info ===\r\n', 'magenta'));
    writeToClient(
      client,
      colorize(`Member since: ${user.joinDate.toLocaleDateString()}\r\n`, 'dim')
    );
    writeToClient(
      client,
      colorize(`Last login: ${user.lastLogin.toLocaleDateString()}\r\n`, 'dim')
    );
    writeToClient(client, colorize('===========================\r\n', 'magenta'));
  }
}
