import { IConnection } from './connection/interfaces/connection.interface';

// State data type - uses Record<string, unknown> to allow any value while still
// being more type-safe than `any`. Code accessing stateData must narrow types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StateData = Record<string, any>;

// Minimal interface for admin monitor socket - only emit and connected are used
export interface AdminMonitorSocket {
  emit(event: string, data: unknown): void;
  connected?: boolean;
}

// Define state enum
export enum ClientStateType {
  CONNECTING = 'connecting',
  LOGIN = 'login',
  SIGNUP = 'signup',
  RACE_SELECTION = 'race_selection', // Race selection during character creation
  CONFIRMATION = 'confirmation',
  AUTHENTICATED = 'authenticated',
  TRANSFER_REQUEST = 'transfer_request', // New state for handling session transfers
  SNAKE_GAME = 'snake_game', // New state for playing Snake game
  GAME = 'game', // Active gameplay state (player in world)
  EDITOR = 'editor', // Editor state (player detached from world for stat/character editing)
}

// Define equipment slots
export enum EquipmentSlot {
  HEAD = 'head',
  NECK = 'neck',
  CHEST = 'chest',
  BACK = 'back',
  ARMS = 'arms',
  HANDS = 'hands',
  FINGER = 'finger',
  WAIST = 'waist',
  LEGS = 'legs',
  FEET = 'feet',
  MAIN_HAND = 'mainHand',
  OFF_HAND = 'offHand',
}

// Define Item interface
export interface Item {
  name: string;
  description?: string;
}

// Define Exit interface
export interface Exit {
  direction: string;
  roomId: string;
}

// Define Currency interface
export interface Currency {
  gold: number;
  silver: number;
  copper: number;
}

// Number range for variable quantities
export interface NumberRange {
  min: number;
  max: number;
}

// NPC inventory item configuration (for drops and merchant stock)
export interface NPCInventoryItem {
  itemId: string; // Item template ID (e.g., "sword-001")
  itemCount: number | NumberRange; // Fixed count or random range
  spawnRate: number; // 0-1 probability (0 = 0%, 1 = 100%)
  spawnPeriod?: number; // Cooldown in seconds before another can spawn (optional)
  lastSpawned?: string; // ISO timestamp of last spawn (for tracking cooldown)
}

// Restock period units for merchant inventory
export type RestockPeriodUnit = 'minutes' | 'hours' | 'days' | 'weeks';

// Merchant stock configuration for a single item type
export interface MerchantStockConfig {
  templateId: string; // Item template ID
  maxStock: number; // Maximum quantity that can be stocked
  restockAmount: number; // How many to restock each period
  restockPeriod: number; // Restock interval value
  restockUnit: RestockPeriodUnit; // Restock interval unit
  lastRestock?: string; // ISO timestamp of last restock (for persistence)
}

// Define GameItem interface for equipment
export interface GameItem {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'consumable' | 'quest' | 'misc';
  slot?: EquipmentSlot; // Where the item is equipped, using the EquipmentSlot enum
  value: number; // Currency value
  weight?: number;
  globalLimit?: number; // Maximum instances that can exist in the entire game (undefined = unlimited)
  stats?: {
    attack?: number;
    defense?: number;
    strength?: number;
    dexterity?: number;
    agility?: number;
    constitution?: number;
    wisdom?: number;
    intelligence?: number;
    charisma?: number;
  };
  requirements?: {
    level?: number;
    strength?: number;
    dexterity?: number;
  };
}

// Define ItemTemplate interface (for item definitions)
export interface ItemTemplate {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'consumable' | 'quest' | 'misc';
  slot?: EquipmentSlot;
  value: number;
  weight?: number;
  globalLimit?: number; // Maximum instances that can exist in the entire game (undefined = unlimited)
  stats?: {
    attack?: number;
    defense?: number;
    strength?: number;
    dexterity?: number;
    agility?: number;
    constitution?: number;
    wisdom?: number;
    intelligence?: number;
    charisma?: number;
  };
  requirements?: {
    level?: number;
    strength?: number;
    dexterity?: number;
  };
}

