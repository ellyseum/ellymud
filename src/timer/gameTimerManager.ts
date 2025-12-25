import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { RoomManager } from '../room/roomManager';
import { UserManager } from '../user/userManager';
import { CombatSystem } from '../combat/combatSystem';
import { EffectManager } from '../effects/effectManager';
import { systemLogger, createContextLogger } from '../utils/logger';
import { colorize } from '../utils/colors';
import { writeFormattedMessageToClient } from '../utils/socketWriter';

// Create a context-specific logger for GameTimerManager
const timerLogger = createContextLogger('GameTimerManager');

// Configuration interface for the game timer system
export interface GameTimerConfig {
  tickInterval: number; // Time between ticks in milliseconds
  saveInterval: number; // Number of ticks between data saves
}

// Default configuration
const DEFAULT_CONFIG: GameTimerConfig = {
  tickInterval: 6000, // 6 seconds per tick
  saveInterval: 10, // Save every 10 ticks (1 minute)
};

// Load config from file or use defaults
function loadGameTimerConfig(): GameTimerConfig {
  const configPath = path.join(__dirname, '..', '..', 'data', 'gametimer-config.json');

  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(data);
      return {
        tickInterval: config.tickInterval || DEFAULT_CONFIG.tickInterval,
        saveInterval: config.saveInterval || DEFAULT_CONFIG.saveInterval,
      };
    }
  } catch (error) {
    systemLogger.error('Error loading game timer configuration:', error);
  }

  // If file doesn't exist or there's an error, use defaults
  return DEFAULT_CONFIG;
}

// Save config to file
function saveGameTimerConfig(config: GameTimerConfig): void {
  const configPath = path.join(__dirname, '..', '..', 'data', 'gametimer-config.json');
  const dataDir = path.join(__dirname, '..', '..', 'data');

  try {
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    systemLogger.error('Error saving game timer configuration:', error);
  }
}

export class GameTimerManager extends EventEmitter {
  private static instance: GameTimerManager | null = null;
  private config: GameTimerConfig;
  private tickCount: number = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private running: boolean = false;
  private userManager: UserManager;
  private roomManager: RoomManager;
  private combatSystem: CombatSystem;
  private effectManager: EffectManager;

  private constructor(userManager: UserManager, roomManager: RoomManager) {
    super();
    timerLogger.info('Creating GameTimerManager instance');
    this.config = loadGameTimerConfig();
    this.userManager = userManager;
    this.roomManager = roomManager;
    // Get the singleton instance instead of creating a new one
    this.combatSystem = CombatSystem.getInstance(userManager, roomManager);
    // Get the EffectManager instance
    this.effectManager = EffectManager.getInstance(userManager, roomManager);
  }

  /**
   * Get the singleton instance of GameTimerManager.
   * If it doesn't exist, it will be created with the provided userManager and roomManager.
   * If it already exists, it will update the references to userManager and roomManager if needed.
   */
  public static getInstance(userManager: UserManager, roomManager: RoomManager): GameTimerManager {
    if (!GameTimerManager.instance) {
      GameTimerManager.instance = new GameTimerManager(userManager, roomManager);
    } else {
      // Update references if they're different objects
      GameTimerManager.instance.userManager = userManager;
      GameTimerManager.instance.roomManager = roomManager;
    }
    return GameTimerManager.instance;
  }

  /**
   * Reset the singleton instance (primarily for testing purposes)
   */
  public static resetInstance(): void {
    if (GameTimerManager.instance && GameTimerManager.instance.running) {
      GameTimerManager.instance.stop();
    }
    GameTimerManager.instance = null;
  }

  /**
   * Get the current game timer configuration
   */
  public getConfig(): GameTimerConfig {
    return { ...this.config };
  }

  /**
   * Update the game timer configuration
   */
  public updateConfig(newConfig: Partial<GameTimerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    saveGameTimerConfig(this.config);

    // If running, restart with new config
    if (this.running) {
      this.stop();
      this.start();
    }
  }

