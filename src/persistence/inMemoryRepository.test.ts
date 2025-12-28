/**
 * Unit tests for in-memory repository implementations
 * @module persistence/inMemoryRepository.test
 */

import {
  InMemoryItemRepository,
  InMemoryUserRepository,
  InMemoryRoomRepository,
} from './inMemoryRepository';
import { GameItem, ItemInstance } from '../types';
import { Room } from '../room/room';
import { createMockUser } from '../test/helpers/mockFactories';

// Helper to create a test item
const createTestItem = (id: string): GameItem => ({
  id,
  name: `Test Item ${id}`,
  description: 'A test item',
  type: 'misc',
  value: 100,
});

// Helper to create a test item instance
const createTestItemInstance = (instanceId: string, templateId: string): ItemInstance => ({
  instanceId,
  templateId,
  created: new Date(),
  createdBy: 'test',
});

// Helper to create a test room
const createTestRoom = (id: string): Room =>
  ({
    id,
    name: `Room ${id}`,
    description: 'A test room',
    exits: {},
    npcs: new Map(),
    players: [],
    flags: [],
    items: [],
    currency: { gold: 0, silver: 0, copper: 0 },
  }) as unknown as Room;

describe('InMemoryItemRepository', () => {
  let repository: InMemoryItemRepository;

  beforeEach(() => {
    repository = new InMemoryItemRepository();
  });

  describe('constructor', () => {
    it('should create with empty data by default', () => {
      expect(repository.loadItems()).toEqual([]);
      expect(repository.loadItemInstances()).toEqual([]);
    });

    it('should accept initial items', () => {
      const items = [createTestItem('sword-1')];
      const repo = new InMemoryItemRepository(items);
      expect(repo.loadItems()).toHaveLength(1);
      expect(repo.loadItems()[0].id).toBe('sword-1');
    });

    it('should accept initial item instances', () => {
      const instances = [createTestItemInstance('inst-1', 'sword-1')];
      const repo = new InMemoryItemRepository([], instances);
      expect(repo.loadItemInstances()).toHaveLength(1);
    });
  });

  describe('loadItems', () => {
    it('should return a copy of items', () => {
      const items = [createTestItem('sword-1')];
      repository.setItems(items);
      const loaded = repository.loadItems();
      loaded.push(createTestItem('axe-1'));
      expect(repository.loadItems()).toHaveLength(1);
    });
  });

  describe('saveItems', () => {
    it('should save items', () => {
      const items = [createTestItem('sword-1')];
      repository.saveItems(items);
      expect(repository.loadItems()).toHaveLength(1);
    });

    it('should replace existing items', () => {
      repository.setItems([createTestItem('old-item')]);
      const newItems = [createTestItem('new-item')];
      repository.saveItems(newItems);
      expect(repository.loadItems()).toHaveLength(1);
      expect(repository.loadItems()[0].id).toBe('new-item');
    });
  });

  describe('clear', () => {
    it('should remove all data', () => {
      repository.setItems([createTestItem('sword-1')]);
      repository.setItemInstances([createTestItemInstance('inst-1', 'sword-1')]);
      repository.clear();
      expect(repository.loadItems()).toEqual([]);
      expect(repository.loadItemInstances()).toEqual([]);
    });
  });
});

describe('InMemoryUserRepository', () => {
  let repository: InMemoryUserRepository;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
  });

  describe('constructor', () => {
    it('should create with empty data by default', () => {
      expect(repository.loadUsers()).toEqual([]);
    });

    it('should accept initial users', () => {
      const users = [createMockUser({ username: 'testuser' })];
      const repo = new InMemoryUserRepository(users);
      expect(repo.loadUsers()).toHaveLength(1);
    });
  });

  describe('storageExists', () => {
    it('should return true by default', () => {
      expect(repository.storageExists()).toBe(true);
    });

    it('should return configured value', () => {
      repository.setStorageExists(false);
      expect(repository.storageExists()).toBe(false);
    });
  });

  describe('saveUsers', () => {
    it('should save users', () => {
      const users = [createMockUser({ username: 'testuser' })];
      repository.saveUsers(users);
      expect(repository.loadUsers()).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('should remove all users', () => {
      repository.setUsers([createMockUser({ username: 'testuser' })]);
      repository.clear();
      expect(repository.loadUsers()).toEqual([]);
    });
  });
});

describe('InMemoryRoomRepository', () => {
  let repository: InMemoryRoomRepository;

  beforeEach(() => {
    repository = new InMemoryRoomRepository();
  });

  describe('constructor', () => {
    it('should create with empty data by default', () => {
      expect(repository.loadRooms().size).toBe(0);
    });

    it('should accept initial rooms as Map', () => {
      const rooms = new Map<string, Room>();
      rooms.set('room-1', createTestRoom('room-1'));
      const repo = new InMemoryRoomRepository(rooms);
      expect(repo.loadRooms().size).toBe(1);
    });

    it('should accept initial rooms as array', () => {
      const rooms = [createTestRoom('room-1'), createTestRoom('room-2')];
      const repo = new InMemoryRoomRepository(rooms);
      expect(repo.loadRooms().size).toBe(2);
    });
  });

  describe('loadRooms', () => {
    it('should return a copy of rooms', () => {
      repository.addRoom(createTestRoom('room-1'));
      const loaded = repository.loadRooms();
      loaded.set('room-2', createTestRoom('room-2'));
      expect(repository.loadRooms().size).toBe(1);
    });
  });

  describe('saveRooms', () => {
    it('should save rooms', () => {
      const rooms = new Map<string, Room>();
      rooms.set('room-1', createTestRoom('room-1'));
      repository.saveRooms(rooms);
      expect(repository.loadRooms().size).toBe(1);
    });
  });

  describe('addRoom', () => {
    it('should add a single room', () => {
      repository.addRoom(createTestRoom('room-1'));
      expect(repository.loadRooms().has('room-1')).toBe(true);
    });
  });

  describe('setRooms', () => {
    it('should accept Map', () => {
      const rooms = new Map<string, Room>();
      rooms.set('room-1', createTestRoom('room-1'));
      repository.setRooms(rooms);
      expect(repository.loadRooms().size).toBe(1);
    });

    it('should accept array', () => {
      const rooms = [createTestRoom('room-1'), createTestRoom('room-2')];
      repository.setRooms(rooms);
      expect(repository.loadRooms().size).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all rooms', () => {
      repository.addRoom(createTestRoom('room-1'));
      repository.addRoom(createTestRoom('room-2'));
      repository.clear();
      expect(repository.loadRooms().size).toBe(0);
    });
  });
});
