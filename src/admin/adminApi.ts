import { Request, Response } from 'express';
import adminAuth from './adminAuth';
import { ServerStats, ConnectedClient, User } from '../types';
import jwt from 'jsonwebtoken';
import { GameTimerManager } from '../timer/gameTimerManager';
import { UserManager } from '../user/userManager';
import { RoomManager } from '../room/roomManager';
import fs from 'fs';
import path from 'path';
import config from '../config';
import { createAdminMessageBox } from '../utils/messageFormatter';

// Use the same JWT secret as the rest of the application
const JWT_SECRET = config.JWT_SECRET;
const TOKEN_EXPIRY = '1h';

// Interface for pipeline execution metrics (from JSON files)
interface PipelineExecution {
  pipelineId?: string;
  task?: string;
  date?: string;
  outcome?: string;
  stages?: Record<
    string,
    {
      duration?: number;
      grade?: string;
      score?: number;
      verdict?: string;
    }
  >;
  [key: string]: unknown;
}

// Configuration file path
const CONFIG_FILE = path.join(__dirname, '..', '..', 'data', 'mud-config.json');

// Default configuration
const DEFAULT_CONFIG = {
  dataFiles: {
    players: './data/players.json',
    rooms: './data/rooms.json',
    items: './data/items.json',
    npcs: './data/npcs.json',
  },
  game: {
    startingRoom: 'town-square',
    maxPlayers: 100,
    idleTimeout: 30,
    maxPasswordAttempts: 5,
  },
  advanced: {
    debugMode: false,
    allowRegistration: true,
    backupInterval: 6,
    logLevel: 'info',
  },
};

// Define MUDConfig type matching DEFAULT_CONFIG structure
export interface MUDConfig {
  dataFiles: { players: string; rooms: string; items: string; npcs: string };
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

/**
 * Ensure a file or directory exists. If not, create it.
 * @returns true if target existed, false if created
 */
async function ensureExists(
  targetPath: string,
  isDir: boolean,
  defaultContent?: string
): Promise<boolean> {
  try {
    const stat = await fs.promises.stat(targetPath);
    if (isDir && !stat.isDirectory()) throw new Error(`${targetPath} is not a directory`);
    if (!isDir && !stat.isFile()) throw new Error(`${targetPath} is not a file`);
    return true;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      if (isDir) {
        await fs.promises.mkdir(targetPath, { recursive: true });
      } else {
        await fs.promises.writeFile(targetPath, defaultContent ?? '');
      }
      return false;
    }
    throw error;
  }
}

/**
 * Get MUD configuration - API handler
 */
export function getMUDConfig() {
  return (req: Request, res: Response) => {
    try {
      const config = loadMUDConfig();
      res.json({ success: true, config });
    } catch (error) {
      console.error('Error getting MUD configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve configuration',
      });
    }
  };
}

/**
 * Update MUD configuration - API handler
 */
export function updateMUDConfig() {
  return async (req: Request, res: Response) => {
    try {
      const newConfig = req.body;

      // Validate required fields
      if (!newConfig.dataFiles || !newConfig.game || !newConfig.advanced) {
        return res.status(400).json({
          success: false,
          message: 'Missing required configuration sections',
        });
      }

      // Save the configuration
      if (await saveMUDConfig(newConfig)) {
        res.json({
          success: true,
          message: 'Configuration updated successfully',
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to save configuration',
        });
      }
    } catch (error) {
      console.error('Error updating MUD configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update configuration',
      });
    }
  };
}

export function login(req: Request, res: Response) {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ success: false, message: 'Username and password are required' });
    return;
  }

  const authenticated = adminAuth.authenticate(username, password);

  if (authenticated) {
    // Generate JWT token
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
}

export function validateToken(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ success: false, message: 'Token error' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as Request & { admin?: jwt.JwtPayload | string }).admin = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

export function getServerStats(serverStats: ServerStats) {
  return (req: Request, res: Response) => {
    res.json({ success: true, stats: serverStats });
  };
}

