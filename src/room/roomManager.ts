// Room manager handles room data and NPC instantiation
import fs from 'fs';
import path from 'path';
import { Room } from './room';
import { RoomData } from './roomData';
import { ConnectedClient } from '../types';
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

const DEFAULT_ROOM_ID = 'start'; // ID for the starting room

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
    // Convert rooms to storable format
    const roomsData: RoomData[] = Array.from(this.rooms.values()).map((room) => {
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
      };
    });

    await this.repository.saveAll(roomsData);
    systemLogger.debug(`[RoomManager] Saved ${roomsData.length} rooms`);
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
