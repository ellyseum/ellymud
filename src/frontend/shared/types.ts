/**
 * Shared type definitions for frontend applications
 * These can be imported by both game client and admin panel
 */

/**
 * Socket.IO message types
 */
export interface OutputMessage {
  data?: string;
}

export interface MaskMessage {
  enabled: boolean;
}

export interface SpecialKeyMessage {
  key: 'up' | 'down' | 'left' | 'right';
}

/**
 * Connection status
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';
