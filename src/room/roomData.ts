/**
 * Shared RoomData interface for room persistence
 * Used by repositories and managers for serialization/deserialization
 * @module room/roomData
 */

import { Currency, Exit, Item } from '../types';
import { NPC } from '../combat/npc';

// Re-export template and state interfaces for centralized access
export { RoomTemplate, RoomTemplateWithDefaults } from './roomTemplate';
export { RoomState, RoomStateData, SerializedItemInstance } from './roomState';

/**
 * Plain data representation of a Room
 * Used for storage and transfer, not runtime operations
 */
export interface RoomData {
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
  /** Area this room belongs to (optional for backward compatibility) */
  areaId?: string;
  /** Grid X coordinate for visual editor */
  gridX?: number;
  /** Grid Y coordinate for visual editor */
  gridY?: number;
  /** Floor/level for multi-level areas (optional) */
  gridZ?: number;
}
