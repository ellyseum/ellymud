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
 * Remote MCP configuration
 */
interface RemoteConfig {
  mcpUrl: string;
  apiKey: string;
}

/**
 * TesterAgent - Programmatic interface for E2E testing.
 *
 * Supports two modes:
 * - **Embedded mode** (default): Creates and controls a local GameServer instance
 * - **Remote mode**: Connects to a running server via MCP HTTP API
 *
 * Mode is determined by the `MCP_URL` environment variable:
 * - If set → remote mode (connects to the specified MCP server)
 * - If not set → embedded mode (creates local server)
 *
 * @example Embedded mode (default)
 * ```typescript
 * const agent = await TesterAgent.create();
 * const sessionId = await agent.directLogin('testplayer');
 * agent.sendCommand(sessionId, 'look');
 * await agent.shutdown();
 * ```
 *
 * @example Remote mode (against Docker)
 * ```bash
 * MCP_URL=http://localhost:3100 ELLYMUD_MCP_API_KEY=<key> npm run test:e2e
 * ```
 */
export class TesterAgent {
  // Embedded mode properties
  private server?: GameServer;
  private sessionManager?: VirtualSessionManager;
  private timerManager?: GameTimerManager;
  private stateLoader?: StateLoader;
  private sessions: Map<string, VirtualSession> = new Map();

  // Remote mode properties
  private remoteConfig?: RemoteConfig;
  private remoteSessions: Map<string, string> = new Map(); // sessionId -> username
  private requestId: number = 1;

  // Mode flag
  private readonly isRemote: boolean;

  private constructor(isRemote: boolean) {
    this.isRemote = isRemote;
  }

  /**
   * Check if running in remote mode
   */
  static isRemoteMode(): boolean {
    return !!process.env.MCP_URL;
  }

  /**
   * Get description of the current test mode
   */
  static getModeDescription(): string {
    if (TesterAgent.isRemoteMode()) {
      return `Remote (${process.env.MCP_URL})`;
    }
    return 'Embedded';
  }

  /**
   * Create a TesterAgent - automatically selects embedded or remote mode
   * based on MCP_URL environment variable
   * @param options Test mode options (only used in embedded mode)
   */
  static async create(options: Partial<TestModeOptions> = {}): Promise<TesterAgent> {
    if (TesterAgent.isRemoteMode()) {
      return TesterAgent.createRemote();
    }
    return TesterAgent.createEmbedded(options);
  }

  /**
   * Create an embedded TesterAgent with a local server in test mode
   */
  private static async createEmbedded(
    options: Partial<TestModeOptions> = {}
  ): Promise<TesterAgent> {
    // Merge with defaults to get random high ports
    const testOptions = { ...getDefaultTestModeOptions(), ...options };

    // Apply test mode overrides BEFORE creating GameServer
    applyTestModeOverrides({
      silent: testOptions.silent,
      noColor: testOptions.noColor,
      noConsole: testOptions.noConsole,
      disableRemoteAdmin: testOptions.disableRemoteAdmin,
    });

    // Enable silent mode on logger BEFORE creating server
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

    const agent = new TesterAgent(false);
    agent.server = server;
    agent.sessionManager = server.getVirtualSessionManager();
    agent.timerManager = server.getGameTimerManager();
    agent.stateLoader = server.getStateLoader();
    return agent;
  }

  /**
   * Create a remote TesterAgent connected to an MCP server
   */
  private static async createRemote(): Promise<TesterAgent> {
    const agent = new TesterAgent(true);
    agent.remoteConfig = {
      mcpUrl: process.env.MCP_URL || 'http://localhost:3100',
      apiKey: process.env.ELLYMUD_MCP_API_KEY || 'test-api-key',
    };

    // Verify connectivity
    const health = await agent.callApi('/health');
    if (health.status !== 'ok') {
      throw new Error(`MCP server not healthy: ${JSON.stringify(health)}`);
    }

    // Enable test mode on remote server
    await agent.callTool('set_test_mode', { enabled: true });

    return agent;
  }

  // === Remote MCP Helpers ===

  private async callTool(
    toolName: string,
    args: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    if (!this.remoteConfig) throw new Error('Not in remote mode');

    const body = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };

