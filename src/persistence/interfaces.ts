/**
 * Repository interfaces for data persistence
 * These abstractions allow for dependency injection and easier testing
 * @module persistence/interfaces
 */

import { GameItem, ItemInstance, User, SnakeScoreEntry, Race, CharacterClass } from '../types';
import { Room } from '../room/room';
import { RoomData, RoomState } from '../room/roomData';
import { NPCData } from '../combat/npc';
import { Area } from '../area/area';
import { MerchantInventoryState } from '../combat/merchant';
import { AbilityTemplate } from '../abilities/types';

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
 * Async repository interface for Room State persistence
 * Handles mutable room data (items, NPCs, currency) separately from templates
 */
export interface IAsyncRoomStateRepository {
  // Read operations
  findAll(): Promise<RoomState[]>;
  findByRoomId(roomId: string): Promise<RoomState | undefined>;

  // Write operations
  save(state: RoomState): Promise<void>;
  saveAll(states: RoomState[]): Promise<void>;
  delete(roomId: string): Promise<void>;
}

/**
 * Async repository interface for NPC template data persistence
 * Used by RepositoryFactory pattern - all methods are async
 *
 * Note: This handles NPC templates (static definitions), not NPC instances.
 * NPC instances are created from templates at runtime and managed in memory.
 */
export interface IAsyncNpcRepository {
  // Read operations
  findAll(): Promise<NPCData[]>;
  findById(id: string): Promise<NPCData | undefined>;
  findByName(name: string): Promise<NPCData | undefined>;
  findHostile(): Promise<NPCData[]>;
  findMerchants(): Promise<NPCData[]>;

  // Write operations
  save(npc: NPCData): Promise<void>;
  saveAll(npcs: NPCData[]): Promise<void>;
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

/**
 * Async repository interface for Area data persistence
 * Used by RepositoryFactory pattern - all methods are async
 */
export interface IAsyncAreaRepository {
  // Read operations
  findAll(): Promise<Area[]>;
  findById(id: string): Promise<Area | undefined>;

  // Write operations
  save(area: Area): Promise<void>;
  saveAll(areas: Area[]): Promise<void>;
  delete(id: string): Promise<void>;
}

/**
 * Admin user structure for repository operations
 */
export interface AdminUser {
  username: string;
  level: 'super' | 'admin' | 'mod';
  addedBy: string;
  addedOn: string;
}

/**
 * Bug report structure for repository operations
 */
export interface BugReport {
  id: string;
  user: string;
  datetime: string;
  report: string;
  logs: {
    raw: string | null;
    user: string | null;
  };
  solved: boolean;
  solvedOn: string | null;
  solvedBy: string | null;
  solvedReason: string | null;
}

/**
 * Async repository interface for Admin data persistence
 * Handles admin users with privilege levels
 */
export interface IAsyncAdminRepository {
  // Read operations
  findAll(): Promise<AdminUser[]>;
  findByUsername(username: string): Promise<AdminUser | undefined>;
  exists(username: string): Promise<boolean>;

  // Write operations
  save(admin: AdminUser): Promise<void>;
  saveAll(admins: AdminUser[]): Promise<void>;
  delete(username: string): Promise<void>;

  // Storage check
  storageExists(): Promise<boolean>;
}

/**
 * Async repository interface for BugReport data persistence
 */
export interface IAsyncBugReportRepository {
  // Read operations
  findAll(): Promise<BugReport[]>;
  findById(id: string): Promise<BugReport | undefined>;
  findByUser(username: string): Promise<BugReport[]>;
  findUnsolved(): Promise<BugReport[]>;

  // Write operations
  save(report: BugReport): Promise<void>;
  saveAll(reports: BugReport[]): Promise<void>;
  delete(id: string): Promise<void>;
}

/**
 * Async repository interface for MerchantState data persistence
 */
export interface IAsyncMerchantStateRepository {
  // Read operations
  findAll(): Promise<MerchantInventoryState[]>;
  findByTemplateId(templateId: string): Promise<MerchantInventoryState | undefined>;
  exists(templateId: string): Promise<boolean>;

