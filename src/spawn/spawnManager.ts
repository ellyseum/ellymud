/**
 * SpawnManager - Handles automatic NPC spawning based on area configurations
 * Tracks NPC instances per area and respawns them according to spawnConfig rules
 * @module spawn/spawnManager
 */

import crypto from 'crypto';
import { AreaManager } from '../area/areaManager';
import { RoomManager } from '../room/roomManager';
import { Room } from '../room/room';
import { NPC } from '../combat/npc';
import { Merchant } from '../combat/merchant';
import { Area, AreaSpawnConfig } from '../area/area';
import { createContextLogger } from '../utils/logger';

const spawnLogger = createContextLogger('SpawnManager');

interface SpawnTracker {
  /** Area ID */
  areaId: string;
  /** NPC template ID */
  npcTemplateId: string;
  /** Current live instance IDs in this area */
  instances: Set<string>;
  /** Tick when last spawn occurred */
  lastSpawnTick: number;
  /** Config reference */
  config: AreaSpawnConfig;
}

/** Callback when NPC is spawned */
export type OnNPCSpawnedCallback = (npc: NPC, room: Room) => void;

export class SpawnManager {
  private static instance: SpawnManager | null = null;
  private areaManager: AreaManager;
  private roomManager: RoomManager;
  private spawnTrackers: Map<string, SpawnTracker> = new Map();
  private initialized: boolean = false;
  private onNPCSpawnedCallbacks: OnNPCSpawnedCallback[] = [];

  private constructor(areaManager: AreaManager, roomManager: RoomManager) {
    this.areaManager = areaManager;
    this.roomManager = roomManager;
  }

  public static getInstance(areaManager: AreaManager, roomManager: RoomManager): SpawnManager {
    if (!SpawnManager.instance) {
      SpawnManager.instance = new SpawnManager(areaManager, roomManager);
    }
    return SpawnManager.instance;
  }

  public static resetInstance(): void {
    SpawnManager.instance = null;
  }

  /**
   * Register a callback to be called when an NPC is spawned
   */
  public onNPCSpawned(callback: OnNPCSpawnedCallback): void {
    this.onNPCSpawnedCallbacks.push(callback);
  }

  /**
   * Initialize spawn trackers from area configurations
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    const areas = await this.areaManager.getAll();

    for (const area of areas) {
      this.initializeAreaTrackers(area);
    }

    this.initialized = true;
    spawnLogger.info(`SpawnManager initialized with ${this.spawnTrackers.size} spawn trackers`);
  }

  /**
   * Initialize trackers for a single area
   */
  private initializeAreaTrackers(area: Area): void {
    if (!area.spawnConfig || area.spawnConfig.length === 0) return;

    for (const config of area.spawnConfig) {
      const trackerId = `${area.id}:${config.npcTemplateId}`;

      // Count existing NPCs in this area
      const existingInstances = this.countExistingNPCs(area.id, config.npcTemplateId);

      this.spawnTrackers.set(trackerId, {
        areaId: area.id,
        npcTemplateId: config.npcTemplateId,
        instances: existingInstances,
        lastSpawnTick: 0,
        config,
      });

      spawnLogger.debug(
        `Tracker ${trackerId}: ${existingInstances.size}/${config.maxInstances} instances`
      );
    }
  }

  /**
   * Count existing NPCs of a type in an area
   */
  private countExistingNPCs(areaId: string, npcTemplateId: string): Set<string> {
    const instances = new Set<string>();
    const rooms = this.roomManager.getRoomsByArea(areaId);

    for (const room of rooms) {
      for (const [instanceId, npc] of room.npcs) {
        if (npc.templateId === npcTemplateId) {
          instances.add(instanceId);
        }
      }
    }

    return instances;
  }

  /**
   * Process spawning on game tick
   * Called by GameTimerManager each tick
   */
  public processTick(currentTick: number): void {
    if (!this.initialized) return;

    for (const tracker of this.spawnTrackers.values()) {
      // Clean up dead instances
      this.cleanupDeadInstances(tracker);

      // Check if we need to spawn
      const currentCount = tracker.instances.size;
      const maxInstances = tracker.config.maxInstances;

      if (currentCount >= maxInstances) {
        continue; // At capacity
      }

      // Check respawn cooldown
      const ticksSinceLastSpawn = currentTick - tracker.lastSpawnTick;
      if (ticksSinceLastSpawn < tracker.config.respawnTicks) {
        continue; // Still on cooldown
      }

      // Spawn one NPC
      const spawned = this.spawnNPC(tracker);
      if (spawned) {
        tracker.lastSpawnTick = currentTick;
        spawnLogger.debug(
          `Spawned ${tracker.npcTemplateId} in ${tracker.areaId} (${tracker.instances.size}/${maxInstances})`
        );
      }
    }
  }

