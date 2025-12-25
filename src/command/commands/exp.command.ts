import { ConnectedClient } from '../../types';
import { colorize } from '../../utils/colors';
import { writeToClient } from '../../utils/socketWriter';
import { Command } from '../command.interface';

/**
 * Calculate the experience required for a given level using exponential scaling.
 * Formula: 1000 * (1.5 ^ (level - 1))
 * Level 1 -> Level 2: 1000 exp
 * Level 2 -> Level 3: 1500 exp
 * Level 3 -> Level 4: 2250 exp
 * etc.
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

export class ExpCommand implements Command {
  name = 'exp';
  description = 'Show your current experience and progress to next level';

  execute(client: ConnectedClient, _args: string): void {
    if (!client.user) {
      writeToClient(client, colorize('You must be logged in to use this command.\r\n', 'red'));
      return;
    }

    const currentLevel = client.user.level;
    const currentExp = client.user.experience;
    const expNeededForNextLevel = getExpRequiredForLevel(currentLevel);
    const totalExpForCurrentLevel = getTotalExpForLevel(currentLevel);
    const expProgress = currentExp - totalExpForCurrentLevel;
    const expRemaining = expNeededForNextLevel - expProgress;

    if (expProgress >= expNeededForNextLevel) {
      // Player has enough exp to level up
      writeToClient(
        client,
        colorize(`You have ${expProgress}/${expNeededForNextLevel} experience points. `, 'white') +
          colorize('Seek training for advancement!\r\n', 'brightWhite')
      );
    } else {
      // Player needs more exp
      writeToClient(
        client,
        colorize(
          `You have ${expProgress}/${expNeededForNextLevel} experience points. Next level in ${expRemaining} more experience.\r\n`,
          'white'
        )
      );
    }
  }
}
