// User manager uses dynamic typing for flexible user data handling
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, ConnectedClient, ClientStateType } from '../types';
import { writeToClient, stopBuffering, writeMessageToClient } from '../utils/socketWriter';
import { colorize } from '../utils/colors';
import { standardizeUsername } from '../utils/formatters';
import { CombatSystem } from '../combat/combatSystem';
import { RoomManager } from '../room/roomManager';
import { systemLogger, getPlayerLogger } from '../utils/logger';
import { parseAndValidateJson } from '../utils/jsonUtils';
import config, { STORAGE_BACKEND } from '../config';
import { getDb } from '../data/db';

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const SNAKE_SCORES_FILE = path.join(DATA_DIR, 'snake-scores.json');

// Interface for snake score entries
interface SnakeScore {
  username: string;
  score: number;
  date: Date;
}

// Interface for raw JSON snake score (before date conversion)
interface RawSnakeScore {
  username: string;
  score: number;
  date: string;
}

import { IUserRepository, IPasswordService } from '../persistence/interfaces';
import { FileUserRepository } from '../persistence/fileRepository';
import { getPasswordService } from '../persistence/passwordService';

export class UserManager {
  private users: User[] = [];
  private activeUserSessions: Map<string, ConnectedClient> = new Map();
  private pendingTransfers: Map<string, ConnectedClient> = new Map();
  private snakeScores: SnakeScore[] = [];
  private testMode: boolean = false;
  private repository: IUserRepository;
  private passwordService: IPasswordService;

  private static instance: UserManager | null = null;

  public static getInstance(): UserManager {
    if (!UserManager.instance) {
      UserManager.instance = new UserManager();
    }
    return UserManager.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    UserManager.instance = null;
  }

  /**
   * Create a UserManager with custom dependencies (for testing)
   * @param repository Optional user repository
   * @param passwordService Optional password service
   */
  public static createWithDependencies(
    repository?: IUserRepository,
    passwordService?: IPasswordService
  ): UserManager {
    UserManager.resetInstance();
    UserManager.instance = new UserManager(repository, passwordService);
    return UserManager.instance;
  }

  private constructor(repository?: IUserRepository, passwordService?: IPasswordService) {
    this.repository = repository ?? new FileUserRepository();
    this.passwordService = passwordService ?? getPasswordService();
    this.loadUsers();
    this.loadSnakeScores();
    this.migrateSnakeScores();
  }

