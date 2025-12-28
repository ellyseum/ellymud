import { RedisSessionStore } from './redisSessionStore';
import { SessionData } from './types';
import { resetRedisClient } from '../data/redis';

// Skip if no Redis available
const describeWithRedis = process.env.REDIS_URL ? describe : describe.skip;

describeWithRedis('RedisSessionStore (integration)', () => {
  let store: RedisSessionStore;

  beforeAll(() => {
    store = new RedisSessionStore();
  });

  afterAll(() => {
    resetRedisClient();
  });

  const createSession = (id: string): SessionData => ({
    username: 'testuser',
    sessionId: id,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  });

  it('should save and retrieve session', async () => {
    await store.saveSession('redis-test-1', createSession('redis-test-1'));
    const result = await store.getSession('redis-test-1');
    expect(result?.username).toBe('testuser');
    await store.deleteSession('redis-test-1');
  });

  it('should pass health check', async () => {
    expect(await store.healthCheck()).toBe(true);
  });

  it('should delete session', async () => {
    await store.saveSession('redis-test-2', createSession('redis-test-2'));
    await store.deleteSession('redis-test-2');
    expect(await store.getSession('redis-test-2')).toBeNull();
  });
});
