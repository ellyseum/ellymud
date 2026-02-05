import * as fs from 'fs';
import * as path from 'path';
import { UserManager } from '../user/userManager';
import { RoomManager } from '../room/roomManager';
import { NPC, NPCData } from '../combat/npc';
import { ItemManager } from '../utils/itemManager';
import { GameItem } from '../types';
import { systemLogger } from '../utils/logger';

const SNAPSHOTS_DIR = path.join(__dirname, '../../data/test-snapshots');

/**
 * StateLoader manages loading and saving test snapshots for repeatable test scenarios.
 *
 * Snapshots are stored in data/test-snapshots/<name>/ directories containing:
 * - users.json: User data
 * - rooms.json: Room data
 * - items.json: Item templates (optional)
 * - npcs.json: NPC templates (optional)
 *
 * @example
 * ```typescript
 * const stateLoader = new StateLoader(userManager, roomManager);
 * await stateLoader.loadSnapshot('fresh');      // Reset to clean state
 * await stateLoader.saveSnapshot('my-test');    // Save current state
 * await stateLoader.resetToClean();             // Alias for loadSnapshot('fresh')
 * ```
 */
export class StateLoader {
  constructor(
    private userManager: UserManager,
    private roomManager: RoomManager
  ) {}

  /**
   * Sanitize and validate a snapshot name to prevent path traversal.
   * Only allow simple directory names (letters, numbers, underscore, dash).
   */
  private sanitizeSnapshotName(name: string): string {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Snapshot name must be a non-empty string');
    }

    const trimmed = name.trim();

