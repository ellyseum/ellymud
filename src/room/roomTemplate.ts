/**
 * RoomTemplate interface - static room definitions
 * Contains immutable room data that doesn't change during gameplay
 * @module room/roomTemplate
 */

import { Exit } from '../types';

/**
 * Core room template data - static/immutable configuration
 * This data is loaded once from rooms.json and never saved during gameplay
 */
export interface RoomTemplate {
  id: string;
  name: string;
  description: string;
  exits: Exit[];
  flags: string[];
  areaId?: string;
  gridX?: number;
  gridY?: number;
}

/**
 * Extended template that includes default spawns
 * Used for room initialization
 */
export interface RoomTemplateWithDefaults extends RoomTemplate {
  defaultNpcs?: string[];
}
