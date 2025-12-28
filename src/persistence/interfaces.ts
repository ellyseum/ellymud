/**
 * Repository interfaces for data persistence
 * These abstractions allow for dependency injection and easier testing
 * @module persistence/interfaces
 */

import { GameItem, ItemInstance, User } from '../types';
import { Room } from '../room/room';

/**
 * Repository interface for Item data persistence
 * Implementations can be file-based, in-memory (for tests), or database-backed
 */
export interface IItemRepository {
  /**
   * Load all item templates from storage
   */
  loadItems(): GameItem[];

  /**
   * Load all item instances from storage
   */
  loadItemInstances(): ItemInstance[];

  /**
   * Save all item templates to storage
   */
  saveItems(items: GameItem[]): void;

  /**
   * Save all item instances to storage
   */
  saveItemInstances(instances: ItemInstance[]): void;
}

/**
 * Repository interface for User data persistence
 */
export interface IUserRepository {
  /**
   * Load all users from storage
   */
  loadUsers(): User[];

  /**
   * Save all users to storage
   */
  saveUsers(users: User[]): void;

  /**
   * Check if storage exists (for first-run scenarios)
   */
  storageExists(): boolean;
}

/**
 * Repository interface for Room data persistence
 */
export interface IRoomRepository {
  /**
   * Load all rooms from storage
   */
  loadRooms(): Map<string, Room>;

  /**
   * Save all rooms to storage
   */
  saveRooms(rooms: Map<string, Room>): void;
}

/**
 * Interface for password hashing operations
 * Allows mocking of crypto operations in tests
 */
export interface IPasswordService {
  /**
   * Hash a password with a new salt
   */
  hash(password: string): { hash: string; salt: string };

  /**
   * Verify a password against a stored hash and salt
   */
  verify(password: string, salt: string, hash: string): boolean;
}

/**
 * Configuration for repository implementations
 */
export interface RepositoryConfig {
  dataDir: string;
}