  /**
   * Start the game timer system
   */
  public start(): void {
    if (this.running) return;

    this.running = true;
    this.intervalId = setInterval(() => this.tick(), this.config.tickInterval);
    timerLogger.info(
      `Game timer started: ${this.config.tickInterval}ms interval, saving every ${this.config.saveInterval} ticks`
    );
  }

  /**
   * Stop the game timer system
   */
  public stop(): void {
    if (!this.running || !this.intervalId) return;

    clearInterval(this.intervalId);
    this.intervalId = null;
    this.running = false;
    timerLogger.info('Game timer stopped');
  }

  /**
   * Check if the game timer system is currently running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Force a tick to occur immediately
   */
  public forceTick(): void {
    this.tick();
  }

  /**
   * Force a save to occur immediately
   */
  public forceSave(): void {
    this.saveData();
  }

  /**
   * The main tick function - processes one game tick
   */
  private tick(): void {
    this.tickCount++;
    timerLogger.debug(`Game tick ${this.tickCount}`);

    // Process effects first so stat modifiers apply to subsequent actions
    this.effectManager.processGameTick(this.tickCount);

    // Process all combat rounds for players actively engaged in combat
    this.combatSystem.processCombatRound();

    // Process room-based combat for entities with aggression
    this.combatSystem.processRoomCombat();

    // Process resting/meditating tick counters
    this.processRestMeditateTicks();

    // Sub-regen ticks every 3 ticks (1/4 of 12) for players in full rest/meditate state
    if (this.tickCount % 3 === 0) {
      this.processSubRegeneration();
    }

    // Process full regeneration every 12 ticks (72 seconds)
    if (this.tickCount % 12 === 0) {
      this.processRegeneration();
    }

    // Check if it's time to save
    if (this.tickCount % this.config.saveInterval === 0) {
      timerLogger.info('Saving all game data...');
      this.forceSave();
      timerLogger.info('Game data saved successfully');
    }
  }

  /**
   * Process tick counters for resting/meditating players
   */
  private processRestMeditateTicks(): void {
    const activeUsers = this.userManager.getAllActiveUserSessions();

    for (const [, client] of activeUsers) {
      if (!client.user) continue;

      // Clear rest/meditate states if in combat or unconscious
      if (client.user.inCombat || client.user.isUnconscious) {
        if (client.user.isResting || client.user.isMeditating) {
          client.user.isResting = false;
          client.user.isMeditating = false;
          client.user.restingTicks = 0;
          client.user.meditatingTicks = 0;
        }
        continue;
      }

      // Increment tick counters
      if (client.user.isResting) {
        client.user.restingTicks = (client.user.restingTicks || 0) + 1;
      }

      if (client.user.isMeditating) {
        client.user.meditatingTicks = (client.user.meditatingTicks || 0) + 1;
      }
    }
  }

  /**
   * Process sub-regeneration for players in full rest/meditate state (4+ ticks)
   * Called every 3 ticks (1/4 of main regen cycle)
   */
  private processSubRegeneration(): void {
    const activeUsers = this.userManager.getAllActiveUserSessions();

    for (const [username, client] of activeUsers) {
      if (!client.user) continue;
      if (client.user.inCombat || client.user.isUnconscious) continue;

      // Sub-regen only applies to players in full rest/meditate state (4+ ticks)
      const isFullyResting = client.user.isResting && (client.user.restingTicks || 0) >= 4;
      const isFullyMeditating = client.user.isMeditating && (client.user.meditatingTicks || 0) >= 4;

      if (!isFullyResting && !isFullyMeditating) continue;

      let hpGained = 0;
      let mpGained = 0;

      // Sub-regen HP while fully resting
      if (isFullyResting && client.user.health < client.user.maxHealth) {
        const constitution = client.user.constitution || 10;
        const subHpRegen = Math.max(1, Math.floor(constitution / 10));
        hpGained = Math.min(subHpRegen, client.user.maxHealth - client.user.health);
        client.user.health += hpGained;
      }

      // Sub-regen MP while fully meditating
      if (isFullyMeditating && client.user.mana < client.user.maxMana) {
        const wisdom = client.user.wisdom || 10;
        const intelligence = client.user.intelligence || 10;
        const subMpRegen = Math.max(1, Math.floor((wisdom + intelligence) / 20));
        mpGained = Math.min(subMpRegen, client.user.maxMana - client.user.mana);
        client.user.mana += mpGained;
      }

      if (hpGained > 0 || mpGained > 0) {
        this.userManager.updateUserStats(username, {
          health: client.user.health,
          mana: client.user.mana,
        });

        const parts: string[] = [];
        if (hpGained > 0) parts.push(`+${hpGained} HP`);
        if (mpGained > 0) parts.push(`+${mpGained} MP`);

        writeFormattedMessageToClient(
          client,
          colorize(`\r\nYou feel yourself recovering... (${parts.join(', ')})\r\n`, 'cyan')
        );
      }
    }
  }

