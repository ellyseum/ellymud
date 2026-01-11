/**
 * Async file-based repository for Room State persistence
 * Handles mutable room data (items, NPCs, currency) separately from templates
 * @module persistence/AsyncFileRoomStateRepository
 */

import fs from 'fs';
import path from 'path';
import { RoomState } from '../room/roomData';
import { IAsyncRoomStateRepository, RepositoryConfig } from './interfaces';
import { createContextLogger } from '../utils/logger';

const repoLogger = createContextLogger('AsyncFileRoomStateRepository');

const DEFAULT_DATA_DIR = path.join(__dirname, '..', '..', 'data');
const ROOM_STATE_FILENAME = 'room_state.json';

export class AsyncFileRoomStateRepository implements IAsyncRoomStateRepository {
  private readonly stateFile: string;
  private readonly dataDir: string;

  constructor(config?: RepositoryConfig) {
    this.dataDir = config?.dataDir ?? DEFAULT_DATA_DIR;
    this.stateFile = path.join(this.dataDir, ROOM_STATE_FILENAME);
  }

  async findAll(): Promise<RoomState[]> {
    if (!fs.existsSync(this.stateFile)) {
      repoLogger.info(`Room state file not found at ${this.stateFile}, returning empty array`);
      return [];
    }

    try {
      const data = fs.readFileSync(this.stateFile, 'utf8');
      const stateData = JSON.parse(data) as RoomState[];
      if (stateData && Array.isArray(stateData)) {
        repoLogger.info(`Loaded ${stateData.length} room states from ${this.stateFile}`);
        return stateData;
      }
    } catch (error) {
      repoLogger.error(`Error loading room state from ${this.stateFile}:`, error);
      // Return empty array on error to allow server to start with fresh state
    }

    repoLogger.warn(`Failed to load room state from ${this.stateFile}, returning empty array`);
    return [];
  }

  async findByRoomId(roomId: string): Promise<RoomState | undefined> {
    const states = await this.findAll();
    return states.find((s) => s.roomId === roomId);
  }

  async save(state: RoomState): Promise<void> {
    const states = await this.findAll();
    const existingIndex = states.findIndex((s) => s.roomId === state.roomId);

    if (existingIndex >= 0) {
      states[existingIndex] = state;
    } else {
      states.push(state);
    }

    await this.writeStates(states);
  }

  async saveAll(states: RoomState[]): Promise<void> {
    await this.writeStates(states);
  }

  async delete(roomId: string): Promise<void> {
    const states = await this.findAll();
    const filtered = states.filter((s) => s.roomId !== roomId);
    await this.writeStates(filtered);
  }

  private async writeStates(states: RoomState[]): Promise<void> {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    fs.writeFileSync(this.stateFile, JSON.stringify(states, null, 2));
    repoLogger.debug(`Saved ${states.length} room states to ${this.stateFile}`);
  }
}
