import { RedisSessionStore } from '../../src/session/redisSessionStore';
import { SessionData } from '../../src/session/types';
import { resetRedisClient } from '../../src/data/redis';

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

  it('should refresh session and update lastActivity', async () => {
    const sessionId = 'redis-test-refresh';
    await store.saveSession(sessionId, createSession(sessionId));

    const before = (await store.getSession(sessionId))?.lastActivity;
    expect(before).toBeDefined();

    // Wait a bit to ensure timestamp changes
    await new Promise((r) => setTimeout(r, 10));

    await store.refreshSession(sessionId);

    const after = (await store.getSession(sessionId))?.lastActivity;
    expect(after).toBeDefined();
    expect(after).toBeGreaterThan(before!);

    await store.deleteSession(sessionId);
  });

  it('should handle refreshSession for non-existent session gracefully', async () => {
    // Should not throw
    await expect(store.refreshSession('non-existent')).resolves.not.toThrow();
  });

  it('should retrieve all session keys using SCAN', async () => {
    // Create multiple sessions
    const sessionIds = ['redis-scan-1', 'redis-scan-2', 'redis-scan-3'];

    for (const id of sessionIds) {
      await store.saveSession(id, createSession(id));
    }

    // Get all keys
    const keys = await store.getAllSessionKeys();

    // Check that all our test sessions are present
    for (const id of sessionIds) {
      expect(keys).toContain(`session:${id}`);
    }

    // Cleanup
    for (const id of sessionIds) {
      await store.deleteSession(id);
    }
  });
});

// Note: Error handling tests for "Redis unavailable" scenarios are intentionally omitted.
// ioredis handles reconnection automatically with configurable retry strategies.
// This is the correct production behavior - commands are queued and retried.
// Testing error scenarios should be done at the unit level with mocked Redis clients.
