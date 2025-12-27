import { VirtualConnection } from '../connection/virtual.connection';
import { ClientManager } from '../client/clientManager';
import { UserManager } from '../user/userManager';
import { ConnectedClient, ClientStateType } from '../types';
import { mcpLogger } from '../utils/logger';
import crypto from 'crypto';

/**
 * VirtualSessionManager - Manages virtual game sessions for MCP/LLM interaction
 */
export class VirtualSessionManager {
  private sessions: Map<string, VirtualSession> = new Map();
  private clientManager: ClientManager;
  private userManager: UserManager;
  private tempUsers: Set<string>;

  constructor(clientManager: ClientManager, userManager: UserManager, tempUsers: Set<string>) {
    this.clientManager = clientManager;
    this.userManager = userManager;
    this.tempUsers = tempUsers;
  }

  /**
   * Create a temporary user for testing
   * Temp users are automatically deleted when server stops
   */
  createTempUser(username?: string): { username: string; password: string } {
    // Generate random username if not provided
    // Username must be letters only (3-12 chars) per game rules
    const finalUsername = username || this.generateRandomUsername();
    const password = crypto.randomBytes(8).toString('hex');

    // Validate username format (letters only, 3-12 chars)
    if (!/^[a-zA-Z]{3,12}$/.test(finalUsername)) {
      throw new Error(
        `Invalid username '${finalUsername}': must be 3-12 letters only (no numbers or special characters)`
      );
    }

    // Check if user already exists
    if (this.userManager.userExists(finalUsername)) {
      throw new Error(`User '${finalUsername}' already exists`);
    }

    // Create the user
    const success = this.userManager.createUser(finalUsername, password);
    if (!success) {
      throw new Error(`Failed to create temp user '${finalUsername}'`);
    }

    // Track as temp user for cleanup
    this.tempUsers.add(finalUsername.toLowerCase());
    mcpLogger.info(`Created temp user: ${finalUsername}`);

    return { username: finalUsername, password };
  }

  /**
   * Generate a random username using only letters (game requirement)
   */
  private generateRandomUsername(): string {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    let name = 'temp';
    for (let i = 0; i < 4; i++) {
      name += letters[Math.floor(Math.random() * letters.length)];
    }
    return name;
  }

  /**
   * Direct login - creates session and logs in user directly without password
   * If user doesn't exist, creates as temp user first
   * Session is returned ready for commands - use virtual_session_command to interact
   */
  directLogin(username: string, isAdmin?: boolean): VirtualSession {
    const lowerUsername = username.toLowerCase();

    // Validate username format if creating new user
    if (!this.userManager.userExists(lowerUsername)) {
      // Validate username format (letters only, 3-12 chars)
      if (!/^[a-zA-Z]{3,12}$/.test(lowerUsername)) {
        throw new Error(
          `Invalid username '${username}': must be 3-12 letters only (no numbers or special characters)`
        );
      }

      const password = crypto.randomBytes(8).toString('hex');
      const success = this.userManager.createUser(lowerUsername, password);
      if (!success) {
        throw new Error(`Failed to create temp user '${username}'`);
      }
      this.tempUsers.add(lowerUsername);
      mcpLogger.info(`Created temp user for direct login: ${username}`);
    }

    // Create virtual session
    const connection = new VirtualConnection();
    const client = this.clientManager.setupClient(connection);

    // Get the user and directly authenticate
    const user = this.userManager.getUser(lowerUsername);
    if (!user) {
      throw new Error(`User '${username}' not found after creation`);
    }

    // Grant admin flag if requested
    if (isAdmin) {
      if (!user.flags) {
        user.flags = [];
      }
      if (!user.flags.includes('admin')) {
        user.flags.push('admin');
        this.userManager.updateUserStats(lowerUsername, { flags: user.flags });
        mcpLogger.info(`Granted admin flag to user: ${username}`);
      }
    }

    // Set up the client as authenticated
    client.user = user;
    client.authenticated = true;
    client.state = ClientStateType.AUTHENTICATED;

    // Register user session
    this.userManager.updateLastLogin(lowerUsername);
    this.userManager.registerUserSession(lowerUsername, client);

    // Clear any login state data and output buffer
    client.stateData = {};
    connection.clearOutput();

    const session = new VirtualSession(connection, client);
    this.sessions.set(connection.getId(), session);

    mcpLogger.info(
      `Direct login session created for: ${username} (sessionId: ${connection.getId()})${isAdmin ? ' [ADMIN]' : ''}`
    );

    return session;
  }

