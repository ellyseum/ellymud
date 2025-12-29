import Redis from 'ioredis';
import { systemLogger } from '../utils/logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(redisUrl, {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        systemLogger.warn(`Redis connection retry #${times}, waiting ${delay}ms`);
        return delay;
      },
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

    redisClient.on('error', (err: Error) => systemLogger.error('Redis Error', { error: err.message }));
    redisClient.on('connect', () => systemLogger.info('Redis Connected'));
    redisClient.on('ready', () => systemLogger.info('Redis Ready'));

    // Explicitly initiate the connection when the client is first created.
    // This keeps the public API synchronous while avoiding fully lazy connection semantics.
    redisClient.connect().catch((err: Error) => {
      systemLogger.error('Failed to establish initial Redis connection', { error: err.message });
    });
  }
  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export function resetRedisClient(): void {
  if (redisClient) {
    redisClient.disconnect();
    redisClient = null;
  }
}
