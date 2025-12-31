/**
 * Unit tests for KyselyRoomRepository
 * Uses in-memory SQLite for isolated, fast testing
 * @module persistence/KyselyRoomRepository.test
 */

import { Kysely } from 'kysely';
import { Database } from '../data/schema';
import { KyselyRoomRepository } from './KyselyRoomRepository';
import { setupTestDb, destroyTestDb } from '../testing/testDb';
import { RoomData } from '../room/roomData';

// Helper to create test room data
function createTestRoomData(overrides: Partial<RoomData> = {}): RoomData {
  return {
    id: overrides.id ?? 'test-room',
    name: overrides.name ?? 'Test Room',
    description: overrides.description ?? 'A test room',
    exits: overrides.exits ?? [{ direction: 'north', roomId: 'other-room' }],
    currency: overrides.currency ?? { gold: 0, silver: 0, copper: 0 },
    flags: overrides.flags ?? [],
    npcs: overrides.npcs,
    items: overrides.items,
  };
}

describe('KyselyRoomRepository', () => {
  let db: Kysely<Database>;
  let repository: KyselyRoomRepository;

  beforeEach(async () => {
    db = await setupTestDb();
    repository = new KyselyRoomRepository(db);
  });

  afterEach(async () => {
    await destroyTestDb();
  });

  describe('findAll', () => {
    it('should return empty array when no rooms exist', async () => {
      const rooms = await repository.findAll();
      expect(rooms).toEqual([]);
    });

    it('should return all saved rooms', async () => {
      const room1 = createTestRoomData({ id: 'room-1', name: 'Room 1' });
      const room2 = createTestRoomData({ id: 'room-2', name: 'Room 2' });

      await repository.save(room1);
      await repository.save(room2);

      const rooms = await repository.findAll();
      expect(rooms).toHaveLength(2);
      expect(rooms.map((r) => r.id).sort()).toEqual(['room-1', 'room-2']);
    });
  });

  describe('findById', () => {
    it('should return undefined for non-existent room', async () => {
      const room = await repository.findById('nonexistent');
      expect(room).toBeUndefined();
    });

    it('should return the room when found', async () => {
      const testRoom = createTestRoomData({ id: 'find-me', name: 'Find Me Room' });
      await repository.save(testRoom);

      const room = await repository.findById('find-me');
      expect(room).toBeDefined();
      expect(room!.name).toBe('Find Me Room');
    });

    it('should preserve exits correctly', async () => {
      const testRoom = createTestRoomData({
        id: 'exits-room',
        exits: [
          { direction: 'north', roomId: 'room-north' },
          { direction: 'south', roomId: 'room-south' },
          { direction: 'east', roomId: 'room-east' },
        ],
      });
      await repository.save(testRoom);

      const room = await repository.findById('exits-room');
      expect(room!.exits).toEqual([
        { direction: 'north', roomId: 'room-north' },
        { direction: 'south', roomId: 'room-south' },
        { direction: 'east', roomId: 'room-east' },
      ]);
    });
  });

  describe('save', () => {
    it('should create a new room', async () => {
      const testRoom = createTestRoomData({ id: 'new-room' });
      await repository.save(testRoom);

      const saved = await repository.findById('new-room');
      expect(saved).toBeDefined();
    });

    it('should update an existing room', async () => {
      const testRoom = createTestRoomData({ id: 'update-room', name: 'Original' });
      await repository.save(testRoom);

      testRoom.name = 'Updated';
      await repository.save(testRoom);

      const updated = await repository.findById('update-room');
      expect(updated!.name).toBe('Updated');
    });

    it('should preserve currency correctly', async () => {
      const testRoom = createTestRoomData({
        id: 'rich-room',
        currency: { gold: 100, silver: 50, copper: 25 },
      });
      await repository.save(testRoom);

      const saved = await repository.findById('rich-room');
      expect(saved!.currency).toEqual({ gold: 100, silver: 50, copper: 25 });
    });

    it('should preserve flags correctly', async () => {
      const testRoom = createTestRoomData({
        id: 'flagged-room',
        flags: ['safe', 'no-combat', 'shop'],
      });
      await repository.save(testRoom);

      const saved = await repository.findById('flagged-room');
      expect(saved!.flags).toEqual(['safe', 'no-combat', 'shop']);
    });
  });

  describe('saveAll', () => {
    it('should save multiple rooms in transaction', async () => {
      const rooms = [
        createTestRoomData({ id: 'batch-1' }),
        createTestRoomData({ id: 'batch-2' }),
        createTestRoomData({ id: 'batch-3' }),
      ];

      await repository.saveAll(rooms);

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
    it('should remove room by id', async () => {
      const testRoom = createTestRoomData({ id: 'delete-room' });
      await repository.save(testRoom);

      await repository.delete('delete-room');

      const room = await repository.findById('delete-room');
      expect(room).toBeUndefined();
    });

    it('should not error when deleting non-existent room', async () => {
      await expect(repository.delete('nonexistent')).resolves.not.toThrow();
    });
  });
});