  /**
   * Delete all temp users (called on server shutdown)
   */
  cleanupTempUsers(): number {
    let cleaned = 0;
    for (const username of this.tempUsers) {
      try {
        this.userManager.deleteUser(username);
        cleaned++;
        mcpLogger.info(`Deleted temp user: ${username}`);
      } catch (error) {
        mcpLogger.error(`Failed to delete temp user ${username}: ${error}`);
      }
    }
    this.tempUsers.clear();
    return cleaned;
  }

  /**
   * Create a new virtual session
   */
  createSession(sessionId?: string): VirtualSession {
    const connection = new VirtualConnection(sessionId);
    const client = this.clientManager.setupClient(connection);

    const session = new VirtualSession(connection, client);
    this.sessions.set(connection.getId(), session);

    mcpLogger.info(`Created virtual session: ${connection.getId()}`);
    return session;
  }

  /**
   * Get an existing session by ID
   */
  getSession(sessionId: string): VirtualSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Close a session
   */
  closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.close();
      this.sessions.delete(sessionId);
      mcpLogger.info(`Closed virtual session: ${sessionId}`);
      return true;
    }
    return false;
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): Map<string, VirtualSession> {
    return this.sessions;
  }

  /**
   * Clean up inactive sessions
   */
  cleanupInactiveSessions(maxAgeMs: number = 3600000): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (!session.isActive() || now - session.getLastActivity() > maxAgeMs) {
        this.closeSession(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      mcpLogger.info(`Cleaned up ${cleaned} inactive virtual sessions`);
    }

    return cleaned;
  }
}

/**
 * VirtualSession - Represents a single virtual game session
 */
export class VirtualSession {
  private connection: VirtualConnection;
  private client: ConnectedClient;
  private createdAt: number;
  private lastActivity: number;

  constructor(connection: VirtualConnection, client: ConnectedClient) {
    this.connection = connection;
    this.client = client;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
  }

  /**
   * Send a command to the game
   */
  sendCommand(command: string): void {
    this.lastActivity = Date.now();
    // Simulate telnet line ending
    this.connection.simulateInput(command + '\r\n');
  }

  /**
   * Get accumulated output since last retrieval
   */
  getOutput(clear: boolean = true): string {
    this.lastActivity = Date.now();
    return this.connection.getOutput(clear);
  }

  /**
   * Get output as lines
   */
  getOutputLines(clear: boolean = true): string[] {
    this.lastActivity = Date.now();
    return this.connection.getOutputLines(clear);
  }

  /**
   * Clear the output buffer
   */
  clearOutput(): void {
    this.connection.clearOutput();
  }

  /**
   * Get the session ID
   */
  getSessionId(): string {
    return this.connection.getId();
  }

  /**
   * Get the client object
   */
  getClient(): ConnectedClient {
    return this.client;
  }

  /**
   * Check if session is active
   */
  isActive(): boolean {
    return this.connection.isActive();
  }

  /**
   * Get last activity timestamp
   */
  getLastActivity(): number {
    return this.lastActivity;
  }

  /**
   * Get session info
   */
  getInfo() {
    return {
      sessionId: this.getSessionId(),
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      isActive: this.isActive(),
      username: this.client.user?.username || null,
      authenticated: this.client.authenticated,
      state: this.client.state,
      currentRoom: this.client.user?.currentRoomId || null,
      bufferSize: this.connection.getBufferSize(),
    };
  }

  /**
   * Close the session
   */
  close(): void {
    this.connection.end();
  }
}
