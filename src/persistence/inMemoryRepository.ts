/**
 * In-memory repository implementations for testing
 * These implementations store data in memory and don't touch the filesystem
 * @module persistence/inMemoryRepository
 */

import { GameItem, ItemInstance, User } from '../types';
import { Room } from '../room/room';
import { IItemRepository, IUserRepository, IRoomRepository } from './interfaces';

/**
 * In-memory implementation of IItemRepository
 * Useful for unit testing without filesystem dependencies
 */
export class InMemoryItemRepository implements IItemRepository {
  private items: GameItem[] = [];
  private itemInstances: ItemInstance[] = [];

  constructor(initialItems?: GameItem[], initialInstances?: ItemInstance[]) {
    if (initialItems) {
      this.items = [...initialItems];
    }
    if (initialInstances) {
      this.itemInstances = [...initialInstances];
    }
  }

  loadItems(): GameItem[] {
    return [...this.items];
  }

  loadItemInstances(): ItemInstance[] {
    return [...this.itemInstances];
  }

  saveItems(items: GameItem[]): void {
    this.items = [...items];
  }

  saveItemInstances(instances: ItemInstance[]): void {
    this.itemInstances = [...instances];
  }

  /**
   * Set items directly (for test setup)
   */
  setItems(items: GameItem[]): void {
    this.items = [...items];
  }

  /**
   * Set item instances directly (for test setup)
   */
  setItemInstances(instances: ItemInstance[]): void {
    this.itemInstances = [...instances];
  }

  /**
   * Clear all data (for test cleanup)
   */
  clear(): void {
    this.items = [];
    this.itemInstances = [];
  }
}

/**
 * In-memory implementation of IUserRepository
 * Useful for unit testing without filesystem dependencies
 */
export class InMemoryUserRepository implements IUserRepository {
  private users: User[] = [];
  private _storageExists: boolean = true;

  constructor(initialUsers?: User[]) {
    if (initialUsers) {
      this.users = [...initialUsers];
    }
  }

  loadUsers(): User[] {
    return [...this.users];
  }

  saveUsers(users: User[]): void {
    this.users = [...users];
  }

  storageExists(): boolean {
    return this._storageExists;
  }

  /**
   * Set users directly (for test setup)
   */
  setUsers(users: User[]): void {
    this.users = [...users];
  }

  /**
   * Set whether storage exists (for testing first-run scenarios)
   */
  setStorageExists(exists: boolean): void {
    this._storageExists = exists;
  }

  /**
   * Clear all data (for test cleanup)
   */
  clear(): void {
    this.users = [];
  }
}

/**
 * In-memory implementation of IRoomRepository
 * Useful for unit testing without filesystem dependencies
 */
export class InMemoryRoomRepository implements IRoomRepository {
  private rooms: Map<string, Room> = new Map();

  constructor(initialRooms?: Map<string, Room> | Room[]) {
    if (initialRooms) {
      if (initialRooms instanceof Map) {
        this.rooms = new Map(initialRooms);
      } else {
        initialRooms.forEach((room) => {
          this.rooms.set(room.id, room);
        });
      }
    }
  }

  loadRooms(): Map<string, Room> {
    return new Map(this.rooms);
  }

  saveRooms(rooms: Map<string, Room>): void {
    this.rooms = new Map(rooms);
  }

  /**
   * Set rooms directly (for test setup)
   */
  setRooms(rooms: Map<string, Room> | Room[]): void {
    if (rooms instanceof Map) {
      this.rooms = new Map(rooms);
    } else {
      this.rooms.clear();
      rooms.forEach((room) => {
        this.rooms.set(room.id, room);
      });
    }
  }

  /**
   * Add a single room (for test setup)
   */
  addRoom(room: Room): void {
    this.rooms.set(room.id, room);
  }

  /**
   * Clear all data (for test cleanup)
   */
  clear(): void {
    this.rooms.clear();
  }
}
