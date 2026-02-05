/**
 * Attribute Command - View and modify character attributes
 *
 * Usage:
 *   attrib           - Show current attributes and unspent points
 *   attrib str 10    - Add 10 points to strength
 *   attrib dex 5     - Add 5 points to dexterity
 *
 * Cost scaling (based on CURRENT stat value, not target):
 *   1-20:  1 point per stat
 *   21-40: 2 points per stat
 *   41-50: 3 points per stat
 *   51-60: 4 points per stat
 *   61+:   5 points per stat
 *
 * @module command/commands/attrib
 */

import { ConnectedClient } from '../../types';
import { colorize } from '../../utils/colors';
import { writeToClient } from '../../utils/socketWriter';
import { Command } from '../command.interface';
import { UserManager } from '../../user/userManager';

/** Attribute abbreviations to full names */
const ATTR_MAP: Record<string, string> = {
  str: 'strength',
  strength: 'strength',
  dex: 'dexterity',
  dexterity: 'dexterity',
  agi: 'agility',
  agility: 'agility',
  con: 'constitution',
  constitution: 'constitution',
  wis: 'wisdom',
  wisdom: 'wisdom',
  int: 'intelligence',
  intelligence: 'intelligence',
  cha: 'charisma',
  charisma: 'charisma',
};

/** All valid attribute names */
type AttributeName =
  | 'strength'
  | 'dexterity'
  | 'agility'
  | 'constitution'
  | 'wisdom'
  | 'intelligence'
  | 'charisma';

/**
 * Calculate the cost to add 1 point based on how many points ALREADY ALLOCATED
 * This uses allocated points, NOT the current stat value (so race bonuses don't penalize)
 *
 * Cost tiers (based on points already allocated to this stat):
 *   0-19:  1 point per stat
 *   20-39: 2 points per stat
 *   40-49: 3 points per stat
 *   50-59: 4 points per stat
 *   60+:   5 points per stat
 */
function getCostPerPoint(allocatedSoFar: number): number {
  if (allocatedSoFar < 20) return 1;
  if (allocatedSoFar < 40) return 2;
  if (allocatedSoFar < 50) return 3;
  if (allocatedSoFar < 60) return 4;
  return 5; // 60+
}

/**
 * Calculate total cost to add `amount` points starting with `alreadyAllocated` points
 */
function calculateTotalCost(alreadyAllocated: number, amount: number): number {
  let totalCost = 0;
  let allocated = alreadyAllocated;

  for (let i = 0; i < amount; i++) {
    totalCost += getCostPerPoint(allocated);
    allocated++;
  }

  return totalCost;
}

export class AttribCommand implements Command {
  name = 'attrib';
  description = 'View and modify character attributes';
  aliases = ['attributes', 'attr', 'stats'];

  constructor(private userManager: UserManager) {}

  execute(client: ConnectedClient, args: string): void {
    if (!client.user) {
      writeToClient(client, colorize('You must be logged in.\r\n', 'red'));
      return;
    }

    const trimmedArgs = args.trim().toLowerCase();

    // No args - show current attributes
    if (!trimmedArgs) {
      this.showAttributes(client);
      return;
    }

    // Parse: attrib <stat> <amount>
    const parts = trimmedArgs.split(/\s+/);
    if (parts.length < 2) {
      writeToClient(
        client,
        colorize('Usage: attrib <stat> <amount>\r\n', 'yellow') +
          colorize('Example: attrib str 10\r\n', 'white')
      );
      return;
    }

    const [statInput, amountStr] = parts;
    const amount = parseInt(amountStr, 10);

    if (isNaN(amount) || amount <= 0) {
      writeToClient(client, colorize('Amount must be a positive number.\r\n', 'red'));
      return;
    }

    // Resolve stat name
    const statName = ATTR_MAP[statInput];
    if (!statName) {
      writeToClient(
        client,
        colorize(`Unknown attribute "${statInput}".\r\n`, 'red') +
          colorize('Valid: str, dex, agi, con, wis, int, cha\r\n', 'yellow')
      );
      return;
    }

    this.addToAttribute(client, statName as AttributeName, amount);
  }

