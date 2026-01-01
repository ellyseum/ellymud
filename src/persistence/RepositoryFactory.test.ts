/**
 * Unit tests for RepositoryFactory
 * @module persistence/RepositoryFactory.test
 */

// Mock the config module to control STORAGE_BACKEND
jest.mock('../config', () => ({
  STORAGE_BACKEND: 'json',
  DATABASE_URL: '',
}));

// Mock the database module to avoid actual DB connections
jest.mock('../data/db', () => ({
  getDb: jest.fn(),
  ensureInitialized: jest.fn().mockResolvedValue(undefined),
}));

describe('RepositoryFactory', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('with JSON storage backend', () => {
    beforeEach(() => {
      jest.doMock('../config', () => ({
        STORAGE_BACKEND: 'json',
        DATABASE_URL: '',
      }));
    });

    it('should return AsyncFileUserRepository for users', async () => {
      const { getUserRepository } = await import('./RepositoryFactory');
      const repo = getUserRepository();
      expect(repo.constructor.name).toBe('AsyncFileUserRepository');
    });

    it('should return AsyncFileRoomRepository for rooms', async () => {
      const { getRoomRepository } = await import('./RepositoryFactory');
      const repo = getRoomRepository();
      expect(repo.constructor.name).toBe('AsyncFileRoomRepository');
    });

    it('should return AsyncFileItemRepository for items', async () => {
      const { getItemRepository } = await import('./RepositoryFactory');
      const repo = getItemRepository();
      expect(repo.constructor.name).toBe('AsyncFileItemRepository');
    });

    it('should return AsyncFileNpcRepository for npcs', async () => {
      const { getNpcRepository } = await import('./RepositoryFactory');
      const repo = getNpcRepository();
      expect(repo.constructor.name).toBe('AsyncFileNpcRepository');
    });

    it('isDatabaseBackend should return false', async () => {
      const { isDatabaseBackend } = await import('./RepositoryFactory');
      expect(isDatabaseBackend()).toBe(false);
    });
  });

  describe('with SQLite storage backend', () => {
    beforeEach(() => {
      jest.doMock('../config', () => ({
        STORAGE_BACKEND: 'sqlite',
        DATABASE_URL: '',
      }));
    });

    it('should return KyselyUserRepository for users', async () => {
      const { getUserRepository } = await import('./RepositoryFactory');
      const repo = getUserRepository();
      expect(repo.constructor.name).toBe('KyselyUserRepository');
    });

    it('should return KyselyRoomRepository for rooms', async () => {
      const { getRoomRepository } = await import('./RepositoryFactory');
      const repo = getRoomRepository();
      expect(repo.constructor.name).toBe('KyselyRoomRepository');
    });

    it('should return KyselyItemRepository for items', async () => {
      const { getItemRepository } = await import('./RepositoryFactory');
      const repo = getItemRepository();
      expect(repo.constructor.name).toBe('KyselyItemRepository');
    });

    it('should return KyselyNpcRepository for npcs', async () => {
      const { getNpcRepository } = await import('./RepositoryFactory');
      const repo = getNpcRepository();
      expect(repo.constructor.name).toBe('KyselyNpcRepository');
    });

    it('isDatabaseBackend should return true', async () => {
      const { isDatabaseBackend } = await import('./RepositoryFactory');
      expect(isDatabaseBackend()).toBe(true);
    });
  });

  describe('with PostgreSQL storage backend', () => {
    beforeEach(() => {
      jest.doMock('../config', () => ({
        STORAGE_BACKEND: 'postgres',
        DATABASE_URL: 'postgres://localhost/test',
      }));
    });

    it('should return KyselyUserRepository for users', async () => {
      const { getUserRepository } = await import('./RepositoryFactory');
      const repo = getUserRepository();
      expect(repo.constructor.name).toBe('KyselyUserRepository');
    });

    it('should return KyselyNpcRepository for npcs', async () => {
      const { getNpcRepository } = await import('./RepositoryFactory');
      const repo = getNpcRepository();
      expect(repo.constructor.name).toBe('KyselyNpcRepository');
    });

    it('isDatabaseBackend should return true', async () => {
      const { isDatabaseBackend } = await import('./RepositoryFactory');
      expect(isDatabaseBackend()).toBe(true);
    });
  });
});
