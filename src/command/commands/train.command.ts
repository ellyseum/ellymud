import { ConnectedClient, ClientStateType } from '../../types';
import { colorize } from '../../utils/colors';
import { writeToClient, writeFormattedMessageToClient } from '../../utils/socketWriter';
import { Command } from '../command.interface';
import { UserManager } from '../../user/userManager';
import { formatUsername } from '../../utils/formatters';
import { getPlayerLogger } from '../../utils/logger';
import { RoomManager } from '../../room/roomManager';
import { ClassManager } from '../../class/classManager';
import { NPC } from '../../combat/npc';

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

/**
 * Trainer NPC type mapping based on their template ID
 */
const TRAINER_TYPES: Record<string, string> = {
  fighter_trainer: 'fighter_trainer',
  mage_trainer: 'mage_trainer',
  thief_trainer: 'thief_trainer',
  healer_trainer: 'healer_trainer',
  paladin_trainer: 'paladin_trainer',
  berserker_trainer: 'berserker_trainer',
  knight_trainer: 'knight_trainer',
  wizard_trainer: 'wizard_trainer',
  necromancer_trainer: 'necromancer_trainer',
  elementalist_trainer: 'elementalist_trainer',
  assassin_trainer: 'assassin_trainer',
  ranger_trainer: 'ranger_trainer',
  shadow_trainer: 'shadow_trainer',
  cleric_trainer: 'cleric_trainer',
  druid_trainer: 'druid_trainer',
  shaman_trainer: 'shaman_trainer',
  // Legacy trainer (supports all tier 1 classes)
  trainer_1: 'universal_trainer',
};

export class TrainCommand implements Command {
  name = 'train';
  description = 'Train to level up, view class options, or advance your class (train class <name>)';

  private classManager: ClassManager;

  constructor(
    private userManager: UserManager,
    private clients: Map<string, ConnectedClient>,
    private roomManager: RoomManager
  ) {
    this.classManager = ClassManager.getInstance();
  }

