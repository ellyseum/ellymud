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

    // Handle 'train stats' - disabled for now (editor state not fully implemented)
    if (trimmedArgs === 'stats') {
      writeToClient(
        client,
        colorize('The stat editor is not yet available.\r\n', 'yellow') +
          colorize('Use "attrib <stat> <points>" to allocate attribute points.\r\n', 'white') +
          colorize('Example: attrib strength 5\r\n', 'dim')
      );
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

    // Check if the argument might be a class name (shortcut for 'train class <name>')
    // This allows players to use 'train magic_user' instead of 'train class magic_user'
    const allClasses = this.classManager.getAllClasses();
    const potentialClass = allClasses.find(
      (c) =>
        c.id === trimmedArgs ||
        c.name.toLowerCase() === trimmedArgs ||
        c.name.toLowerCase().replace(/\s+/g, '_') === trimmedArgs
    );

    if (potentialClass) {
      // Found a matching class, treat as class advancement
      this.attemptClassAdvancement(client, trimmedArgs, playerLogger);
      return;
    }

    // Unknown argument
    writeToClient(
      client,
      colorize('Usage:\r\n', 'yellow') +
        colorize('  train           - Level up when you have enough XP\r\n', 'white') +
        colorize('  train class     - View available class options\r\n', 'white') +
        colorize('  train class <n> - Advance to a new class\r\n', 'white') +
        colorize('\r\nTo allocate attribute points, use the "attrib" command.\r\n', 'dim')
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

    // Refresh user data from UserManager to ensure we have latest stats
    const freshUser = this.userManager.getUser(client.user.username);
    if (freshUser) {
      // Sync critical fields that might be stale
      client.user.level = freshUser.level;
      client.user.classId = freshUser.classId;
      client.user.classHistory = freshUser.classHistory;
    }

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

    // Refresh user data from UserManager to ensure we have latest stats
    const freshUser = this.userManager.getUser(client.user.username);
    if (freshUser) {
      client.user.level = freshUser.level;
      client.user.classId = freshUser.classId;
      client.user.classHistory = freshUser.classHistory;
    }

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
      // Initialize mana fields if they don't exist (e.g., advancing from Adventurer to Magic User)
      client.user.maxMana = (client.user.maxMana ?? 0) + bonuses.maxMana;
      client.user.mana = (client.user.mana ?? 0) + bonuses.maxMana;
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

    const startLevel = client.user.level;
    const expNeededForNext = getExpRequiredForLevel(startLevel);
    const expProgress = client.user.experience - getTotalExpForLevel(startLevel);

    // Not enough XP to advance even one level — bail with the existing message.
    if (expProgress < expNeededForNext) {
      writeToClient(
        client,
        colorize('You do not have enough experience for training!\r\n', 'brightRed')
      );
      writeToClient(
        client,
        colorize(
          `Progress: ${expProgress}/${expNeededForNext} XP needed for level ${startLevel + 1}\r\n`,
          'yellow'
        )
      );
      return;
    }

    // Pop as many levels as the banked XP allows.
    const healthGain = 5;
    const attributePointGain = 10;
    const currentClassId = client.user.classId ?? 'adventurer';
    const availableAdvancements = this.classManager.getAvailableAdvancements(currentClassId);

    let level = startLevel;
    let levelsGained = 0;
    const newClassUnlocks: typeof availableAdvancements = [];

    while (client.user.experience >= getTotalExpForLevel(level + 1)) {
      level += 1;
      levelsGained += 1;

      // HP grant is kept manual: calculateMaxHP also adds level*HP_PER_LEVEL,
      // so this stays in sync with the formula. UserManager.recalculateStats
      // (called on race/class/equipment changes) re-derives from level so the
      // stored value isn't authoritative — but the manual += keeps stats.command
      // and the prompt accurate between recalcs.
      client.user.maxHealth += healthGain;
      client.user.health += healthGain;
      client.user.unspentAttributePoints =
        (client.user.unspentAttributePoints ?? 0) + attributePointGain;

      // No mana increment: ResourceManager.calculateMaxResource derives mana
      // from INT/WIS only (no level term). Any manual user.maxMana += would
      // be erased on the next regen tick / resource read, so granting it
      // here is a silent no-op. Mana scaling needs to live in the formula,
      // not the level-up grant. (See src/utils/statCalculator.ts:calculateMaxMana.)

      // Collect class unlocks for this level (dedupe across the run).
      for (const adv of availableAdvancements) {
        if (adv.requirements.level === level && !newClassUnlocks.find((c) => c.id === adv.id)) {
          newClassUnlocks.push(adv);
        }
      }
    }

    client.user.level = level;

    this.userManager.updateUserStats(client.user.username, {
      level,
      maxHealth: client.user.maxHealth,
      health: client.user.health,
      unspentAttributePoints: client.user.unspentAttributePoints,
    });

    playerLogger.info(`Leveled up from ${startLevel} to ${level} (+${levelsGained})`);

    // One ding per level.
    for (let lv = startLevel + 1; lv <= level; lv++) {
      writeToClient(
        client,
        colorize(`\r\nYou feel stronger and are now level ${lv}!\r\n`, 'brightWhite')
      );
      writeToClient(client, colorize(`  +${healthGain} Max Health\r\n`, 'green'));
      writeToClient(
        client,
        colorize(`  +${attributePointGain} Attribute Points (use "attrib" to allocate)\r\n`, 'cyan')
      );
    }

    if (levelsGained > 1) {
      writeToClient(client, colorize(`\r\nYou gained ${levelsGained} levels!\r\n`, 'brightGreen'));
    }

    // One notice per unique class unlock crossed during the level range.
    for (const adv of newClassUnlocks) {
      writeToClient(
        client,
        colorize(
          `\r\nNew class available: ${adv.name}! Use "train class" to learn more.\r\n`,
          'brightYellow'
        )
      );
    }

    // Single room broadcast — don't spam once per level.
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
