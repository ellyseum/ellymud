import { SessionStore } from './types';
import { MemorySessionStore } from './memorySessionStore';
import { RedisSessionStore } from './redisSessionStore';
import { systemLogger } from '../utils/logger';

export function createSessionStore(): SessionStore {
  const useRedis = process.env.USE_REDIS === 'true';

  if (useRedis) {
    systemLogger.info('Session store: Using Redis backend');
    return new RedisSessionStore();
  }

  systemLogger.info('Session store: Using in-memory backend');
  return new MemorySessionStore();
}

export { MemorySessionStore } from './memorySessionStore';
export { RedisSessionStore } from './redisSessionStore';
export type { SessionStore, SessionData } from './types';
