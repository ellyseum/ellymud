import { SessionStore, SessionData } from './types';
import { getRedisClient } from '../data/redis';
import { systemLogger } from '../utils/logger';

const SESSION_TTL = 3600;
const SESSION_PREFIX = 'session:';

export class RedisSessionStore implements SessionStore {
  private getKey(sessionId: string): string {
    return `${SESSION_PREFIX}${sessionId}`;
  }

  async saveSession(sessionId: string, data: SessionData): Promise<void> {
    const redis = getRedisClient();
    const serialized = JSON.stringify({ ...data, lastActivity: Date.now() });
    await redis.set(this.getKey(sessionId), serialized, 'EX', SESSION_TTL);
    systemLogger.debug('RedisSessionStore: Session saved', { sessionId });
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const redis = getRedisClient();
    const data = await redis.get(this.getKey(sessionId));
    if (!data) return null;
    return JSON.parse(data) as SessionData;
  }

  async refreshSession(sessionId: string): Promise<void> {
    const redis = getRedisClient();
    const key = this.getKey(sessionId);

    const data = await redis.get(key);
    if (!data) {
      // Session not found, preserve original behavior of just updating TTL if possible.
      await redis.expire(key, SESSION_TTL);
      return;
    }

    try {
      const session = JSON.parse(data) as SessionData & { lastActivity?: number };
      const updatedSession = { ...session, lastActivity: Date.now() };
      await redis.set(key, JSON.stringify(updatedSession), 'EX', SESSION_TTL);
      systemLogger.debug('RedisSessionStore: Session refreshed', { sessionId });
    } catch (error) {
      // If parsing fails or any other error occurs, fall back to original TTL refresh behavior.
      systemLogger.warn('RedisSessionStore: Failed to refresh session data, falling back to TTL-only refresh', {
        sessionId,
        error,
      });
      await redis.expire(key, SESSION_TTL);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const redis = getRedisClient();
    await redis.del(this.getKey(sessionId));
    systemLogger.debug('RedisSessionStore: Session deleted', { sessionId });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const redis = getRedisClient();
      return (await redis.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  // ===== Implementation-specific utility methods (not part of SessionStore interface) =====
  // These methods are for internal use and testing only.

  /**
   * Retrieves all session keys from Redis using SCAN.
   * @internal - For testing and admin purposes only. Use with caution in production.
   * @returns Array of session keys with the session: prefix
   */
  async getAllSessionKeys(): Promise<string[]> {
    const redis = getRedisClient();
    const pattern = `${SESSION_PREFIX}*`;
    let cursor = '0';
    const keys: string[] = [];

    do {
      const [nextCursor, batchKeys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 1000);
      cursor = nextCursor;
      if (Array.isArray(batchKeys) && batchKeys.length > 0) {
        keys.push(...batchKeys);
      }
    } while (cursor !== '0');

    return keys;
  }
}