  execute(client: ConnectedClient, args: string): void {
    if (!client.user) {
      writeToClient(client, colorize('You must be logged in to use this command.\r\n', 'red'));
      return;
    }

    const playerLogger = getPlayerLogger(client.user.username);
    const trimmedArgs = args.trim().toLowerCase();

    // Check if in training room for all train commands
    const room = this.roomManager.getRoom(client.user.currentRoomId);
    if (!room || !room.flags.includes('trainer')) {
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

    // Handle 'train class' - show available classes
    if (trimmedArgs === 'class') {
      this.showAvailableClasses(client);
      return;
    }

    // Handle 'train class <name>' - attempt class advancement
    if (trimmedArgs.startsWith('class ')) {
      const className = trimmedArgs.slice(6).trim();
      this.attemptClassAdvancement(client, className, playerLogger);
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
      colorize('Usage:\r\n', 'yellow') +
        colorize('  train           - Level up when you have enough XP\r\n', 'white') +
        colorize('  train stats     - Enter the stat editor\r\n', 'white') +
        colorize('  train class     - View available class options\r\n', 'white') +
        colorize('  train class <n> - Advance to a new class\r\n', 'white')
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

  private showAvailableClasses(client: ConnectedClient): void {
    if (!client.user) return;

    const currentClassId = client.user.classId ?? 'adventurer';
    const availableAdvancements = this.classManager.getAvailableAdvancements(currentClassId);

    writeToClient(client, colorize('\r\n=== Class Training ===\r\n', 'magenta'));
    writeToClient(
      client,
      colorize(`Current Class: ${this.classManager.getClassName(currentClassId)}\r\n`, 'cyan')
    );

    if (availableAdvancements.length === 0) {
      writeToClient(
        client,
        colorize('\r\nYou have reached the highest tier of your class.\r\n', 'yellow')
      );
      return;
    }

    writeToClient(client, colorize('\r\nAvailable Class Advancements:\r\n', 'white'));

    // Check for trainer NPCs in the room
    const room = this.roomManager.getRoom(client.user.currentRoomId);
    const trainersInRoom = this.getTrainersInRoom(room);

    for (const cls of availableAdvancements) {
      const canAdvance = this.classManager.canAdvanceToClass(
        client.user,
        cls.id,
        trainersInRoom.length > 0,
        trainersInRoom[0]?.trainerType
      );

      const statusColor = canAdvance.canAdvance ? 'green' : 'red';
      const statusIcon = canAdvance.canAdvance ? '[READY]' : '[LOCKED]';

      writeToClient(
        client,
        colorize(`\r\n  ${cls.name}`, 'yellow') + colorize(` ${statusIcon}\r\n`, statusColor)
      );
      writeToClient(client, colorize(`    ${cls.description}\r\n`, 'dim'));
      writeToClient(client, colorize(`    Requirements: Level ${cls.requirements.level}`, 'white'));
      if (cls.requirements.questFlag) {
        writeToClient(client, colorize(` + Quest`, 'white'));
      }
      if (cls.requirements.trainerType) {
        writeToClient(client, colorize(` + Trainer`, 'white'));
      }
      writeToClient(client, '\r\n');

      if (!canAdvance.canAdvance) {
        writeToClient(client, colorize(`    ${canAdvance.reason}\r\n`, 'red'));
      }

      // Show stat bonuses
      const bonuses = cls.statBonuses;
      const bonusStr: string[] = [];
      if (bonuses.maxHealth > 0) bonusStr.push(`+${bonuses.maxHealth} HP`);
      if (bonuses.maxMana > 0) bonusStr.push(`+${bonuses.maxMana} MP`);
      if (bonuses.attack > 0) bonusStr.push(`+${bonuses.attack} ATK`);
      if (bonuses.defense > 0) bonusStr.push(`+${bonuses.defense} DEF`);
      if (bonusStr.length > 0) {
        writeToClient(client, colorize(`    Bonuses: ${bonusStr.join(', ')}\r\n`, 'cyan'));
      }
    }

    writeToClient(
      client,
      colorize('\r\nUse "train class <name>" to advance to a class.\r\n', 'yellow')
    );
  }

  private getTrainersInRoom(
    room: ReturnType<typeof this.roomManager.getRoom>
  ): Array<{ npc: NPC; trainerType: string }> {
    if (!room) return [];

    const trainers: Array<{ npc: NPC; trainerType: string }> = [];

    for (const npc of room.npcs.values()) {
      const trainerType = TRAINER_TYPES[npc.templateId];
      if (trainerType) {
        trainers.push({ npc, trainerType });
      }
    }

    return trainers;
  }

  private attemptClassAdvancement(
    client: ConnectedClient,
    className: string,
    playerLogger: ReturnType<typeof getPlayerLogger>
  ): void {
    if (!client.user) return;

    // Find the class by name or ID
    const allClasses = this.classManager.getAllClasses();
    const targetClass = allClasses.find(
      (c) =>
        c.id === className ||
        c.name.toLowerCase() === className ||
        c.name.toLowerCase().replace(/\s+/g, '_') === className
    );

    if (!targetClass) {
      writeToClient(
        client,
        colorize(`Unknown class "${className}". Use "train class" to see options.\r\n`, 'red')
      );
      return;
    }

    // Get trainer NPCs in the room
    const room = this.roomManager.getRoom(client.user.currentRoomId);
    const trainersInRoom = this.getTrainersInRoom(room);

    // Check if we have a suitable trainer
    let hasValidTrainer = false;
    let trainerType: string | undefined;

    for (const trainer of trainersInRoom) {
      // Universal trainer (trainer_1) can train all tier 1 classes
      if (trainer.trainerType === 'universal_trainer' && targetClass.tier === 1) {
        hasValidTrainer = true;
        trainerType = targetClass.requirements.trainerType ?? undefined;
        break;
      }
      // Specific trainer must match the required trainer type
      if (trainer.trainerType === targetClass.requirements.trainerType) {
        hasValidTrainer = true;
        trainerType = trainer.trainerType;
        break;
      }
    }

    // Check advancement requirements
    const canAdvance = this.classManager.canAdvanceToClass(
      client.user,
      targetClass.id,
      hasValidTrainer,
      trainerType
    );

    if (!canAdvance.canAdvance) {
      writeToClient(client, colorize(`${canAdvance.reason}\r\n`, 'red'));
      return;
    }

    // Advance the class!
    const previousClass = client.user.classId ?? 'adventurer';
    this.userManager.updateUserClass(client.user.username, targetClass.id);

    // Update the client's user object
    client.user.classId = targetClass.id;
    if (!client.user.classHistory) {
      client.user.classHistory = [];
    }
    if (!client.user.classHistory.includes(targetClass.id)) {
      client.user.classHistory.push(targetClass.id);
    }

    // Apply class stat bonuses
    const bonuses = targetClass.statBonuses;
    if (bonuses.maxHealth > 0) {
      client.user.maxHealth += bonuses.maxHealth;
      client.user.health += bonuses.maxHealth;
    }
    if (bonuses.maxMana > 0) {
      client.user.maxMana += bonuses.maxMana;
      client.user.mana += bonuses.maxMana;
    }

    // Save the updated stats
    this.userManager.updateUserStats(client.user.username, {
      maxHealth: client.user.maxHealth,
      health: client.user.health,
      maxMana: client.user.maxMana,
      mana: client.user.mana,
    });

    playerLogger.info(
      `Advanced from ${this.classManager.getClassName(previousClass)} to ${targetClass.name}`
    );

    // Message to the player
    writeToClient(
      client,
      colorize(`\r\nCongratulations! You have become a ${targetClass.name}!\r\n`, 'brightGreen')
    );
    writeToClient(client, colorize(`${targetClass.description}\r\n\r\n`, 'cyan'));

    // Show gained bonuses
    const bonusLines: string[] = [];
    if (bonuses.maxHealth > 0) bonusLines.push(`  +${bonuses.maxHealth} Max Health`);
    if (bonuses.maxMana > 0) bonusLines.push(`  +${bonuses.maxMana} Max Mana`);
    if (bonuses.attack > 0) bonusLines.push(`  +${bonuses.attack} Attack`);
    if (bonuses.defense > 0) bonusLines.push(`  +${bonuses.defense} Defense`);

    if (bonusLines.length > 0) {
      writeToClient(client, colorize('Class Bonuses:\r\n', 'yellow'));
      bonusLines.forEach((line) => {
        writeToClient(client, colorize(`${line}\r\n`, 'green'));
      });
    }

    // Broadcast to others in the room
    const username = formatUsername(client.user.username);
    const currentRoomId = client.user.currentRoomId;

    this.clients.forEach((c) => {
      if (c !== client && c.authenticated && c.user && c.user.currentRoomId === currentRoomId) {
        writeFormattedMessageToClient(
          c,
          colorize(`${username} has become a ${targetClass.name}!\r\n`, 'brightYellow')
        );
      }
    });
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
      writeToClient(
        client,
        colorize(
          `Progress: ${expProgress}/${expNeeded} XP needed for level ${currentLevel + 1}\r\n`,
          'yellow'
        )
      );
      return;
    }

    // Level up!
    const newLevel = currentLevel + 1;
    client.user.level = newLevel;

    // Add stat gains from leveling up
    const healthGain = 5;
    const manaGain = 3;
    const attributePointGain = 10;

    client.user.maxHealth += healthGain;
    client.user.health += healthGain;
    client.user.maxMana += manaGain;
    client.user.mana += manaGain;
    client.user.unspentAttributePoints =
      (client.user.unspentAttributePoints ?? 0) + attributePointGain;

    // Update in UserManager and save
    this.userManager.updateUserStats(client.user.username, {
      level: newLevel,
      maxHealth: client.user.maxHealth,
      health: client.user.health,
      maxMana: client.user.maxMana,
      mana: client.user.mana,
      unspentAttributePoints: client.user.unspentAttributePoints,
    });

    playerLogger.info(`Leveled up from ${currentLevel} to ${newLevel}`);

    // Message to the player
    writeToClient(
      client,
      colorize(`\r\nYou feel stronger and are now level ${newLevel}!\r\n`, 'brightWhite')
    );
    writeToClient(client, colorize(`  +${healthGain} Max Health\r\n`, 'green'));
    writeToClient(client, colorize(`  +${manaGain} Max Mana\r\n`, 'blue'));
    writeToClient(
      client,
      colorize(`  +${attributePointGain} Attribute Points (use "attrib" to allocate)\r\n`, 'cyan')
    );

    // Check if class advancement is now available
    const currentClassId = client.user.classId ?? 'adventurer';
    const availableAdvancements = this.classManager.getAvailableAdvancements(currentClassId);
    const unlockedClass = availableAdvancements.find((c) => c.requirements.level === newLevel);

    if (unlockedClass) {
      writeToClient(
        client,
        colorize(
          `\r\nNew class available: ${unlockedClass.name}! Use "train class" to learn more.\r\n`,
          'brightYellow'
        )
      );
    }

    // Broadcast to others in the room
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
