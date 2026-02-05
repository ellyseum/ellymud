/**
 * MobilityManager - Handles automatic NPC movement between rooms
 * Tracks NPC movement timers and moves them through valid exits
 * @module mobility/mobilityManager
 */

import { RoomManager } from '../room/roomManager';
import { Room } from '../room/room';
import { NPC } from '../combat/npc';
import { createContextLogger } from '../utils/logger';
import { ClientManager } from '../client/clientManager';
import { writeMessageToClient } from '../utils/socketWriter';

const mobilityLogger = createContextLogger('MobilityManager');

interface MobileNPC {
  /** NPC instance ID */
  instanceId: string;
  /** NPC template ID */
  templateId: string;
  /** Tick when last move occurred */
  lastMoveTick: number;
  /** Ticks between moves */
  movementTicks: number;
  /** Whether NPC stays in spawn area */
  staysInArea: boolean;
  /** Current room ID */
  currentRoomId: string;
  /** Spawn area ID (for staysInArea check) */
  spawnAreaId?: string;
}

export class MobilityManager {
  private static instance: MobilityManager | null = null;
  private roomManager: RoomManager;
  private mobileNPCs: Map<string, MobileNPC> = new Map();
  private initialized: boolean = false;

  private constructor(roomManager: RoomManager) {
    this.roomManager = roomManager;
  }

  public static getInstance(roomManager: RoomManager): MobilityManager {
    if (!MobilityManager.instance) {
      MobilityManager.instance = new MobilityManager(roomManager);
    }
    return MobilityManager.instance;
  }

  public static resetInstance(): void {
    MobilityManager.instance = null;
  }

  /**
   * Initialize by scanning all rooms for mobile NPCs
   */
  public initialize(): void {
    if (this.initialized) return;

    const rooms = this.roomManager.getAllRooms();

    for (const room of rooms) {
      for (const npc of room.npcs.values()) {
        this.registerNPC(npc, room);
      }
    }

    this.initialized = true;
    mobilityLogger.info(`MobilityManager initialized with ${this.mobileNPCs.size} mobile NPCs`);
  }

  /**
   * Register an NPC for mobility tracking
   */
  public registerNPC(npc: NPC, room: Room): void {
    const npcData = NPC.loadNPCData();
    const template = npcData.get(npc.templateId);

    if (!template) return;

    // Check if NPC is stationary (never moves - vendors, trainers, etc.)
    const isStationary =
      'stationary' in template && (template as { stationary?: boolean }).stationary === true;
    if (isStationary) return;

    // Check if NPC can move (using template data or defaults)
    const canMove = 'canMove' in template && (template as { canMove?: boolean }).canMove === true;
    if (!canMove) return;

    const movementTicks =
      'movementTicks' in template
        ? ((template as { movementTicks?: number }).movementTicks ?? 30)
        : 30;
    const staysInArea =
      'staysInArea' in template
        ? ((template as { staysInArea?: boolean }).staysInArea ?? true)
        : true;

    this.mobileNPCs.set(npc.instanceId, {
      instanceId: npc.instanceId,
      templateId: npc.templateId,
      lastMoveTick: 0,
      movementTicks,
      staysInArea,
      currentRoomId: room.id,
      spawnAreaId: room.areaId,
    });

    mobilityLogger.debug(
      `Registered mobile NPC: ${npc.name} (${npc.instanceId}) in room ${room.id}`
    );
  }

  /**
   * Unregister an NPC from mobility tracking (when killed)
   */
  public unregisterNPC(instanceId: string): void {
    this.mobileNPCs.delete(instanceId);
  }

  /**
   * Process NPC movement on game tick
   */
  public processTick(currentTick: number): void {
    if (!this.initialized) return;

    for (const [instanceId, mobile] of this.mobileNPCs) {
      // Check movement cooldown
      const ticksSinceLastMove = currentTick - mobile.lastMoveTick;
      if (ticksSinceLastMove < mobile.movementTicks) {
        continue;
      }

      // Verify NPC still exists
      const currentRoom = this.roomManager.getRoom(mobile.currentRoomId);
      if (!currentRoom) {
        this.mobileNPCs.delete(instanceId);
        continue;
      }

      const npc = currentRoom.getNPC(instanceId);
      if (!npc) {
        this.mobileNPCs.delete(instanceId);
        continue;
      }

      // Don't move NPCs that are in combat
      if (npc.getAllAggressors().length > 0) {
        continue;
      }

      // Don't move merchants
      if (npc.isMerchant()) {
        continue;
      }

      // Try to move
      const moved = this.moveNPC(mobile, npc, currentRoom);
      if (moved) {
        mobile.lastMoveTick = currentTick;
      }
    }
  }

