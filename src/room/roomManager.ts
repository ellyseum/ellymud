// Room manager handles room data and NPC instantiation
import fs from 'fs';
import path from 'path';
import { Room } from './room';
import { RoomData } from './roomData';
import { ConnectedClient, Exit } from '../types';
import { Area } from '../area/area';
import { systemLogger } from '../utils/logger';
import { NPC } from '../combat/npc';
import { IRoomManager } from './interfaces';
import { parseAndValidateJson } from '../utils/jsonUtils';
import { IAsyncRoomRepository } from '../persistence/interfaces';
import { getRoomRepository } from '../persistence/RepositoryFactory';
import config from '../config';

// Import our service classes
import { DirectionHelper } from './services/directionHelper';
import { EntityRegistryService } from './services/entityRegistryService';
import { NPCInteractionService } from './services/npcInteractionService';
import { PlayerMovementService } from './services/playerMovementService';
import { RoomUINotificationService } from './services/roomUINotificationService';
import { TeleportationService } from './services/teleportationService';

const DEFAULT_ROOM_ID = 'start'; // Hardcoded fallback ID for the starting room

// Emergency room ID used when no rooms exist at all
export const EMERGENCY_ROOM_ID = '__emergency_void__';

// Local interface for MUD config starting room lookup
interface MUDConfigStartingRoom {
  game?: {
    startingRoom?: string;
  };
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
  private repository: IAsyncRoomRepository;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  // Add static instance for singleton pattern
  private static instance: RoomManager | null = null;

  // Make constructor private for singleton pattern
  private constructor(clients: Map<string, ConnectedClient>, repository?: IAsyncRoomRepository) {
    systemLogger.info('Creating RoomManager instance');
    this.clients = clients;
    this.repository = repository ?? getRoomRepository();

    // Initialize services
    this.initializeServices();

    // Start async initialization
    this.initPromise = this.initialize();
  }

