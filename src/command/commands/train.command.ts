import { ConnectedClient, ClientStateType } from '../../types';
import { colorize } from '../../utils/colors';
import { writeToClient, writeFormattedMessageToClient } from '../../utils/socketWriter';
import { Command } from '../command.interface';
import { UserManager } from '../../user/userManager';
import { formatUsername } from '../../utils/formatters';
import { getPlayerLogger } from '../../utils/logger';
import { RoomManager } from '../../room/roomManager';

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

export class TrainCommand implements Command {
  name = 'train';
  description = 'Train to level up or enter character editor (train stats)';

  constructor(
    private userManager: UserManager,
    private clients: Map<string, ConnectedClient>,
    private roomManager: RoomManager
  ) {}

  execute(client: ConnectedClient, args: string): void {
    if (!client.user) {
      writeToClient(client, colorize('You must be logged in to use this command.\r\n', 'red'));
      return;
    }

    const playerLogger = getPlayerLogger(client.user.username);
    const trimmedArgs = args.trim().toLowerCase();

    // Check if in training room for all train commands
    const room = this.roomManager.getRoom(client.user.currentRoomId);
    if (!room || !room.flags.includes('training')) {
      writeToClient(
        client,
        colorize('You can only train in a designated training room.\r\n', 'yellow')
      );
      return;
    }

    // Handle 'train stats' - enter editor state
    if (trimmedArgs === 'stats') {
      this.enterEditorState(client);
      return;
    }

    // Handle 'train' with no args - attempt to level up
    if (trimmedArgs === '') {
      this.attemptLevelUp(client, playerLogger);
      return;
    }

    // Unknown argument
    writeToClient(
      client,
      colorize('Usage: train (to level up) or train stats (to enter editor)\r\n', 'yellow')
    );
  }

  private enterEditorState(client: ConnectedClient): void {
    if (!client.user) return;

    // Only allow from GAME or AUTHENTICATED state
    if (client.state !== ClientStateType.GAME && client.state !== ClientStateType.AUTHENTICATED) {
      writeToClient(
        client,
        colorize('You can only use this command while in the game.\r\n', 'red')
      );
      return;
    }

    // Store current room for return
    client.stateData.previousRoomId = client.user.currentRoomId;

    // Notify player
    writeToClient(client, colorize('Entering the editor...\r\n', 'cyan'));

    // Set the forced transition flag to EDITOR
    client.stateData.forcedTransition = ClientStateType.EDITOR;
  }

  private attemptLevelUp(
    client: ConnectedClient,
    playerLogger: ReturnType<typeof getPlayerLogger>
  ): void {
    if (!client.user) return;

    const currentLevel = client.user.level;
    const currentExp = client.user.experience;
    const expNeeded = getExpRequiredForLevel(currentLevel);
    const totalExpForCurrentLevel = getTotalExpForLevel(currentLevel);
    const expProgress = currentExp - totalExpForCurrentLevel;

    // Check if player has enough experience to level up
    if (expProgress < expNeeded) {
      writeToClient(
        client,
        colorize('You do not have enough experience for training!\r\n', 'brightRed')
      );
      return;
    }

    // Level up!
    const newLevel = currentLevel + 1;
    client.user.level = newLevel;

    // Update in UserManager and save
    this.userManager.updateUserStats(client.user.username, { level: newLevel });

    playerLogger.info(`Leveled up from ${currentLevel} to ${newLevel}`);

    // Message to the player (bold white)
    writeToClient(
      client,
      colorize(`You feel stronger and are now level ${newLevel}!\r\n`, 'brightWhite')
    );

    // Broadcast to others in the room (bold white)
    const username = formatUsername(client.user.username);
    const currentRoomId = client.user.currentRoomId;

    this.clients.forEach((c) => {
      if (c !== client && c.authenticated && c.user && c.user.currentRoomId === currentRoomId) {
        writeFormattedMessageToClient(
          c,
          colorize(`${username} looks stronger.\r\n`, 'brightWhite')
        );
      }
    });
  }
}