export function kickPlayer(clients: Map<string, ConnectedClient>) {
  return (req: Request, res: Response) => {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Client ID is required' });
    }

    const client = clients.get(clientId);

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    try {
      // Send a message to the client that they're being kicked by admin
      client.connection.write('\r\n\r\nYou have been disconnected by an administrator.\r\n');

      // Disconnect the client
      setTimeout(() => {
        client.connection.end();
      }, 500);

      res.json({ success: true, message: 'Player kicked successfully' });
    } catch (error) {
      console.error('Error kicking player:', error);
      res.status(500).json({ success: false, message: 'Failed to kick player' });
    }
  };
}

/**
 * Send admin message to a connected player
 */
export function sendAdminMessage(clients: Map<string, ConnectedClient>) {
  return (req: Request, res: Response) => {
    const { clientId } = req.params;
    const { message } = req.body;

    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Client ID is required' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const client = clients.get(clientId);

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    try {
      const boxedMessage = createAdminMessageBox(message);
      client.connection.write(boxedMessage);

      res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
      console.error('Error sending admin message:', error);
      res.status(500).json({ success: false, message: 'Failed to send message' });
    }
  };
}

/**
 * Get connected player details
 */
export function getConnectedPlayers(
  clients: Map<string, ConnectedClient>,
  _userManager: UserManager
) {
  return (req: Request, res: Response) => {
    // Get all connected clients, both authenticated and unauthenticated
    const players = Array.from(clients.entries()).map(([id, client]) => {
      const isAuthenticated = client.authenticated && client.user;
      const tempUsername = (client as ConnectedClient & { tempUsername?: string }).tempUsername;

      return {
        id,
        username:
          isAuthenticated && client.user
            ? client.user.username
            : tempUsername || `Guest-${id.substring(0, 8)}`,
        authenticated: !!isAuthenticated,
        connected: new Date(client.connectedAt).toISOString(),
        ip: client.connection.remoteAddress || 'unknown',
        connectionType: client.connection.getType(),
        currentRoom: isAuthenticated && client.user ? client.user.currentRoomId : 'Not in game',
        health:
          isAuthenticated && client.user ? `${client.user.health}/${client.user.maxHealth}` : 'N/A',
        level: isAuthenticated && client.user ? client.user.level : 'N/A',
        experience: isAuthenticated && client.user ? client.user.experience : 'N/A',
        lastActivity: client.lastActivity ? new Date(client.lastActivity).toISOString() : 'unknown',
        idleTime: client.lastActivity ? Math.floor((Date.now() - client.lastActivity) / 1000) : 0,
        state: client.state || 'Unknown',
      };
    });

    res.json({ success: true, players });
  };
}

export function monitorPlayer(clients: Map<string, ConnectedClient>) {
  return (req: Request, res: Response) => {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Client ID is required' });
    }

    const client = clients.get(clientId);

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    try {
      // Get username for response
      const username = client.user ? client.user.username : 'Unknown';

      // Set a flag on the client to indicate it's being monitored
      client.isBeingMonitored = true;

      res.json({
        success: true,
        message: 'Monitoring session established',
        username: username,
        clientId: clientId,
      });
    } catch (error) {
      console.error('Error setting up monitoring:', error);
      res.status(500).json({ success: false, message: 'Failed to set up monitoring' });
    }
  };
}

export function getGameTimerConfig(gameTimerManager: GameTimerManager) {
  return (req: Request, res: Response) => {
    try {
      const config = gameTimerManager.getConfig();
      res.json({
        success: true,
        config,
      });
    } catch (error) {
      console.error('Error getting game timer configuration:', error);
      res.status(500).json({ success: false, message: 'Failed to get game timer configuration' });
    }
  };
}

export function updateGameTimerConfig(gameTimerManager: GameTimerManager) {
  return (req: Request, res: Response) => {
    try {
      const { tickInterval, saveInterval } = req.body;

      // Validate inputs
      if (tickInterval !== undefined && (isNaN(tickInterval) || tickInterval < 1000)) {
        return res.status(400).json({
          success: false,
          message: 'Tick interval must be at least 1000ms (1 second)',
        });
      }

      if (saveInterval !== undefined && (isNaN(saveInterval) || saveInterval < 1)) {
        return res.status(400).json({
          success: false,
          message: 'Save interval must be at least 1 tick',
        });
      }

      // Update config with validated values
      const newConfig: Partial<{ tickInterval: number; saveInterval: number }> = {};
      if (tickInterval !== undefined) newConfig.tickInterval = tickInterval;
      if (saveInterval !== undefined) newConfig.saveInterval = saveInterval;

      gameTimerManager.updateConfig(newConfig);

      res.json({
        success: true,
        message: 'Game timer configuration updated successfully',
        config: gameTimerManager.getConfig(),
      });
    } catch (error) {
      console.error('Error updating game timer configuration:', error);
      res
        .status(500)
        .json({ success: false, message: 'Failed to update game timer configuration' });
    }
  };
}

