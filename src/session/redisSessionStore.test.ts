/**
 * Unit tests for RedisSessionStore
 * Mocks the Redis client to test logic without requiring a real Redis instance
 */

import { RedisSessionStore } from './redisSessionStore';
import { SessionData } from './types';

// Mock the redis module
const mockRedisClient = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  expire: jest.fn(),
  ping: jest.fn(),
  scan: jest.fn(),
};

jest.mock('../data/redis', () => ({
  getRedisClient: jest.fn(() => mockRedisClient),
}));

// Mock the logger to avoid noise in tests
jest.mock('../utils/logger', () => ({
  systemLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('RedisSessionStore', () => {
  let store: RedisSessionStore;

  const createSession = (id: string): SessionData => ({
    username: 'testuser',
    sessionId: id,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  });

  beforeEach(() => {
    store = new RedisSessionStore();
    jest.clearAllMocks();
  });

  describe('saveSession', () => {
    it('should save session with correct key and TTL', async () => {
      const sessionId = 'test-session-1';
      const sessionData = createSession(sessionId);

      mockRedisClient.set.mockResolvedValue('OK');

      await store.saveSession(sessionId, sessionData);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'session:test-session-1',
        expect.any(String),
        'EX',
        3600
      );

      // Verify the serialized data contains expected fields
      const serializedData = mockRedisClient.set.mock.calls[0][1];
      const parsed = JSON.parse(serializedData);
      expect(parsed.username).toBe('testuser');
      expect(parsed.sessionId).toBe(sessionId);
      expect(parsed.lastActivity).toBeDefined();
    });
  });

  describe('getSession', () => {
    it('should return session data when found', async () => {
      const sessionId = 'test-session-2';
      const sessionData = createSession(sessionId);

      mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionData));

      const result = await store.getSession(sessionId);

      expect(mockRedisClient.get).toHaveBeenCalledWith('session:test-session-2');
      expect(result).toEqual(sessionData);
    });

    it('should return null when session not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await store.getSession('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('refreshSession', () => {
    it('should update lastActivity and reset TTL when session exists', async () => {
      const sessionId = 'test-session-3';
      const sessionData = createSession(sessionId);
      const originalLastActivity = sessionData.lastActivity;

      mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionData));
      mockRedisClient.set.mockResolvedValue('OK');

      // Wait a tiny bit to ensure timestamp changes
      await new Promise((r) => setTimeout(r, 5));

      await store.refreshSession(sessionId);

      expect(mockRedisClient.get).toHaveBeenCalledWith('session:test-session-3');
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'session:test-session-3',
        expect.any(String),
        'EX',
        3600
      );

      // Verify lastActivity was updated
      const serializedData = mockRedisClient.set.mock.calls[0][1];
      const parsed = JSON.parse(serializedData);
      expect(parsed.lastActivity).toBeGreaterThanOrEqual(originalLastActivity);
    });

    it('should fall back to TTL-only refresh when session not found', async () => {
      const sessionId = 'non-existent-session';

      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.expire.mockResolvedValue(0);

      await store.refreshSession(sessionId);

      expect(mockRedisClient.expire).toHaveBeenCalledWith('session:non-existent-session', 3600);
    });

    it('should fall back to TTL-only refresh on parse error', async () => {
      const sessionId = 'bad-data-session';

      mockRedisClient.get.mockResolvedValue('not-valid-json');
      mockRedisClient.expire.mockResolvedValue(1);

      await store.refreshSession(sessionId);

      expect(mockRedisClient.expire).toHaveBeenCalledWith('session:bad-data-session', 3600);
    });
  });

  describe('deleteSession', () => {
    it('should delete session by key', async () => {
      const sessionId = 'test-session-4';

      mockRedisClient.del.mockResolvedValue(1);

      await store.deleteSession(sessionId);

      expect(mockRedisClient.del).toHaveBeenCalledWith('session:test-session-4');
    });
  });

  describe('healthCheck', () => {
    it('should return true when Redis responds with PONG', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await store.healthCheck();

      expect(result).toBe(true);
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    it('should return false when Redis does not respond with PONG', async () => {
      mockRedisClient.ping.mockResolvedValue('something-else');

      const result = await store.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false when Redis throws an error', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection refused'));

      const result = await store.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('getAllSessionKeys', () => {
    it('should return all session keys using SCAN', async () => {
      // Simulate SCAN returning keys in batches
      mockRedisClient.scan
        .mockResolvedValueOnce(['1', ['session:user1', 'session:user2']])
        .mockResolvedValueOnce(['0', ['session:user3']]);

      const keys = await store.getAllSessionKeys();

      expect(keys).toEqual(['session:user1', 'session:user2', 'session:user3']);
      expect(mockRedisClient.scan).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.scan).toHaveBeenCalledWith('0', 'MATCH', 'session:*', 'COUNT', 1000);
    });

    it('should return empty array when no sessions exist', async () => {
      mockRedisClient.scan.mockResolvedValueOnce(['0', []]);

      const keys = await store.getAllSessionKeys();

      expect(keys).toEqual([]);
    });

    it('should handle single batch result', async () => {
      mockRedisClient.scan.mockResolvedValueOnce(['0', ['session:only-one']]);

      const keys = await store.getAllSessionKeys();

      expect(keys).toEqual(['session:only-one']);
      expect(mockRedisClient.scan).toHaveBeenCalledTimes(1);
    });
  });
});