    // Disallow path separators and parent directory references
    if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) {
      throw new Error('Invalid snapshot name');
    }

    // Restrict to a safe character set
    if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
      throw new Error('Invalid snapshot name');
    }

    return trimmed;
  }

  /**
   * Get the path to a named snapshot directory
   */
  private getSnapshotPath(name: string): string {
    const safeName = this.sanitizeSnapshotName(name);
    const snapshotPath = path.resolve(SNAPSHOTS_DIR, safeName);

    // Ensure the resolved path is within the snapshots directory
    const normalizedRoot = path.resolve(SNAPSHOTS_DIR) + path.sep;
    if (!snapshotPath.startsWith(normalizedRoot)) {
      throw new Error('Snapshot path is outside of the allowed directory');
    }

    return snapshotPath;
  }

  /**
   * Check if a snapshot exists
   */
  public snapshotExists(name: string): boolean {
    const snapshotPath = this.getSnapshotPath(name);
    return fs.existsSync(snapshotPath);
  }

  /**
   * List all available snapshots
   */
  public listSnapshots(): string[] {
    if (!fs.existsSync(SNAPSHOTS_DIR)) {
      return [];
    }

    return fs
      .readdirSync(SNAPSHOTS_DIR, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);
  }

  /**
   * Load a named snapshot, replacing current state.
   * This loads user, room, item, and NPC data from the snapshot directory.
   *
   * @param name - Snapshot name (e.g., "fresh", "combat-ready")
   * @throws Error if snapshot doesn't exist
   */
  async loadSnapshot(
    name: string
  ): Promise<{
    usersLoaded: number;
    roomsLoaded: number;
    itemsLoaded: number;
    npcsLoaded: number;
  }> {
    const snapshotPath = this.getSnapshotPath(name);

    if (!fs.existsSync(snapshotPath)) {
      throw new Error(`Snapshot '${name}' not found at ${snapshotPath}`);
    }

    systemLogger.info(`[StateLoader] Loading snapshot: ${name}`);

    let usersLoaded = 0;
    let roomsLoaded = 0;
    let itemsLoaded = 0;
    let npcsLoaded = 0;

    // Load items FIRST (before rooms, since rooms may reference items)
    const itemsPath = path.join(snapshotPath, 'items.json');
    if (fs.existsSync(itemsPath)) {
      try {
        const itemData = JSON.parse(fs.readFileSync(itemsPath, 'utf8')) as GameItem[];
        if (Array.isArray(itemData)) {
          const itemManager = ItemManager.getInstance();
          await itemManager.ensureInitialized();
          itemManager.loadPrevalidatedItems(itemData);
          itemsLoaded = itemData.length;
          systemLogger.info(`[StateLoader] Loaded ${itemsLoaded} items from snapshot`);
        }
      } catch (error) {
        systemLogger.error(`[StateLoader] Error loading items from snapshot:`, error);
      }
    }

    // Load NPCs BEFORE rooms (rooms will instantiate NPCs from this cache)
    const npcsPath = path.join(snapshotPath, 'npcs.json');
    if (fs.existsSync(npcsPath)) {
      try {
        const npcData = JSON.parse(fs.readFileSync(npcsPath, 'utf8')) as NPCData[];
        if (Array.isArray(npcData)) {
          // Clear existing cache and load snapshot data
          NPC.clearNpcDataCache();
          NPC.loadPrevalidatedNPCData(npcData);
          npcsLoaded = npcData.length;
          systemLogger.info(`[StateLoader] Loaded ${npcsLoaded} NPCs from snapshot`);
        }
      } catch (error) {
        systemLogger.error(`[StateLoader] Error loading NPCs from snapshot:`, error);
      }
    } else {
      // No NPCs in snapshot, just clear cache
      NPC.clearNpcDataCache();
    }

    // Load users if file exists in snapshot
    const usersPath = path.join(snapshotPath, 'users.json');
    if (fs.existsSync(usersPath)) {
      await this.userManager.loadFromPath(usersPath);
      const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
      usersLoaded = Array.isArray(users) ? users.length : 0;
      systemLogger.info(`[StateLoader] Loaded ${usersLoaded} users from snapshot`);
    }

    // Load rooms (will use the NPC cache we just populated)
    const roomsPath = path.join(snapshotPath, 'rooms.json');
    if (fs.existsSync(roomsPath)) {
      await this.roomManager.loadFromPath(roomsPath);
      const rooms = JSON.parse(fs.readFileSync(roomsPath, 'utf8'));
      roomsLoaded = Array.isArray(rooms) ? rooms.length : 0;
      systemLogger.info(`[StateLoader] Loaded ${roomsLoaded} rooms from snapshot`);
    }

    systemLogger.info(`[StateLoader] Snapshot '${name}' loaded successfully`);

    return { usersLoaded, roomsLoaded, itemsLoaded, npcsLoaded };
  }

  /**
   * Save current state as a named snapshot.
   * Creates the snapshot directory if it doesn't exist.
   *
   * @param name - Name for the snapshot
   * @param overwrite - If true, overwrites existing snapshot. Default: false
   * @throws Error if snapshot exists and overwrite is false
   */
  async saveSnapshot(
    name: string,
    overwrite: boolean = false
  ): Promise<{ usersSaved: number; roomsSaved: number }> {
    const snapshotPath = this.getSnapshotPath(name);

    // Check if snapshot already exists
    if (fs.existsSync(snapshotPath) && !overwrite) {
      throw new Error(`Snapshot '${name}' already exists. Use overwrite=true to replace.`);
    }

    // Create snapshot directory
    fs.mkdirSync(snapshotPath, { recursive: true });

    systemLogger.info(`[StateLoader] Saving snapshot: ${name}`);

    // Save users
    const usersPath = path.join(snapshotPath, 'users.json');
    const usersSaved = await this.userManager.saveToPath(usersPath);

    // Save rooms
    const roomsPath = path.join(snapshotPath, 'rooms.json');
    const roomsSaved = await this.roomManager.saveToPath(roomsPath);

    systemLogger.info(`[StateLoader] Snapshot '${name}' saved successfully`);

    return { usersSaved, roomsSaved };
  }

  /**
   * Delete a named snapshot
   *
   * @param name - Snapshot name to delete
   * @returns true if deleted, false if didn't exist
   */
  deleteSnapshot(name: string): boolean {
    // Prevent deleting the 'fresh' snapshot
    if (name === 'fresh') {
      throw new Error("Cannot delete the 'fresh' snapshot - it is required for resetToClean()");
    }

    const snapshotPath = this.getSnapshotPath(name);

    if (!fs.existsSync(snapshotPath)) {
      return false;
    }

    // Recursively delete the snapshot directory
    fs.rmSync(snapshotPath, { recursive: true, force: true });
    systemLogger.info(`[StateLoader] Deleted snapshot: ${name}`);

    return true;
  }

  /**
   * Reset to clean state by loading the 'fresh' snapshot.
   * The 'fresh' snapshot contains minimal data for a clean game state.
   */
  async resetToClean(): Promise<{
    usersLoaded: number;
    roomsLoaded: number;
    itemsLoaded: number;
    npcsLoaded: number;
  }> {
    return this.loadSnapshot('fresh');
  }

  /**
   * Get information about a snapshot without loading it
   */
  getSnapshotInfo(name: string): {
    exists: boolean;
    path: string;
    files: string[];
    userCount?: number;
    roomCount?: number;
    itemCount?: number;
    npcCount?: number;
  } {
    const snapshotPath = this.getSnapshotPath(name);
    const exists = fs.existsSync(snapshotPath);

    if (!exists) {
      return { exists: false, path: snapshotPath, files: [] };
    }

    const files = fs.readdirSync(snapshotPath);
    const info: {
      exists: boolean;
      path: string;
      files: string[];
      userCount?: number;
      roomCount?: number;
      itemCount?: number;
      npcCount?: number;
    } = {
      exists: true,
      path: snapshotPath,
      files,
    };

    // Count users if users.json exists
    const usersPath = path.join(snapshotPath, 'users.json');
    if (fs.existsSync(usersPath)) {
      try {
        const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        info.userCount = Array.isArray(users) ? users.length : 0;
      } catch {
        info.userCount = 0;
      }
    }

    // Count rooms if rooms.json exists
    const roomsPath = path.join(snapshotPath, 'rooms.json');
    if (fs.existsSync(roomsPath)) {
      try {
        const rooms = JSON.parse(fs.readFileSync(roomsPath, 'utf8'));
        info.roomCount = Array.isArray(rooms) ? rooms.length : 0;
      } catch {
        info.roomCount = 0;
      }
    }

    // Count items if items.json exists
    const itemsPath = path.join(snapshotPath, 'items.json');
    if (fs.existsSync(itemsPath)) {
      try {
        const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
        info.itemCount = Array.isArray(items) ? items.length : 0;
      } catch {
        info.itemCount = 0;
      }
    }

    // Count NPCs if npcs.json exists
    const npcsPath = path.join(snapshotPath, 'npcs.json');
    if (fs.existsSync(npcsPath)) {
      try {
        const npcs = JSON.parse(fs.readFileSync(npcsPath, 'utf8'));
        info.npcCount = Array.isArray(npcs) ? npcs.length : 0;
      } catch {
        info.npcCount = 0;
      }
    }

    return info;
  }
}