  // Generate a random salt
  private generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  // Hash password with salt
  private hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  }

  // Verify password against stored hash
  private verifyPassword(password: string, salt: string, storedHash: string): boolean {
    const hash = this.hashPassword(password, salt);
    return hash === storedHash;
  }

  // Migrate existing users to use hash+salt
  private migrateUsersToHashedPasswords(): void {
    let hasChanges = false;

    this.users.forEach((user) => {
      if (user.password && !user.passwordHash) {
        const salt = this.generateSalt();
        const passwordHash = this.hashPassword(user.password, salt);

        // Update user object
        user.passwordHash = passwordHash;
        user.salt = salt;
        delete user.password;

        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.saveUsers();
    }
  }

  /**
   * Load prevalidated user data
   * @param userData An array of validated user data objects
   */
  public loadPrevalidatedUsers(userData: Partial<User>[]): void {
    systemLogger.info(`Loading ${userData.length} pre-validated users...`);

    // Clear existing users to prevent duplicates
    this.users = [];

    // Process each validated user
    userData.forEach((user) => {
      // Ensure dates are properly parsed
      if (typeof user.joinDate === 'string') {
        user.joinDate = new Date(user.joinDate);
      }
      if (typeof user.lastLogin === 'string') {
        user.lastLogin = new Date(user.lastLogin);
      }

      // Ensure inventory structure exists
      if (!user.inventory) {
        user.inventory = {
          items: [],
          currency: { gold: 0, silver: 0, copper: 0 },
        };
      }

      if (!user.inventory.items) {
        user.inventory.items = [];
      }

      if (!user.inventory.currency) {
        user.inventory.currency = { gold: 0, silver: 0, copper: 0 };
      }

      // Ensure totalPlayTime is properly initialized
      if (user.totalPlayTime === undefined) {
        user.totalPlayTime = 0;
      }

      // Ensure mana stats are initialized and clamped
      if (typeof user.maxMana !== 'number' || Number.isNaN(user.maxMana)) {
        user.maxMana = 100;
      }

      if (typeof user.mana !== 'number' || Number.isNaN(user.mana)) {
        user.mana = user.maxMana;
      } else {
        user.mana = Math.max(0, Math.min(user.mana, user.maxMana));
      }

      // Add user to collection - at this point all required fields have been validated
      this.users.push(user as User);
    });

    // Migrate any users with plain text passwords
    this.migrateUsersToHashedPasswords();

    // Save to ensure all users have the correct structure
    this.saveUsers();

    systemLogger.info('Pre-validated users loaded successfully');
  }

  private loadUsers(): void {
    // First try to load users from command line argument if provided
    if (config.DIRECT_USERS_DATA) {
      try {
        const userData = parseAndValidateJson<Partial<User>[]>(config.DIRECT_USERS_DATA, 'users');

        if (userData && Array.isArray(userData)) {
          this.loadPrevalidatedUsers(userData);
          return; // Successfully loaded from command line
        }
      } catch (error) {
        systemLogger.error('Failed to load users from command line:', error);
      }
    }

    // Load based on storage backend config
    if (STORAGE_BACKEND === 'json') {
      // JSON only mode - use repository directly
      this.loadUsersFromRepository();
    } else if (STORAGE_BACKEND === 'sqlite') {
      // SQLite only mode - use database, fail if not available
      this.loadUsersFromDatabase().catch((error) => {
        systemLogger.error('[UserManager] SQLite load failed (no fallback):', error);
      });
    } else {
      // Auto mode (default) - try database first, fallback to repository
      this.loadUsersFromDatabase().catch(() => this.loadUsersFromRepository());
    }
  }

  private loadUsersFromRepository(): void {
    try {
      // Check if storage exists
      if (!this.repository.storageExists()) {
        this.users = [];
        return;
      }

      const userData = this.repository.loadUsers();

      if (userData.length > 0) {
        this.loadPrevalidatedUsers(userData);
      } else {
        // Empty but valid - just start with no users
        this.users = [];
      }
    } catch (error: unknown) {
      systemLogger.error(
        'Error loading users from repository:',
        error instanceof Error ? error.message : String(error)
      );
      this.users = [];
    }
  }

  /**
   * Load users from SQLite database via Kysely.
   * Fire-and-forget pattern since loadUsers() is sync.
   */
  private async loadUsersFromDatabase(): Promise<void> {
    try {
      const db = getDb();
      const rows = await db.selectFrom('users').selectAll().execute();

      this.users = rows.map((row) => ({
        username: row.username,
        passwordHash: row.password_hash,
        salt: row.salt,
        health: row.health,
        maxHealth: row.max_health,
        mana: row.mana,
        maxMana: row.max_mana,
        experience: row.experience,
        level: row.level,
        strength: row.strength,
        dexterity: row.dexterity,
        agility: row.agility,
        constitution: row.constitution,
        wisdom: row.wisdom,
        intelligence: row.intelligence,
        charisma: row.charisma,
        equipment: row.equipment ? JSON.parse(row.equipment) : undefined,
        joinDate: new Date(row.join_date),
        lastLogin: new Date(row.last_login),
        totalPlayTime: row.total_play_time,
        currentRoomId: row.current_room_id,
        inventory: {
          items: row.inventory_items ? JSON.parse(row.inventory_items) : [],
          currency: {
            gold: row.inventory_gold,
            silver: row.inventory_silver,
            copper: row.inventory_copper,
          },
        },
        bank: { gold: row.bank_gold, silver: row.bank_silver, copper: row.bank_copper },
        inCombat: row.in_combat === 1,
        isUnconscious: row.is_unconscious === 1,
        isResting: row.is_resting === 1,
        isMeditating: row.is_meditating === 1,
        flags: row.flags ? JSON.parse(row.flags) : undefined,
        pendingAdminMessages: row.pending_admin_messages
          ? JSON.parse(row.pending_admin_messages)
          : undefined,
        email: row.email || undefined,
        description: row.description || undefined,
      }));

      systemLogger.info(`[UserManager] Loaded ${this.users.length} users from database`);
    } catch (error) {
      systemLogger.error(
        '[UserManager] Error loading from database, falling back to repository:',
        error
      );
      this.loadUsersFromRepository();
    }
  }

  private saveUsers(): void {
    if (this.testMode) {
      systemLogger.debug('[UserManager] Skipping save - test mode active');
      return;
    }

    // Save based on storage backend config
    if (STORAGE_BACKEND === 'json') {
      // JSON only mode - save to repository only
      try {
        this.repository.saveUsers(this.users);
      } catch (error) {
        systemLogger.error('Error saving users to file:', error);
      }
    } else if (STORAGE_BACKEND === 'sqlite') {
      // SQLite only mode - save to database only
      this.saveUsersToDatabase().catch((error) => {
        systemLogger.error('[UserManager] Database save failed:', error);
      });
    } else {
      // Auto mode (default) - save to both database AND JSON file (backup)
      this.saveUsersToDatabase().catch((error) => {
        systemLogger.error('[UserManager] Database save failed:', error);
      });
      try {
        this.repository.saveUsers(this.users);
      } catch (error) {
        systemLogger.error('Error saving users to file:', error);
      }
    }
  }

  private async saveUsersToDatabase(): Promise<void> {
    const db = getDb();
    for (const user of this.users) {
      const values = {
        username: user.username,
        password_hash: user.passwordHash || '',
        salt: user.salt || '',
        health: user.health,
        max_health: user.maxHealth,
        mana: user.mana,
        max_mana: user.maxMana,
        experience: user.experience,
        level: user.level,
        strength: user.strength,
        dexterity: user.dexterity,
        agility: user.agility,
        constitution: user.constitution,
        wisdom: user.wisdom,
        intelligence: user.intelligence,
        charisma: user.charisma,
        equipment: user.equipment ? JSON.stringify(user.equipment) : null,
        join_date: user.joinDate instanceof Date ? user.joinDate.toISOString() : user.joinDate,
        last_login: user.lastLogin instanceof Date ? user.lastLogin.toISOString() : user.lastLogin,
        total_play_time: user.totalPlayTime ?? 0,
        current_room_id: user.currentRoomId,
        inventory_items: user.inventory?.items ? JSON.stringify(user.inventory.items) : null,
        inventory_gold: user.inventory?.currency?.gold ?? 0,
        inventory_silver: user.inventory?.currency?.silver ?? 0,
        inventory_copper: user.inventory?.currency?.copper ?? 0,
        bank_gold: user.bank?.gold ?? 0,
        bank_silver: user.bank?.silver ?? 0,
        bank_copper: user.bank?.copper ?? 0,
        in_combat: user.inCombat ? 1 : 0,
        is_unconscious: user.isUnconscious ? 1 : 0,
        is_resting: user.isResting ? 1 : 0,
        is_meditating: user.isMeditating ? 1 : 0,
        flags: user.flags ? JSON.stringify(user.flags) : null,
        pending_admin_messages: user.pendingAdminMessages
          ? JSON.stringify(user.pendingAdminMessages)
          : null,
        email: user.email || null,
        description: user.description || null,
      };
      await db
        .insertInto('users')
        .values(values)
        .onConflict((oc) => oc.column('username').doUpdateSet(values))
        .execute();
    }
  }

  /**
   * Force saving users data
   * Public method for tick system to call
   */
  public forceSave(): void {
    this.saveUsers();
  }

  /**
   * Enable or disable test mode.
   * When enabled, file persistence is skipped to avoid overwriting main game data.
   * @param enabled True to enable test mode, false to disable
   */
  public setTestMode(enabled: boolean): void {
    this.testMode = enabled;
    systemLogger.info(
      `[UserManager] Test mode ${enabled ? 'enabled' : 'disabled'} - file persistence ${enabled ? 'disabled' : 'enabled'}`
    );
  }

  /**
   * Check if test mode is enabled
   */
  public isTestMode(): boolean {
    return this.testMode;
  }

  /**
   * Load user data from a specific file path (for testing/snapshots).
   * This replaces the current users array with data from the file.
   *
   * @param filePath - Absolute path to the users JSON file
   */
  public async loadFromPath(filePath: string): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`User data file not found: ${filePath}`);
      }

      const data = fs.readFileSync(filePath, 'utf8');
      const userData = JSON.parse(data);

      if (!Array.isArray(userData)) {
        throw new Error('User data must be an array');
      }

      // Load using the prevalidated method to ensure proper structure
      this.loadPrevalidatedUsers(userData);
      systemLogger.info(`[UserManager] Loaded ${userData.length} users from ${filePath}`);
    } catch (error) {
      systemLogger.error(`[UserManager] Error loading users from ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Save user data to a specific file path (for testing/snapshots).
   * This saves the current users array to the specified file.
   *
   * @param filePath - Absolute path to save the users JSON file
   * @returns Number of users saved
   */
  public async saveToPath(filePath: string): Promise<number> {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(this.users, null, 2));
      systemLogger.info(`[UserManager] Saved ${this.users.length} users to ${filePath}`);
      return this.users.length;
    } catch (error) {
      systemLogger.error(`[UserManager] Error saving users to ${filePath}:`, error);
      throw error;
    }
  }

  // Load snake scores from the dedicated file
  private loadSnakeScores(): void {
    try {
      // Create snake scores file if it doesn't exist
      if (!fs.existsSync(SNAKE_SCORES_FILE)) {
        fs.writeFileSync(SNAKE_SCORES_FILE, JSON.stringify({ scores: [] }, null, 2));
        return;
      }

      const data = fs.readFileSync(SNAKE_SCORES_FILE, 'utf8');
      const parsed = JSON.parse(data);

      // Ensure scores is an array
      if (!Array.isArray(parsed.scores)) {
        this.snakeScores = [];
        return;
      }

      // Convert date strings back to Date objects
      this.snakeScores = parsed.scores.map((score: RawSnakeScore) => ({
        username: score.username,
        score: score.score,
        date: new Date(score.date),
      }));

      systemLogger.info(`[UserManager] Loaded ${this.snakeScores.length} snake scores from file`);
    } catch (error) {
      systemLogger.error('Error loading snake scores:', error);
      this.snakeScores = [];
    }
  }

  // Save snake scores to the dedicated file
  private saveSnakeScores(): void {
    try {
      const data = {
        scores: this.snakeScores,
      };
      fs.writeFileSync(SNAKE_SCORES_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      systemLogger.error('Error saving snake scores:', error);
    }
  }

  // Migrate any existing snake scores from users.json to snake-scores.json
  private migrateSnakeScores(): void {
    let migrationCount = 0;

    // Check each user for a snakeHighScore
    this.users.forEach((user) => {
      if (user.snakeHighScore && user.snakeHighScore > 0) {
        const username = user.username;
        const score = user.snakeHighScore;

        // Check if we already have this score in the new system
        const existingScoreIndex = this.snakeScores.findIndex((s) => s.username === username);

        if (existingScoreIndex === -1) {
          // Add as a new score
          this.snakeScores.push({
            username,
            score,
            date: new Date(), // We don't know the original date, so use current
          });
          migrationCount++;
        } else if (score > this.snakeScores[existingScoreIndex].score) {
          // Update existing score if higher
          this.snakeScores[existingScoreIndex].score = score;
          migrationCount++;
        }

        // Clear the score from the user object
        delete user.snakeHighScore;
      }
    });

    if (migrationCount > 0) {
      systemLogger.info(
        `[UserManager] Migrated ${migrationCount} snake scores from users.json to snake-scores.json`
      );
      // Save both files
      this.saveUsers();
      this.saveSnakeScores();
    }
  }

  public getUser(username: string): User | undefined {
    const standardized = standardizeUsername(username);
    return this.users.find((user) => user.username === standardized);
  }

  public userExists(username: string): boolean {
    const standardized = standardizeUsername(username);
    return this.users.some((user) => user.username === standardized);
  }

  public authenticateUser(username: string, password: string): boolean {
    const user = this.getUser(username);

    if (!user) {
      return false;
    }

    // Handle legacy users with plain text passwords
    if (user.password) {
      if (user.password === password) {
        // Migrate this user to the new password system
        const salt = this.generateSalt();
        const passwordHash = this.hashPassword(password, salt);

        user.passwordHash = passwordHash;
        user.salt = salt;
        delete user.password;

        this.saveUsers();
        return true;
      }
      return false;
    }

    // Verify using hash and salt
    if (user.passwordHash && user.salt) {
      return this.verifyPassword(password, user.salt, user.passwordHash);
    }

    return false;
  }

  public isUserActive(username: string): boolean {
    const standardized = standardizeUsername(username);
    return this.activeUserSessions.has(standardized);
  }

  public getActiveUserSession(username: string): ConnectedClient | undefined {
    const standardized = standardizeUsername(username);
    return this.activeUserSessions.get(standardized);
  }

  /**
   * Get all active user sessions as a Map of username -> ConnectedClient
   * Used by regeneration system to process all players
   */
  public getAllActiveUserSessions(): Map<string, ConnectedClient> {
    return new Map(this.activeUserSessions);
  }

  public registerUserSession(username: string, client: ConnectedClient): void {
    const standardized = standardizeUsername(username);
    this.activeUserSessions.set(standardized, client);
    // Clear any pending transfers for this user
    this.pendingTransfers.delete(standardized);

    systemLogger.info(`User ${username} logged in`);
    const playerLogger = getPlayerLogger(username);
    playerLogger.info(`Logged in successfully`);
  }

  public unregisterUserSession(username: string): void {
    const standardized = standardizeUsername(username);
    this.activeUserSessions.delete(standardized);
    // Also clean up any pending transfers
    this.pendingTransfers.delete(standardized);

    systemLogger.info(`User ${username} disconnected`);
    getPlayerLogger(username).info(`Disconnected from server`);
  }

  // Request a transfer of the session for the user
  public requestSessionTransfer(username: string, newClient: ConnectedClient): boolean {
    const lowerUsername = username.toLowerCase();

    // Get the existing client session
    const existingClient = this.activeUserSessions.get(lowerUsername);
    if (!existingClient) return false;

    // Store the pending transfer request
    this.pendingTransfers.set(lowerUsername, newClient);

    // Save the current state and previous state for restoring if denied
    newClient.stateData.previousState = newClient.state;
    newClient.stateData.waitingForTransfer = true;
    newClient.stateData.transferUsername = username;

    // Interrupt the existing client with a transfer request through the state machine
    existingClient.stateData.forcedTransition = ClientStateType.TRANSFER_REQUEST;
    existingClient.stateData.transferClient = newClient;

    // Send an immediate notification to the existing client to check for state changes
    this.notifyClient(existingClient);

    return true;
  }

  // Helper method to notify a client to check their state
  private notifyClient(client: ConnectedClient): void {
    // For notifications, use the message writer that handles prompt management
    if (client.authenticated && client.state === ClientStateType.AUTHENTICATED) {
      writeMessageToClient(client, '');
    } else {
      writeToClient(client, '');
    }
    stopBuffering(client);
  }

  // Approve or deny a session transfer
  public resolveSessionTransfer(username: string, approved: boolean): void {
    const lowerUsername = username.toLowerCase();
    const newClient = this.pendingTransfers.get(lowerUsername);
    const existingClient = this.activeUserSessions.get(lowerUsername);

    if (!newClient || !existingClient) return;

    if (approved) {
      // Inform the existing client they're being disconnected
      writeToClient(
        existingClient,
        colorize('\r\n\r\nYou approved the session transfer. Disconnecting...\r\n', 'yellow')
      );

      // Mark both clients as being in a transfer
      existingClient.stateData.transferInProgress = true;
      newClient.stateData.isSessionTransfer = true;

      // CRITICAL FIX: Keep references to both clients temporarily
      // This helps prevent combat from seeing "no valid clients" during transfer

      if (existingClient.user) {
        // Capture if user is in combat BEFORE making any changes
        const inCombat = existingClient.user.inCombat || false;
        systemLogger.info(`[UserManager] User ${username} inCombat status: ${inCombat}`);

        // Clone the user from existing client
        const user = this.getUser(username);
        if (user) {
          // Setup the new client
          newClient.user = { ...user }; // Clone to avoid reference issues
          newClient.authenticated = true;
          newClient.stateData.waitingForTransfer = false;

          // CRITICAL: Always register the new session FIRST
          this.registerUserSession(username, newClient);

          // Transfer combat state if needed
          if (inCombat) {
            // Explicitly preserve combat flag
            if (newClient.user) {
              newClient.user.inCombat = true;
              // Update user data store immediately
              this.updateUserStats(username, { inCombat: true });
            }

            // Notify combat system to transfer combat state
            try {
              const roomManager = RoomManager.getInstance(this.activeUserSessions);
              const combatSystem = CombatSystem.getInstance(this, roomManager);
              combatSystem.handleSessionTransfer(existingClient, newClient);
            } catch (error) {
              systemLogger.error('Error transferring combat state:', error);
            }
          }

          // Save user stats
          this.updateUserStats(username, { lastLogin: new Date() });

          // Inform new client they can proceed
          writeToClient(
            newClient,
            colorize('\r\n\r\nSession transfer approved. Logging in...\r\n', 'green')
          );

          // Transition new client to authenticated state
          newClient.stateData.transitionTo = ClientStateType.AUTHENTICATED;
        }
      }

      // Disconnect existing client after a longer delay
      // This ensures all combat processing has a chance to complete
      setTimeout(() => {
        systemLogger.info(`[UserManager] Disconnecting old client for ${username} after transfer`);
        // Only now mark the client as not authenticated
        existingClient.authenticated = false;
        existingClient.user = null;
        existingClient.connection.end();
      }, 7000); // Increased to 7 seconds
    } else {
      // Transfer denied - restore the new client to previous state
      newClient.stateData.waitingForTransfer = false;
      writeToClient(
        newClient,
        colorize('\r\n\r\nSession transfer was denied by the active user.\r\n', 'red')
      );
      newClient.stateData.transitionTo = ClientStateType.LOGIN;

      // Restore the existing client
      existingClient.state =
        existingClient.stateData.returnToState || ClientStateType.AUTHENTICATED;
      delete existingClient.stateData.interruptedBy;
      delete existingClient.stateData.transferClient;
      writeToClient(
        existingClient,
        colorize('\r\n\r\nYou denied the session transfer. Continuing your session.\r\n', 'green')
      );
    }

    // Clean up the pending transfer
    this.pendingTransfers.delete(lowerUsername);
  }

  // Cancel a pending transfer (e.g., if one of the clients disconnects)
  public cancelTransfer(username: string): void {
    const lowerUsername = username.toLowerCase();
    const newClient = this.pendingTransfers.get(lowerUsername);
    const existingClient = this.activeUserSessions.get(lowerUsername);

    if (newClient) {
      newClient.stateData.waitingForTransfer = false;
      writeToClient(newClient, colorize('\r\n\r\nSession transfer was cancelled.\r\n', 'red'));
      newClient.stateData.transitionTo = ClientStateType.LOGIN;
    }

    if (existingClient && existingClient.state === ClientStateType.TRANSFER_REQUEST) {
      // Restore the existing client to its previous state
      existingClient.state =
        existingClient.stateData.returnToState || ClientStateType.AUTHENTICATED;
      delete existingClient.stateData.interruptedBy;
      delete existingClient.stateData.transferClient;
      writeToClient(existingClient, colorize('\r\n\r\nTransfer request cancelled.\r\n', 'yellow'));
    }

    this.pendingTransfers.delete(lowerUsername);
  }

  public createUser(username: string, password: string): boolean {
    // Standardize the username to lowercase
    const standardized = standardizeUsername(username);

    if (this.userExists(standardized)) {
      return false;
    }

    // Validate username before creating
    if (!/^[a-zA-Z]+$/.test(standardized) || standardized.length >= 13 || standardized.length < 3) {
      return false;
    }

    const salt = this.generateSalt();
    const passwordHash = this.hashPassword(password, salt);

    const now = new Date();
    const newUser: User = {
      username: standardized,
      passwordHash,
      salt,
      health: 100,
      maxHealth: 100,
      mana: 100,
      maxMana: 100,
      experience: 0,
      level: 1,
      // Initialize character statistics
      strength: 10,
      dexterity: 10,
      agility: 10,
      constitution: 10,
      wisdom: 10,
      intelligence: 10,
      charisma: 10,
      // Initialize combat stats (will be recalculated based on equipment)
      attack: 5, // Base attack (strength/2)
      defense: 5, // Base defense (constitution/2)
      // Initialize empty equipment
      equipment: {},
      joinDate: now,
      lastLogin: now,
      currentRoomId: 'start', // Set default starting room
      inventory: {
        items: [],
        currency: { gold: 0, silver: 0, copper: 0 },
      },
      totalPlayTime: 0, // Initialize totalPlayTime to 0
    };

    this.users.push(newUser);
    this.saveUsers();
    return true;
  }

  public updateLastLogin(username: string): void {
    const user = this.getUser(username);
    if (user) {
      user.lastLogin = new Date();
      this.saveUsers();
    }
  }

  public updateUserStats(username: string, stats: Partial<User>): boolean {
    const user = this.getUser(username);
    if (!user) return false;

    // Handle isUnconscious property specially
    if (Object.prototype.hasOwnProperty.call(stats, 'isUnconscious')) {
      user.isUnconscious = stats.isUnconscious;
    }

    // Handle flags array properly
    if (stats.flags !== undefined) {
      // Ensure flags is an array
      if (!Array.isArray(stats.flags)) {
        systemLogger.warn(
          `[UserManager] Attempted to update flags with non-array value for ${username}. Ignoring.`
        );
        delete stats.flags; // Remove invalid flags from stats to avoid overwriting
      } else {
        // If the user doesn't have a flags array yet, initialize it
        if (!user.flags) {
          user.flags = [];
        }
        // Use the provided flags array
        user.flags = [...stats.flags];
        delete stats.flags; // Remove flags from stats to avoid double processing
      }
    }

    Object.assign(user, stats);
    this.saveUsers();
    return true;
  }

  public updateUserInventory(username: string, inventory: User['inventory']): boolean {
    const user = this.getUser(username);
    if (!user) return false;

    user.inventory = inventory;
    this.saveUsers();
    return true;
  }

  public deleteUser(username: string): boolean {
    const index = this.users.findIndex(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
    if (index === -1) return false;

    this.users.splice(index, 1);
    this.saveUsers();
    return true;
  }

  /**
   * Get all users
   * Used by admin API to get a list of all players
   */
  public getAllUsers(): User[] {
    return [...this.users];
  }

  // Add method to change password
  public changeUserPassword(username: string, newPassword: string): boolean {
    const user = this.getUser(username);

    if (!user) {
      return false;
    }

    const salt = this.generateSalt();
    const passwordHash = this.hashPassword(newPassword, salt);

    user.passwordHash = passwordHash;
    user.salt = salt;

    // Remove plain text password if it exists
    if (user.password) {
      delete user.password;
    }

    this.saveUsers();
    return true;
  }

  // Save a player's high score for the Snake game
  public saveHighScore(scoreData: { username: string; score: number }): void {
    if (!scoreData.username || scoreData.score <= 0) return;

    // Get the username in standardized form
    const username = standardizeUsername(scoreData.username);

    // Check if the user exists
    if (!this.userExists(username)) return;

    // Find existing score for this user
    const existingScoreIndex = this.snakeScores.findIndex((s) => s.username === username);

    if (existingScoreIndex >= 0) {
      // Only update if new score is higher
      if (scoreData.score > this.snakeScores[existingScoreIndex].score) {
        this.snakeScores[existingScoreIndex] = {
          username,
          score: scoreData.score,
          date: new Date(),
        };

        // Save to file
        this.saveSnakeScores();
        systemLogger.info(
          `[UserManager] Updated snake high score for ${username}: ${scoreData.score}`
        );
      }
    } else {
      // New high score for this user
      this.snakeScores.push({
        username,
        score: scoreData.score,
        date: new Date(),
      });

      // Save to file
      this.saveSnakeScores();
      systemLogger.info(
        `[UserManager] Added new snake high score for ${username}: ${scoreData.score}`
      );
    }
  }

  // Get all snake game high scores, sorted from highest to lowest
  public getSnakeHighScores(limit: number = 10): { username: string; score: number }[] {
    return this.snakeScores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((score) => ({
        username: score.username,
        score: score.score,
      }));
  }

  /**
   * Adds a flag to a user. Ensures no duplicates.
   * @param username The user to add the flag to
   * @param flag The flag string to add
   * @returns True if the flag was added, false otherwise (user not found or flag already exists)
   */
  public addFlag(username: string, flag: string): boolean {
    const user = this.getUser(username);
    if (!user) {
      systemLogger.error(`[UserManager] Cannot add flag: User ${username} not found.`);
      return false;
    }

    // Ensure flags array exists
    if (!user.flags) {
      user.flags = [];
    }

    // Check if flag already exists
    if (!user.flags.includes(flag)) {
      user.flags.push(flag);
      this.saveUsers();
      systemLogger.info(`[UserManager] Added flag '${flag}' to user ${username}.`);
      return true;
    } else {
      systemLogger.info(`[UserManager] Flag '${flag}' already exists for user ${username}.`);
      return false; // Indicate flag wasn't newly added
    }
  }

  /**
   * Removes a flag from a user.
   * @param username The user to remove the flag from
   * @param flag The flag string to remove
   * @returns True if the flag was removed, false otherwise (user not found or flag didn't exist)
   */
  public removeFlag(username: string, flag: string): boolean {
    const user = this.getUser(username);
    if (!user || !user.flags) {
      systemLogger.error(
        `[UserManager] Cannot remove flag: User ${username} not found or has no flags.`
      );
      return false;
    }

    const initialLength = user.flags.length;
    user.flags = user.flags.filter((f) => f !== flag);

    if (user.flags.length < initialLength) {
      this.saveUsers();
      systemLogger.info(`[UserManager] Removed flag '${flag}' from user ${username}.`);
      return true;
    } else {
      systemLogger.info(`[UserManager] Flag '${flag}' not found for user ${username}.`);
      return false; // Indicate flag wasn't found/removed
    }
  }

  /**
   * Checks if a user has a specific flag.
   * @param username The user to check
   * @param flag The flag string to check for
   * @returns True if the user has the flag, false otherwise
   */
  public hasFlag(username: string, flag: string): boolean {
    const user = this.getUser(username);
    return !!user?.flags?.includes(flag);
  }

  /**
   * Gets all flags for a user.
   * @param username The user to get flags for
   * @returns An array of flag strings, or empty array if user has no flags, or null if user not found
   */
  public getFlags(username: string): string[] | null {
    const user = this.getUser(username);
    if (!user) return null;
    return [...(user.flags || [])]; // Return a copy or empty array
  }

  /**
   * Updates a user object with new data
   * @param username The username of the user to update
   * @param updatedData The partial user data to apply
   * @returns True if the user was updated, false if user not found
   */
  public updateUser(username: string, updatedData: Partial<User>): boolean {
    const index = this.users.findIndex(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
    if (index === -1) return false;

    // Get the existing user
    const existingUser = this.users[index]; // Type: User

    // Merge the updated data onto the existing user, ensuring username is not changed
    const dataToMerge = { ...updatedData };
    delete dataToMerge.username; // Prevent username change via this method

    // Explicitly construct the updated user object to satisfy the User type
    const updatedUserObject: User = {
      ...existingUser, // Start with existing user properties
      ...dataToMerge, // Override with updated data (excluding username)
      username: existingUser.username, // Explicitly keep the original username (string)
    };

    // Apply the updates
    this.users[index] = updatedUserObject;

    // Save changes to disk
    this.saveUsers();
    return true;
  }

  /**
   * Gets a user by username - alias for getUser to improve code readability
   * @param username The username to find
   * @returns User object or undefined if not found
   */
  public getUserByUsername(username: string): User | undefined {
    return this.getUser(username);
  }

  /**
   * Updates a user's password
   * @param username The username of the user to update
   * @param newPassword The new password for the user
   * @returns True if the password was updated, false if user not found
   */
  public updateUserPassword(username: string, newPassword: string): boolean {
    return this.changeUserPassword(username, newPassword);
  }

  /**
   * Updates the total play time for a user.
   * @param username The username of the user to update
   * @param playTime The play time to add in milliseconds
   * @returns True if the play time was updated, false if user not found
   */
  public updateTotalPlayTime(username: string, playTime: number): boolean {
    const user = this.getUser(username);
    if (!user) return false;

    user.totalPlayTime = (user.totalPlayTime || 0) + playTime;
    this.saveUsers();
    return true;
  }
}
