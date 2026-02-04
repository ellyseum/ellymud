/**
 * Movement Event Bus
 *
 * Provides event-driven communication for the movement system.
 * Used by auto-walk and other systems that need to react to movement.
 *
 * @module room/services/movementEventBus
 */

import { EventEmitter } from 'events';

/**
 * Movement event data
 */
export interface MovementEventData {
  clientId: string;
  username: string;
  fromRoomId: string;
  toRoomId: string;
  direction: string;
}

/**
 * Movement start event - fired when player begins moving
 */
export interface MovementStartEvent extends MovementEventData {
  /** Expected delay in milliseconds */
  delay: number;
}

/**
 * Movement complete event - fired when player arrives
 */
export interface MovementCompleteEvent extends MovementEventData {
  /** Whether movement succeeded */
  success: boolean;
}

/**
 * Movement cancelled event - fired when movement is interrupted
 */
export interface MovementCancelledEvent {
  clientId: string;
  username: string;
  reason: string;
}

/**
 * Global movement event bus
 */
class MovementEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Many clients may have active walks
  }

  /**
   * Emit movement start event
   */
  emitStart(data: MovementStartEvent): void {
    this.emit('movement:start', data);
    this.emit(`movement:start:${data.clientId}`, data);
  }

  /**
   * Emit movement complete event
   */
  emitComplete(data: MovementCompleteEvent): void {
    this.emit('movement:complete', data);
    this.emit(`movement:complete:${data.clientId}`, data);
  }

  /**
   * Emit movement cancelled event
   */
  emitCancelled(data: MovementCancelledEvent): void {
    this.emit('movement:cancelled', data);
    this.emit(`movement:cancelled:${data.clientId}`, data);
  }

  /**
   * Subscribe to movement complete for a specific client
   */
  onClientComplete(clientId: string, callback: (data: MovementCompleteEvent) => void): () => void {
    const handler = (data: MovementCompleteEvent) => callback(data);
    this.on(`movement:complete:${clientId}`, handler);
    return () => this.off(`movement:complete:${clientId}`, handler);
  }

  /**
   * Subscribe to movement cancelled for a specific client
   */
  onClientCancelled(
    clientId: string,
    callback: (data: MovementCancelledEvent) => void
  ): () => void {
    const handler = (data: MovementCancelledEvent) => callback(data);
    this.on(`movement:cancelled:${clientId}`, handler);
    return () => this.off(`movement:cancelled:${clientId}`, handler);
  }
}

export const movementEventBus = new MovementEventBus();
