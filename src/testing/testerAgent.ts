import { GameServer } from '../app';
import { applyTestModeOverrides } from '../config';
import { VirtualSessionManager, VirtualSession } from '../mcp/virtualSessionManager';
import { GameTimerManager } from '../timer/gameTimerManager';
import { enableSilentMode } from '../utils/logger';
import { StateLoader } from './stateLoader';
import { TestModeOptions, getDefaultTestModeOptions } from './testMode';
import { NPC, NPCData } from '../combat/npc';
import { RoomManager } from '../room/roomManager';

/**
 * Player stats interface for test manipulation
 */
export interface PlayerStats {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  gold: number;
  experience: number;
  level: number;
}

/**
 * TesterAgent - Programmatic interface for E2E testing.
 * Provides the same capabilities as MCP tools but callable from Jest.
 *
 * @example
 * ```typescript
 * const agent = await TesterAgent.create();
 * const sessionId = await agent.directLogin('testplayer');
 * agent.sendCommand(sessionId, 'look');
 * const output = agent.getOutput(sessionId);
 * agent.advanceTicks(12); // Advance 12 game ticks
 * await agent.shutdown();
 * ```
 */
export class TesterAgent {
  private server: GameServer;
  private sessionManager: VirtualSessionManager;
  private timerManager: GameTimerManager;
  private stateLoader: StateLoader;
  private sessions: Map<string, VirtualSession> = new Map();

  private constructor(server: GameServer) {
    this.server = server;
    this.sessionManager = server.getVirtualSessionManager();
    this.timerManager = server.getGameTimerManager();
    this.stateLoader = server.getStateLoader();
  }

  /**
   * Create a TesterAgent with a server in test mode
   * @param options Test mode options
   */
  static async create(options: Partial<TestModeOptions> = {}): Promise<TesterAgent> {
    // Merge with defaults to get random high ports
    const testOptions = { ...getDefaultTestModeOptions(), ...options };

    // Apply test mode overrides BEFORE creating GameServer
    // This suppresses console output during manager initialization
    applyTestModeOverrides({
      silent: testOptions.silent,
      noColor: testOptions.noColor,
      noConsole: testOptions.noConsole,
      disableRemoteAdmin: testOptions.disableRemoteAdmin,
    });

    // Enable silent mode on logger BEFORE creating server
    // This removes console transports before managers start logging
    if (testOptions.silent) {
      enableSilentMode();
    }

    // Create server with test ports
    const server = new GameServer({
      telnetPort: testOptions.telnetPort,
      httpPort: testOptions.httpPort,
      mcpPort: testOptions.mcpPort,
    });
    await server.bootTestMode(testOptions);
    return new TesterAgent(server);
  }

  /**
   * Shut down the test server
   */
  async shutdown(): Promise<void> {
    // Close all sessions first
    for (const [sessionId] of this.sessions) {
      this.closeSession(sessionId);
    }
    await this.server.stop();
  }

  // === Time Control ===

  /**
   * Advance the game by N ticks synchronously
   * @param count Number of ticks to advance
   */
  advanceTicks(count: number): void {
    this.timerManager.advanceTicks(count);
  }

  /**
   * Get the current tick count
   */
  getTickCount(): number {
    return this.timerManager.getTickCount();
  }

  /**
   * Advance to the next regeneration tick (12 ticks = 1 regen cycle)
   */
  advanceToRegen(): void {
    const current = this.timerManager.getTickCount();
    const ticksToRegen = 12 - (current % 12);
    this.advanceTicks(ticksToRegen);
  }

  // === Session Control ===

  /**
   * Create a new unauthenticated virtual session
   */
  async createSession(): Promise<string> {
    const session = this.sessionManager.createSession();
    this.sessions.set(session.getSessionId(), session);
    return session.getSessionId();
  }

  /**
   * Create a session and directly login as the specified user
   * If the user doesn't exist, creates them as a temp user
   * @param username Username to login as
   */
  async directLogin(username: string): Promise<string> {
    const session = this.sessionManager.directLogin(username);
    this.sessions.set(session.getSessionId(), session);
    return session.getSessionId();
  }

  /**
   * Send a command to a session and return any immediate output
   * @param sessionId Session ID
   * @param command Command to send
   */
  sendCommand(sessionId: string, command: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    session.sendCommand(command);
    // Return accumulated output
    return session.getOutput(true);
  }

  /**
   * Get output from a session
   * @param sessionId Session ID
   * @param clear Whether to clear the output buffer (default: true)
   */
  getOutput(sessionId: string, clear: boolean = true): string {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    return session.getOutput(clear);
  }

  /**
   * Close a virtual session
   * @param sessionId Session ID
   */
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.close();
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Get a session's client object
   * @param sessionId Session ID
   */
  getSession(sessionId: string): VirtualSession | undefined {
    return this.sessions.get(sessionId);
  }

  // === State Control ===

  /**
   * Load a named snapshot, replacing current game state
   * @param name Snapshot name (e.g., "fresh", "combat-ready")
   */
  async loadSnapshot(name: string): Promise<void> {
    await this.stateLoader.loadSnapshot(name);
  }

  /**
   * Save current state as a named snapshot
   * @param name Name for the snapshot
   */
  async saveSnapshot(name: string): Promise<void> {
    await this.stateLoader.saveSnapshot(name);
  }

  /**
   * Reset to clean state by loading the 'fresh' snapshot
   */
  async resetToClean(): Promise<void> {
    await this.stateLoader.resetToClean();
  }

