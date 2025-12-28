import { SessionStore, SessionData } from './types';
import { systemLogger } from '../utils/logger';

const SESSION_TTL_MS = 3600 * 1000; // 1 hour

export class MemorySessionStore implements SessionStore {
  private sessions: Map<string, SessionData> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private finalizationRegistry: FinalizationRegistry<NodeJS.Timeout>;

  constructor() {
    // Use FinalizationRegistry to ensure cleanup on garbage collection
    this.finalizationRegistry = new FinalizationRegistry((interval: NodeJS.Timeout) => {
      clearInterval(interval);
      systemLogger.debug('MemorySessionStore: Cleanup timer cleared via finalization');
    });
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, session] of this.sessions) {
        if (now - session.lastActivity > SESSION_TTL_MS) {
          this.sessions.delete(id);
          systemLogger.debug('MemorySessionStore: Session expired', { sessionId: id });
        }
      }
    }, 60000); // Check every minute
    
    // Register the interval for automatic cleanup if the instance is garbage collected
    // The held value (interval) is passed to the cleanup callback when 'this' is GC'd
    if (this.cleanupInterval) {
      this.finalizationRegistry.register(this, this.cleanupInterval, this.cleanupInterval);
    }
  }

  async saveSession(sessionId: string, data: SessionData): Promise<void> {
    this.sessions.set(sessionId, { ...data, lastActivity: Date.now() });
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (Date.now() - session.lastActivity > SESSION_TTL_MS) {
      this.sessions.delete(sessionId);
      return null;
    }
    return session;
  }

  async refreshSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // ===== Implementation-specific utility methods (not part of SessionStore interface) =====
  // These methods are for testing and internal use only. Production code should only use
  // the SessionStore interface methods above.

  /**
   * Gets the current number of sessions in memory.
   * @internal - For testing and debugging only
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Clears all sessions from memory.
   * @internal - For testing only
   */
  clear(): void {
    this.sessions.clear();
  }

  /**
   * Stops the cleanup timer. Should be called before discarding instances.
   * Note: The FinalizationRegistry provides automatic cleanup as a fallback,
   * but explicit cleanup via this method is preferred for deterministic behavior.
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      // Unregister from finalization registry before manual cleanup
      this.finalizationRegistry.unregister(this.cleanupInterval);
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
