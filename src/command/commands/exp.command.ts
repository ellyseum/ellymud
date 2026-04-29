import { ConnectedClient } from '../../types';
import { colorize } from '../../utils/colors';
import { writeToClient } from '../../utils/socketWriter';
import { Command } from '../command.interface';
import { getExpRequiredForLevel, getTotalExpForLevel } from '../../utils/expCurve';

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