    const response = await fetch(this.remoteConfig.mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.remoteConfig.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`MCP call failed: ${response.status} ${text}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(`MCP tool error: ${result.error.message || JSON.stringify(result.error)}`);
    }

    // Parse result from MCP response format
    if (result.result?.content?.[0]?.text) {
      try {
        return JSON.parse(result.result.content[0].text);
      } catch {
        return { text: result.result.content[0].text };
      }
    }

    return result.result || {};
  }

  private async callApi(
    path: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    if (!this.remoteConfig) throw new Error('Not in remote mode');

    const url = `${this.remoteConfig.mcpUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.remoteConfig.apiKey,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API call failed: ${response.status} ${text}`);
    }

    return response.json();
  }

  // === Shutdown ===

  /**
   * Shut down the test server/connection
   */
  async shutdown(): Promise<void> {
    if (this.isRemote) {
      // Close all remote sessions
      for (const [sessionId] of this.remoteSessions) {
        await this.closeSession(sessionId);
      }
      // Disable test mode
      await this.callTool('set_test_mode', { enabled: false });
    } else {
      // Close all local sessions
      for (const [sessionId] of this.sessions) {
        this.closeSession(sessionId);
      }
      await this.server!.stop();
    }
  }

  // === Time Control ===

  /**
   * Advance the game by N ticks
   * @param count Number of ticks to advance
   */
  advanceTicks(count: number): void | Promise<void> {
    if (this.isRemote) {
      return this.callTool('advance_game_ticks', { ticks: count }).then(() => {});
    }
    this.timerManager!.advanceTicks(count);
  }

  /**
   * Get the current tick count
   */
  getTickCount(): number | Promise<number> {
    if (this.isRemote) {
      return this.callTool('get_game_tick').then((r) => r.tickCount as number);
    }
    return this.timerManager!.getTickCount();
  }

  /**
   * Advance to the next regeneration tick (12 ticks = 1 regen cycle)
   */
  async advanceToRegen(): Promise<void> {
    const current = await this.getTickCount();
    const ticksToRegen = 12 - (current % 12);
    await this.advanceTicks(ticksToRegen);
  }

  // === Session Control ===

  /**
   * Create a new unauthenticated virtual session
   */
  async createSession(): Promise<string> {
    if (this.isRemote) {
      const result = await this.callTool('virtual_session_create');
      const sessionId = result.sessionId as string;
      this.remoteSessions.set(sessionId, '');
      return sessionId;
    }
    const session = this.sessionManager!.createSession();
    this.sessions.set(session.getSessionId(), session);
    return session.getSessionId();
  }

  /**
   * Create a session and directly login as the specified user
   * If the user doesn't exist, creates them as a temp user
   * @param username Username to login as
   * @param isAdmin Whether to grant admin privileges (default: false)
   */
  async directLogin(username: string, isAdmin: boolean = false): Promise<string> {
    if (this.isRemote) {
      const result = await this.callTool('direct_login', { username, isAdmin });
      const sessionId = result.sessionId as string;
      this.remoteSessions.set(sessionId, username);
      return sessionId;
    }
    const session = this.sessionManager!.directLogin(username, isAdmin);
    this.sessions.set(session.getSessionId(), session);
    return session.getSessionId();
  }

  /**
   * Send a command to a session and return any immediate output
   * @param sessionId Session ID
   * @param command Command to send
   */
  sendCommand(sessionId: string, command: string): string | Promise<string> {
    if (this.isRemote) {
      return this.callTool('virtual_session_command', { sessionId, command, waitMs: 200 }).then(
        (r) => (r.output as string) || ''
      );
    }
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    session.sendCommand(command);
    return session.getOutput(true);
  }

  /**
   * Get output from a session
   * @param sessionId Session ID
   * @param clear Whether to clear the output buffer (default: true)
   */
  getOutput(sessionId: string, clear: boolean = true): string | Promise<string> {
    if (this.isRemote) {
      return this.callTool('tail_user_session', {
        username: this.remoteSessions.get(sessionId),
        lines: 50,
      }).then((r) => (r.output as string) || '');
    }
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    return session.getOutput(clear);
  }

  /**
   * Close a virtual session
   * @param sessionId Session ID
   */
  closeSession(sessionId: string): void | Promise<void> {
    if (this.isRemote) {
      this.remoteSessions.delete(sessionId);
      return this.callTool('virtual_session_close', { sessionId }).then(() => {});
    }
    const session = this.sessions.get(sessionId);
    if (session) {
      session.close();
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Get a session's client object (embedded mode only)
   * @param sessionId Session ID
   */
  getSession(sessionId: string): VirtualSession | undefined {
    if (this.isRemote) {
      throw new Error('getSession() not available in remote mode');
    }
    return this.sessions.get(sessionId);
  }

  // === State Control ===

  /**
   * Load a named snapshot, replacing current game state
   * @param name Snapshot name (e.g., "fresh", "combat-ready")
   */
  async loadSnapshot(name: string): Promise<void> {
    if (this.isRemote) {
      await this.callTool('load_test_snapshot', { name });
      return;
    }
    await this.stateLoader!.loadSnapshot(name);
  }

  /**
   * Save current state as a named snapshot
   * @param name Name for the snapshot
   */
  async saveSnapshot(name: string): Promise<void> {
    if (this.isRemote) {
      await this.callTool('save_test_snapshot', { name });
      return;
    }
    await this.stateLoader!.saveSnapshot(name);
  }

  /**
   * Reset to clean state by loading the 'fresh' snapshot
   */
  async resetToClean(): Promise<void> {
    if (this.isRemote) {
      await this.callTool('reset_game_state');
      return;
    }
    await this.stateLoader!.resetToClean();
  }

  /**
   * List available test snapshots
   */
  listSnapshots(): string[] | Promise<string[]> {
    if (this.isRemote) {
      return this.callTool('list_test_snapshots').then((r) => (r.snapshots as string[]) || []);
    }
    return this.stateLoader!.listSnapshots();
  }

  // === Player Helpers ===

  /**
   * Get player stats for a session (embedded) or by username (remote)
   * @param sessionIdOrUsername Session ID (embedded) or username (remote)
   */
  getPlayerStats(sessionIdOrUsername: string): PlayerStats | Promise<PlayerStats> {
    if (this.isRemote) {
      // In remote mode, sessionIdOrUsername is the username
      const username = this.remoteSessions.get(sessionIdOrUsername) || sessionIdOrUsername;
      return this.callTool('get_user_data', { username }).then((r) => {
        // Type assertion for the User object returned by get_user_data
        const userData = r as {
          health: number;
          maxHealth: number;
          mana: number;
          maxMana: number;
          experience: number;
          level: number;
          inventory?: { currency?: { gold?: number } };
        };
        return {
          health: userData.health,
          maxHealth: userData.maxHealth,
          mana: userData.mana,
          maxMana: userData.maxMana,
          gold: userData.inventory?.currency?.gold ?? 0,
          experience: userData.experience,
          level: userData.level,
        };
      });
    }
    const session = this.sessions.get(sessionIdOrUsername);
    if (!session) throw new Error(`Session ${sessionIdOrUsername} not found`);
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
   * @param sessionIdOrUsername Session ID (embedded) or username (remote)
   * @param stats Partial stats to set
   */
  setPlayerStats(sessionIdOrUsername: string, stats: Partial<PlayerStats>): void | Promise<void> {
    if (this.isRemote) {
      const username = this.remoteSessions.get(sessionIdOrUsername) || sessionIdOrUsername;
      return this.callTool('set_player_stats', { username, ...stats }).then(() => {});
    }
    const session = this.sessions.get(sessionIdOrUsername);
    if (!session) throw new Error(`Session ${sessionIdOrUsername} not found`);
    const user = session.getClient().user;
    if (!user) throw new Error('Session not authenticated');

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
  teleportTo(sessionId: string, roomId: string): void | Promise<void> {
    if (this.isRemote) {
      // Get the username for this session, then use teleport_player MCP tool
      const username = this.remoteSessions.get(sessionId);
      if (!username) throw new Error(`Session ${sessionId} not found`);

      return this.callTool('teleport_player', { username, roomId }).then(() => {
        // No return needed, just void
      });
    }
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
   * Get the underlying GameServer instance (embedded mode only)
   */
  getServer(): GameServer {
    if (this.isRemote) {
      throw new Error('getServer() not available in remote mode');
    }
    return this.server!;
  }

  // === NPC Helpers ===

  /**
   * Get all NPC templates from the cache
   */
  getAllNpcTemplates(): NPCData[] | Promise<NPCData[]> {
    if (this.isRemote) {
      return this.callTool('get_all_npcs').then((r) => (r.npcs as NPCData[]) || []);
    }
    const npcMap = NPC.loadNPCData();
    return Array.from(npcMap.values());
  }

  /**
   * Get an NPC template by ID
   * @param id Template ID
   */
  getNpcTemplateById(id: string): NPCData | undefined | Promise<NPCData | undefined> {
    if (this.isRemote) {
      // In remote mode, fetch all NPCs and filter by ID
      return this.callTool('get_all_npcs').then((result) => {
        const npcs = (result.npcs || []) as NPCData[];
        return npcs.find((npc) => npc.id === id);
      });
    }
    const npcMap = NPC.loadNPCData();
    return npcMap.get(id);
  }

  /**
   * Get all hostile NPC templates
   */
  getHostileNpcTemplates(): NPCData[] | Promise<NPCData[]> {
    if (this.isRemote) {
      return this.callTool('get_all_npcs').then((result) => {
        const npcs = (result.npcs || []) as NPCData[];
        return npcs.filter((npc) => npc.isHostile);
      });
    }
    return (this.getAllNpcTemplates() as NPCData[]).filter((npc) => npc.isHostile);
  }

  /**
   * Get all merchant NPC templates
   */
  getMerchantNpcTemplates(): NPCData[] | Promise<NPCData[]> {
    if (this.isRemote) {
      return this.callTool('get_all_npcs').then((result) => {
        const npcs = (result.npcs || []) as NPCData[];
        return npcs.filter((npc) => npc.merchant === true);
      });
    }
    return (this.getAllNpcTemplates() as NPCData[]).filter((npc) => npc.merchant === true);
  }

  // === Room & Combat Helpers ===

  /**
   * Get NPCs currently in a room (live instances, not templates)
   * @param roomId Room ID to check
   */
  getRoomNpcs(roomId: string):
    | Array<{
        instanceId: string;
        templateId: string;
        name: string;
        health: number;
        maxHealth: number;
        isHostile: boolean;
      }>
    | Promise<
        Array<{
          instanceId: string;
          templateId: string;
          name: string;
          health: number;
          maxHealth: number;
          isHostile: boolean;
        }>
      > {
    if (this.isRemote) {
      // Use get_room_data MCP tool which returns npcs array
      return this.callTool('get_room_data', { roomId }).then((result) => {
        return (result.npcs || []) as Array<{
          instanceId: string;
          templateId: string;
          name: string;
          health: number;
          maxHealth: number;
          isHostile: boolean;
        }>;
      });
    }
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
  isInCombat(sessionId: string): boolean | Promise<boolean> {
    if (this.isRemote) {
      // Get the username for this session, then check user data
      const username = this.remoteSessions.get(sessionId);
      if (!username) return Promise.resolve(false);

      return this.callTool('get_user_data', { username }).then((userData) => {
        return userData.inCombat === true;
      });
    }
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const client = session.getClient();
    return client?.user?.inCombat === true;
  }

  /**
   * Get the current room ID for a session
   * @param sessionId Session ID
   */
  getCurrentRoomId(sessionId: string): string | undefined | Promise<string | undefined> {
    if (this.isRemote) {
      // Get the username for this session, then check user data
      const username = this.remoteSessions.get(sessionId);
      if (!username) return Promise.resolve(undefined);

      return this.callTool('get_user_data', { username }).then((userData) => {
        return userData.currentRoomId as string | undefined;
      });
    }
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    const client = session.getClient();
    return client?.user?.currentRoomId;
  }

  /**
   * Set the health of an NPC instance in a room
   * @param roomId Room ID where the NPC is located
   * @param instanceId The NPC's instance ID
   * @param health The health value to set
   */
  setNpcHealth(roomId: string, instanceId: string, health: number): void | Promise<void> {
    if (this.isRemote) {
      return this.callTool('set_npc_health', { roomId, instanceId, health }).then(() => {
        // No return needed, just void
      });
    }
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
  getRoomItems(
    roomId: string
  ):
    | Array<{ instanceId: string; templateId: string }>
    | Promise<Array<{ instanceId: string; templateId: string }>> {
    if (this.isRemote) {
      // Use get_room_data MCP tool which returns itemInstances array
      return this.callTool('get_room_data', { roomId }).then((result) => {
        return (result.itemInstances || []) as Array<{ instanceId: string; templateId: string }>;
      });
    }
    const roomManager = RoomManager.getInstance(new Map());
    const room = roomManager.getRoom(roomId);
    if (!room) return [];

    return Array.from(room.getItemInstances().entries()).map(([instanceId, templateId]) => ({
      instanceId,
      templateId,
    }));
  }

  /**
   * Get floor currency in a room
   * @param roomId Room ID to check
   */
  getRoomCurrency(
    roomId: string
  ):
    | { gold: number; silver: number; copper: number }
    | Promise<{ gold: number; silver: number; copper: number }> {
    if (this.isRemote) {
      // Use get_room_data MCP tool which returns currency
      return this.callTool('get_room_data', { roomId }).then((result) => {
        return (result.currency || { gold: 0, silver: 0, copper: 0 }) as {
          gold: number;
          silver: number;
          copper: number;
        };
      });
    }
    const roomManager = RoomManager.getInstance(new Map());
    const room = roomManager.getRoom(roomId);
    if (!room) return { gold: 0, silver: 0, copper: 0 };
    return room.currency;
  }

  // === Data Query Helpers ===

  /**
   * Get all rooms
   */
  getAllRooms(): Array<Record<string, unknown>> | Promise<Array<Record<string, unknown>>> {
    if (this.isRemote) {
      return this.callTool('get_all_rooms').then(
        (r) => (r.rooms as Array<Record<string, unknown>>) || []
      );
    }
    const roomManager = RoomManager.getInstance(new Map());
    return roomManager.getAllRooms().map((room) => ({
      id: room.id,
      name: room.name,
      description: room.description,
      exits: room.exits,
    }));
  }

  /**
   * Get all item templates
   */
  getAllItemTemplates(): Array<Record<string, unknown>> | Promise<Array<Record<string, unknown>>> {
    if (this.isRemote) {
      return this.callTool('get_all_items').then(
        (r) => (r.items as Array<Record<string, unknown>>) || []
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ItemManager = require('../utils/itemManager').ItemManager;
    const itemManager = ItemManager.getInstance();
    return itemManager.getAllItems().map((item: Record<string, unknown>) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      description: item.description,
    }));
  }

  /**
   * Get online users
   */
  getOnlineUsers(): Array<Record<string, unknown>> | Promise<Array<Record<string, unknown>>> {
    if (this.isRemote) {
      return this.callTool('get_online_users').then(
        (r) => (r.users as Array<Record<string, unknown>>) || []
      );
    }
    const result: Array<Record<string, unknown>> = [];
    for (const [, session] of this.sessions) {
      const client = session.getClient();
      if (client.user) {
        result.push({
          username: client.user.username,
          currentRoomId: client.user.currentRoomId,
          level: client.user.level,
        });
      }
    }
    return result;
  }

  /**
   * Get game configuration
   */
  getGameConfig(): Record<string, unknown> | Promise<Record<string, unknown>> {
    if (this.isRemote) {
      return this.callTool('get_game_config');
    }
    return {
      game: {
        name: 'EllyMUD',
        version: '1.0.0',
      },
      timer: {
        tickCount: this.timerManager!.getTickCount(),
        regenTicks: 12,
      },
    };
  }

  /**
   * Get combat state information
   */
  getCombatState(): Record<string, unknown> | Promise<Record<string, unknown>> {
    if (this.isRemote) {
      return this.callTool('get_combat_state');
    }
    // Embedded mode: return basic combat info
    return {
      activeCombats: 0,
      description: 'Combat state in embedded mode',
    };
  }

  /**
   * Get room data by ID
   * @param roomId Room ID
   */
  getRoomData(roomId: string): Record<string, unknown> | Promise<Record<string, unknown>> {
    if (this.isRemote) {
      return this.callTool('get_room_data', { roomId });
    }
    const roomManager = RoomManager.getInstance(new Map());
    const room = roomManager.getRoom(roomId);
    if (!room) {
      return { error: `Room ${roomId} not found` };
    }
    return {
      id: room.id,
      name: room.name,
      description: room.description,
      exits: room.exits,
      npcs: Array.from(room.npcs.entries()).map(([id, npc]) => ({
        instanceId: id,
        name: npc.name,
        health: npc.health,
      })),
    };
  }
}
