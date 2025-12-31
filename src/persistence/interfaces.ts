/**
 * Repository interfaces for data persistence
 * These abstractions allow for dependency injection and easier testing
 * @module persistence/interfaces
 */

import { GameItem, ItemInstance, User } from '../types';
import { Room } from '../room/room';
import { RoomData } from '../room/roomData';

/**
 * Async repository interface for Item data persistence
 * Used by RepositoryFactory pattern - all methods are async
 */
export interface IAsyncItemRepository {
  // Read operations
  findAllTemplates(): Promise<GameItem[]>;
  findTemplateById(id: string): Promise<GameItem | undefined>;
  findAllInstances(): Promise<ItemInstance[]>;
  findInstanceById(instanceId: string): Promise<ItemInstance | undefined>;
  findInstancesByTemplateId(templateId: string): Promise<ItemInstance[]>;

  // Write operations
  saveTemplate(item: GameItem): Promise<void>;
  saveTemplates(items: GameItem[]): Promise<void>;
  deleteTemplate(id: string): Promise<void>;
  saveInstance(instance: ItemInstance): Promise<void>;
  saveInstances(instances: ItemInstance[]): Promise<void>;
  deleteInstance(instanceId: string): Promise<void>;
}

/**
 * Async repository interface for User data persistence
 * Used by RepositoryFactory pattern - all methods are async
 */
export interface IAsyncUserRepository {
  // Read operations
  findAll(): Promise<User[]>;
  findByUsername(username: string): Promise<User | undefined>;
  exists(username: string): Promise<boolean>;

  // Write operations
  save(user: User): Promise<void>;
  saveAll(users: User[]): Promise<void>;
  delete(username: string): Promise<void>;

  // Storage check
  storageExists(): Promise<boolean>;
}

/**
 * Async repository interface for Room data persistence
 * Used by RepositoryFactory pattern - all methods are async
 */
export interface IAsyncRoomRepository {
  // Read operations
  findAll(): Promise<RoomData[]>;
  findById(id: string): Promise<RoomData | undefined>;

  // Write operations
  save(room: RoomData): Promise<void>;
  saveAll(rooms: RoomData[]): Promise<void>;
  delete(id: string): Promise<void>;
}

/**
 * Legacy repository interface for Item data persistence
 * @deprecated Use IAsyncItemRepository with RepositoryFactory instead
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
 * Legacy repository interface for User data persistence
 * @deprecated Use IAsyncUserRepository with RepositoryFactory instead
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
 * Legacy repository interface for Room data persistence
 * @deprecated Use IAsyncRoomRepository with RepositoryFactory instead
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
