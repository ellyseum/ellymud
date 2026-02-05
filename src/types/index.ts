import type { StateData, AdminMonitorSocket } from '../types';

export enum ClientStateType {
  CONNECTING = 'connecting',
  LOGIN = 'login',
  SIGNUP = 'signup',
  AUTHENTICATED = 'authenticated',
}

export interface ClientState {
  name: ClientStateType;
  enter(client: ConnectedClient): void;
  handle(client: ConnectedClient, data: string): void;
  exit(client: ConnectedClient): void;
}

export interface ConnectedClient {
  connection: SocketConnection;
  buffer: string;
  state: ClientState;
  stateData: StateData;
  isTyping: boolean;
  outputBuffer: string[];
  authenticated: boolean;
  user?: UserData;
  adminMonitorSocket?: AdminMonitorSocket;
  isBeingMonitored?: boolean;
  commandHistory?: string[]; // Add command history for up/down arrow navigation
}

export interface SocketConnection {
  getType(): 'telnet' | 'websocket';
  write(data: string): void;
  end(): void;
}

export interface UserData {
  username: string;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  experience: number;
  level: number;
  // Add character statistics
  strength: number;
  dexterity: number;
  agility: number;
  constitution: number; // New stat for physical endurance
  wisdom: number;
  intelligence: number;
  charisma: number;
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
  // Combat stats
  attack?: number; // Calculated from equipment
  defense?: number; // Calculated from equipment
  // Equipment slots
  equipment?: {
    [slot: string]: string; // Maps slot name to item ID
  };
  inCombat: boolean;
  currentRoomId: string;
  // Stealth states
  isSneaking?: boolean; // Move silently, invisible to NPCs
  isHiding?: boolean; // Invisible to everyone in room, breaks on move
  inventory: {
    items: string[];
    currency: Currency;
  };
  commandHistory?: string[]; // Add command history to user data for persistence
  currentHistoryIndex?: number; // Add current history index for browsing history
  savedCurrentCommand?: string; // For saving the current command when browsing history
}

export interface Item {
  name: string;
  description?: string;
  type?: string;
  value?: number;
}

export interface Currency {
  gold: number;
  silver: number;
  copper: number;
}

export interface Exit {
  direction: string;
  roomId: string;
  isLocked?: boolean;
  keyId?: string;
}
