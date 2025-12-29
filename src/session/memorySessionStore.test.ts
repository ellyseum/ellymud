import { MemorySessionStore } from './memorySessionStore';
import { SessionData } from './types';

describe('MemorySessionStore', () => {
  let store: MemorySessionStore;

  beforeEach(() => {
    store = new MemorySessionStore();
  });

  afterEach(() => {
    store.stopCleanup();
    store.clear();
  });

  const createSession = (id: string): SessionData => ({
    username: 'testuser',
    sessionId: id,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  });

  it('should save and retrieve session', async () => {
    await store.saveSession('test-1', createSession('test-1'));
    const result = await store.getSession('test-1');
    expect(result?.username).toBe('testuser');
  });

  it('should return null for non-existent session', async () => {
    expect(await store.getSession('missing')).toBeNull();
  });

  it('should delete session', async () => {
    await store.saveSession('test-1', createSession('test-1'));
    await store.deleteSession('test-1');
    expect(await store.getSession('test-1')).toBeNull();
  });

  it('should pass health check', async () => {
    expect(await store.healthCheck()).toBe(true);
  });

  it('should refresh session activity', async () => {
    await store.saveSession('test-1', createSession('test-1'));
    const before = (await store.getSession('test-1'))?.lastActivity;
    await new Promise((r) => setTimeout(r, 10));
    await store.refreshSession('test-1');
    const after = (await store.getSession('test-1'))?.lastActivity;
    expect(after).toBeGreaterThan(before!);
  });
});