  /**
   * Process HP/MP regeneration for all active players
   * Called every 12 ticks (72 seconds)
   */
  private processRegeneration(): void {
    timerLogger.debug('Processing player regeneration');
    const activeUsers = this.userManager.getAllActiveUserSessions();

    for (const [username, client] of activeUsers) {
      if (!client.user) continue;
      if (client.user.inCombat || client.user.isUnconscious) continue;

      let hpGained = 0;
      let mpGained = 0;
      const messages: string[] = [];

      const constitution = client.user.constitution || 10;
      const baseHpRegen = Math.max(1, Math.floor(constitution / 5));

      const wisdom = client.user.wisdom || 10;
      const intelligence = client.user.intelligence || 10;
      const baseMpRegen = Math.max(1, Math.floor((wisdom + intelligence) / 10));

      if (client.user.health < client.user.maxHealth) {
        let hpRegen = baseHpRegen;
        if (client.user.isResting && (client.user.restingTicks || 0) >= 4) {
          hpRegen = Math.floor(hpRegen * 2);
          messages.push('resting');
        }
        hpGained = Math.min(hpRegen, client.user.maxHealth - client.user.health);
        client.user.health += hpGained;
      }

      if (client.user.mana < client.user.maxMana) {
        let mpRegen = baseMpRegen;
        if (client.user.isMeditating && (client.user.meditatingTicks || 0) >= 4) {
          mpRegen = Math.floor(mpRegen * 2);
          messages.push('meditating');
        }
        mpGained = Math.min(mpRegen, client.user.maxMana - client.user.mana);
        client.user.mana += mpGained;
      }

      if (hpGained > 0 || mpGained > 0) {
        this.userManager.updateUserStats(username, {
          health: client.user.health,
          mana: client.user.mana,
        });

        const parts: string[] = [];
        if (hpGained > 0) parts.push(`+${hpGained} HP`);
        if (mpGained > 0) parts.push(`+${mpGained} MP`);

        const bonusText = messages.length > 0 ? ` (${messages.join(', ')})` : '';
        writeFormattedMessageToClient(
          client,
          colorize(`\r\nYou regenerate ${parts.join(', ')}${bonusText}.\r\n`, 'green')
        );
      }
    }
  }

  /**
   * Save all game data
   */
  private saveData(): void {
    timerLogger.info('Saving all game data...');

    try {
      // Save users
      this.userManager.forceSave();

      // Save rooms
      this.roomManager.forceSave();

      // Emit save event for other systems to hook into
      this.emit('save');

      timerLogger.info('Game data saved successfully');
    } catch (error) {
      timerLogger.error('Error saving game data:', error);
    }
  }

  /**
   * Get the current tick count
   */
  public getTickCount(): number {
    return this.tickCount;
  }

  /**
   * Reset the tick count to zero
   */
  public resetTickCount(): void {
    this.tickCount = 0;
  }

  /**
   * Get the combat system instance
   */
  public getCombatSystem(): CombatSystem {
    return this.combatSystem;
  }
}
