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
import { getMUDConfigRepository } from '../persistence/RepositoryFactory';
import { MUDConfig } from '../persistence/interfaces';

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

/**
 * Get MUD configuration - API handler
 */
export function getMUDConfig() {
  return async (req: Request, res: Response) => {
    try {
      const config = await loadMUDConfig();
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

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ success: false, message: 'Username and password are required' });
    return;
  }

  // Use async version to ensure admin list is loaded fresh
  const authenticated = await adminAuth.authenticateAsync(username, password);

  if (authenticated) {
    // Generate JWT token
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    // Check if user is using the default password
    const requiresPasswordChange = password === 'admin';
    res.json({ success: true, token, requiresPasswordChange });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
}

/**
 * Password validation rules
 */
const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true,
};

/**
 * Validate password against rules
 */
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(`Password must be at least ${PASSWORD_RULES.minLength} characters`);
  }
  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (PASSWORD_RULES.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (PASSWORD_RULES.requireSymbol && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one symbol');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Change admin's own password
 */
export function changePassword(userManager: UserManager) {
  return (req: Request, res: Response) => {
    try {
      const { newPassword } = req.body;
      const admin = (req as Request & { admin?: { username: string } }).admin;

      if (!admin?.username) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }

      if (!newPassword) {
        return res.status(400).json({ success: false, message: 'New password is required' });
      }

      // Validate new password
      const validation = validatePassword(newPassword);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Password does not meet requirements',
          errors: validation.errors,
        });
      }

      // Change the password
      const success = userManager.changeUserPassword(admin.username, newPassword);

      if (!success) {
        return res.status(500).json({ success: false, message: 'Failed to change password' });
      }

      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ success: false, message: 'Failed to change password' });
    }
  };
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
  const repository = getMUDConfigRepository();
  return repository.get();
}

/**
 * Save MUD configuration
 */
export async function saveMUDConfig(configData: MUDConfig): Promise<boolean> {
  try {
    const repository = getMUDConfigRepository();
    await repository.save(configData);
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

const PIPELINE_STATS_DIR = path.join(
  __dirname,
  '..',
  '..',
  '.github',
  'agents',
  'metrics',
  'stats'
);

const PIPELINE_REPORT_PATH = path.join(
  __dirname,
  '..',
  '..',
  '.github',
  'agents',
  'metrics',
  'pipeline-report.md'
);

/**
 * Parse markdown table into array of objects
 */
function parseMarkdownTable(tableText: string): Record<string, string>[] {
  const lines = tableText
    .trim()
    .split('\n')
    .filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = headerLine
    .split('|')
    .map((h) => h.trim())
    .filter((h) => h.length > 0);

  const rows: Record<string, string>[] = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i]
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cells.length >= 2) {
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = cells[idx] || '';
      });
      rows.push(row);
    }
  }
  return rows;
}

/**
 * Parse stats markdown file to extract sections
 */
function parseStatsMarkdown(content: string): {
  tokenUsage?: Record<string, number>;
  toolCalls?: Record<string, number>;
  timing?: Record<string, string | number>;
} {
  const result: {
    tokenUsage?: Record<string, number>;
    toolCalls?: Record<string, number>;
    timing?: Record<string, string | number>;
  } = {};

  // Find sections
  const sectionRegex = /^##\s+(.+)$/gm;
  const sections: { name: string; startIndex: number }[] = [];
  let match;
  while ((match = sectionRegex.exec(content)) !== null) {
    sections.push({ name: match[1].trim(), startIndex: match.index });
  }

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const nextStart = sections[i + 1]?.startIndex || content.length;
    const sectionContent = content.slice(section.startIndex, nextStart);
    const sectionNameLower = section.name.toLowerCase();

    if (sectionContent.includes('|')) {
      const tableMatch = sectionContent.match(/(\|.+\|[\s\S]*?\n)(?=\n[^|]|\n*$)/);
      if (tableMatch) {
        const tableData = parseMarkdownTable(tableMatch[0]);
        if (tableData.length > 0) {
          const firstRow = tableData[0];
          const keys = Object.keys(firstRow);

          // Key-value style table
          if (keys.length === 2) {
            const kvObject: Record<string, number | string> = {};
            tableData.forEach((row) => {
              const k = row[keys[0]]?.replace(/\*\*/g, '').trim();
              const v = row[keys[1]]?.replace(/\*\*/g, '').trim();
              if (k) {
                const numMatch = v?.match(/^~?(\d+(?:,\d+)?(?:\.\d+)?)/);
                kvObject[k] = numMatch ? parseFloat(numMatch[1].replace(',', '')) : v;
              }
            });

            if (sectionNameLower.includes('token') || sectionNameLower.includes('usage')) {
              result.tokenUsage = kvObject as Record<string, number>;
            } else if (sectionNameLower.includes('tool')) {
              result.toolCalls = kvObject as Record<string, number>;
            } else if (sectionNameLower.includes('timing')) {
              result.timing = kvObject;
            }
          }
        }
      }
    }
  }

  return result;
}

