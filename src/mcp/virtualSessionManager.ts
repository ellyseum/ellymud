import { VirtualConnection } from '../connection/virtual.connection';
import { ClientManager } from '../client/clientManager';
import { ConnectedClient } from '../types';
import { mcpLogger } from '../utils/logger';

/**
 * VirtualSessionManager - Manages virtual game sessions for MCP/LLM interaction
 */
export class VirtualSessionManager {
  private sessions: Map<string, VirtualSession> = new Map();
  private clientManager: ClientManager;

  constructor(clientManager: ClientManager) {
    this.clientManager = clientManager;
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
      if (!session.isActive() || (now - session.getLastActivity()) > maxAgeMs) {
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
