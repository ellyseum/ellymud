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
    await redis.expire(this.getKey(sessionId), SESSION_TTL);
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

  async getAllSessionKeys(): Promise<string[]> {
    const redis = getRedisClient();
    return redis.keys(`${SESSION_PREFIX}*`);
  }
}