// Define ItemInstance interface (for specific item instances)
export interface ItemInstance {
  instanceId: string; // Unique instance ID
  templateId: string; // Reference to the item template
  created: Date; // When this item was created
  createdBy: string; // Who/what created this item (player, spawn, quest, etc)
  properties?: {
    // Instance-specific properties
    customName?: string; // Custom name given to this item instance
    durability?: {
      // Durability system
      current: number; // Current durability
      max: number; // Maximum durability
    };
    quality?: 'poor' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'; // Item quality
    soulbound?: boolean; // Whether item is bound to a specific player
    boundTo?: string; // Username item is bound to (if soulbound)
    charges?: number; // For items with limited uses
    enchantments?: {
      // Additional enchantments
      name: string;
      effect: string;
      bonuses?: { [stat: string]: number };
    }[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any; // Allow for other custom properties
  };
  history?: {
    // Optional: track item history
    timestamp: Date;
    event: string;
    details?: string;
  }[];
}

// Race definition interface
export interface Race {
  id: string;
  name: string;
  description: string;
  statModifiers: {
    strength: number;
    dexterity: number;
    agility: number;
    constitution: number;
    wisdom: number;
    intelligence: number;
    charisma: number;
  };
  bonuses: {
    xpGain?: number; // Percentage bonus to XP gained
    maxMana?: number; // Percentage bonus to max mana
    maxHealth?: number; // Percentage bonus to max health
    critChance?: number; // Percentage bonus to critical hit chance
    attack?: number; // Percentage bonus to attack damage
  };
  bonusDescription: string;
}

// Class definition interface
export interface CharacterClass {
  id: string;
  name: string;
  description: string;
  tier: number; // 0 = adventurer, 1 = tier 1, 2 = tier 2
  requirements: {
    level: number;
    previousClass: string | null;
    questFlag: string | null;
    trainerType: string | null;
  };
  statBonuses: {
    maxHealth: number;
    maxMana: number;
    attack: number;
    defense: number;
  };
  availableAdvancement: string[]; // Class IDs that can be advanced to
}

export interface User {
  username: string;
  password?: string; // Making optional for backward compatibility
  passwordHash?: string;
  salt?: string;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  experience: number;
  level: number;
  // Race and class system
  raceId?: string; // "human", "elf", "dwarf", "halfling", "orc"
  classId?: string; // "adventurer", "fighter", "magic_user", etc.
  classHistory?: string[]; // Track progression path through classes
  questFlags?: string[]; // For tier 2 class requirements
  unspentAttributePoints?: number; // Points to allocate on level up
  // Track how many points player has allocated to each stat (for cost scaling)
  allocatedStats?: {
    strength: number;
    dexterity: number;
    agility: number;
    constitution: number;
    wisdom: number;
    intelligence: number;
    charisma: number;
  };
  // Add character statistics
  strength: number;
  dexterity: number;
  agility: number;
  constitution: number; // New stat for physical endurance
  wisdom: number;
  intelligence: number;
  charisma: number;
  // Combat stats
  attack?: number; // Calculated from equipment
  defense?: number; // Calculated from equipment
  // Equipment slots
  equipment?: {
    [slot: string]: string; // Maps slot name to item instanceId
  };
  joinDate: Date;
  lastLogin: Date;
  // Play time tracking fields
  totalPlayTime?: number; // Total play time in seconds
  lastLoginTime?: Date; // Timestamp of last login for session calculation
  currentRoomId: string; // Add this field to track user's current room
  inventory: {
    items: string[]; // Now stores item instanceIds instead of templateIds
    currency: Currency;
  };
  bank?: Currency; // Bank balance for economy system
  commandHistory?: string[]; // Store the user's command history (up to 30 entries)
  currentHistoryIndex?: number; // Current position in command history when browsing
  savedCurrentCommand?: string; // Save the current command when browsing history
  inCombat?: boolean; // Add combat status
  isUnconscious?: boolean; // Add unconscious status
  snakeHighScore?: number; // Add high score for Snake game
  movementRestricted?: boolean; // Flag to restrict player movement
  movementRestrictedReason?: string; // Custom reason why movement is restricted
  isResting?: boolean; // Player is resting for HP regeneration bonus
  isMeditating?: boolean; // Player is meditating for MP regeneration bonus
  restingTicks?: number; // Number of ticks player has been resting
  meditatingTicks?: number; // Number of ticks player has been meditating
  isSneaking?: boolean; // Move silently, invisible to NPCs
  isHiding?: boolean; // Invisible to everyone in room, breaks on move
  flags?: string[]; // Array to store player flags for permissions, quests, etc.
  pendingAdminMessages?: Array<{ message: string; timestamp: string }>; // Store admin messages for offline users

  // Ban status fields
  banned?: boolean; // Whether the user is banned
  banReason?: string; // The reason for the ban
  banExpires?: string; // ISO date string when ban expires, undefined for permanent
  banDate?: string; // ISO date string when the ban was issued

  // Add missing optional properties used in UserAdminMenu
  email?: string;
  role?: string; // e.g., 'player', 'admin', 'builder'
  created?: Date; // Date user was created
  description?: string; // User-set description
  isAdmin?: boolean; // Whether this is an admin account
}

export interface ConnectedClient {
  id: string; // Make sure clients have an ID property for lookup
  connection: IConnection; // Replace Socket with IConnection
  user: User | null;
  authenticated: boolean;
  buffer: string;
  state: ClientStateType;
  stateData: StateData;

  // For output buffering
  isTyping: boolean;
  outputBuffer: string[];

  // For idle disconnection and monitoring
  connectedAt: number;
  lastActivity: number;
  isBeingMonitored: boolean;
  adminMonitorSocket?: AdminMonitorSocket;
  isInputBlocked?: boolean; // Add flag to track if admin blocked user input

  // Add tempUsername property
  tempUsername?: string;

  cursorPos?: number; // Track cursor position within the buffer

  // Connection type and origin information
  isConsoleClient?: boolean; // Indicates if connection is from local console
  ipAddress?: string; // IP address of the client connection
}

export type StateHandler = (client: ConnectedClient, input: string) => void;

export interface ClientState {
  name: ClientStateType;
  enter: (client: ConnectedClient) => void;
  handle: StateHandler;
  exit: (client: ConnectedClient) => void; // Add exit method to clean up state resources
}

export interface ServerStats {
  startTime: Date;
  uptime: number; // in seconds
  connectedClients: number;
  authenticatedUsers: number;
  totalConnections: number;
  totalCommands: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

export interface Room {
  id: string;
  name: string;
  description: string;
  exits: Exit[];
  players: string[];
  items: Item[];
  currency: {
    gold: number;
    silver: number;
    copper: number;
  };
  npcs?: string[]; // Add NPCs array to track monsters in the room
}

export interface SnakeScoreEntry {
  username: string;
  score: number;
  date: string; // ISO date string of when the score was achieved
}

export interface SnakeScores {
  scores: SnakeScoreEntry[];
}

// MUD configuration loaded from mud-config.json
export interface MUDConfig {
  game: {
    idleTimeout: number;
  };
}

// Global type extension for test flags
export interface GlobalWithSkipMCP {
  __SKIP_MCP_SERVER?: boolean;
}