  /**
   * Remove instances that no longer exist (were killed)
   */
  private cleanupDeadInstances(tracker: SpawnTracker): void {
    const rooms = this.roomManager.getRoomsByArea(tracker.areaId);
    const liveInstances = new Set<string>();

    for (const room of rooms) {
      for (const [instanceId, npc] of room.npcs) {
        if (npc.templateId === tracker.npcTemplateId) {
          liveInstances.add(instanceId);
        }
      }
    }

    // Update tracker with only live instances
    tracker.instances = liveInstances;
  }

  /**
   * Spawn a single NPC in the area
   */
  private spawnNPC(tracker: SpawnTracker): boolean {
    const npcData = NPC.loadNPCData();
    const template = npcData.get(tracker.npcTemplateId);

    if (!template) {
      spawnLogger.warn(`NPC template not found: ${tracker.npcTemplateId}`);
      return false;
    }

    // Get eligible rooms
    const rooms = this.getSpawnRooms(tracker);
    if (rooms.length === 0) {
      spawnLogger.warn(`No eligible spawn rooms for ${tracker.npcTemplateId} in ${tracker.areaId}`);
      return false;
    }

    // Pick a random room
    const room = rooms[Math.floor(Math.random() * rooms.length)];

    // Generate instance ID
    const instanceId = `${tracker.npcTemplateId}-${Date.now()}-${crypto.randomInt(1000)}`;

    // Check if this is a merchant
    const isMerchant = 'merchant' in template && template.merchant === true;

    let npc: NPC;
    if (isMerchant) {
      npc = new Merchant(
        template.name,
        template.health,
        template.maxHealth,
        template.damage,
        template.isHostile,
        template.isPassive,
        template.experienceValue,
        template.description,
        template.attackTexts,
        template.deathMessages,
        tracker.npcTemplateId,
        instanceId,
        template.inventory || [],
        [],
        []
      );
      (npc as Merchant).initializeInventory();
    } else {
      npc = new NPC(
        template.name,
        template.health,
        template.maxHealth,
        template.damage,
        template.isHostile,
        template.isPassive,
        template.experienceValue,
        template.description,
        template.attackTexts,
        template.deathMessages,
        tracker.npcTemplateId,
        instanceId,
        template.inventory || []
      );
    }

    // Add to room
    room.addNPC(npc);
    tracker.instances.add(instanceId);

    // Notify callbacks (e.g., MobilityManager)
    for (const callback of this.onNPCSpawnedCallbacks) {
      try {
        callback(npc, room);
      } catch (error) {
        spawnLogger.error('Error in onNPCSpawned callback:', error);
      }
    }

    spawnLogger.info(`Auto-spawned ${template.name} (${instanceId}) in room ${room.id}`);

    return true;
  }

  /**
   * Get eligible rooms for spawning in this tracker's area
   */
  private getSpawnRooms(tracker: SpawnTracker): Room[] {
    // If specific rooms configured, use those
    if (tracker.config.spawnRooms && tracker.config.spawnRooms.length > 0) {
      return tracker.config.spawnRooms
        .map((roomId) => this.roomManager.getRoom(roomId))
        .filter((room): room is Room => room !== undefined);
    }

    // Otherwise, all rooms in the area
    return this.roomManager.getRoomsByArea(tracker.areaId);
  }

  /**
   * Notify spawn manager that an NPC was killed
   * This triggers faster respawn tracking
   */
  public notifyNPCDeath(areaId: string, npcTemplateId: string, instanceId: string): void {
    const trackerId = `${areaId}:${npcTemplateId}`;
    const tracker = this.spawnTrackers.get(trackerId);

    if (tracker) {
      tracker.instances.delete(instanceId);
      spawnLogger.debug(
        `NPC death tracked: ${npcTemplateId} in ${areaId} (${tracker.instances.size}/${tracker.config.maxInstances})`
      );
    }
  }

  /**
   * Reload spawn configs from areas (call after area update)
   */
  public async reload(): Promise<void> {
    this.spawnTrackers.clear();
    this.initialized = false;
    await this.initialize();
  }

  /**
   * Get spawn status for debugging/admin
   */
  public getStatus(): { areaId: string; npcTemplateId: string; current: number; max: number }[] {
    const status: { areaId: string; npcTemplateId: string; current: number; max: number }[] = [];

    for (const tracker of this.spawnTrackers.values()) {
      status.push({
        areaId: tracker.areaId,
        npcTemplateId: tracker.npcTemplateId,
        current: tracker.instances.size,
        max: tracker.config.maxInstances,
      });
    }

    return status;
  }
}