  private showAttributes(client: ConnectedClient): void {
    const user = client.user!;
    const unspent = user.unspentAttributePoints ?? 0;
    const allocated = user.allocatedStats ?? {
      strength: 0,
      dexterity: 0,
      agility: 0,
      constitution: 0,
      wisdom: 0,
      intelligence: 0,
      charisma: 0,
    };

    const attrs = [
      {
        name: 'Strength',
        abbr: 'STR',
        key: 'strength' as const,
        value: user.strength,
        desc: 'Physical power, melee damage',
      },
      {
        name: 'Dexterity',
        abbr: 'DEX',
        key: 'dexterity' as const,
        value: user.dexterity,
        desc: 'Accuracy, ranged damage',
      },
      {
        name: 'Agility',
        abbr: 'AGI',
        key: 'agility' as const,
        value: user.agility,
        desc: 'Speed, dodge chance',
      },
      {
        name: 'Constitution',
        abbr: 'CON',
        key: 'constitution' as const,
        value: user.constitution,
        desc: 'Health, physical resistance',
      },
      {
        name: 'Wisdom',
        abbr: 'WIS',
        key: 'wisdom' as const,
        value: user.wisdom,
        desc: 'Mana, magic resistance',
      },
      {
        name: 'Intelligence',
        abbr: 'INT',
        key: 'intelligence' as const,
        value: user.intelligence,
        desc: 'Spell power, mana regen',
      },
      {
        name: 'Charisma',
        abbr: 'CHA',
        key: 'charisma' as const,
        value: user.charisma,
        desc: 'Prices, NPC reactions',
      },
    ];

    writeToClient(client, colorize('\r\n=== Character Attributes ===\r\n', 'cyan'));
    writeToClient(
      client,
      colorize(`Unspent Points: `, 'white') + colorize(`${unspent}\r\n\r\n`, 'brightGreen')
    );

    for (const attr of attrs) {
      // Cost is based on points ALLOCATED, not current stat value (race bonuses don't count)
      const allocatedToStat = allocated[attr.key];
      const costNext = getCostPerPoint(allocatedToStat);
      writeToClient(
        client,
        colorize(`${attr.abbr}: `, 'yellow') +
          colorize(`${attr.value.toString().padStart(2)}`, 'brightWhite') +
          colorize(` (${attr.name})`, 'dim') +
          colorize(` - ${attr.desc}`, 'white') +
          colorize(` [next: ${costNext} pt${costNext > 1 ? 's' : ''}]\r\n`, 'dim')
      );
    }

    writeToClient(client, colorize('\r\nCost scaling:\r\n', 'yellow'));
    writeToClient(client, colorize('  1-20:  1 pt/stat\r\n', 'white'));
    writeToClient(client, colorize('  21-40: 2 pts/stat\r\n', 'white'));
    writeToClient(client, colorize('  41-50: 3 pts/stat\r\n', 'white'));
    writeToClient(client, colorize('  51-60: 4 pts/stat\r\n', 'white'));
    writeToClient(client, colorize('  61+:   5 pts/stat\r\n', 'white'));
    writeToClient(client, colorize('\r\nUse "attrib <stat> <amount>" to spend points.\r\n', 'dim'));
  }

  private addToAttribute(client: ConnectedClient, stat: AttributeName, amount: number): void {
    const user = client.user!;
    const currentValue = user[stat] as number;
    const unspent = user.unspentAttributePoints ?? 0;

    // Get current allocated points for this stat (race bonuses don't count)
    const allocated = user.allocatedStats ?? {
      strength: 0,
      dexterity: 0,
      agility: 0,
      constitution: 0,
      wisdom: 0,
      intelligence: 0,
      charisma: 0,
    };
    const allocatedToStat = allocated[stat];

    // Calculate cost based on ALLOCATED points, not current value
    const totalCost = calculateTotalCost(allocatedToStat, amount);

    if (totalCost > unspent) {
      // Calculate how many they CAN afford
      let affordable = 0;
      let costSoFar = 0;
      let tempAllocated = allocatedToStat;
      while (costSoFar + getCostPerPoint(tempAllocated) <= unspent) {
        costSoFar += getCostPerPoint(tempAllocated);
        tempAllocated++;
        affordable++;
      }

      writeToClient(
        client,
        colorize(`Not enough points!\r\n`, 'red') +
          colorize(`Adding ${amount} to ${stat} costs ${totalCost} points.\r\n`, 'yellow') +
          colorize(`You have ${unspent} points.\r\n`, 'white') +
          colorize(`You can afford +${affordable} (costing ${costSoFar} points).\r\n`, 'dim')
      );
      return;
    }

    // Apply the change
    const newValue = currentValue + amount;
    const newUnspent = unspent - totalCost;
    const newAllocated = allocatedToStat + amount;

    // Update user object
    user[stat] = newValue;
    user.unspentAttributePoints = newUnspent;
    if (!user.allocatedStats) {
      user.allocatedStats = {
        strength: 0,
        dexterity: 0,
        agility: 0,
        constitution: 0,
        wisdom: 0,
        intelligence: 0,
        charisma: 0,
      };
    }
    user.allocatedStats[stat] = newAllocated;

    // Persist to userManager
    this.userManager.updateUserStats(user.username, {
      [stat]: newValue,
      unspentAttributePoints: newUnspent,
      allocatedStats: user.allocatedStats,
    });

    writeToClient(
      client,
      colorize(`\r\n+${amount} ${stat.charAt(0).toUpperCase() + stat.slice(1)}!\r\n`, 'brightGreen')
    );
    writeToClient(
      client,
      colorize(`${currentValue} -> ${newValue}`, 'white') +
        colorize(` (cost: ${totalCost} points)\r\n`, 'dim')
    );
    writeToClient(client, colorize(`Remaining points: ${newUnspent}\r\n`, 'yellow'));
  }
}
