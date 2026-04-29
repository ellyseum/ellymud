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
import { CombatSystem } from '../combat/combatSystem';

const mobilityLogger = createContextLogger('MobilityManager');

/** In-place Fisher-Yates shuffle. */
function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

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

  /**
   * Optional ref to CombatSystem for the in-combat check during dispersal.
   * Wired in via setCombatSystem(); if absent, the dispersal pass falls
   * back to the npc.aggressors check (less precise but safe).
   */
  private combatSystem: CombatSystem | null = null;

  private constructor(roomManager: RoomManager) {
    this.roomManager = roomManager;
  }

  public static getInstance(roomManager: RoomManager): MobilityManager {
    if (!MobilityManager.instance) {
      MobilityManager.instance = new MobilityManager(roomManager);
    }
    return MobilityManager.instance;
  }

  /**
   * Inject the live CombatSystem for combat-aware dispersal. Optional —
   * MobilityManager works without it but can't catch the engage→first-swing
   * window on its own.
   */
  public setCombatSystem(combatSystem: CombatSystem): void {
    this.combatSystem = combatSystem;
  }

  public isMobile(instanceId: string): boolean {
    return this.mobileNPCs.has(instanceId);
  }

  /**
   * Count of NPCs in the room that count toward the population cap:
   * mobile (registered here), and not merchants. Stationary NPCs (vendors,
   * trainers) are never registered, so they're excluded automatically.
   */
  public getCountableNpcs(room: Room): NPC[] {
    const result: NPC[] = [];
    for (const npc of room.npcs.values()) {
      if (this.mobileNPCs.has(npc.instanceId) && !npc.isMerchant()) {
        result.push(npc);
      }
    }
    return result;
  }

  /**
   * Is this NPC currently engaged in combat? Prefers the targeter set
   * (set immediately at engage time), falls back to the NPC's aggressor
   * list if combatSystem isn't wired.
   */
  private isInCombat(npc: NPC, roomId: string): boolean {
    if (this.combatSystem) {
      return this.combatSystem.isEntityInCombat(roomId, npc.instanceId);
    }
    return npc.getAllAggressors().length > 0;
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

    this.processNormalMovement(currentTick);
    this.processOverflow(currentTick);
  }

  /**
   * Per-NPC random-walk movement subject to per-mob cooldowns.
   */
  private processNormalMovement(currentTick: number): void {
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
      if (this.isInCombat(npc, currentRoom.id)) {
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
   * Population-cap overflow pass — auto-disperses excess mobile NPCs to
   * neighboring rooms with available capacity. Combat-engaged mobs and
   * merchants are exempt. Backpressure-aware: maintains a per-tick
   * occupancy map so multiple dispersals don't pile into the same neighbor.
   */
  private processOverflow(currentTick: number): void {
    // Snapshot countable populations once per tick — we mutate this map as
    // dispersals execute so subsequent decisions see updated load.
    const virtualLoad = new Map<string, number>();
    const allRooms = this.roomManager.getAllRooms();
    for (const r of allRooms) {
      virtualLoad.set(r.id, this.getCountableNpcs(r).length);
    }

    for (const room of allRooms) {
      const cap = room.effectiveMaxMobs();
      if (cap === null) continue;
      const present = virtualLoad.get(room.id) ?? 0;
      if (present <= cap) continue;

      // Snapshot current NPC list AFTER any earlier dispersals already
      // mutated this room (re-read instead of using the pre-loop list).
      const candidates = this.getCountableNpcs(room).filter(
        (npc) => !this.isInCombat(npc, room.id)
      );
      if (candidates.length === 0) continue;

      shuffle(candidates);
      const overflow = present - cap;
      const toDisperse = candidates.slice(0, overflow);

      for (const npc of toDisperse) {
        const mobile = this.mobileNPCs.get(npc.instanceId);
        if (!mobile) continue;
        this.disperseMobile(mobile, npc, room, virtualLoad, currentTick);
      }
    }
  }

  /**
   * Move an overcrowded mob toward the neighbor with the most slack.
   * Returns false (mob stays) if no neighbor has positive slack — we
   * never push into a room that's already at-or-over its own cap.
   */
  private disperseMobile(
    mobile: MobileNPC,
    npc: NPC,
    room: Room,
    virtualLoad: Map<string, number>,
    currentTick: number
  ): boolean {
    const exits = this.getValidExits(mobile, room);
    if (exits.length === 0) return false;

    type Ranked = {
      exit: { direction: string; roomId: string };
      dest: Room;
      slack: number;
    };

    const ranked: Ranked[] = [];
    for (const exit of exits) {
      const dest = this.roomManager.getRoom(exit.roomId);
      if (!dest) continue;
      const destCap = dest.effectiveMaxMobs();
      const destLoad = virtualLoad.get(dest.id) ?? this.getCountableNpcs(dest).length;
      const slack = destCap === null ? Infinity : destCap - destLoad;
      if (slack > 0) ranked.push({ exit, dest, slack });
    }

    if (ranked.length === 0) return false; // honor stay-put when neighbors are full

    // Pick the highest-slack exit; random tie-break among the tied subset.
    ranked.sort((a, b) => b.slack - a.slack);
    const topSlack = ranked[0].slack;
    const tied = ranked.filter((r) => r.slack === topSlack);
    shuffle(tied);
    const chosen = tied[0];

    const moved = this.executeNpcMove(mobile, npc, room, chosen.exit, chosen.dest, currentTick);
    if (moved) {
      virtualLoad.set(room.id, (virtualLoad.get(room.id) ?? 1) - 1);
      virtualLoad.set(chosen.dest.id, (virtualLoad.get(chosen.dest.id) ?? 0) + 1);
    }
    return moved;
  }

  /**
   * Execute a single NPC move from one room to another. Re-validates at
   * execution time (NPC still in source, alive, not in combat) since
   * selection and execution can happen at different points in a tick.
   * Honors the safe-zone invariant via Room.addNPC's boolean return —
   * if the destination rejects, the NPC is restored to the source room.
   */
  private executeNpcMove(
    mobile: MobileNPC,
    npc: NPC,
    fromRoom: Room,
    exit: { direction: string; roomId: string },
    toRoom: Room,
    currentTick: number
  ): boolean {
    if (!fromRoom.npcs.has(npc.instanceId)) return false;
    if (!npc.isAlive()) return false;
    if (this.isInCombat(npc, fromRoom.id)) return false;

    fromRoom.removeNPC(npc.instanceId);
    this.broadcastToRoom(fromRoom, `A ${npc.name} leaves ${exit.direction}.`);

    const added = toRoom.addNPC(npc);
    if (!added) {
      // Refuge invariant rejected the entry — put the mob back where it was.
      fromRoom.addNPC(npc);
      mobilityLogger.debug(
        `Move from ${fromRoom.id} to ${toRoom.id} rejected by addNPC (likely safe-zone refusal); ${npc.name} stays.`
      );
      return false;
    }

    const oppositeDirection = this.getOppositeDirection(exit.direction);
    this.broadcastToRoom(toRoom, `A ${npc.name} arrives from the ${oppositeDirection}.`);
    mobile.currentRoomId = toRoom.id;
    mobile.lastMoveTick = currentTick;
    return true;
  }

  /**
   * Move an NPC to a random adjacent room (the regular wandering path).
   * Caller is the per-tick movement loop, which has already filtered for
   * cooldown / combat / merchant. Population-cap dispersal goes through
   * disperseMobile → executeNpcMove instead.
   */
  private moveNPC(mobile: MobileNPC, npc: NPC, currentRoom: Room): boolean {
    const validExits = this.getValidExits(mobile, currentRoom);
    if (validExits.length === 0) return false;

    const exitIndex = Math.floor(Math.random() * validExits.length);
    const chosenExit = validExits[exitIndex];
    const destRoom = this.roomManager.getRoom(chosenExit.roomId);
    if (!destRoom) return false;

    return this.executeNpcMove(mobile, npc, currentRoom, chosenExit, destRoom, mobile.lastMoveTick);
  }

  /**
   * Get valid exits for an NPC to move through
   */
  private getValidExits(
    mobile: MobileNPC,
    room: Room
  ): Array<{ direction: string; roomId: string }> {
    const validExits: Array<{ direction: string; roomId: string }> = [];

    // Look up the actual NPC instance to check hostility — MobileNPC tracker
    // doesn't carry that flag.
    const npcInstance = room.getNPC(mobile.instanceId);
    const isHostile = npcInstance?.isHostile === true;

    for (const exit of room.exits) {
      const destRoom = this.roomManager.getRoom(exit.roomId);
      if (!destRoom) continue;

      // Stay-in-area constraint
      if (mobile.staysInArea && mobile.spawnAreaId && destRoom.areaId !== mobile.spawnAreaId) {
        continue;
      }

      // Refuge invariant: hostile NPCs do not wander into safe rooms.
      // Room.addNPC also rejects this on actual entry; pre-filtering here
      // avoids generating a noisy reject + wasted move attempt.
      if (isHostile && destRoom.flags?.includes('safe')) {
        continue;
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
