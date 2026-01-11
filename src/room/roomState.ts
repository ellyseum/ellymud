/**
 * RoomState interface - mutable room data
 * Contains runtime state that changes during gameplay and is persisted via autosave
 * @module room/roomState
 */

import { Currency } from '../types';

/**
 * Serialized item instance for storage
 * Minimal representation to reconstruct item instances
 */
export interface SerializedItemInstance {
  instanceId: string;
  templateId: string;
}

/**
 * Room state data - mutable runtime state
 * This data is saved periodically via autosave to room_state.json
 */
export interface RoomState {
  roomId: string;
  itemInstances: SerializedItemInstance[];
  npcTemplateIds: string[];
  currency: Currency;
  items?: string[];
}

/**
 * Array of room states for bulk operations
 */
export type RoomStateData = RoomState[];