/**
 * Load all stats files
 */
async function loadAllStats(): Promise<
  Array<{
    filename: string;
    stage: string;
    tokenUsage?: Record<string, number>;
    toolCalls?: Record<string, number>;
    timing?: Record<string, string | number>;
  }>
> {
  try {
    await fs.promises.access(PIPELINE_STATS_DIR);
  } catch {
    return [];
  }

  const files = await fs.promises.readdir(PIPELINE_STATS_DIR);
  const statsFiles = files.filter((f) => f.endsWith('-stats.md'));

  const results: Array<{
    filename: string;
    stage: string;
    tokenUsage?: Record<string, number>;
    toolCalls?: Record<string, number>;
    timing?: Record<string, string | number>;
  }> = [];

  for (const filename of statsFiles) {
    try {
      const content = await fs.promises.readFile(path.join(PIPELINE_STATS_DIR, filename), 'utf-8');
      const parsed = parseStatsMarkdown(content);
      const parts = filename.replace('-stats.md', '').split('_');
      results.push({
        filename,
        stage: parts[0] || 'unknown',
        ...parsed,
      });
    } catch {
      // Skip files that can't be read
    }
  }

  return results;
}

/**
 * Get pipeline metrics - API handler
 */
export function getPipelineMetrics() {
  return async (_req: Request, res: Response) => {
    try {
      // Check if directory exists
      const executions: PipelineExecution[] = [];
      try {
        await fs.promises.access(PIPELINE_METRICS_DIR);

        // Read all JSON files in the directory
        const files = await fs.promises.readdir(PIPELINE_METRICS_DIR);
        const jsonFiles = files.filter(
          (f) => f.endsWith('.json') && f !== 'pipeline-metrics-schema.json'
        );

        for (const file of jsonFiles) {
          try {
            const content = await fs.promises.readFile(
              path.join(PIPELINE_METRICS_DIR, file),
              'utf8'
            );
            executions.push(JSON.parse(content));
          } catch (e) {
            console.error(`Error reading pipeline metrics file ${file}:`, e);
          }
        }
      } catch {
        // Directory doesn't exist
      }

      // Load stats files for token/tool metrics
      const allStats = await loadAllStats();

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
        { avgDuration: number; avgScore: number | null; failureRate: number; total: number }
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
            total: stageData.length,
          };
        }
      });

      // Calculate token usage from stats files
      const tokenUsage: { total: number; byStage: Record<string, number> } = {
        total: 0,
        byStage: {},
      };

      allStats.forEach((s) => {
        if (s.tokenUsage) {
          const stageTokens =
            typeof s.tokenUsage.Total === 'number'
              ? s.tokenUsage.Total
              : typeof s.tokenUsage.total === 'number'
                ? s.tokenUsage.total
                : 0;

          if (stageTokens > 0) {
            tokenUsage.total += stageTokens;
            if (!tokenUsage.byStage[s.stage]) {
              tokenUsage.byStage[s.stage] = 0;
            }
            tokenUsage.byStage[s.stage] += stageTokens;
          }
        }
      });

      // Calculate tool calls from stats files
      const toolCallsMap: Record<string, number> = {};
      allStats.forEach((s) => {
        if (s.toolCalls) {
          Object.entries(s.toolCalls).forEach(([key, val]) => {
            if (key !== 'Total' && key !== 'total') {
              toolCallsMap[key] = (toolCallsMap[key] || 0) + (Number(val) || 0);
            }
          });
        }
      });

      const toolCalls = Object.entries(toolCallsMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name, count]) => ({ name, count }));

      // Calculate complexity distribution
      const complexity: Record<string, number> = {};
      executions.forEach((e) => {
        const c = ((e as Record<string, unknown>).complexity as string) || 'Unknown';
        complexity[c] = (complexity[c] || 0) + 1;
      });

      // Calculate mode distribution
      const modeDistribution: Record<string, number> = {};
      executions.forEach((e) => {
        const m = ((e as Record<string, unknown>).mode as string) || 'Unknown';
        modeDistribution[m] = (modeDistribution[m] || 0) + 1;
      });

      // Load pipeline report markdown
      let pipelineReport = '';
      try {
        pipelineReport = await fs.promises.readFile(PIPELINE_REPORT_PATH, 'utf-8');
      } catch {
        pipelineReport =
          '# Pipeline Report\n\nNo report generated yet. Run `scripts/generate-pipeline-report.sh` to generate.';
      }

      // Identify common issues (placeholder - could be enhanced with pattern detection)
      const commonIssues: string[] = [];
      const failedExecutions = executions.filter((e) => e.outcome !== 'success');
      if (failedExecutions.length > 0) {
        // Add some basic issue detection
        const inProgressCount = executions.filter((e) => e.outcome === 'in-progress').length;
        if (inProgressCount > 0) {
          commonIssues.push(`${inProgressCount} pipeline(s) still in progress`);
        }
        const rolledBackCount = executions.filter((e) => e.outcome === 'rolled-back').length;
        if (rolledBackCount > 0) {
          commonIssues.push(`${rolledBackCount} pipeline(s) were rolled back`);
        }
      }

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
          successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : '0',
          totalTokens: tokenUsage.total,
        },
        stages: stageStats,
        executions: sortedExecutions,
        tokenUsage,
        toolCalls,
        complexity,
        modeDistribution,
        pipelineReport,
        commonIssues,
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