  /**
   * Move an NPC to an adjacent room
   */
  private moveNPC(mobile: MobileNPC, npc: NPC, currentRoom: Room): boolean {
    // Get valid exits
    const validExits = this.getValidExits(mobile, currentRoom);
    if (validExits.length === 0) {
      return false;
    }

    // Pick a random exit
    const exitIndex = Math.floor(Math.random() * validExits.length);
    const chosenExit = validExits[exitIndex];

    // Get destination room
    const destRoom = this.roomManager.getRoom(chosenExit.roomId);
    if (!destRoom) {
      return false;
    }

    // Remove from current room
    currentRoom.removeNPC(npc.instanceId);

    // Broadcast departure message to current room
    this.broadcastToRoom(currentRoom, `A ${npc.name} leaves ${chosenExit.direction}.`);

    // Add to destination room
    destRoom.addNPC(npc);

    // Broadcast arrival message to destination room
    const oppositeDirection = this.getOppositeDirection(chosenExit.direction);
    this.broadcastToRoom(destRoom, `A ${npc.name} arrives from the ${oppositeDirection}.`);

    // Update tracking
    mobile.currentRoomId = destRoom.id;

    mobilityLogger.debug(
      `NPC ${npc.name} (${npc.instanceId}) moved from ${currentRoom.id} to ${destRoom.id}`
    );

    return true;
  }

  /**
   * Get valid exits for an NPC to move through
   */
  private getValidExits(
    mobile: MobileNPC,
    room: Room
  ): Array<{ direction: string; roomId: string }> {
    const validExits: Array<{ direction: string; roomId: string }> = [];

    for (const exit of room.exits) {
      // Check if destination is in the same area (if staysInArea is true)
      if (mobile.staysInArea && mobile.spawnAreaId) {
        const destRoom = this.roomManager.getRoom(exit.roomId);
        if (!destRoom || destRoom.areaId !== mobile.spawnAreaId) {
          continue;
        }
      }

      validExits.push({ direction: exit.direction, roomId: exit.roomId });
    }

    return validExits;
  }

  /**
   * Get the opposite direction for arrival messages
   */
  private getOppositeDirection(direction: string): string {
    const opposites: Record<string, string> = {
      north: 'south',
      south: 'north',
      east: 'west',
      west: 'east',
      northeast: 'southwest',
      northwest: 'southeast',
      southeast: 'northwest',
      southwest: 'northeast',
      up: 'below',
      down: 'above',
    };

    return opposites[direction.toLowerCase()] || direction;
  }

  /**
   * Broadcast a message to all players in a room
   */
  private broadcastToRoom(room: Room, message: string): void {
    const clientManager = ClientManager.getInstance();

    for (const playerName of room.players) {
      const client = clientManager.getClientByUsername(playerName);
      if (client) {
        writeMessageToClient(client, `\r\n${message}\r\n`);
      }
    }
  }

  /**
   * Get status for debugging/admin
   */
  public getStatus(): Array<{
    instanceId: string;
    templateId: string;
    currentRoomId: string;
    movementTicks: number;
    staysInArea: boolean;
  }> {
    const status: Array<{
      instanceId: string;
      templateId: string;
      currentRoomId: string;
      movementTicks: number;
      staysInArea: boolean;
    }> = [];

    for (const mobile of this.mobileNPCs.values()) {
      status.push({
        instanceId: mobile.instanceId,
        templateId: mobile.templateId,
        currentRoomId: mobile.currentRoomId,
        movementTicks: mobile.movementTicks,
        staysInArea: mobile.staysInArea,
      });
    }

    return status;
  }

  /**
   * Reload by rescanning all rooms
   */
  public reload(): void {
    this.mobileNPCs.clear();
    this.initialized = false;
    this.initialize();
  }
}