export function forceSave(gameTimerManager: GameTimerManager) {
  return (req: Request, res: Response) => {
    try {
      gameTimerManager.forceSave();
      res.json({
        success: true,
        message: 'Game data saved successfully',
      });
    } catch (error) {
      console.error('Error forcing save:', error);
      res.status(500).json({ success: false, message: 'Failed to save game data' });
    }
  };
}

/**
 * Get all player details (including offline players)
 */
export function getAllPlayers(userManager: UserManager) {
  return (req: Request, res: Response) => {
    try {
      // Get all users from the user manager
      const players = userManager.getAllUsers().map((user: User) => ({
        username: user.username,
        health: user.health,
        maxHealth: user.maxHealth,
        level: user.level,
        experience: user.experience,
        joinDate: user.joinDate,
        lastLogin: user.lastLogin,
        currentRoomId: user.currentRoomId,
        banned: user.banned || false,
        banReason: user.banReason,
        banExpires: user.banExpires,
        isAdmin: user.isAdmin || false,
      }));

      res.json({ success: true, players });
    } catch (error) {
      console.error('Error getting all players:', error);
      res.status(500).json({ success: false, message: 'Failed to get player list' });
    }
  };
}

/**
 * Get detailed information about a specific player
 */
export function getPlayerDetailsById(userManager: UserManager) {
  return (req: Request, res: Response) => {
    try {
      const { username } = req.params;

      if (!username) {
        return res.status(400).json({ success: false, message: 'Username is required' });
      }

      const user = userManager.getUser(username);

      if (!user) {
        return res.status(404).json({ success: false, message: 'Player not found' });
      }

      res.json({
        success: true,
        player: {
          username: user.username,
          health: user.health,
          maxHealth: user.maxHealth,
          level: user.level,
          experience: user.experience,
          joinDate: user.joinDate,
          lastLogin: user.lastLogin,
          currentRoomId: user.currentRoomId,
          inventory: user.inventory,
        },
      });
    } catch (error) {
      console.error('Error getting player details:', error);
      res.status(500).json({ success: false, message: 'Failed to get player details' });
    }
  };
}

/**
 * Update player details
 */
export function updatePlayer(userManager: UserManager, roomManager: RoomManager) {
  return (req: Request, res: Response) => {
    try {
      const { username } = req.params;
      const { health, maxHealth, level, experience, currentRoomId, inventory } = req.body;

      if (!username) {
        return res.status(400).json({ success: false, message: 'Username is required' });
      }

      // Validate the room ID exists
      if (currentRoomId && !roomManager.getRoom(currentRoomId)) {
        return res.status(400).json({ success: false, message: 'Specified room does not exist' });
      }

      // Update the user
      const success = userManager.updateUserStats(username, {
        health,
        maxHealth,
        level,
        experience,
        currentRoomId,
        inventory,
      });

      if (!success) {
        return res.status(404).json({ success: false, message: 'Player not found' });
      }

      // If player is currently online, update their in-memory state too
      const client = userManager.getActiveUserSession(username);
      if (client && client.user) {
        client.user.health = health;
        client.user.maxHealth = maxHealth;
        client.user.level = level;
        client.user.experience = experience;

        // Handle room change
        if (currentRoomId && client.user.currentRoomId !== currentRoomId) {
          // Remove from old room
          roomManager.removePlayerFromAllRooms(username);

          // Add to new room
          const newRoom = roomManager.getRoom(currentRoomId);
          if (newRoom) {
            newRoom.addPlayer(username);
            client.user.currentRoomId = currentRoomId;
          }
        }

        // Update inventory
        if (inventory) {
          client.user.inventory = inventory;
        }
      }

      res.json({ success: true, message: 'Player updated successfully' });
    } catch (error) {
      console.error('Error updating player:', error);
      res.status(500).json({ success: false, message: 'Failed to update player' });
    }
  };
}