  // Write operations
  save(state: MerchantInventoryState): Promise<void>;
  saveAll(states: MerchantInventoryState[]): Promise<void>;
  delete(templateId: string): Promise<void>;
}

/**
 * Async repository interface for Ability data persistence
 * Read-only in typical usage (abilities loaded from JSON)
 */
export interface IAsyncAbilityRepository {
  // Read operations
  findAll(): Promise<AbilityTemplate[]>;
  findById(id: string): Promise<AbilityTemplate | undefined>;
  findByType(type: string): Promise<AbilityTemplate[]>;

  // Write operations (for admin tools)
  save(ability: AbilityTemplate): Promise<void>;
  saveAll(abilities: AbilityTemplate[]): Promise<void>;
  delete(id: string): Promise<void>;
}

/**
 * Async repository interface for SnakeScore data persistence
 */
export interface IAsyncSnakeScoreRepository {
  // Read operations
  findAll(): Promise<SnakeScoreEntry[]>;
  findByUsername(username: string): Promise<SnakeScoreEntry[]>;
  findTopScores(limit: number): Promise<SnakeScoreEntry[]>;

  // Write operations
  save(score: SnakeScoreEntry): Promise<void>;
  saveAll(scores: SnakeScoreEntry[]): Promise<void>;
  deleteByUsername(username: string): Promise<void>;
}

/**
 * MUD configuration data structure
 */
export interface MUDConfig {
  dataFiles: {
    players: string;
    rooms: string;
    items: string;
    npcs: string;
  };
  game: {
    startingRoom: string;
    maxPlayers: number;
    idleTimeout: number;
    maxPasswordAttempts: number;
  };
  advanced: {
    debugMode: boolean;
    allowRegistration: boolean;
    backupInterval: number;
    logLevel: string;
  };
}

/**
 * Async repository interface for MUD configuration persistence
 * Singleton configuration - there's only one config record
 */
export interface IAsyncMUDConfigRepository {
  // Read operations
  get(): Promise<MUDConfig>;

  // Write operations
  save(config: MUDConfig): Promise<void>;

  // Partial updates
  updateGame(game: Partial<MUDConfig['game']>): Promise<void>;
  updateAdvanced(advanced: Partial<MUDConfig['advanced']>): Promise<void>;

  // Storage check
  exists(): Promise<boolean>;
}

/**
 * Game timer configuration data structure
 */
export interface GameTimerConfig {
  tickInterval: number; // Time between ticks in milliseconds
  saveInterval: number; // Number of ticks between data saves
}

/**
 * Async repository interface for GameTimer configuration persistence
 * Singleton configuration - there's only one config record
 */
export interface IAsyncGameTimerConfigRepository {
  // Read operations
  get(): Promise<GameTimerConfig>;

  // Write operations
  save(config: GameTimerConfig): Promise<void>;

  // Storage check
  exists(): Promise<boolean>;
}

/**
 * Async repository interface for Race data persistence
 * Read-only in typical usage (races loaded from JSON)
 */
export interface IAsyncRaceRepository {
  // Read operations
  findAll(): Promise<Race[]>;
  findById(id: string): Promise<Race | undefined>;

  // Write operations (for admin tools)
  save(race: Race): Promise<void>;
  saveAll(races: Race[]): Promise<void>;
  delete(id: string): Promise<void>;
}

/**
 * Async repository interface for CharacterClass data persistence
 * Read-only in typical usage (classes loaded from JSON)
 */
export interface IAsyncClassRepository {
  // Read operations
  findAll(): Promise<CharacterClass[]>;
  findById(id: string): Promise<CharacterClass | undefined>;
  findByTier(tier: number): Promise<CharacterClass[]>;

  // Write operations (for admin tools)
  save(characterClass: CharacterClass): Promise<void>;
  saveAll(classes: CharacterClass[]): Promise<void>;
  delete(id: string): Promise<void>;
}