  // === Player Helpers ===

  /**
   * Get player stats for a session
   * @param sessionId Session ID
   */
  getPlayerStats(sessionId: string): PlayerStats {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    const user = session.getClient().user;
    if (!user) throw new Error('Session not authenticated');
    return {
      health: user.health,
      maxHealth: user.maxHealth,
      mana: user.mana,
      maxMana: user.maxMana,
      gold: user.inventory.currency.gold,
      experience: user.experience,
      level: user.level,
    };
  }

  /**
   * Set player stats for testing purposes
   * @param sessionId Session ID
   * @param stats Partial stats to set
   */
  setPlayerStats(sessionId: string, stats: Partial<PlayerStats>): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    const user = session.getClient().user;
    if (!user) throw new Error('Session not authenticated');

    // Apply stats to user object
    if (stats.health !== undefined) user.health = stats.health;
    if (stats.maxHealth !== undefined) user.maxHealth = stats.maxHealth;
    if (stats.mana !== undefined) user.mana = stats.mana;
    if (stats.maxMana !== undefined) user.maxMana = stats.maxMana;
    if (stats.experience !== undefined) user.experience = stats.experience;
    if (stats.level !== undefined) user.level = stats.level;
    if (stats.gold !== undefined) user.inventory.currency.gold = stats.gold;
  }

  /**
   * Teleport player instantly to a room (bypasses movement delay)
   * @param sessionId Session ID
   * @param roomId Target room ID
   */
  teleportTo(sessionId: string, roomId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    const client = session.getClient();
    const user = client.user;
    if (!user) throw new Error('Session not authenticated');

    const roomManager = RoomManager.getInstance(new Map());
    const targetRoom = roomManager.getRoom(roomId);
    if (!targetRoom) throw new Error(`Room ${roomId} not found`);

    // Remove from current room
    if (user.currentRoomId) {
      const currentRoom = roomManager.getRoom(user.currentRoomId);
      if (currentRoom) {
        currentRoom.removePlayer(user.username);
      }
    }

    // Add to target room
    targetRoom.addPlayer(user.username);
    user.currentRoomId = roomId;
  }

  /**
   * Get the underlying GameServer instance (for advanced testing)
   */
  getServer(): GameServer {
    return this.server;
  }

  // === NPC Helpers ===

  /**
   * Get all NPC templates from the cache
   */
  getAllNpcTemplates(): NPCData[] {
    const npcMap = NPC.loadNPCData();
    return Array.from(npcMap.values());
  }

  /**
   * Get an NPC template by ID
   * @param id Template ID
   */
  getNpcTemplateById(id: string): NPCData | undefined {
    const npcMap = NPC.loadNPCData();
    return npcMap.get(id);
  }

  /**
   * Get all hostile NPC templates
   */
  getHostileNpcTemplates(): NPCData[] {
    return this.getAllNpcTemplates().filter((npc) => npc.isHostile);
  }

  /**
   * Get all merchant NPC templates
   */
  getMerchantNpcTemplates(): NPCData[] {
    return this.getAllNpcTemplates().filter((npc) => npc.merchant === true);
  }

  // === Room & Combat Helpers ===

  /**
   * Get NPCs currently in a room (live instances, not templates)
   * @param roomId Room ID to check
   */
  getRoomNpcs(roomId: string): Array<{
    instanceId: string;
    templateId: string;
    name: string;
    health: number;
    maxHealth: number;
    isHostile: boolean;
  }> {
    const roomManager = RoomManager.getInstance(new Map());
    const room = roomManager.getRoom(roomId);
    if (!room) return [];

    return Array.from(room.npcs.entries()).map(([id, npc]) => ({
      instanceId: id,
      templateId: npc.templateId,
      name: npc.name,
      health: npc.health,
      maxHealth: npc.maxHealth,
      isHostile: npc.isHostile,
    }));
  }

  /**
   * Check if a player is currently in combat
   * @param sessionId Session ID
   */
  isInCombat(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const client = session.getClient();
    return client?.user?.inCombat === true;
  }

  /**
   * Get the current room ID for a session
   * @param sessionId Session ID
   */
  getCurrentRoomId(sessionId: string): string | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    const client = session.getClient();
    return client?.user?.currentRoomId;
  }

  /**
   * Set the health of an NPC instance in a room (for faster test execution)
   * @param roomId Room ID where the NPC is located
   * @param instanceId The NPC's instance ID
   * @param health The health value to set
   */
  setNpcHealth(roomId: string, instanceId: string, health: number): void {
    const roomManager = RoomManager.getInstance(new Map());
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const npc = room.npcs.get(instanceId);
    if (npc) {
      npc.health = health;
    }
  }

  /**
   * Get item instances in a room (dropped items)
   * @param roomId Room ID to check
   */
  getRoomItems(roomId: string): Array<{ instanceId: string; templateId: string }> {
    const roomManager = RoomManager.getInstance(new Map());
    const room = roomManager.getRoom(roomId);
    if (!room) return [];

    return Array.from(room.getItemInstances().entries()).map(([instanceId, templateId]) => ({
      instanceId,
      templateId,
    }));
  }

  /**
   * Get floor currency in a room (returns total gold value)
   * @param roomId Room ID to check
   */
  getRoomCurrency(roomId: string): { gold: number; silver: number; copper: number } {
    const roomManager = RoomManager.getInstance(new Map());
    const room = roomManager.getRoom(roomId);
    if (!room) return { gold: 0, silver: 0, copper: 0 };
    return room.currency;
  }
}
