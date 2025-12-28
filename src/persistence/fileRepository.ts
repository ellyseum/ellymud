/**
 * File-based repository implementations
 * Production implementations that read/write to the filesystem
 * @module persistence/fileRepository
 */

import fs from 'fs';
import path from 'path';
import { GameItem, ItemInstance, User } from '../types';
import { Room } from '../room/room';
import { IItemRepository, IUserRepository, IRoomRepository, RepositoryConfig } from './interfaces';
import { loadAndValidateJsonFile } from '../utils/fileUtils';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('FileRepository');

/**
 * Default data directory path
 */
const DEFAULT_DATA_DIR = path.join(__dirname, '..', '..', 'data');

/**
 * File-based implementation of IItemRepository
 * Reads and writes item data to JSON files
 */
export class FileItemRepository implements IItemRepository {
  private readonly itemsFile: string;
  private readonly itemInstancesFile: string;

  constructor(config?: RepositoryConfig) {
    const dataDir = config?.dataDir ?? DEFAULT_DATA_DIR;
    this.itemsFile = path.join(dataDir, 'items.json');
    this.itemInstancesFile = path.join(dataDir, 'itemInstances.json');
  }

  loadItems(): GameItem[] {
    if (!fs.existsSync(this.itemsFile)) {
      repoLogger.info(`Items file not found at ${this.itemsFile}, returning empty array`);
      return [];
    }

    const itemData = loadAndValidateJsonFile<GameItem[]>(this.itemsFile, 'items');
    if (itemData && Array.isArray(itemData)) {
      repoLogger.info(`Loaded ${itemData.length} items from ${this.itemsFile}`);
      return itemData;
    }

    repoLogger.warn(`Failed to load items from ${this.itemsFile}`);
    return [];
  }

  loadItemInstances(): ItemInstance[] {
    if (!fs.existsSync(this.itemInstancesFile)) {
      repoLogger.info(
        `Item instances file not found at ${this.itemInstancesFile}, returning empty array`
      );
      return [];
    }

    try {
      // Item instances don't have a validator, so we read directly
      const data = fs.readFileSync(this.itemInstancesFile, 'utf8');
      const instanceData = JSON.parse(data) as ItemInstance[];
      if (instanceData && Array.isArray(instanceData)) {
        repoLogger.info(
          `Loaded ${instanceData.length} item instances from ${this.itemInstancesFile}`
        );
        return instanceData;
      }
    } catch (error) {
      repoLogger.warn(`Failed to parse item instances from ${this.itemInstancesFile}:`, error);
    }

    return [];
  }

  saveItems(items: GameItem[]): void {
    const dataDir = path.dirname(this.itemsFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(this.itemsFile, JSON.stringify(Array.from(items), null, 2));
    repoLogger.info(`Saved ${items.length} items to ${this.itemsFile}`);
  }

  saveItemInstances(instances: ItemInstance[]): void {
    const dataDir = path.dirname(this.itemInstancesFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(this.itemInstancesFile, JSON.stringify(Array.from(instances), null, 2));
    repoLogger.info(`Saved ${instances.length} item instances to ${this.itemInstancesFile}`);
  }
}

/**
 * File-based implementation of IUserRepository
 * Reads and writes user data to JSON files
 */
export class FileUserRepository implements IUserRepository {
  private readonly usersFile: string;

  constructor(config?: RepositoryConfig) {
    const dataDir = config?.dataDir ?? DEFAULT_DATA_DIR;
    this.usersFile = path.join(dataDir, 'users.json');
  }

  loadUsers(): User[] {
    if (!fs.existsSync(this.usersFile)) {
      repoLogger.info(`Users file not found at ${this.usersFile}, returning empty array`);
      return [];
    }

    const userData = loadAndValidateJsonFile<User[]>(this.usersFile, 'users');
    if (userData && Array.isArray(userData)) {
      repoLogger.info(`Loaded ${userData.length} users from ${this.usersFile}`);
      return userData;
    }

    repoLogger.warn(`Failed to load users from ${this.usersFile}`);
    return [];
  }

  saveUsers(users: User[]): void {
    const dataDir = path.dirname(this.usersFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(this.usersFile, JSON.stringify(users, null, 2));
    repoLogger.info(`Saved ${users.length} users to ${this.usersFile}`);
  }

  storageExists(): boolean {
    return fs.existsSync(this.usersFile);
  }
}

/**
 * File-based implementation of IRoomRepository
 * Reads and writes room data to JSON files
 */
export class FileRoomRepository implements IRoomRepository {
  private readonly roomsFile: string;

  constructor(config?: RepositoryConfig) {
    const dataDir = config?.dataDir ?? DEFAULT_DATA_DIR;
    this.roomsFile = path.join(dataDir, 'rooms.json');
  }

  loadRooms(): Map<string, Room> {
    const rooms = new Map<string, Room>();

    if (!fs.existsSync(this.roomsFile)) {
      repoLogger.info(`Rooms file not found at ${this.roomsFile}, returning empty map`);
      return rooms;
    }

    const roomData = loadAndValidateJsonFile<Room[]>(this.roomsFile, 'rooms');
    if (roomData && Array.isArray(roomData)) {
      roomData.forEach((room) => {
        rooms.set(room.id, room);
      });
      repoLogger.info(`Loaded ${rooms.size} rooms from ${this.roomsFile}`);
    } else {
      repoLogger.warn(`Failed to load rooms from ${this.roomsFile}`);
    }

    return rooms;
  }

  saveRooms(rooms: Map<string, Room>): void {
    const dataDir = path.dirname(this.roomsFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const roomArray = Array.from(rooms.values());
    fs.writeFileSync(this.roomsFile, JSON.stringify(roomArray, null, 2));
    repoLogger.info(`Saved ${roomArray.length} rooms to ${this.roomsFile}`);
  }
}