  /**
   * Async initialization - loads rooms from repository
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.loadRooms();
    this.initialized = true;
    this.initPromise = null;
  }

  /**
   * Ensure the manager is initialized before performing operations
   */
  public async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) {
      await this.initPromise;
    }
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
    repository: IAsyncRoomRepository
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
        isTestMode: this.isTestMode.bind(this),
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

  private async loadRooms(): Promise<void> {
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

    // Load from repository (handles backend selection via RepositoryFactory)
    await this.loadRoomsFromRepository();
  }

  private async loadRoomsFromRepository(): Promise<void> {
    try {
      const roomDataArray = await this.repository.findAll();

      if (roomDataArray.length > 0) {
        this.loadPrevalidatedRooms(roomDataArray);
      } else {
        // No rooms found, save initial empty state
        this.saveRooms();
      }
    } catch (error) {
      systemLogger.error('[RoomManager] Error loading rooms from repository:', error);
    }
  }

  private saveRooms(): void {
    // Skip file persistence in test mode to avoid overwriting main game data
    if (this.testMode) {
      systemLogger.debug('[RoomManager] Skipping save - test mode active');
      return;
    }

    // Use async repository to save - fire-and-forget pattern to maintain sync interface
    void this.saveRoomsAsync().catch((error) => {
      systemLogger.error('[RoomManager] Save failed:', error);
    });
  }

  private async saveRoomsAsync(): Promise<void> {
    // Convert rooms to storable format, excluding the emergency void room
    const roomsData: RoomData[] = Array.from(this.rooms.values())
      .filter((room) => room.id !== EMERGENCY_ROOM_ID) // Never persist emergency room
      .map((room) => {
        // Convert NPC Map to an array of template IDs for storage
        const npcTemplateIds: string[] = [];
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
          items: room.items,
          itemInstances: serializedItemInstances,
          npcs: npcTemplateIds,
          flags: room.flags,
          currency: room.currency,
          areaId: room.areaId,
          gridX: room.gridX,
          gridY: room.gridY,
          gridZ: room.gridZ,
        };
      });

    await this.repository.saveAll(roomsData);
    systemLogger.debug(`[RoomManager] Saved ${roomsData.length} rooms`);
  }

  // Core room management methods
  public getRoom(roomId: string): Room | undefined {
    // Special handling for emergency room - create if needed
    if (roomId === EMERGENCY_ROOM_ID && !this.rooms.has(EMERGENCY_ROOM_ID)) {
      this.ensureEmergencyRoom();
    }
    return this.rooms.get(roomId);
  }

  /**
   * Creates the emergency void room if it doesn't exist.
   * This room is used when no other rooms are available.
   */
  public ensureEmergencyRoom(): Room {
    if (this.rooms.has(EMERGENCY_ROOM_ID)) {
      return this.rooms.get(EMERGENCY_ROOM_ID)!;
    }

    const emergencyRoom = new Room({
      id: EMERGENCY_ROOM_ID,
      name: 'The Void',
      description: `You float in an endless void. There are no rooms in this world yet.

=== WORLD BUILDER INSTRUCTIONS ===

To create rooms and build your world, follow these steps:

1. Access the Admin Panel:
   Open your browser and go to: http://localhost:8080/admin/

2. Navigate to World Builder:
   Click on "World Builder" in the left sidebar.

3. Create an Area:
   - Click "+ New Area" button
   - Enter an Area ID (e.g., "town-center")
   - Enter a name and description
   - Click "Create Area"

4. Create Rooms:
   - Select your new area from the list
   - Click on empty grid cells in the Room Map to create rooms
   - Fill in room details in the editor panel
   - Ctrl+click between rooms to create connections

5. Set Starting Room:
   - Go to "Config" in the sidebar
   - Under "Game Settings", set the Starting Room
   - Save your configuration

6. Reconnect:
   After creating rooms, type "quit" and log back in.

==========================================`,
      exits: [],
      areaId: '__system__',
      gridX: 0,
      gridY: 0,
    });

    // Add to rooms map but don't persist to disk
    this.rooms.set(EMERGENCY_ROOM_ID, emergencyRoom);
    systemLogger.info('Created emergency void room for world without rooms');

    return emergencyRoom;
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

  /**
   * Get the starting room ID for new players.
   * Priority:
   * 1. MUD config startingRoom (if room exists)
   * 2. Fallback: First area's room at gridX=0, gridY=0
   * 3. Ultimate fallback: DEFAULT_ROOM_ID constant
   */
  public getStartingRoomId(): string {
    // Debug: log room count
    systemLogger.debug(
      `[getStartingRoomId] Called. Rooms loaded: ${this.rooms.size}, initialized: ${this.initialized}`
    );

    // Try to load from MUD config
    const configPath = path.join(config.DATA_DIR, 'mud-config.json');
    if (fs.existsSync(configPath)) {
      try {
        const configData = fs.readFileSync(configPath, 'utf8');
        const mudConfig: MUDConfigStartingRoom = JSON.parse(configData);
        const configuredRoom = mudConfig.game?.startingRoom;

        // Check if the configured room exists
        if (configuredRoom && this.rooms.has(configuredRoom)) {
          return configuredRoom;
        }

        // Configured room doesn't exist, try fallback
        if (configuredRoom) {
          systemLogger.warn(
            `Configured starting room '${configuredRoom}' not found (have ${this.rooms.size} rooms), using fallback`
          );
        }
      } catch (error) {
        systemLogger.error('Error reading MUD config for starting room:', error);
      }
    }

    // Fallback: Find first area's room at (0,0)
    const fallbackRoom = this.findFallbackStartingRoom();
    if (fallbackRoom) {
      systemLogger.info(`Using fallback starting room: ${fallbackRoom}`);
      return fallbackRoom;
    }

    // Check if default room exists
    if (this.rooms.has(DEFAULT_ROOM_ID)) {
      return DEFAULT_ROOM_ID;
    }

    // If any rooms exist at all, return the first one
    if (this.rooms.size > 0) {
      const firstRoom = this.rooms.values().next().value;
      if (firstRoom) {
        systemLogger.warn(
          `No configured starting room, using first available room: ${firstRoom.id}`
        );
        return firstRoom.id;
      }
    }

    // Ultimate fallback: emergency room (will be created by GameState if needed)
    systemLogger.warn(`No rooms exist (size=${this.rooms.size})! Will use emergency void room.`);
    return EMERGENCY_ROOM_ID;
  }

  /**
   * Find a fallback starting room by looking for the room at (0,0) in the first area.
   */
  private findFallbackStartingRoom(): string | null {
    try {
      // Load areas to find the first one
      const areasPath = path.join(config.DATA_DIR, 'areas.json');
      if (fs.existsSync(areasPath)) {
        const areasData = fs.readFileSync(areasPath, 'utf8');
        const areas: Area[] = JSON.parse(areasData);

        if (areas.length > 0) {
          const firstArea = areas[0];

          // Find a room in the first area at (0,0)
          for (const room of this.rooms.values()) {
            if (room.areaId === firstArea.id && room.gridX === 0 && room.gridY === 0) {
              return room.id;
            }
          }

          // If no (0,0) room, just get any room from the first area
          for (const room of this.rooms.values()) {
            if (room.areaId === firstArea.id) {
              return room.id;
            }
          }
        }
      }
    } catch (error) {
      systemLogger.error('Error finding fallback starting room:', error);
    }

    return null;
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

  // ============================================================================
  // CRUD Methods for World Builder
  // ============================================================================

  /**
   * Create a new room from data
   */
  public async createRoom(roomData: RoomData): Promise<Room> {
    if (this.rooms.has(roomData.id)) {
      throw new Error(`Room '${roomData.id}' already exists`);
    }

    const room = new Room(roomData);
    this.rooms.set(roomData.id, room);
    await this.repository.save(roomData);
    systemLogger.info(`[RoomManager] Created room: ${roomData.id}`);
    return room;
  }

  /**
   * Update room data (overload for RoomData input)
   */
  public async updateRoomData(roomData: RoomData): Promise<void> {
    const room = this.rooms.get(roomData.id);
    if (!room) {
      throw new Error(`Room '${roomData.id}' not found`);
    }

    // Update in-memory room
    const newRoom = new Room(roomData);
    this.rooms.set(roomData.id, newRoom);

    // Persist
    await this.repository.save(roomData);
    systemLogger.info(`[RoomManager] Updated room: ${roomData.id}`);
  }

  /**
   * Delete a room
   */
  public async deleteRoom(roomId: string): Promise<void> {
    if (!this.rooms.has(roomId)) {
      throw new Error(`Room '${roomId}' not found`);
    }

    this.rooms.delete(roomId);
    await this.repository.delete(roomId);
    systemLogger.info(`[RoomManager] Deleted room: ${roomId}`);
  }

  /**
   * Connect two rooms with exits
   * Creates bidirectional exits between rooms
   */
  public async connectRooms(
    fromRoomId: string,
    toRoomId: string,
    fromDirection: string,
    toDirection: string
  ): Promise<void> {
    const fromRoom = this.getRoom(fromRoomId);
    const toRoom = this.getRoom(toRoomId);

    if (!fromRoom) {
      throw new Error(`Source room '${fromRoomId}' not found`);
    }
    if (!toRoom) {
      throw new Error(`Target room '${toRoomId}' not found`);
    }

    // Add exit from source to target
    const fromData = fromRoom.toData();
    const existingFromExit = fromData.exits.find((e: Exit) => e.direction === fromDirection);
    if (existingFromExit) {
      existingFromExit.roomId = toRoomId;
    } else {
      fromData.exits.push({ direction: fromDirection, roomId: toRoomId });
    }

    // Add exit from target to source
    const toData = toRoom.toData();
    const existingToExit = toData.exits.find((e: Exit) => e.direction === toDirection);
    if (existingToExit) {
      existingToExit.roomId = fromRoomId;
    } else {
      toData.exits.push({ direction: toDirection, roomId: fromRoomId });
    }

    // Save both rooms
    await this.updateRoomData(fromData);
    await this.updateRoomData(toData);
  }

  /**
   * Disconnect an exit from a room
   */
  public async disconnectExit(roomId: string, direction: string): Promise<void> {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new Error(`Room '${roomId}' not found`);
    }

    const data = room.toData();
    data.exits = data.exits.filter((e: Exit) => e.direction !== direction);
    await this.updateRoomData(data);
  }
}