/**
 * Reset a player's password
 */
export function resetPlayerPassword(userManager: UserManager) {
  return (req: Request, res: Response) => {
    try {
      const { username } = req.params;
      const { newPassword } = req.body;

      if (!username || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Username and new password are required',
        });
      }

      const user = userManager.getUser(username);

      if (!user) {
        return res.status(404).json({ success: false, message: 'Player not found' });
      }

      // Update the password
      user.password = newPassword;

      // Save the changes
      userManager.forceSave();

      res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
  };
}

/**
 * Delete a player
 */
export function deletePlayer(
  userManager: UserManager,
  roomManager: RoomManager,
  _clients: Map<string, ConnectedClient>
) {
  return (req: Request, res: Response) => {
    try {
      const { username } = req.params;

      if (!username) {
        return res.status(400).json({ success: false, message: 'Username is required' });
      }

      // Check if player is online and disconnect them first
      const client = userManager.getActiveUserSession(username);
      if (client) {
        // Send a message to the client that they're being deleted by admin
        client.connection.write('\r\n\r\nYour account has been deleted by an administrator.\r\n');

        // Remove from all rooms
        roomManager.removePlayerFromAllRooms(username);

        // Unregister the user session
        userManager.unregisterUserSession(username);

        // Disconnect after a brief delay
        setTimeout(() => {
          client.connection.end();
        }, 500);
      }

      // Delete the user
      const success = userManager.deleteUser(username);

      if (!success) {
        return res.status(404).json({ success: false, message: 'Player not found' });
      }

      res.json({ success: true, message: 'Player deleted successfully' });
    } catch (error) {
      console.error('Error deleting player:', error);
      res.status(500).json({ success: false, message: 'Failed to delete player' });
    }
  };
}

/**
 * Ban a player
 */
export function banPlayer(
  userManager: UserManager,
  roomManager: RoomManager,
  _clients: Map<string, ConnectedClient>
) {
  return (req: Request, res: Response) => {
    try {
      const { username } = req.params;
      const { reason, durationMinutes } = req.body;

      if (!username) {
        return res.status(400).json({ success: false, message: 'Username is required' });
      }

      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        return res.status(400).json({ success: false, message: 'Ban reason is required' });
      }

      // Get the user
      const user = userManager.getUser(username);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Player not found' });
      }

      // Cannot ban admin
      if (user.isAdmin) {
        return res.status(403).json({ success: false, message: 'Cannot ban admin accounts' });
      }

      // Calculate ban expiration
      let banExpires: string | null = null;
      if (durationMinutes && typeof durationMinutes === 'number' && durationMinutes > 0) {
        const expirationDate = new Date(Date.now() + durationMinutes * 60 * 1000);
        banExpires = expirationDate.toISOString();
      }

      // Update user ban status
      userManager.banUser(username, reason.trim(), banExpires);

      // If player is online, disconnect them
      const client = userManager.getActiveUserSession(username);
      if (client) {
        // Send a message to the client
        const expiresMsg = banExpires
          ? `Your ban expires on ${new Date(banExpires).toLocaleString()}.`
          : 'This ban is permanent.';
        client.connection.write(
          `\r\n\r\nYou have been banned by an administrator.\r\nReason: ${reason.trim()}\r\n${expiresMsg}\r\n`
        );

        // Remove from all rooms
        roomManager.removePlayerFromAllRooms(username);

        // Unregister the user session
        userManager.unregisterUserSession(username);

        // Disconnect after a brief delay
        setTimeout(() => {
          client.connection.end();
        }, 500);
      }

      res.json({ success: true, message: 'Player banned successfully' });
    } catch (error) {
      console.error('Error banning player:', error);
      res.status(500).json({ success: false, message: 'Failed to ban player' });
    }
  };
}

/**
 * Unban a player
 */
