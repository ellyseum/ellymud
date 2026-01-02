// API Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
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
  };
  stages: Record<string, StageStats>;
  executions: PipelineExecution[];
}

export interface StageStats {
  avgDuration: number;
  avgScore: number | null;
  failureRate: number;
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
export type TabId = 'dashboard' | 'client' | 'players' | 'config' | 'pipeline';
