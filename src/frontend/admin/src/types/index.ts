// API Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  // Some endpoints return data at root level (e.g., login returns token directly)
  token?: string;
}

// Server Stats
export interface ServerStats {
  uptime: number;
  connectedClients: number;
  authenticatedUsers: number;
  totalConnections: number;
  totalCommands: number;
  memoryUsage: MemoryUsage;
}

export interface MemoryUsage {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
}

// Game Timer Config
export interface GameTimerConfig {
  tickInterval: number;
  saveInterval: number;
}

// Player Types
export interface Player {
  id: string;
  username: string;
  authenticated: boolean;
  connected: string;
  ip: string;
  connectionType: string;
  currentRoom?: string;
  health?: number;
  maxHealth?: number;
  level?: number;
  experience?: number;
  state?: string;
  lastActivity: string;
  idleTime: number;
  lastLogin?: string;
  banned?: boolean;
  banReason?: string;
  banExpires?: string;
  isAdmin?: boolean;
}

export interface PlayerDetails {
  username: string;
  health: number;
  maxHealth: number;
  level: number;
  experience: number;
  currentRoomId: string;
  inventory: InventoryItem[];
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity?: number;
}

// MUD Config
export interface MUDConfig {
  dataFiles: {
    players: string;
    rooms: string;
    items: string;
    npcs: string;
  };
  game: {
    startingRoom: string;
    maxPlayers: number;
    idleTimeout: number;
    maxPasswordAttempts: number;
  };
  advanced: {
    debugMode: boolean;
    allowRegistration: boolean;
    backupInterval: number;
    logLevel: string;
  };
}

// Pipeline Metrics
export interface PipelineMetrics {
  summary: {
    total: number;
    successful: number;
    failed: number;
    successRate: string;
    totalTokens: number;
  };
  stages: Record<string, StageStats>;
  executions: PipelineExecution[];
  tokenUsage: TokenUsage;
  toolCalls: ToolCall[];
  complexity: Record<string, number>;
  modeDistribution: Record<string, number>;
  pipelineReport: string;
  commonIssues: string[];
}

export interface StageStats {
  avgDuration: number;
  avgScore: number | null;
  failureRate: number;
  total: number;
}

export interface TokenUsage {
  total: number;
  byStage: Record<string, number>;
}

export interface ToolCall {
  name: string;
  count: number;
}

export interface PipelineExecution {
  pipelineId: string;
  task: string;
  date: string;
  complexity: string;
  mode: string;
  totalDuration: number;
  outcome: string;
  stages?: Record<string, StageData>;
}

export interface StageData {
  duration: number;
  score?: number;
  grade?: string;
  verdict?: string;
}

// Stage Reports
export interface StageReportFile {
  filename: string;
  type: 'report' | 'reviewed' | 'grade';
  size: number;
  modified: string;
}

export interface StageReportsResponse {
  stage: string;
  files: StageReportFile[];
}

export interface ReportFileResponse {
  stage: string;
  filename: string;
  content: string;
  size: number;
  modified: string;
}

// Auth
export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user?: {
    username: string;
    role: string;
  };
}

// Tab Types
export type TabId = 'dashboard' | 'client' | 'players' | 'config' | 'pipeline' | 'worldbuilder';

// Pipeline Sub-Tab Types
export type PipelineSubTab =
  | 'dashboard'
  | 'research'
  | 'planning'
  | 'implementation'
  | 'validation';

// ============================================================================
// AREA & WORLD BUILDER TYPES
// ============================================================================

/**
 * Combat configuration for an area
 */
export interface AreaCombatConfig {
  pvpEnabled: boolean;
  dangerLevel: number;
  xpMultiplier: number;
}

/**
 * NPC spawn configuration
 */
export interface AreaSpawnConfig {
  npcTemplateId: string;
  maxInstances: number;
  respawnTicks: number;
  spawnRooms?: string[];
}

/**
 * Area entity
 */
export interface Area {
  id: string;
  name: string;
  description: string;
  levelRange: { min: number; max: number };
  flags: string[];
  combatConfig?: AreaCombatConfig;
  spawnConfig: AreaSpawnConfig[];
  defaultRoomFlags?: string[];
  created: string;
  modified: string;
}

/**
 * Room data with coordinates
 */
export interface RoomData {
  id: string;
  name?: string;
  description?: string;
  shortDescription?: string;
  longDescription?: string;
  exits: Exit[];
  items?: string[];
  npcs?: string[];
  flags?: string[];
  areaId?: string;
  gridX?: number;
  gridY?: number;
  gridZ?: number;
}

/**
 * Room exit
 */
export interface Exit {
  direction: string;
  roomId: string;
}

/**
 * AI room generation request
 */
export interface AIGenerateRoomRequest {
  roomName: string;
  areaContext?: string;
  style?: 'fantasy' | 'dark' | 'mystical' | 'medieval';
}

/**
 * AI room generation response
 */
export interface AIGenerateRoomResponse {
  description: string;
  suggestedExits?: string[];
  suggestedNpcs?: string[];
}

/**
 * Area with rooms response
 */
export interface AreaWithRooms {
  area: Area;
  rooms: RoomData[];
}
