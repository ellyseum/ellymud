export interface SessionData {
  username: string;
  sessionId: string;
  createdAt: number;
  lastActivity: number;
  [key: string]: unknown;
}

export interface SessionStore {
  saveSession(sessionId: string, data: SessionData): Promise<void>;
  getSession(sessionId: string): Promise<SessionData | null>;
  refreshSession(sessionId: string): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  healthCheck(): Promise<boolean>;
}