// Agents directory for stage reports
const AGENTS_DIR = path.join(__dirname, '..', '..', '.github', 'agents');

/**
 * Get stage reports (research, planning, implementation, validation)
 */
export function getStageReports() {
  return async (req: Request, res: Response) => {
    try {
      const stage = req.params.stage;
      const validStages = ['research', 'planning', 'implementation', 'validation'];

      if (!validStages.includes(stage)) {
        return res.status(400).json({
          success: false,
          message: `Invalid stage. Must be one of: ${validStages.join(', ')}`,
        });
      }

      const stageDir = path.join(AGENTS_DIR, stage);

      try {
        await fs.promises.access(stageDir);
      } catch {
        return res.json({
          success: true,
          stage,
          files: [],
        });
      }

      const allFiles = await fs.promises.readdir(stageDir);
      const mdFiles = allFiles.filter(
        (f) => f.endsWith('.md') && !f.startsWith('README') && !f.startsWith('AGENTS')
      );

      const files: Array<{
        filename: string;
        type: string;
        size: number;
        modified: string;
      }> = [];

      for (const filename of mdFiles.sort().reverse()) {
        try {
          const stat = await fs.promises.stat(path.join(stageDir, filename));
          let type = 'report';
          if (filename.includes('-grade')) type = 'grade';
          else if (filename.includes('-reviewed')) type = 'reviewed';

          files.push({
            filename,
            type,
            size: stat.size,
            modified: stat.mtime.toISOString(),
          });
        } catch {
          // Skip files we can't stat
        }
      }

      res.json({
        success: true,
        stage,
        files,
      });
    } catch (error) {
      console.error('Error getting stage reports:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve stage reports',
      });
    }
  };
}

/**
 * Get a specific report file content
 */
export function getReportFile() {
  return async (req: Request, res: Response) => {
    try {
      const { stage, filename } = req.params;
      const validStages = ['research', 'planning', 'implementation', 'validation'];

      if (!validStages.includes(stage)) {
        return res.status(400).json({
          success: false,
          message: `Invalid stage. Must be one of: ${validStages.join(', ')}`,
        });
      }

      // Sanitize filename to prevent directory traversal
      const sanitizedFilename = path.basename(filename);
      if (!sanitizedFilename.endsWith('.md')) {
        return res.status(400).json({
          success: false,
          message: 'Only markdown files are supported',
        });
      }

      const filePath = path.join(AGENTS_DIR, stage, sanitizedFilename);

      try {
        await fs.promises.access(filePath);
      } catch {
        return res.status(404).json({
          success: false,
          message: 'File not found',
        });
      }

      const content = await fs.promises.readFile(filePath, 'utf-8');
      const stat = await fs.promises.stat(filePath);

      res.json({
        success: true,
        stage,
        filename: sanitizedFilename,
        content,
        size: stat.size,
        modified: stat.mtime.toISOString(),
      });
    } catch (error) {
      console.error('Error getting report file:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve report file',
      });
    }
  };
}

// ============================================================================
// AREA API HANDLERS
// ============================================================================

import { AreaManager } from '../area/areaManager';
import { CreateAreaDTO, UpdateAreaDTO } from '../area/area';

