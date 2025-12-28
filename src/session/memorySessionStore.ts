import { SessionStore, SessionData } from './types';
import { systemLogger } from '../utils/logger';

const SESSION_TTL_MS = 3600 * 1000; // 1 hour

export class MemorySessionStore implements SessionStore {
  private sessions: Map<string, SessionData> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
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

  getSessionCount(): number {
    return this.sessions.size;
  }

  clear(): void {
    this.sessions.clear();
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
