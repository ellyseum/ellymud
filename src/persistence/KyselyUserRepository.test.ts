/**
 * Unit tests for Kysely repository implementations
 * Uses in-memory SQLite for isolated, fast testing
 * @module persistence/KyselyUserRepository.test
 */

import { Kysely } from 'kysely';
import { Database } from '../data/schema';
import { KyselyUserRepository } from './KyselyUserRepository';
import { setupTestDb, destroyTestDb } from '../testing/testDb';
import { createMockUser } from '../test/helpers/mockFactories';

describe('KyselyUserRepository', () => {
  let db: Kysely<Database>;
  let repository: KyselyUserRepository;

  beforeEach(async () => {
    db = await setupTestDb();
    repository = new KyselyUserRepository(db);
  });

  afterEach(async () => {
    await destroyTestDb();
  });

  describe('findAll', () => {
    it('should return empty array when no users exist', async () => {
      const users = await repository.findAll();
      expect(users).toEqual([]);
    });

    it('should return all saved users', async () => {
      const user1 = createMockUser({ username: 'user1' });
      const user2 = createMockUser({ username: 'user2' });

      await repository.save(user1);
      await repository.save(user2);

      const users = await repository.findAll();
      expect(users).toHaveLength(2);
      expect(users.map((u) => u.username).sort()).toEqual(['user1', 'user2']);
    });
  });

  describe('findByUsername', () => {
    it('should return undefined for non-existent user', async () => {
      const user = await repository.findByUsername('nonexistent');
      expect(user).toBeUndefined();
    });

    it('should return the user when found', async () => {
      const mockUser = createMockUser({ username: 'testuser', level: 5 });
      await repository.save(mockUser);

      const user = await repository.findByUsername('testuser');
      expect(user).toBeDefined();
      expect(user!.username).toBe('testuser');
      expect(user!.level).toBe(5);
    });
  });

  describe('exists', () => {
    it('should return false for non-existent user', async () => {
      const exists = await repository.exists('nonexistent');
      expect(exists).toBe(false);
    });

    it('should return true for existing user', async () => {
      const mockUser = createMockUser({ username: 'existinguser' });
      await repository.save(mockUser);

      const exists = await repository.exists('existinguser');
      expect(exists).toBe(true);
    });
  });

  describe('save', () => {
    it('should create a new user', async () => {
      const mockUser = createMockUser({ username: 'newuser', health: 80 });
      await repository.save(mockUser);

      const saved = await repository.findByUsername('newuser');
      expect(saved).toBeDefined();
      expect(saved!.health).toBe(80);
    });

    it('should update an existing user', async () => {
      const mockUser = createMockUser({ username: 'updateuser', health: 100 });
      await repository.save(mockUser);

      mockUser.health = 50;
      await repository.save(mockUser);

      const updated = await repository.findByUsername('updateuser');
      expect(updated!.health).toBe(50);
    });

    it('should preserve complex fields like inventory', async () => {
      const mockUser = createMockUser({
        username: 'richuser',
        inventory: {
          items: ['sword-1', 'potion-2'],
          currency: { gold: 100, silver: 50, copper: 25 },
        },
      });
      await repository.save(mockUser);

      const saved = await repository.findByUsername('richuser');
      expect(saved!.inventory!.items).toEqual(['sword-1', 'potion-2']);
      expect(saved!.inventory!.currency.gold).toBe(100);
    });
  });

  describe('saveAll', () => {
    it('should save multiple users in transaction', async () => {
      const users = [
        createMockUser({ username: 'batch1' }),
        createMockUser({ username: 'batch2' }),
        createMockUser({ username: 'batch3' }),
      ];

      await repository.saveAll(users);

      const all = await repository.findAll();
      expect(all).toHaveLength(3);
    });

    it('should handle empty array gracefully', async () => {
      await repository.saveAll([]);
      const all = await repository.findAll();
      expect(all).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should remove user by username', async () => {
      const mockUser = createMockUser({ username: 'deleteuser' });
      await repository.save(mockUser);

      await repository.delete('deleteuser');

      const exists = await repository.exists('deleteuser');
      expect(exists).toBe(false);
    });

    it('should not error when deleting non-existent user', async () => {
      await expect(repository.delete('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('storageExists', () => {
    it('should return true when tables exist', async () => {
      const exists = await repository.storageExists();
      expect(exists).toBe(true);
    });
  });
});