/**
 * Get all areas - API handler
 */
export function getAllAreas() {
  return async (_req: Request, res: Response) => {
    try {
      const areaManager = AreaManager.getInstance();
      const areas = areaManager.getAll();
      res.json({ success: true, areas });
    } catch (error) {
      console.error('Error getting areas:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve areas',
      });
    }
  };
}

/**
 * Get area by ID with associated rooms - API handler
 */
export function getAreaById() {
  return async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const areaManager = AreaManager.getInstance();
      const area = areaManager.getById(id);

      if (!area) {
        return res.status(404).json({
          success: false,
          message: `Area '${id}' not found`,
        });
      }

      // Get rooms belonging to this area
      const roomManager = RoomManager.getInstance(new Map());
      await roomManager.ensureInitialized();
      const allRooms = roomManager.getAllRooms();
      const areaRooms = allRooms.filter((room) => {
        const data = room.toData();
        return data.areaId === id;
      });

      res.json({
        success: true,
        area,
        rooms: areaRooms.map((r) => r.toData()),
      });
    } catch (error) {
      console.error('Error getting area:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve area',
      });
    }
  };
}

/**
 * Create a new area - API handler
 */
export function createArea() {
  return async (req: Request, res: Response) => {
    try {
      const dto: CreateAreaDTO = req.body;

      if (!dto.id || !dto.name) {
        return res.status(400).json({
          success: false,
          message: 'Area ID and name are required',
        });
      }

      const areaManager = AreaManager.getInstance();
      const area = await areaManager.create(dto);

      res.status(201).json({
        success: true,
        message: 'Area created successfully',
        area,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create area';
      console.error('Error creating area:', error);
      res.status(400).json({
        success: false,
        message,
      });
    }
  };
}

/**
 * Update an area - API handler
 */
export function updateArea() {
  return async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const dto: UpdateAreaDTO = req.body;

      const areaManager = AreaManager.getInstance();
      const area = await areaManager.update(id, dto);

      res.json({
        success: true,
        message: 'Area updated successfully',
        area,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update area';
      console.error('Error updating area:', error);
      res.status(400).json({
        success: false,
        message,
      });
    }
  };
}

/**
 * Delete an area - API handler
 */
export function deleteArea() {
  return async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const areaManager = AreaManager.getInstance();
      await areaManager.delete(id);

      res.json({
        success: true,
        message: `Area '${id}' deleted successfully`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete area';
      console.error('Error deleting area:', error);
      res.status(400).json({
        success: false,
        message,
      });
    }
  };
}

// ============================================================================
// ROOM API HANDLERS
// ============================================================================

/**
 * Get all rooms - API handler
 */
export function getAllRooms() {
  return async (_req: Request, res: Response) => {
    try {
      const roomManager = RoomManager.getInstance(new Map());
      await roomManager.ensureInitialized();
      const rooms = roomManager.getAllRooms();
      res.json({
        success: true,
        rooms: rooms.map((r) => r.toData()),
      });
    } catch (error) {
      console.error('Error getting rooms:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve rooms',
      });
    }
  };
}

/**
 * Get room by ID - API handler
 */
export function getRoomById() {
  return async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const roomManager = RoomManager.getInstance(new Map());
      await roomManager.ensureInitialized();
      const room = roomManager.getRoom(id);

      if (!room) {
        return res.status(404).json({
          success: false,
          message: `Room '${id}' not found`,
        });
      }

      res.json({
        success: true,
        room: room.toData(),
      });
    } catch (error) {
      console.error('Error getting room:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve room',
      });
    }
  };
}

/**
 * Create a new room - API handler
 */
