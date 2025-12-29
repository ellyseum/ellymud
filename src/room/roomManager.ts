// Room manager handles room data and NPC instantiation
import fs from 'fs';
import path from 'path';
import { Room } from './room';
import { ConnectedClient, Currency, Exit, Item } from '../types';
import { systemLogger } from '../utils/logger';
import { NPC } from '../combat/npc';
import { IRoomManager } from './interfaces';
import { parseAndValidateJson } from '../utils/jsonUtils';
import { IRoomRepository } from '../persistence/interfaces';
import { FileRoomRepository } from '../persistence/fileRepository';
import config, { STORAGE_BACKEND } from '../config';
import { getDb } from '../data/db';

// Import our service classes
import { DirectionHelper } from './services/directionHelper';
import { EntityRegistryService } from './services/entityRegistryService';
import { NPCInteractionService } from './services/npcInteractionService';
import { PlayerMovementService } from './services/playerMovementService';
import { RoomUINotificationService } from './services/roomUINotificationService';
import { TeleportationService } from './services/teleportationService';

const ROOMS_FILE = path.join(__dirname, '..', '..', 'data', 'rooms.json');
const DEFAULT_ROOM_ID = 'start'; // ID for the starting room

interface RoomData {
  id: string;
  shortDescription?: string;
  longDescription?: string;
  name?: string;
  description?: string;
  exits: Exit[];
  items?: (string | Item)[];
  players?: string[];
  npcs?: string[] | Map<string, NPC>;
  currency: Currency;
  flags?: string[];
}

export class RoomManager implements IRoomManager {
  private rooms: Map<string, Room> = new Map();
  private clients: Map<string, ConnectedClient>;
  private testMode: boolean = false;

  // Services - use definite assignment assertions to tell TypeScript they will be initialized
  private directionHelper!: DirectionHelper;
  private entityRegistryService!: EntityRegistryService;
  private npcInteractionService!: NPCInteractionService;
  private playerMovementService!: PlayerMovementService;
  private roomUINotificationService!: RoomUINotificationService;
  private teleportationService!: TeleportationService;
  private repository: IRoomRepository;

  // Add static instance for singleton pattern
  private static instance: RoomManager | null = null;

  // Make constructor private for singleton pattern
  private constructor(clients: Map<string, ConnectedClient>, repository?: IRoomRepository) {
    systemLogger.info('Creating RoomManager instance');
    this.clients = clients;
    this.repository = repository ?? new FileRoomRepository();

    // Initialize services
    this.initializeServices();

    // Load rooms
    this.loadRooms();
  }

