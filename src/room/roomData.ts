/**
 * Shared RoomData interface for room persistence
 * Used by repositories and managers for serialization/deserialization
 * @module room/roomData
 */

import { Currency, Exit, Item } from '../types';
import { NPC } from '../combat/npc';

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
}