export function unbanPlayer(userManager: UserManager) {
  return (req: Request, res: Response) => {
    try {
      const { username } = req.params;

      if (!username) {
        return res.status(400).json({ success: false, message: 'Username is required' });
      }

      // Get the user
      const user = userManager.getUser(username);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Player not found' });
      }

      if (!user.banned) {
        return res.status(400).json({ success: false, message: 'Player is not banned' });
      }

      // Unban the user
      userManager.unbanUser(username);

      res.json({ success: true, message: 'Player unbanned successfully' });
    } catch (error) {
      console.error('Error unbanning player:', error);
      res.status(500).json({ success: false, message: 'Failed to unban player' });
    }
  };
}

/**
 * Load the MUD configuration.
 *
 * @returns {Promise<MUDConfig>} A Promise that resolves to the MUD configuration object.
 */
export async function loadMUDConfig(): Promise<MUDConfig> {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(CONFIG_FILE);
    await ensureExists(dataDir, true);

    // Ensure config file exists
    const configExists = await ensureExists(
      CONFIG_FILE,
      false,
      JSON.stringify(DEFAULT_CONFIG, null, 2)
    );
    if (!configExists) {
      return DEFAULT_CONFIG;
    }

    // Read and parse config
    const configData = await fs.promises.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error loading MUD configuration:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Save MUD configuration
 */
export async function saveMUDConfig(config: Record<string, unknown>): Promise<boolean> {
  try {
    await fs.promises.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving MUD configuration:', error);
    return false;
  }
}

// Pipeline metrics directory
const PIPELINE_METRICS_DIR = path.join(
  __dirname,
  '..',
  '..',
  '.github',
  'agents',
  'metrics',
  'executions'
);

/**
 * Get pipeline metrics - API handler
 */
export function getPipelineMetrics() {
  return async (req: Request, res: Response) => {
    try {
      // Check if directory exists
      try {
        await fs.promises.access(PIPELINE_METRICS_DIR);
      } catch {
        // Directory doesn't exist, return empty metrics
        return res.json({
          success: true,
          summary: { total: 0, successful: 0, failed: 0, successRate: 0 },
          stages: {},
          executions: [],
        });
      }

      // Read all JSON files in the directory
      const files = await fs.promises.readdir(PIPELINE_METRICS_DIR);
      const jsonFiles = files.filter(
        (f) => f.endsWith('.json') && f !== 'pipeline-metrics-schema.json'
      );

      const executions: PipelineExecution[] = [];

      for (const file of jsonFiles) {
        try {
          const content = await fs.promises.readFile(path.join(PIPELINE_METRICS_DIR, file), 'utf8');
          executions.push(JSON.parse(content));
        } catch (e) {
          console.error(`Error reading pipeline metrics file ${file}:`, e);
        }
      }

      // Calculate aggregated metrics
      const total = executions.length;
      const successful = executions.filter((e) => e.outcome === 'success').length;
      const failed = executions.filter(
        (e) => e.outcome === 'failure' || e.outcome === 'rolled-back'
      ).length;

      // Calculate stage stats
      const stages = ['research', 'planning', 'implementation', 'validation'];
      const stageStats: Record<
        string,
        { avgDuration: number; avgScore: number | null; failureRate: number }
      > = {};

      stages.forEach((stage) => {
        const stageData = executions
          .filter((e) => e.stages && e.stages[stage])
          .map((e) => e.stages![stage]);

        if (stageData.length > 0) {
          const durations = stageData.map((s) => s?.duration || 0);
          const scores = stageData.filter((s) => s?.score !== undefined).map((s) => s!.score!);
          const failures = stageData.filter(
            (s) => s?.grade === 'F' || s?.verdict === 'REJECTED'
          ).length;

          stageStats[stage] = {
            avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
            avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
            failureRate: (failures / stageData.length) * 100,
          };
        }
      });

      // Sort executions by date (newest first) and limit to 20
      const sortedExecutions = executions
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
        .slice(0, 20);

      res.json({
        success: true,
        summary: {
          total,
          successful,
          failed,
          successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : 0,
        },
        stages: stageStats,
        executions: sortedExecutions,
      });
    } catch (error) {
      console.error('Error getting pipeline metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve pipeline metrics',
      });
    }
  };
}