  // Static method to get the singleton instance
  public static getInstance(clients: Map<string, ConnectedClient>): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager(clients);
    } else {
      // Update clients reference if it's a different object
      RoomManager.instance.clients = clients;
    }
    return RoomManager.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    RoomManager.instance = null;
  }

  /**
   * Create a RoomManager with a custom repository (for testing)
   * @param clients The connected clients map
   * @param repository Optional repository implementation
   */
  public static createWithRepository(
    clients: Map<string, ConnectedClient>,
    repository: IRoomRepository
  ): RoomManager {
    RoomManager.resetInstance();
    RoomManager.instance = new RoomManager(clients, repository);
    return RoomManager.instance;
  }

  /**
   * Initialize all the service classes
   */
  private initializeServices(): void {
    // Create direction helper first as it's used by other services
    this.directionHelper = new DirectionHelper();

    // Create the notification service first since it's used by other services
    this.roomUINotificationService = new RoomUINotificationService(
      {
        getRoom: this.getRoom.bind(this),
        getStartingRoomId: this.getStartingRoomId.bind(this),
      },
      this.findClientByUsername.bind(this),
      {
        teleportToStartingRoom: this.teleportToStartingRoom.bind(this),
      }
    );

    this.teleportationService = new TeleportationService(
      {
        getRoom: this.getRoom.bind(this),
        getStartingRoomId: this.getStartingRoomId.bind(this),
        getAllRooms: this.getAllRooms.bind(this),
      },
      this.roomUINotificationService.notifyPlayersInRoom.bind(this.roomUINotificationService)
    );

    this.npcInteractionService = new NPCInteractionService({
      updateRoom: this.updateRoom.bind(this),
    });

    this.entityRegistryService = new EntityRegistryService(
      {
        getRoom: this.getRoom.bind(this),
        getStartingRoomId: this.getStartingRoomId.bind(this),
        updateRoom: this.updateRoom.bind(this),
      },
      () => this.clients,
      this.roomUINotificationService.notifyPlayersInRoom.bind(this.roomUINotificationService),
      this.teleportationService.teleportToStartingRoom.bind(this.teleportationService)
    );

    this.playerMovementService = new PlayerMovementService(
      {
        getRoom: this.getRoom.bind(this),
        getStartingRoomId: this.getStartingRoomId.bind(this),
      },
      this.directionHelper,
      this.roomUINotificationService.notifyPlayersInRoom.bind(this.roomUINotificationService),
      () => this.clients
    );
  }

  /**
   * Load prevalidated room data
   * @param roomDataArray An array of validated room data objects
   */
  public loadPrevalidatedRooms(roomDataArray: RoomData[]): void {
    systemLogger.info(`Loading ${roomDataArray.length} pre-validated rooms...`);

    // Clear existing rooms to prevent duplicates
    this.rooms.clear();

    // Load all NPC templates first
    const npcData = NPC.loadNPCData();

    roomDataArray.forEach((roomData) => {
      const room = new Room(roomData);
      this.rooms.set(room.id, room);

      // Instantiate NPCs from templates after room is created
      if (Array.isArray(roomData.npcs)) {
        this.npcInteractionService.instantiateNpcsFromTemplates(room, roomData.npcs, npcData);
      }
    });

    systemLogger.info('Pre-validated rooms loaded successfully');
  }

  private loadRooms(): void {
    // First try to load rooms from command line argument if provided
    if (config.DIRECT_ROOMS_DATA) {
      try {
        const roomDataArray = parseAndValidateJson<RoomData[]>(config.DIRECT_ROOMS_DATA, 'rooms');

        if (roomDataArray && Array.isArray(roomDataArray)) {
          this.loadPrevalidatedRooms(roomDataArray);
          return; // Successfully loaded from command line
        }
      } catch (error) {
        systemLogger.error('Failed to load rooms from command line:', error);
      }
    }

    // Load based on storage backend config
    if (STORAGE_BACKEND === 'json') {
      // JSON only mode - use repository directly
      this.loadRoomsFromRepository();
    } else if (STORAGE_BACKEND === 'sqlite') {
      // SQLite only mode - try database, load repository as initial sync data
      this.loadRoomsFromRepository(); // Load sync first
      this.loadRoomsFromDatabase().catch((error) => {
        systemLogger.error('[RoomManager] SQLite load failed (no fallback):', error);
      });
    } else {
      // Auto mode (default) - load repository sync, then try database async
      this.loadRoomsFromRepository();
      this.loadRoomsFromDatabase()
        .then((success) => {
          if (success) {
            systemLogger.info('[RoomManager] Database loaded, overwriting repository data');
          }
        })
        .catch(() => {
          // Database failed, repository data already loaded
        });
    }
  }

  private loadRoomsFromRepository(): void {
    // Load rooms from repository
    const roomsMap = this.repository.loadRooms();

    if (roomsMap.size > 0) {
      // Convert map values to array for loadPrevalidatedRooms
      const roomDataArray = Array.from(roomsMap.values());
      this.loadPrevalidatedRooms(roomDataArray as RoomData[]);
    } else {
      // No rooms found, save initial empty state
      this.saveRooms();
    }
  }

  private saveRooms(): void {
    // Skip file persistence in test mode to avoid overwriting main game data
    if (this.testMode) {
      systemLogger.debug('[RoomManager] Skipping save - test mode active');
      return;
    }

    // Helper to save to JSON file
    const saveToFile = () => {
      try {
        // Convert rooms to storable format (without players)
        const roomsData = Array.from(this.rooms.values()).map((room) => {
          // Convert NPC Map to an array of template IDs for storage
          const npcTemplateIds: string[] = [];

          // For each NPC in the room, store its template ID
          room.npcs.forEach((npc) => {
            npcTemplateIds.push(npc.templateId);
          });

          // Serialize item instances to a format suitable for storage
          const serializedItemInstances = room.serializeItemInstances();

          return {
            id: room.id,
            name: room.name,
            description: room.description,
            exits: room.exits,
            items: room.items, // Keep legacy items for backward compatibility
            itemInstances: serializedItemInstances, // Add new item instances
            npcs: npcTemplateIds, // Use the array of template IDs
            flags: room.flags, // Preserve room flags (bank, training, safe, etc.)
            currency: room.currency,
          };
        });

        fs.writeFileSync(ROOMS_FILE, JSON.stringify(roomsData, null, 2));
      } catch (error) {
        systemLogger.error('Error saving rooms:', error);
      }
    };

    // Save based on storage backend config
    if (STORAGE_BACKEND === 'json') {
      // JSON only mode - save to file only
      saveToFile();
    } else if (STORAGE_BACKEND === 'sqlite') {
      // SQLite only mode - save to database only
      // Note: fire-and-forget pattern to maintain synchronous interface
      void this.saveRoomsToDatabase().catch((error) => {
        systemLogger.error('[RoomManager] Database save failed:', error);
      });
    } else {
      // Auto mode (default) - save to both database AND JSON file (backup)
      void this.saveRoomsToDatabase().catch((error) => {
        systemLogger.error('[RoomManager] Database save failed:', error);
      });
      saveToFile();
    }
  }

  /**
   * Save rooms to SQLite database via Kysely
   */
  private async saveRoomsToDatabase(): Promise<void> {
    const db = getDb();

    // Wrap all inserts in a transaction for atomicity
    await db.transaction().execute(async (trx) => {
      for (const room of this.rooms.values()) {
        const npcTemplateIds: string[] = [];
        room.npcs.forEach((npc) => {
          npcTemplateIds.push(npc.templateId);
        });

        const values = {
          id: room.id,
          name: room.name,
          description: room.description,
          exits: JSON.stringify(room.exits),
          currency_gold: room.currency?.gold ?? 0,
          currency_silver: room.currency?.silver ?? 0,
          currency_copper: room.currency?.copper ?? 0,
          flags: room.flags ? JSON.stringify(room.flags) : null,
          npc_template_ids: npcTemplateIds.length > 0 ? JSON.stringify(npcTemplateIds) : null,
          item_instances: room.serializeItemInstances()
            ? JSON.stringify(room.serializeItemInstances())
            : null,
        };

        await trx
          .insertInto('rooms')
          .values(values)
          .onConflict((oc) => oc.column('id').doUpdateSet(values))
          .execute();
      }
    });
    systemLogger.debug(`[RoomManager] Saved ${this.rooms.size} rooms to database`);
  }

  /**
   * Load rooms from SQLite database via Kysely
   */
  private async loadRoomsFromDatabase(): Promise<boolean> {
    try {
      const db = getDb();
      const rows = await db.selectFrom('rooms').selectAll().execute();

      if (rows.length === 0) {
        return false; // No rooms in database, fall back to file
      }

      // Helper to safely parse JSON fields with fallback
      const safeJsonParse = <T>(
        value: string | null | undefined,
        fallback: T,
        fieldName: string,
        roomId: string | number
      ): T => {
        if (value == null) {
          return fallback;
        }
        try {
          return JSON.parse(value) as T;
        } catch (err) {
          systemLogger.warn(
            `[RoomManager] Failed to parse JSON for field "${fieldName}" on room ${roomId}; using fallback value. Error:`,
            err
          );
          return fallback;
        }
      };

      const roomDataArray = rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        exits: safeJsonParse<Exit[]>(row.exits, [], 'exits', row.id),
        currency: {
          gold: row.currency_gold,
          silver: row.currency_silver,
          copper: row.currency_copper,
        },
        flags: safeJsonParse<string[] | undefined>(
          row.flags ?? undefined,
          undefined,
          'flags',
          row.id
        ),
        npcs: safeJsonParse<string[]>(row.npc_template_ids, [], 'npc_template_ids', row.id),
        itemInstances: safeJsonParse<string[]>(row.item_instances, [], 'item_instances', row.id),
      }));

      this.loadPrevalidatedRooms(roomDataArray);
      systemLogger.info(`[RoomManager] Loaded ${rows.length} rooms from database`);
      return true;
    } catch (error) {
      systemLogger.error('[RoomManager] Error loading from database:', error);
      return false;
    }
  }

  // Core room management methods
  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  public addRoomIfNotExists(room: Room): void {
    if (!this.rooms.has(room.id)) {
      this.rooms.set(room.id, room);
      this.saveRooms();
    }
  }

  public updateRoom(room: Room): void {
    this.rooms.set(room.id, room);
    this.saveRooms();
  }

  public getStartingRoomId(): string {
    return DEFAULT_ROOM_ID;
  }

  // Get all rooms (used by some systems like combat)
  public getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  // Service delegation methods - these delegate to specialized services

  // Movement methods
  public movePlayer(client: ConnectedClient, direction: string): boolean {
    return this.playerMovementService.movePlayer(client, direction);
  }

  public movePlayerWithDelay(client: ConnectedClient, direction: string): boolean {
    return this.playerMovementService.movePlayerWithDelay(client, direction);
  }

  // Entity methods
  public findClientByUsername(username: string): ConnectedClient | undefined {
    return this.entityRegistryService.findClientByUsername(username);
  }

  public getNPCFromRoom(roomId: string, npcId: string): NPC | null {
    return this.entityRegistryService.getNPCFromRoom(roomId, npcId);
  }

  public removeNPCFromRoom(roomId: string, npcInstanceId: string): boolean {
    return this.entityRegistryService.removeNPCFromRoom(roomId, npcInstanceId);
  }

  public storeNPC(npcId: string, npc: NPC): void {
    this.entityRegistryService.storeNPC(npcId, npc);
  }

  public lookAtEntity(client: ConnectedClient, entityName: string): boolean {
    return this.entityRegistryService.lookAtEntity(client, entityName);
  }

  // UI methods
  public lookRoom(client: ConnectedClient): boolean {
    return this.roomUINotificationService.lookRoom(client);
  }

  public briefLookRoom(client: ConnectedClient): boolean {
    return this.roomUINotificationService.briefLookRoom(client);
  }

  public notifyPlayersInRoom(roomId: string, message: string, excludeUsername?: string): void {
    this.roomUINotificationService.notifyPlayersInRoom(roomId, message, excludeUsername);
  }

  public announcePlayerEntrance(roomId: string, username: string): void {
    this.roomUINotificationService.announcePlayerEntrance(roomId, username);
  }

  // Teleportation methods
  public teleportToStartingRoom(client: ConnectedClient): boolean {
    return this.teleportationService.teleportToStartingRoom(client);
  }

  public teleportToStartingRoomIfNeeded(client: ConnectedClient): boolean {
    return this.teleportationService.teleportToStartingRoomIfNeeded(client);
  }

  public removePlayerFromAllRooms(username: string): void {
    this.teleportationService.removePlayerFromAllRooms(username);
  }

  // Direction helper methods
  public getOppositeDirection(direction: string): string {
    return this.directionHelper.getOppositeDirection(direction);
  }

  public getFullDirectionName(direction: string): string {
    return this.directionHelper.getFullDirectionName(direction);
  }

  /**
   * Force saving rooms data
   * Public method for tick system to call
   */
  public forceSave(): void {
    this.saveRooms();
  }

  /**
   * Enable or disable test mode.
   * When enabled, file persistence is skipped to avoid overwriting main game data.
   * @param enabled True to enable test mode, false to disable
   */
  public setTestMode(enabled: boolean): void {
    this.testMode = enabled;
    systemLogger.info(
      `[RoomManager] Test mode ${enabled ? 'enabled' : 'disabled'} - file persistence ${enabled ? 'disabled' : 'enabled'}`
    );
  }

  /**
   * Check if test mode is enabled
   */
  public isTestMode(): boolean {
    return this.testMode;
  }

  /**
   * Load room data from a specific file path (for testing/snapshots).
   * This replaces the current rooms with data from the file.
   *
   * @param filePath - Absolute path to the rooms JSON file
   */
  public async loadFromPath(filePath: string): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Room data file not found: ${filePath}`);
      }

      const data = fs.readFileSync(filePath, 'utf8');
      const roomData = JSON.parse(data);

      if (!Array.isArray(roomData)) {
        throw new Error('Room data must be an array');
      }

      // Load using the prevalidated method to ensure proper structure
      this.loadPrevalidatedRooms(roomData);
      systemLogger.info(`[RoomManager] Loaded ${roomData.length} rooms from ${filePath}`);
    } catch (error) {
      systemLogger.error(`[RoomManager] Error loading rooms from ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Save room data to a specific file path (for testing/snapshots).
   * This saves the current rooms to the specified file.
   *
   * @param filePath - Absolute path to save the rooms JSON file
   * @returns Number of rooms saved
   */
  public async saveToPath(filePath: string): Promise<number> {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Convert rooms to storable format (same logic as saveRooms)
      const roomsData = Array.from(this.rooms.values()).map((room) => {
        const npcTemplateIds: string[] = [];
        room.npcs.forEach((npc) => {
          npcTemplateIds.push(npc.templateId);
        });

        const serializedItemInstances = room.serializeItemInstances();

        return {
          id: room.id,
          name: room.name,
          description: room.description,
          exits: room.exits,
          items: room.items,
          itemInstances: serializedItemInstances,
          npcs: npcTemplateIds,
          flags: room.flags,
          currency: room.currency,
        };
      });

      fs.writeFileSync(filePath, JSON.stringify(roomsData, null, 2));
      systemLogger.info(`[RoomManager] Saved ${roomsData.length} rooms to ${filePath}`);
      return roomsData.length;
    } catch (error) {
      systemLogger.error(`[RoomManager] Error saving rooms to ${filePath}:`, error);
      throw error;
    }
  }
}