export function createRoom() {
  return async (req: Request, res: Response) => {
    try {
      const roomData = req.body;
      if (process.env.DEBUG === 'true') {
        console.log('[DEBUG POST /rooms] Received roomData:', JSON.stringify(roomData));
        console.log('[DEBUG POST /rooms] gridX:', roomData.gridX, 'gridY:', roomData.gridY);
      }

      if (!roomData.id) {
        return res.status(400).json({
          success: false,
          message: 'Room ID is required',
        });
      }

      const roomManager = RoomManager.getInstance(new Map());
      await roomManager.ensureInitialized();

      // Check if room already exists
      if (roomManager.getRoom(roomData.id)) {
        return res.status(400).json({
          success: false,
          message: `Room '${roomData.id}' already exists`,
        });
      }

      // Create room with defaults
      const fullRoomData = {
        id: roomData.id,
        name: roomData.name ?? 'New Room',
        description: roomData.description ?? 'An empty room.',
        shortDescription: roomData.shortDescription,
        longDescription: roomData.longDescription,
        exits: roomData.exits ?? [],
        items: roomData.items ?? [],
        npcs: roomData.npcs ?? [],
        currency: roomData.currency ?? { gold: 0, silver: 0, copper: 0 },
        flags: roomData.flags ?? [],
        areaId: roomData.areaId,
        gridX: roomData.gridX,
        gridY: roomData.gridY,
        gridZ: roomData.gridZ,
      };

      if (process.env.DEBUG === 'true') {
        console.log('[DEBUG POST /rooms] fullRoomData:', JSON.stringify(fullRoomData));
        console.log(
          '[DEBUG POST /rooms] fullRoomData.gridX:',
          fullRoomData.gridX,
          'gridY:',
          fullRoomData.gridY
        );
      }

      await roomManager.createRoom(fullRoomData);

      res.status(201).json({
        success: true,
        message: 'Room created successfully',
        room: fullRoomData,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create room';
      console.error('Error creating room:', error);
      res.status(400).json({
        success: false,
        message,
      });
    }
  };
}

/**
 * Update a room - API handler
 */
export function updateRoom() {
  return async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const roomManager = RoomManager.getInstance(new Map());
      await roomManager.ensureInitialized();
      const room = roomManager.getRoom(id);

      if (!room) {
        return res.status(404).json({
          success: false,
          message: `Room '${id}' not found`,
        });
      }

      // Apply updates
      const currentData = room.toData();
      const updatedData = {
        ...currentData,
        ...updates,
        id: currentData.id, // Prevent ID change
      };

      await roomManager.updateRoomData(updatedData);

      res.json({
        success: true,
        message: 'Room updated successfully',
        room: updatedData,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update room';
      console.error('Error updating room:', error);
      res.status(400).json({
        success: false,
        message,
      });
    }
  };
}

/**
 * Delete a room - API handler
 */
export function deleteRoom() {
  return async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const roomManager = RoomManager.getInstance(new Map());
      await roomManager.ensureInitialized();
      const room = roomManager.getRoom(id);

      if (!room) {
        return res.status(404).json({
          success: false,
          message: `Room '${id}' not found`,
        });
      }

      await roomManager.deleteRoom(id);

      res.json({
        success: true,
        message: `Room '${id}' deleted successfully`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete room';
      console.error('Error deleting room:', error);
      res.status(400).json({
        success: false,
        message,
      });
    }
  };
}

// ============================================================================
// AI GENERATION HANDLERS
// ============================================================================

interface AIGenerateRoomRequest {
  roomName: string;
  areaContext?: string;
  style?: 'fantasy' | 'dark' | 'mystical' | 'medieval';
}

interface AIGenerateRoomResponse {
  description: string;
  suggestedExits?: string[];
  suggestedNpcs?: string[];
}

/**
 * Generate room content using AI - API handler
 * Note: Requires OPENAI_API_KEY environment variable
 */
export function generateRoomContent() {
  return async (req: Request, res: Response) => {
    try {
      const { roomName, areaContext, style } = req.body as AIGenerateRoomRequest;

      if (!roomName) {
        return res.status(400).json({
          success: false,
          message: 'Room name is required',
        });
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        // Return a generated placeholder if no API key
        const placeholder: AIGenerateRoomResponse = {
          description: `You are in ${roomName}. ${areaContext ? `This is part of ${areaContext}. ` : ''}The area has a ${style ?? 'fantasy'} atmosphere.`,
          suggestedExits: ['north', 'south'],
          suggestedNpcs: [],
        };
        return res.json({
          success: true,
          generated: placeholder,
          note: 'AI generation requires OPENAI_API_KEY. Using placeholder.',
        });
      }

      // Call OpenAI API
      const prompt = `Generate a MUD room description for a room called "${roomName}".
${areaContext ? `Context: This room is part of ${areaContext}.` : ''}
${style ? `Style: ${style}` : 'Style: fantasy'}

Respond with JSON in this format:
{
  "description": "A vivid 2-3 sentence description of the room",
  "suggestedExits": ["direction1", "direction2"],
  "suggestedNpcs": ["npc_type1"]
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from AI response');
      }

      const generated: AIGenerateRoomResponse = JSON.parse(jsonMatch[0]);

      res.json({
        success: true,
        generated,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI generation failed';
      console.error('Error generating room content:', error);
      res.status(500).json({
        success: false,
        message,
      });
    }
  };
}
