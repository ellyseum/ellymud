/**
 * Async wrapper around FileRoomRepository
 * Implements IAsyncRoomRepository using the existing JSON file storage
 * @module persistence/AsyncFileRoomRepository
 */

import fs from 'fs';
import path from 'path';
import { RoomData } from '../room/roomData';
import { IAsyncRoomRepository, RepositoryConfig } from './interfaces';
import { loadAndValidateJsonFile } from '../utils/fileUtils';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('AsyncFileRoomRepository');

const DEFAULT_DATA_DIR = path.join(__dirname, '..', '..', 'data');

export class AsyncFileRoomRepository implements IAsyncRoomRepository {
  private readonly roomsFile: string;
  private readonly dataDir: string;

  constructor(config?: RepositoryConfig) {
    this.dataDir = config?.dataDir ?? DEFAULT_DATA_DIR;
    this.roomsFile = path.join(this.dataDir, 'rooms.json');
  }

  async findAll(): Promise<RoomData[]> {
    if (!fs.existsSync(this.roomsFile)) {
      repoLogger.info(`Rooms file not found at ${this.roomsFile}, returning empty array`);
      return [];
    }

    const roomData = loadAndValidateJsonFile<RoomData[]>(this.roomsFile, 'rooms');
    if (roomData && Array.isArray(roomData)) {
      repoLogger.info(`Loaded ${roomData.length} rooms from ${this.roomsFile}`);
      return roomData;
    }

    repoLogger.warn(`Failed to load rooms from ${this.roomsFile}`);
    return [];
  }

  async findById(id: string): Promise<RoomData | undefined> {
    const rooms = await this.findAll();
    return rooms.find((r) => r.id === id);
  }

  async save(room: RoomData): Promise<void> {
    const rooms = await this.findAll();
    const existingIndex = rooms.findIndex((r) => r.id === room.id);

    if (existingIndex >= 0) {
      rooms[existingIndex] = room;
    } else {
      rooms.push(room);
    }

    await this.writeRooms(rooms);
  }

  async saveAll(rooms: RoomData[]): Promise<void> {
    await this.writeRooms(rooms);
  }

  async delete(id: string): Promise<void> {
    const rooms = await this.findAll();
    const filtered = rooms.filter((r) => r.id !== id);
    await this.writeRooms(filtered);
  }

  private async writeRooms(rooms: RoomData[]): Promise<void> {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    fs.writeFileSync(this.roomsFile, JSON.stringify(rooms, null, 2));
    repoLogger.info(`Saved ${rooms.length} rooms to ${this.roomsFile}`);
  }
}
