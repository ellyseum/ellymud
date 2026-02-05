/**
 * Area entity and related types
 * Areas group rooms together with shared properties like spawn rules and combat config
 * @module area/area
 */

/**
 * Combat configuration for an area
 * Controls PvP, difficulty, and XP rewards
 */
export interface AreaCombatConfig {
  /** Whether player vs player combat is enabled */
  pvpEnabled: boolean;
  /** Difficulty scale 1-10, affects mob stats */
  dangerLevel: number;
  /** XP multiplier, 1.0 = normal */
  xpMultiplier: number;
  /** Maximum NPCs allowed per room (default: 3 for low danger, 5 for high) */
  maxNpcsPerRoom?: number;
  /** Maximum total NPCs in the entire area (default: sum of spawnConfig maxInstances) */
  maxTotalNpcs?: number;
}

/**
 * NPC spawn configuration for an area
 * Defines which NPCs spawn, how many, and how often
 */
export interface AreaSpawnConfig {
  /** Template ID from data/npcs.json */
  npcTemplateId: string;
  /** Maximum concurrent instances */
  maxInstances: number;
  /** Ticks between respawns (12 ticks = 1 minute) */
  respawnTicks: number;
  /** Specific room IDs, or all rooms if empty */
  spawnRooms?: string[];
}

/**
 * Area entity - a collection of rooms with shared properties
 */
export interface Area {
  /** Unique identifier (e.g., 'enchanted-forest') */
  id: string;
  /** Display name */
  name: string;
  /** Area description for world builders */
  description: string;
  /** Recommended level range */
  levelRange: { min: number; max: number };
  /** Area-level flags (e.g., 'no-recall', 'quest-zone') */
  flags: string[];
  /** Optional combat configuration */
  combatConfig?: AreaCombatConfig;
  /** NPC spawn rules */
  spawnConfig: AreaSpawnConfig[];
  /** Flags applied to new rooms in this area */
  defaultRoomFlags?: string[];
  /** ISO timestamp of creation */
  created: string;
  /** ISO timestamp of last modification */
  modified: string;
}

/**
 * Data transfer object for creating a new area
 */
export interface CreateAreaDTO {
  id: string;
  name: string;
  description?: string;
  levelRange?: { min: number; max: number };
  flags?: string[];
  combatConfig?: AreaCombatConfig;
  defaultRoomFlags?: string[];
}

/**
 * Data transfer object for updating an area
 */
export interface UpdateAreaDTO {
  name?: string;
  description?: string;
  levelRange?: { min: number; max: number };
  flags?: string[];
  combatConfig?: AreaCombatConfig;
  spawnConfig?: AreaSpawnConfig[];
  defaultRoomFlags?: string[];
}
