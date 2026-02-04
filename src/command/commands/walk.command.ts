/**
 * Walk Command - Auto-navigate to a destination
 *
 * Usage:
 *   walk <room-name>    - Find and walk to a room by name
 *   walk <room-id>      - Walk to a room by ID
 *
 * Auto-walk is cancelled by:
 *   - Entering any command
 *   - Movement failure (no exit, blocked path)
 *   - Taking damage / entering combat
 *
 * @module command/commands/walk
 */

import { ConnectedClient } from '../../types';
import { Command } from '../command.interface';
import { RoomManager } from '../../room/roomManager';
import { colorize } from '../../utils/colors';
import { writeToClient } from '../../utils/socketWriter';
import { findPathByName } from '../../utils/pathfinder';
import { getPlayerLogger } from '../../utils/logger';
import {
  movementEventBus,
  MovementCompleteEvent,
  MovementCancelledEvent,
} from '../../room/services/movementEventBus';

/** Active walks by client ID */
const activeWalks = new Map<string, WalkState>();

interface WalkState {
  path: string[]; // Remaining directions to walk
  destination: string; // Final room ID
  destinationName: string; // Destination room name (for messages)
  /** Unsubscribe function for movement complete listener */
  unsubscribeComplete: () => void;
  /** Unsubscribe function for movement cancelled listener */
  unsubscribeCancelled: () => void;
}

export class WalkCommand implements Command {
  name = 'walk';
  description = 'Auto-walk to a destination room';
  aliases = ['goto', 'autowalk'];
  private roomManager: RoomManager;

  constructor(private clients: Map<string, ConnectedClient>) {
    this.roomManager = RoomManager.getInstance(clients);
  }

  execute(client: ConnectedClient, args: string): void {
    if (!client.user) {
      writeToClient(client, colorize('You must be logged in.\r\n', 'red'));
      return;
    }

    const playerLogger = getPlayerLogger(client.user.username);
    const arg = args.trim().toLowerCase();

    // Check if already walking
    if (activeWalks.has(client.id)) {
      writeToClient(
        client,
        colorize("You're already auto-walking. Use 'walk stop' to cancel.\r\n", 'yellow')
      );
      return;
    }

    if (!arg) {
      writeToClient(client, colorize('Usage: walk <destination> or walk stop\r\n', 'yellow'));
      return;
    }

    // Get current room
    const currentRoomId = client.user.currentRoomId || this.roomManager.getStartingRoomId();

    // Find path to destination
    const result = findPathByName(currentRoomId, arg, this.roomManager);

    if (!result.found) {
      writeToClient(client, colorize(`Cannot find path: ${result.error}\r\n`, 'red'));
      return;
    }

    if (result.path.length === 0) {
      writeToClient(client, colorize("You're already there!\r\n", 'green'));
      return;
    }

    // Get destination room name for display
    const destRoom = this.roomManager.getRoom(result.roomIds[result.roomIds.length - 1]);
    const destName = destRoom?.name || 'destination';

    playerLogger.info(`Starting auto-walk to ${destName} (${result.steps} steps)`);

    writeToClient(
      client,
      colorize(`Starting auto-walk to ${destName} (${result.steps} steps)...\r\n`, 'cyan')
    );

    // Start walking
    this.startWalk(client, result.path, result.roomIds[result.roomIds.length - 1], destName);
  }

  /**
   * Start auto-walking along a path using event-driven movement
   */
  private startWalk(
    client: ConnectedClient,
    path: string[],
    destination: string,
    destinationName: string
  ): void {
    // Set up event listeners for this client
    const unsubscribeComplete = movementEventBus.onClientComplete(
      client.id,
      (data: MovementCompleteEvent) => this.onMovementComplete(client, data)
    );

    const unsubscribeCancelled = movementEventBus.onClientCancelled(
      client.id,
      (data: MovementCancelledEvent) => this.onMovementCancelled(client, data)
    );

    const walkState: WalkState = {
      path: [...path],
      destination,
      destinationName,
      unsubscribeComplete,
      unsubscribeCancelled,
    };

    activeWalks.set(client.id, walkState);

    // Start the first step
    this.walkStep(client);
  }

  /**
   * Execute one step of the walk
   */
  private walkStep(client: ConnectedClient): void {
    const state = activeWalks.get(client.id);
    if (!state) return;

    // Check if client still valid
    if (!client.user) {
      this.cleanupWalk(client, true);
      return;
    }

    // Get next direction
    const direction = state.path.shift();
    if (!direction) {
      // Arrived!
      writeToClient(client, colorize(`You have arrived at ${state.destinationName}.\r\n`, 'green'));
      this.cleanupWalk(client, true);
      return;
    }

    // Attempt to move - the movement service will emit events when complete/cancelled
    const success = this.roomManager.movePlayer(client, direction);

    if (!success) {
      // Movement failed immediately (no exit, restricted, etc.)
      writeToClient(
        client,
        colorize(`Auto-walk interrupted: cannot move ${direction}.\r\n`, 'red')
      );
      this.cleanupWalk(client, true);
    }
    // If success, we wait for the movement:complete event to trigger the next step
  }

  /**
   * Handle movement completion event - trigger next step
   */
  private onMovementComplete(client: ConnectedClient, _data: MovementCompleteEvent): void {
    const state = activeWalks.get(client.id);
    if (!state) return;

    // Check if we've arrived
    if (state.path.length === 0) {
      writeToClient(client, colorize(`You have arrived at ${state.destinationName}.\r\n`, 'green'));
      this.cleanupWalk(client, true);
      return;
    }

    // Continue to next step
    this.walkStep(client);
  }

  /**
   * Handle movement cancelled event - stop auto-walk
   */
  private onMovementCancelled(client: ConnectedClient, data: MovementCancelledEvent): void {
    const state = activeWalks.get(client.id);
    if (!state) return;

    writeToClient(client, colorize(`Auto-walk interrupted: ${data.reason}.\r\n`, 'red'));
    this.cleanupWalk(client, true);
  }

  /**
   * Clean up walk state and event listeners
   */
  private cleanupWalk(client: ConnectedClient, _silent: boolean = false): void {
    const state = activeWalks.get(client.id);
    if (state) {
      // Unsubscribe from events
      state.unsubscribeComplete();
      state.unsubscribeCancelled();
      activeWalks.delete(client.id);
    }
    // Note: _silent parameter kept for API compatibility but messages are handled by callers
  }

  /**
   * Check if a client is currently auto-walking
   * Used by other systems to check walk state
   */
  public static isWalking(clientId: string): boolean {
    return activeWalks.has(clientId);
  }

  /**
   * Interrupt a walk (called by combat, damage, user input, etc.)
   */
  public static interrupt(client: ConnectedClient, reason: string): void {
    const state = activeWalks.get(client.id);
    if (state) {
      // Unsubscribe from events
      state.unsubscribeComplete();
      state.unsubscribeCancelled();
      activeWalks.delete(client.id);
      writeToClient(client, colorize(`Auto-walk interrupted: ${reason}\r\n`, 'yellow'));
    }
  }
}
