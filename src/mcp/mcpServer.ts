// MCP server uses dynamic typing for flexible API responses
import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server as HttpServer } from 'http';
import { UserManager } from '../user/userManager';
import { RoomManager } from '../room/roomManager';
import { ClientManager } from '../client/clientManager';
import { GameTimerManager } from '../timer/gameTimerManager';
import { StateLoader } from '../testing/stateLoader';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { systemLogger, mcpLogger } from '../utils/logger';
import { VirtualSessionManager } from './virtualSessionManager';

// MCP protocol types
interface MCPToolCallParams {
  name: string;
  arguments: Record<string, unknown>;
}

type MCPRequestId = string | number | null;

/**
 * Strip ANSI escape codes from a string
 */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}
/**
 * Escape special regex characters in a string to prevent regex injection
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Clean command output for LLM consumption:
 * - Strips ANSI codes
 * - Removes the prompt line (HP/MP status bar)
 * - Removes terminal control sequences
 * - Trims whitespace
 */
function cleanCommandOutput(rawOutput: string): string {
  // Strip ANSI codes
  let output = stripAnsi(rawOutput);

  // Remove carriage returns and terminal control chars
  output = output.replace(/\r/g, '');

  // Remove the prompt pattern: [HP=X/X MP=X/X]:
  output = output.replace(/\[HP=\d+\/\d+\s*MP=\d+\/\d+\]:\s*/g, '');

  // Remove cursor movement sequences (e.g., \x1b[10D)
  // eslint-disable-next-line no-control-regex
  output = output.replace(/\x1b\[\d+[ABCD]/g, '');

  // Remove line clearing sequences
  // eslint-disable-next-line no-control-regex
  output = output.replace(/\x1b\[K/g, '');

  // Clean up multiple newlines
  output = output.replace(/\n{3,}/g, '\n\n');

  // Trim and return
  return output.trim();
}

/**
 * MCP Server integrated with EllyMUD runtime
 * Provides access to both static game data and live runtime state via HTTP
 */
export class MCPServer {
  private app: express.Application;
  private httpServer: HttpServer | null = null;
  private userManager: UserManager;
  private roomManager: RoomManager;
  private clientManager: ClientManager;
  private gameTimerManager: GameTimerManager;
  private virtualSessionManager: VirtualSessionManager;
  private stateLoader: StateLoader;
  private port: number;
  private tempUsers: Set<string> = new Set(); // Track temp users for cleanup
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    userManager: UserManager,
    roomManager: RoomManager,
    clientManager: ClientManager,
    gameTimerManager: GameTimerManager,
    port: number = 3100
  ) {
    this.userManager = userManager;
    this.roomManager = roomManager;
    this.clientManager = clientManager;
    this.gameTimerManager = gameTimerManager;
    this.virtualSessionManager = new VirtualSessionManager(
      clientManager,
      userManager,
      this.tempUsers
    );
    this.stateLoader = new StateLoader(userManager, roomManager);
    this.port = port;

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();

    // Clean up inactive virtual sessions every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.virtualSessionManager.cleanupInactiveSessions();
    }, 600000);
  }

  private setupMiddleware(): void {
    // Enable CORS for all origins (suitable for local development)
    this.app.use(
      cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
        credentials: false,
      })
    );
    this.app.use(express.json());

    // API Key Authentication Middleware
    this.app.use((req, res, next) => {
      // Skip authentication for health check endpoint
      if (req.path === '/health') {
        return next();
      }

      const apiKey = req.headers['x-api-key'] as string;
      const expectedApiKey = process.env.ELLYMUD_MCP_API_KEY;

      // If no API key is configured, allow all requests (backward compatibility)
      if (!expectedApiKey) {
        mcpLogger.warn('ELLYMUD_MCP_API_KEY not set - server is running without authentication');
        return next();
      }

      // Validate API key
      if (!apiKey || apiKey !== expectedApiKey) {
        mcpLogger.warn(`Unauthorized access attempt from ${req.ip} to ${req.path}`);
        return res.status(401).json({
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: 'Unauthorized - Invalid or missing API key',
          },
          id: null,
        });
      }

      next();
    });

    // Log all requests
    this.app.use((req, res, next) => {
      mcpLogger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // MCP Protocol JSON-RPC endpoint
    this.app.post('/', (req: Request, res: Response) => {
      const { jsonrpc, method, params, id } = req.body;

      // Log the incoming request for debugging
      mcpLogger.info(`MCP Request: method=${method}, jsonrpc=${jsonrpc}, id=${id}`);
      mcpLogger.debug(`Full request body: ${JSON.stringify(req.body)}`);

      // Validate JSON-RPC 2.0 format
      if (jsonrpc !== '2.0') {
        res.status(400).json({
          jsonrpc: '2.0',
          id: id || null,
          error: {
            code: -32600,
            message: "Invalid Request: jsonrpc must be '2.0'",
          },
        });
        return;
      }

      // Handle notifications (no id, no response needed)
      if (id === null || id === undefined) {
        mcpLogger.info(`Handling MCP notification: ${method}`);

        // Acknowledge all notifications with 200 OK but no JSON-RPC response
        if (method === 'notifications/initialized') {
          mcpLogger.info('Client initialized notification received');
          res.status(200).end();
          return;
        }

        // Other notifications
        mcpLogger.info(`Received notification: ${method}`);
        res.status(200).end();
        return;
      }

      // Handle MCP protocol methods (requests that need responses)
      if (method === 'initialize') {
        mcpLogger.info('Handling MCP initialize request');
        res.json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              resources: {},
              prompts: {},
            },
            serverInfo: {
              name: 'EllyMUD MCP Server',
              version: '1.0.0',
            },
            instructions: 'EllyMUD MCP Server - API Key authentication via X-API-Key header',
          },
        });
        return;
      }

      if (method === 'tools/list') {
        mcpLogger.info('Handling MCP tools/list request');
        res.json({
          jsonrpc: '2.0',
          id,
          result: {
            tools: this.getMCPToolsList(),
          },
        });
        return;
      }

      if (method === 'tools/call') {
        mcpLogger.info(`Handling MCP tools/call request: ${params?.name}`);
        this.handleToolCall(params, id, res);
        return;
      }

      if (method === 'prompts/list') {
        mcpLogger.info('Handling MCP prompts/list request');
        res.json({
          jsonrpc: '2.0',
          id,
          result: {
            prompts: [],
          },
        });
        return;
      }

      if (method === 'resources/list') {
        mcpLogger.info('Handling MCP resources/list request');
        res.json({
          jsonrpc: '2.0',
          id,
          result: {
            resources: [],
          },
        });
        return;
      }

      // Unknown method
      mcpLogger.warn(`Unknown MCP method: ${method}`);
      res.status(400).json({
        jsonrpc: '2.0',
        id: id || null,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      });
    });

    // Root endpoint - MCP server info (GET for browser access)
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'EllyMUD MCP Server',
        version: '1.0.0',
        description:
          'Model Context Protocol server providing access to EllyMUD game state and data',
        protocol: 'MCP (Model Context Protocol) via JSON-RPC 2.0',
        endpoints: {
          mcp: 'POST / (JSON-RPC 2.0)',
          health: '/health',
          tools: '/tools',
          api: '/api/*',
        },
        documentation: 'See /tools for available endpoints',
      });
    });

    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // List all available tools
    this.app.get('/tools', (req: Request, res: Response) => {
      res.json({
        tools: [
          {
            name: 'get_online_users',
            description:
              'Get list of currently connected users with their current state and location',
            endpoint: '/api/online-users',
            method: 'GET',
          },
          {
            name: 'get_user_data',
            description:
              'Get detailed information about a specific user including stats, inventory, and equipment',
            endpoint: '/api/users/:username',
            method: 'GET',
          },
          {
            name: 'get_room_data',
            description:
              'Get detailed information about a specific room including description, exits, items, NPCs, and current occupants',
            endpoint: '/api/rooms/:roomId',
            method: 'GET',
          },
          {
            name: 'get_all_rooms',
            description: 'Get a list of all rooms in the game world',
            endpoint: '/api/rooms',
            method: 'GET',
          },
          {
            name: 'get_all_items',
            description: 'Get a list of all item templates in the game',
            endpoint: '/api/items',
            method: 'GET',
          },
          {
            name: 'get_all_npcs',
            description: 'Get a list of all NPC templates in the game',
            endpoint: '/api/npcs',
            method: 'GET',
          },
          {
            name: 'get_combat_state',
            description: 'Get information about active combat sessions in the game',
            endpoint: '/api/combat-state',
            method: 'GET',
          },
          {
            name: 'search_logs',
            description: 'Search through player logs or system logs for debugging',
            endpoint: '/api/logs/search',
            method: 'POST',
            body: {
              logType: 'player | system | error | raw-session',
              searchTerm: 'string',
              username: 'string (optional, required for player/raw-session)',
            },
          },
          {
            name: 'get_game_config',
            description: 'Get current game configuration settings',
            endpoint: '/api/config',
            method: 'GET',
          },
          {
            name: 'tail_user_session',
            description:
              "Get the last N lines of a user's raw session log to see exactly what they are seeing. If username not provided and only one user is online, uses that user automatically.",
            endpoint: '/api/tail-session',
            method: 'POST',
            body: {
              username: 'string (optional if only 1 user online)',
              lines: 'number (optional, default 500, max 500)',
            },
          },
          {
            name: 'virtual_session_create',
            description: 'Create a new virtual game session for the LLM to play the game',
            endpoint: '/api/virtual-session/create',
            method: 'POST',
          },
          {
            name: 'virtual_session_command',
            description:
              'Send a command to a virtual game session and get the response. Output is cleaned (ANSI codes and prompt removed) for easy parsing.',
            endpoint: '/api/virtual-session/command',
            method: 'POST',
            body: {
              sessionId: 'string',
              command: 'string',
              waitMs: 'number (optional, default 100)',
            },
          },
          {
            name: 'virtual_session_info',
            description: 'Get information about a virtual session',
            endpoint: '/api/virtual-session/:sessionId',
            method: 'GET',
          },
          {
            name: 'virtual_session_close',
            description: 'Close a virtual game session',
            endpoint: '/api/virtual-session/:sessionId',
            method: 'DELETE',
          },
          {
            name: 'virtual_sessions_list',
            description: 'List all active virtual sessions',
            endpoint: '/api/virtual-sessions',
            method: 'GET',
          },
          {
            name: 'advance_game_ticks',
            description: 'Advance the game timer by a specific number of ticks (Test Mode only)',
            endpoint: '/api/test/advance-ticks',
            method: 'POST',
            body: {
              ticks: 'number',
            },
          },
          {
            name: 'get_game_tick',
            description: 'Get the current game tick count',
            endpoint: '/api/test/tick-count',
            method: 'GET',
          },
          {
            name: 'set_test_mode',
            description: 'Enable or disable test mode (pauses/resumes timer)',
            endpoint: '/api/test/mode',
            method: 'POST',
            body: {
              enabled: 'boolean',
            },
          },
        ],
      });
    });

    // API endpoints
    this.app.get('/api/online-users', async (req: Request, res: Response) => {
      try {
        const data = await this.getOnlineUsers();
        mcpLogger.info(`Retrieved ${data.count} online users`);
        res.json({ success: true, data });
      } catch (error) {
        mcpLogger.error(`Error getting online users: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get('/api/users/:username', async (req: Request, res: Response) => {
      try {
        const data = await this.getUserData(req.params.username);
        mcpLogger.info(`Retrieved user data for ${req.params.username}`);
        res.json({ success: true, data });
      } catch (error) {
        mcpLogger.error(`Error getting user data: ${error}`);
        res.status(404).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get('/api/rooms/:roomId', async (req: Request, res: Response) => {
      try {
        const data = await this.getRoomData(req.params.roomId);
        mcpLogger.info(`Retrieved room data for ${req.params.roomId}`);
        res.json({ success: true, data });
      } catch (error) {
        mcpLogger.error(`Error getting room data: ${error}`);
        res.status(404).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get('/api/rooms', async (req: Request, res: Response) => {
      try {
        const data = await this.getAllRooms();
        mcpLogger.info(`Retrieved ${data.count} rooms`);
        res.json({ success: true, data });
      } catch (error) {
        mcpLogger.error(`Error getting all rooms: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get('/api/items', async (req: Request, res: Response) => {
      try {
        const data = await this.getAllItems();
        mcpLogger.info(`Retrieved ${data.count} items`);
        res.json({ success: true, data });
      } catch (error) {
        mcpLogger.error(`Error getting all items: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get('/api/npcs', async (req: Request, res: Response) => {
      try {
        const data = await this.getAllNPCs();
        mcpLogger.info(`Retrieved ${data.count} NPCs`);
        res.json({ success: true, data });
      } catch (error) {
        mcpLogger.error(`Error getting all NPCs: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get('/api/combat-state', async (req: Request, res: Response) => {
      try {
        const data = await this.getCombatState();
        mcpLogger.info(`Retrieved ${data.activeCombatSessions} combat sessions`);
        res.json({ success: true, data });
      } catch (error) {
        mcpLogger.error(`Error getting combat state: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.post('/api/logs/search', async (req: Request, res: Response) => {
      try {
        const { logType, searchTerm, username } = req.body;
        if (!logType || !searchTerm) {
          return res.status(400).json({
            success: false,
            error: 'logType and searchTerm are required',
          });
        }
        const data = await this.searchLogs(logType, searchTerm, username);
        mcpLogger.info(
          `Searched ${logType} logs for "${searchTerm}" - found ${data.results.length} results`
        );
        res.json({ success: true, data });
      } catch (error) {
        mcpLogger.error(`Error searching logs: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get('/api/config', async (req: Request, res: Response) => {
      try {
        const data = await this.getGameConfig();
        mcpLogger.info('Retrieved game config');
        res.json({ success: true, data });
      } catch (error) {
        mcpLogger.error(`Error getting game config: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.post('/api/tail-session', async (req: Request, res: Response) => {
      try {
        let { username, lines } = req.body;

        // Default to 500 lines, max 500
        lines = lines ? Math.min(Math.max(1, parseInt(lines)), 500) : 500;

        // If no username provided, check if only one user is online
        if (!username) {
          const onlineUsers = await this.getOnlineUsers();
          if (onlineUsers.count === 0) {
            return res.status(400).json({
              success: false,
              error: 'No users currently online',
            });
          }
          if (onlineUsers.count === 1) {
            username = onlineUsers.users[0].username;
            mcpLogger.info(`Auto-selected only online user: ${username}`);
          } else {
            return res.status(400).json({
              success: false,
              error: `Multiple users online (${onlineUsers.count}). Please specify username.`,
              availableUsers: onlineUsers.users.map((u) => u.username),
            });
          }
        }

        const data = await this.tailUserSession(username, lines);
        mcpLogger.info(`Tailed ${lines} lines of session for user: ${username}`);
        res.json({ success: true, data });
      } catch (error) {
        mcpLogger.error(`Error tailing session: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Virtual session endpoints
    this.app.post('/api/virtual-session/create', async (req: Request, res: Response) => {
      try {
        const session = this.virtualSessionManager.createSession();
        mcpLogger.info(`Created virtual session: ${session.getSessionId()}`);
        res.json({
          success: true,
          data: {
            sessionId: session.getSessionId(),
            message: 'Virtual session created. Use session_command to interact.',
          },
        });
      } catch (error) {
        mcpLogger.error(`Error creating virtual session: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.post('/api/virtual-session/command', async (req: Request, res: Response) => {
      try {
        const { sessionId, command, waitMs } = req.body;

        if (!sessionId || !command) {
          return res.status(400).json({
            success: false,
            error: 'sessionId and command are required',
          });
        }

        const session = this.virtualSessionManager.getSession(sessionId);
        if (!session) {
          return res.status(404).json({
            success: false,
            error: `Session '${sessionId}' not found`,
          });
        }

        // Send the command
        session.sendCommand(command);

        // Wait a bit for the response (default 100ms, max 5000ms)
        // Use predefined safe delay values to prevent resource exhaustion (CWE-400)
        const SAFE_DELAYS = [0, 50, 100, 200, 500, 1000, 2000, 5000] as const;
        const DEFAULT_DELAY = 100;
        const MAX_DELAY = 5000;

        let requestedDelay = DEFAULT_DELAY;
        if (waitMs !== undefined) {
          const parsed = parseInt(waitMs, 10);
          if (Number.isFinite(parsed)) {
            requestedDelay = Math.min(Math.max(parsed, 0), MAX_DELAY);
          }
        }

        // Find the closest safe delay value (snap to predefined values)
        const safeDelay = SAFE_DELAYS.reduce((prev, curr) =>
          Math.abs(curr - requestedDelay) < Math.abs(prev - requestedDelay) ? curr : prev
        );
        await new Promise((resolve) => setTimeout(resolve, safeDelay));

        // Get the output
        const output = session.getOutput(true);

        mcpLogger.info(`Virtual session ${sessionId} executed command: ${command}`);
        res.json({
          success: true,
          data: {
            sessionId,
            command,
            output,
            sessionInfo: session.getInfo(),
          },
        });
      } catch (error) {
        mcpLogger.error(`Error executing virtual session command: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get('/api/virtual-session/:sessionId', async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.params;
        const session = this.virtualSessionManager.getSession(sessionId);

        if (!session) {
          return res.status(404).json({
            success: false,
            error: `Session '${sessionId}' not found`,
          });
        }

        res.json({
          success: true,
          data: session.getInfo(),
        });
      } catch (error) {
        mcpLogger.error(`Error getting virtual session info: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.delete('/api/virtual-session/:sessionId', async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.params;
        const closed = this.virtualSessionManager.closeSession(sessionId);

        if (!closed) {
          return res.status(404).json({
            success: false,
            error: `Session '${sessionId}' not found`,
          });
        }

        mcpLogger.info(`Closed virtual session: ${sessionId}`);
        res.json({
          success: true,
          data: { message: 'Session closed' },
        });
      } catch (error) {
        mcpLogger.error(`Error closing virtual session: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get('/api/virtual-sessions', async (req: Request, res: Response) => {
      try {
        const sessions = Array.from(this.virtualSessionManager.getAllSessions().values()).map(
          (session) => session.getInfo()
        );

        res.json({
          success: true,
          data: {
            count: sessions.length,
            sessions,
          },
        });
      } catch (error) {
        mcpLogger.error(`Error listing virtual sessions: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Test Mode Endpoints
    this.app.post('/api/test/advance-ticks', (req: Request, res: Response) => {
      try {
        const { ticks } = req.body;
        if (typeof ticks !== 'number' || ticks <= 0) {
          return res.status(400).json({ success: false, error: 'Invalid ticks value' });
        }
        this.gameTimerManager.advanceTicks(ticks);
        mcpLogger.info(`Advanced game timer by ${ticks} ticks`);
        res.json({
          success: true,
          data: { ticksAdvanced: ticks, currentTick: this.gameTimerManager.getTickCount() },
        });
      } catch (error) {
        mcpLogger.error(`Error advancing ticks: ${error}`);
        res.status(500).json({ success: false, error: String(error) });
      }
    });

    this.app.get('/api/test/tick-count', (req: Request, res: Response) => {
      try {
        const count = this.gameTimerManager.getTickCount();
        res.json({ success: true, data: { tickCount: count } });
      } catch (error) {
        mcpLogger.error(`Error getting tick count: ${error}`);
        res.status(500).json({ success: false, error: String(error) });
      }
    });

    this.app.post('/api/test/mode', (req: Request, res: Response) => {
      try {
        const { enabled } = req.body;
        if (typeof enabled !== 'boolean') {
          return res.status(400).json({ success: false, error: 'Invalid enabled value' });
        }
        this.gameTimerManager.setTestMode(enabled);
        mcpLogger.info(`Set test mode to ${enabled}`);
        res.json({ success: true, data: { testMode: enabled } });
      } catch (error) {
        mcpLogger.error(`Error setting test mode: ${error}`);
        res.status(500).json({ success: false, error: String(error) });
      }
    });

    // State Management Endpoints
    this.app.post('/api/test/snapshot/load', async (req: Request, res: Response) => {
      try {
        const { name } = req.body;
        if (!name) {
          return res.status(400).json({ success: false, error: 'Snapshot name is required' });
        }
        const result = await this.loadTestSnapshot(name);
        mcpLogger.info(`Loaded test snapshot: ${name}`);
        res.json({ success: true, data: result });
      } catch (error) {
        mcpLogger.error(`Error loading snapshot: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.post('/api/test/snapshot/save', async (req: Request, res: Response) => {
      try {
        const { name, overwrite } = req.body;
        if (!name) {
          return res.status(400).json({ success: false, error: 'Snapshot name is required' });
        }
        const result = await this.saveTestSnapshot(name, overwrite);
        mcpLogger.info(`Saved test snapshot: ${name}`);
        res.json({ success: true, data: result });
      } catch (error) {
        mcpLogger.error(`Error saving snapshot: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.post('/api/test/reset', async (req: Request, res: Response) => {
      try {
        const result = await this.resetGameState();
        mcpLogger.info('Reset game state to fresh');
        res.json({ success: true, data: result });
      } catch (error) {
        mcpLogger.error(`Error resetting game state: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get('/api/test/snapshots', (req: Request, res: Response) => {
      try {
        const result = this.listTestSnapshots();
        res.json({ success: true, data: result });
      } catch (error) {
        mcpLogger.error(`Error listing snapshots: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.post('/api/test/set-player-stats', (req: Request, res: Response) => {
      try {
        const result = this.setPlayerStats(req.body);
        res.json({ success: true, data: result });
      } catch (error) {
        mcpLogger.error(`Error setting player stats: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  private async getOnlineUsers() {
    // Import SudoCommand to check admin status
    const { SudoCommand } = await import('../command/commands/sudo.command.js');

    const clients = Array.from(this.clientManager.getClients().values());
    const onlineUsers = clients.map((client) => ({
      username: client.user?.username || 'Not logged in',
      state: client.state || 'Unknown',
      roomId: client.user?.currentRoomId || null,
      sessionId: client.id,
      connectedAt: client.connectedAt,
      isAdmin: client.user?.username ? SudoCommand.isAuthorizedUser(client.user.username) : false,
    }));

    return {
      count: onlineUsers.length,
      users: onlineUsers,
    };
  }

  private async getUserData(username: string) {
    // First check if user is online - runtime client.user has the actual current stats
    const clients = Array.from(this.clientManager.getClients().values());
    const onlineClient = clients.find(
      (client) => client.user?.username?.toLowerCase() === username.toLowerCase()
    );

    if (onlineClient && onlineClient.user) {
      // Return the runtime user data which reflects current state (regeneration, combat, etc.)
      return onlineClient.user;
    }

    // Fall back to persisted data for offline users
    const user = this.userManager.getUser(username);
    if (!user) {
      throw new Error(`User '${username}' not found`);
    }
    return user;
  }

  private async getRoomData(roomId: string) {
    const room = this.roomManager.getRoom(roomId);
    if (!room) {
      throw new Error(`Room '${roomId}' not found`);
    }

    // Get users currently in the room
    const clients = Array.from(this.clientManager.getClients().values());
    const usersInRoom = clients
      .filter((client) => client.user?.currentRoomId === roomId)
      .map((client) => client.user?.username);

    // Convert Maps to arrays for proper JSON serialization
    const npcsArray = Array.from(room.npcs.entries()).map(([id, npc]) => ({
      instanceId: id,
      templateId: npc.templateId,
      name: npc.name,
      health: npc.health,
      maxHealth: npc.maxHealth,
      isHostile: npc.isHostile,
      experienceValue: npc.experienceValue,
    }));

    const itemInstancesArray = Array.from(room.getItemInstances().entries()).map(
      ([instanceId, templateId]) => ({
        instanceId,
        templateId,
      })
    );

    return {
      id: room.id,
      name: room.name,
      description: room.description,
      exits: room.exits,
      items: room.items,
      currency: room.currency,
      currentUsers: usersInRoom,
      npcs: npcsArray,
      itemInstances: itemInstancesArray,
    };
  }

  private async getAllRooms() {
    const rooms = this.roomManager.getAllRooms();
    return {
      count: rooms.length,
      rooms: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description?.substring(0, 100) + '...',
        exits: Object.keys(r.exits || {}),
      })),
    };
  }

  private async getAllItems() {
    try {
      const itemsPath = join(process.cwd(), 'data', 'items.json');
      const itemsData = JSON.parse(readFileSync(itemsPath, 'utf-8'));
      return {
        count: itemsData.length,
        items: itemsData,
      };
    } catch (error) {
      throw new Error(`Failed to read items data: ${error}`);
    }
  }

  private async getAllNPCs() {
    try {
      const npcsPath = join(process.cwd(), 'data', 'npcs.json');
      const npcsData = JSON.parse(readFileSync(npcsPath, 'utf-8'));
      return {
        count: npcsData.length,
        npcs: npcsData,
      };
    } catch (error) {
      throw new Error(`Failed to read NPCs data: ${error}`);
    }
  }

  private async getCombatState() {
    const clients = Array.from(this.clientManager.getClients().values());
    const combatSessions = clients
      .filter((client) => client.state === 'authenticated' && client.stateData?.inCombat)
      .map((client) => ({
        username: client.user?.username,
        roomId: client.user?.currentRoomId,
        combatData: client.stateData,
      }));

    return {
      activeCombatSessions: combatSessions.length,
      sessions: combatSessions,
    };
  }

  private async searchLogs(logType: string, searchTerm: string, username?: string) {
    try {
      let logDir: string;
      let logFiles: string[];

      switch (logType) {
        case 'player':
          if (!username) {
            throw new Error('username is required for player logs');
          }
          logDir = join(process.cwd(), 'logs', 'players');
          logFiles = readdirSync(logDir).filter((f) => f.startsWith(username + '-'));
          break;

        case 'raw-session':
          if (!username) {
            throw new Error('username is required for raw-session logs');
          }
          logDir = join(process.cwd(), 'logs', 'raw-sessions');
          logFiles = readdirSync(logDir).filter((f) => f.includes(username));
          break;

        case 'system':
          logDir = join(process.cwd(), 'logs');
          logFiles = readdirSync(logDir).filter((f) => f.startsWith('system-'));
          break;

        case 'error':
          logDir = join(process.cwd(), 'logs');
          logFiles = readdirSync(logDir).filter((f) => f.startsWith('error-'));
          break;

        default:
          throw new Error(`Unknown log type: ${logType}`);
      }

      // Search through log files
      const results: Array<{ file: string; matches: string[] }> = [];
      const searchRegex = new RegExp(escapeRegExp(searchTerm), 'gi');

      for (const file of logFiles.slice(-5)) {
        // Only search last 5 files
        const content = readFileSync(join(logDir, file), 'utf-8');
        const lines = content.split('\n');
        const matches = lines.filter((line) => searchRegex.test(line));

        if (matches.length > 0) {
          results.push({
            file,
            matches: matches.slice(0, 10), // Limit to 10 matches per file
          });
        }
      }

      return {
        logType,
        searchTerm,
        filesSearched: logFiles.length,
        results,
      };
    } catch (error) {
      throw new Error(`Failed to search logs: ${error}`);
    }
  }

  private async getGameConfig() {
    try {
      const configPath = join(process.cwd(), 'data', 'mud-config.json');
      const configData = JSON.parse(readFileSync(configPath, 'utf-8'));
      return configData;
    } catch (error) {
      throw new Error(`Failed to read game config: ${error}`);
    }
  }

  private async tailUserSession(username: string | undefined, lines: number = 500) {
    // Import SudoCommand to check admin status
    const { SudoCommand } = await import('../command/commands/sudo.command.js');

    // Get list of online users
    const clients = Array.from(this.clientManager.getClients().values());
    const onlineUsers = clients
      .filter((c) => c.user?.username)
      .map((c) => ({
        username: c.user!.username,
        client: c,
        isAdmin: SudoCommand.isAuthorizedUser(c.user!.username),
      }));

    // If no username provided, auto-select based on rules
    if (!username) {
      if (onlineUsers.length === 0) {
        throw new Error('No users currently online');
      }

      if (onlineUsers.length === 1) {
        // Rule 1: If only 1 user online, auto-select
        username = onlineUsers[0].username;
        mcpLogger.info(`Auto-selected only online user: ${username}`);
      } else {
        // Rule 2: If multiple users, prefer admin users
        const adminUsers = onlineUsers.filter((u) => u.isAdmin);

        if (adminUsers.length === 1) {
          username = adminUsers[0].username;
          mcpLogger.info(`Auto-selected only admin user: ${username}`);
        } else if (adminUsers.length > 1) {
          // Rule 3: Multiple admins, ask LLM to choose
          throw new Error(
            `Multiple admin users online. Please specify username: ${adminUsers.map((u) => u.username).join(', ')}`
          );
        } else {
          // No admins, multiple regular users - ask LLM to choose
          throw new Error(
            `Multiple users online. Please specify username: ${onlineUsers.map((u) => u.username).join(', ')}`
          );
        }
      }
    }

    // Find the user's session
    const userClient = clients.find((c) => c.user?.username === username);

    if (!userClient) {
      throw new Error(`User '${username}' is not currently online`);
    }

    // Get the connection ID (which is used for the session log filename)
    const sessionId = userClient.connection.getId();

    if (!sessionId || sessionId === 'unknown') {
      throw new Error(`Unable to retrieve session ID for user '${username}'`);
    }

    const today = new Date().toISOString().split('T')[0];
    const logFilePath = join(process.cwd(), 'logs', 'raw-sessions', `${sessionId}-${today}.log`);

    // Check if log file exists
    if (!existsSync(logFilePath)) {
      return {
        username,
        sessionId,
        lines: 0,
        content: '(No session log file found for today)',
        logFile: logFilePath,
      };
    }

    // Read the last N lines from the file
    const content = readFileSync(logFilePath, 'utf-8');
    const allLines = content.split('\n');
    const lastLines = allLines.slice(-lines);

    return {
      username,
      sessionId,
      lines: lastLines.length,
      requestedLines: lines,
      content: lastLines.join('\n'),
      logFile: logFilePath,
      totalLines: allLines.length,
    };
  }

  /**
   * Get MCP tools list in MCP protocol format
   */
  private getMCPToolsList() {
    return [
      {
        name: 'get_online_users',
        description: 'Get list of currently connected users with their current state and location',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_user_data',
        description:
          'Get detailed information about a specific user including stats, inventory, and equipment',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'The username to look up' },
          },
          required: ['username'],
        },
      },
      {
        name: 'get_room_data',
        description:
          'Get detailed information about a specific room including description, exits, items, NPCs, and current occupants',
        inputSchema: {
          type: 'object',
          properties: {
            roomId: { type: 'string', description: 'The room ID to look up' },
          },
          required: ['roomId'],
        },
      },
      {
        name: 'get_all_rooms',
        description: 'Get a list of all rooms in the game world',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_all_items',
        description: 'Get a list of all item templates in the game',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_all_npcs',
        description: 'Get a list of all NPC templates in the game',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_combat_state',
        description: 'Get information about active combat sessions in the game',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_game_config',
        description: 'Get current game configuration settings',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'tail_user_session',
        description:
          "Get the last N lines of a user's raw session log to see exactly what they are seeing. Automatically selects user if only one is online.",
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username to tail (optional if only 1 user online)',
            },
            lines: {
              type: 'number',
              description: 'Number of lines to retrieve (default 500, max 500)',
            },
          },
          required: [],
        },
      },
      {
        name: 'virtual_session_create',
        description:
          'Create a new virtual game session for the LLM to interact with the game as a player',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'virtual_session_command',
        description:
          'Send a command to a virtual game session and receive the response. Use this to login, create users, and play the game.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'The virtual session ID',
            },
            command: {
              type: 'string',
              description: "The command to send (e.g., 'admin', 'password', 'look', 'north')",
            },
            waitMs: {
              type: 'number',
              description: 'Milliseconds to wait for response (default 100)',
            },
          },
          required: ['sessionId', 'command'],
        },
      },
      {
        name: 'virtual_session_info',
        description:
          'Get information about a virtual session including authentication status and current state',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'The virtual session ID',
            },
          },
          required: ['sessionId'],
        },
      },
      {
        name: 'virtual_session_close',
        description: 'Close a virtual game session',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'The virtual session ID',
            },
          },
          required: ['sessionId'],
        },
      },
      {
        name: 'virtual_sessions_list',
        description: 'List all active virtual sessions',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'create_temp_user',
        description:
          'Create a temporary user for testing. Temp users are automatically deleted when the server restarts.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description:
                "Optional username for the temp user. If not provided, a random name like 'temp_abc123' will be generated.",
            },
          },
          required: [],
        },
      },
      {
        name: 'direct_login',
        description:
          "Create a virtual session and login directly as the specified user, bypassing password authentication. If the user doesn't exist, it will be created as a temp user. Perfect for quick testing.",
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: "Username to login as. Will be created as temp user if doesn't exist.",
            },
            isAdmin: {
              type: 'boolean',
              description: 'If true, grants admin flag to the user. Default: false',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'load_test_snapshot',
        description:
          'Load a named test snapshot, replacing current game state. Use to reset to known states for testing.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Snapshot name (e.g., "fresh", "combat-ready")',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'save_test_snapshot',
        description: 'Save current game state as a named snapshot for future tests.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the snapshot',
            },
            overwrite: {
              type: 'boolean',
              description: 'If true, overwrites existing snapshot. Default: false',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'reset_game_state',
        description: 'Reset game to clean/fresh state by loading the "fresh" snapshot.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'list_test_snapshots',
        description: 'List all available test snapshots.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'set_player_stats',
        description:
          'Directly set player stats for testing (health, mana, gold, etc). Only specified fields are updated.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username of the player to modify',
            },
            health: {
              type: 'number',
              description: 'Set current health',
            },
            maxHealth: {
              type: 'number',
              description: 'Set maximum health',
            },
            mana: {
              type: 'number',
              description: 'Set current mana',
            },
            maxMana: {
              type: 'number',
              description: 'Set maximum mana',
            },
            gold: {
              type: 'number',
              description: 'Set gold in inventory',
            },
            experience: {
              type: 'number',
              description: 'Set experience points',
            },
            level: {
              type: 'number',
              description: 'Set player level',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'advance_game_ticks',
        description:
          'Advance the game timer by a specific number of ticks. Used for testing time-based mechanics like regeneration (12 ticks = 1 regen cycle). Requires test mode to be enabled.',
        inputSchema: {
          type: 'object',
          properties: {
            ticks: {
              type: 'number',
              description: 'Number of ticks to advance (must be positive)',
            },
          },
          required: ['ticks'],
        },
      },
      {
        name: 'get_game_tick',
        description:
          'Get the current game tick count. Useful for tracking time progression in tests.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'set_test_mode',
        description:
          'Enable or disable test mode. When enabled, the game timer is paused and can only be advanced manually via advance_game_ticks. Required before using advance_game_ticks.',
        inputSchema: {
          type: 'object',
          properties: {
            enabled: {
              type: 'boolean',
              description:
                'True to enable test mode (pause timer), false to disable (resume timer)',
            },
          },
          required: ['enabled'],
        },
      },
      {
        name: 'sync_artifacts_to_hub',
        description:
          'Sync pipeline artifacts from local development to the hub codespace. Requires GitHub CLI authentication.',
        inputSchema: {
          type: 'object',
          properties: {
            dryRun: {
              type: 'boolean',
              description: 'Preview changes without actually syncing (default: false)',
            },
            hubCodespace: {
              type: 'string',
              description:
                'Hub codespace name (default: PIPELINE_HUB_CODESPACE env var or "ellymud-pipeline-hub")',
            },
          },
          required: [],
        },
      },
      {
        name: 'sync_artifacts_from_hub',
        description:
          'Sync pipeline artifacts from the hub codespace to local development. Requires GitHub CLI authentication.',
        inputSchema: {
          type: 'object',
          properties: {
            dryRun: {
              type: 'boolean',
              description: 'Preview changes without actually syncing (default: false)',
            },
            hubCodespace: {
              type: 'string',
              description:
                'Hub codespace name (default: PIPELINE_HUB_CODESPACE env var or "ellymud-pipeline-hub")',
            },
            force: {
              type: 'boolean',
              description: 'Overwrite local files even if they are newer (default: false)',
            },
          },
          required: [],
        },
      },
    ];
  }

  /**
   * Handle MCP tool call
   */
  private async handleToolCall(params: MCPToolCallParams, id: MCPRequestId, res: Response) {
    const { name, arguments: args } = params;
    // Cast args to Record for accessing properties by key
    const toolArgs = args as Record<string, string | number | boolean | undefined>;

    try {
      let result;

      switch (name) {
        case 'get_online_users':
          result = await this.getOnlineUsers();
          break;
        case 'get_user_data':
          result = await this.getUserData(toolArgs.username as string);
          break;
        case 'get_room_data':
          result = await this.getRoomData(toolArgs.roomId as string);
          break;
        case 'get_all_rooms':
          result = await this.getAllRooms();
          break;
        case 'get_all_items':
          result = await this.getAllItems();
          break;
        case 'get_all_npcs':
          result = await this.getAllNPCs();
          break;
        case 'get_combat_state':
          result = await this.getCombatState();
          break;
        case 'get_game_config':
          result = await this.getGameConfig();
          break;
        case 'tail_user_session':
          result = await this.tailUserSession(
            toolArgs.username as string | undefined,
            toolArgs.lines as number | undefined
          );
          break;
        case 'virtual_session_create':
          result = this.createVirtualSession();
          break;
        case 'virtual_session_command':
          result = await this.sendVirtualCommand(
            toolArgs.sessionId as string,
            toolArgs.command as string,
            toolArgs.waitMs as number | undefined
          );
          break;
        case 'virtual_session_info':
          result = this.getVirtualSessionInfo(toolArgs.sessionId as string);
          break;
        case 'virtual_session_close':
          result = this.closeVirtualSession(toolArgs.sessionId as string);
          break;
        case 'virtual_sessions_list':
          result = this.listVirtualSessions();
          break;
        case 'create_temp_user':
          result = this.createTempUser(toolArgs.username as string | undefined);
          break;
        case 'direct_login':
          result = this.directLogin(
            toolArgs.username as string,
            toolArgs.isAdmin as boolean | undefined
          );
          break;
        case 'load_test_snapshot':
          result = await this.loadTestSnapshot(toolArgs.name as string);
          break;
        case 'save_test_snapshot':
          result = await this.saveTestSnapshot(
            toolArgs.name as string,
            toolArgs.overwrite as boolean | undefined
          );
          break;
        case 'reset_game_state':
          result = await this.resetGameState();
          break;
        case 'list_test_snapshots':
          result = this.listTestSnapshots();
          break;
        case 'set_player_stats':
          result = this.setPlayerStats({
            username: toolArgs.username as string,
            health: toolArgs.health as number | undefined,
            maxHealth: toolArgs.maxHealth as number | undefined,
            mana: toolArgs.mana as number | undefined,
            maxMana: toolArgs.maxMana as number | undefined,
            gold: toolArgs.gold as number | undefined,
            experience: toolArgs.experience as number | undefined,
            level: toolArgs.level as number | undefined,
          });
          break;
        case 'advance_game_ticks':
          result = this.advanceGameTicks(toolArgs.ticks as number);
          break;
        case 'get_game_tick':
          result = this.getGameTick();
          break;
        case 'set_test_mode':
          result = this.setTestMode(toolArgs.enabled as boolean);
          break;
        case 'sync_artifacts_to_hub':
          result = await this.syncArtifactsToHub(
            toolArgs.dryRun as boolean | undefined,
            toolArgs.hubCodespace as string | undefined
          );
          break;
        case 'sync_artifacts_from_hub':
          result = await this.syncArtifactsFromHub(
            toolArgs.dryRun as boolean | undefined,
            toolArgs.hubCodespace as string | undefined,
            toolArgs.force as boolean | undefined
          );
          break;
        default:
          res.status(400).json({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Unknown tool: ${name}`,
            },
          });
          return;
      }

      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
      });
    } catch (error) {
      mcpLogger.error(`Error calling tool ${name}: ${error}`);
      res.status(500).json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * Virtual session helper methods
   */
  private createVirtualSession() {
    const session = this.virtualSessionManager.createSession();
    return {
      sessionId: session.getSessionId(),
      message: 'Virtual session created. Use virtual_session_command to interact.',
      info: session.getInfo(),
    };
  }

  private async sendVirtualCommand(sessionId: string, command: string, waitMs?: number) {
    const session = this.virtualSessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found`);
    }

    // IMPORTANT: Clear any accumulated output BEFORE sending command
    // This prevents previous command output from bleeding into current response
    session.clearOutput();

    // Send the command
    session.sendCommand(command);

    // Wait for response (default 200ms - increased from 100ms for more complete output)
    const DEFAULT_WAIT_MS = 200;
    const MIN_WAIT_MS = 0;
    const MAX_WAIT_MS = 5000; // Cap at 5 seconds to prevent resource exhaustion

    let requestedWait: number;
    if (waitMs === undefined || waitMs === null) {
      requestedWait = DEFAULT_WAIT_MS;
    } else {
      const parsed = Number.parseInt(waitMs.toString(), 10);
      requestedWait = Number.isFinite(parsed) ? parsed : DEFAULT_WAIT_MS;
    }

    const delay = Math.min(Math.max(requestedWait, MIN_WAIT_MS), MAX_WAIT_MS);

    await new Promise((resolve) => setTimeout(resolve, delay));

    // Get the raw output and clean it for LLM consumption
    const rawOutput = session.getOutput(true);
    const output = cleanCommandOutput(rawOutput);

    return {
      sessionId,
      command,
      output,
      sessionInfo: session.getInfo(),
    };
  }

  private getVirtualSessionInfo(sessionId: string) {
    const session = this.virtualSessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found`);
    }
    return session.getInfo();
  }

  private closeVirtualSession(sessionId: string) {
    const closed = this.virtualSessionManager.closeSession(sessionId);
    if (!closed) {
      throw new Error(`Session '${sessionId}' not found`);
    }
    return { message: 'Session closed', sessionId };
  }

  private listVirtualSessions() {
    const sessions = Array.from(this.virtualSessionManager.getAllSessions().values()).map(
      (session) => session.getInfo()
    );
    return {
      count: sessions.length,
      sessions,
    };
  }

  /**
   * Create a temporary user
   */
  private createTempUser(username?: string) {
    const result = this.virtualSessionManager.createTempUser(username);
    return {
      ...result,
      message:
        'Temp user created. Will be deleted when server restarts. Use direct_login to login as this user.',
      isTempUser: true,
    };
  }

  /**
   * Direct login - create session and login directly
   * Session is returned immediately ready for commands via virtual_session_command
   */
  private directLogin(username: string, isAdmin?: boolean) {
    const session = this.virtualSessionManager.directLogin(username, isAdmin);

    return {
      sessionId: session.getSessionId(),
      username,
      message:
        "Logged in directly. Session is ready. Use virtual_session_command with 'look' to see the room.",
      isTempUser: this.tempUsers.has(username.toLowerCase()),
      isAdmin: isAdmin ?? false,
      sessionInfo: session.getInfo(),
    };
  }

  /**
   * Load a named test snapshot, replacing current game state
   */
  private async loadTestSnapshot(name: string) {
    mcpLogger.info(`Loading test snapshot: ${name}`);
    const result = await this.stateLoader.loadSnapshot(name);
    return {
      snapshot: name,
      message: `Snapshot '${name}' loaded successfully`,
      ...result,
    };
  }

  /**
   * Save current game state as a named snapshot
   */
  private async saveTestSnapshot(name: string, overwrite?: boolean) {
    mcpLogger.info(`Saving test snapshot: ${name}`);
    const result = await this.stateLoader.saveSnapshot(name, overwrite ?? false);
    return {
      snapshot: name,
      message: `Snapshot '${name}' saved successfully`,
      ...result,
    };
  }

  /**
   * Reset game to clean/fresh state
   */
  private async resetGameState() {
    mcpLogger.info('Resetting game state to fresh snapshot');
    const result = await this.stateLoader.resetToClean();
    return {
      message: 'Game state reset to fresh snapshot',
      ...result,
    };
  }

  /**
   * List all available test snapshots
   */
  private listTestSnapshots() {
    const snapshots = this.stateLoader.listSnapshots();
    const snapshotInfo = snapshots.map((name) => this.stateLoader.getSnapshotInfo(name));
    return {
      count: snapshots.length,
      snapshots: snapshotInfo,
    };
  }

  /**
   * Directly set player stats for testing
   */
  private setPlayerStats(args: {
    username: string;
    health?: number;
    maxHealth?: number;
    mana?: number;
    maxMana?: number;
    gold?: number;
    experience?: number;
    level?: number;
  }) {
    const user = this.userManager.getUser(args.username);
    if (!user) {
      throw new Error(`User '${args.username}' not found`);
    }

    const updates: Record<string, number> = {};

    if (args.health !== undefined) {
      updates.health = args.health;
    }
    if (args.maxHealth !== undefined) {
      updates.maxHealth = args.maxHealth;
    }
    if (args.mana !== undefined) {
      updates.mana = args.mana;
    }
    if (args.maxMana !== undefined) {
      updates.maxMana = args.maxMana;
    }
    if (args.gold !== undefined) {
      // Gold is nested in inventory.currency
      if (!user.inventory) {
        user.inventory = { items: [], currency: { gold: 0, silver: 0, copper: 0 } };
      }
      user.inventory.currency.gold = args.gold;
    }
    if (args.experience !== undefined) {
      updates.experience = args.experience;
    }
    if (args.level !== undefined) {
      updates.level = args.level;
    }

    // Apply updates using the UserManager's updateUser method
    const success = this.userManager.updateUser(args.username, updates);

    if (!success) {
      throw new Error(`Failed to update stats for user '${args.username}'`);
    }

    // Also update the runtime client's user object if they are online
    const clients = Array.from(this.clientManager.getClients().values());
    const onlineClient = clients.find(
      (client) => client.user?.username?.toLowerCase() === args.username.toLowerCase()
    );
    if (onlineClient && onlineClient.user) {
      // Update the runtime user object directly
      if (args.health !== undefined) onlineClient.user.health = args.health;
      if (args.maxHealth !== undefined) onlineClient.user.maxHealth = args.maxHealth;
      if (args.mana !== undefined) onlineClient.user.mana = args.mana;
      if (args.maxMana !== undefined) onlineClient.user.maxMana = args.maxMana;
      if (args.experience !== undefined) onlineClient.user.experience = args.experience;
      if (args.level !== undefined) onlineClient.user.level = args.level;
      if (args.gold !== undefined) {
        if (!onlineClient.user.inventory) {
          onlineClient.user.inventory = { items: [], currency: { gold: 0, silver: 0, copper: 0 } };
        }
        onlineClient.user.inventory.currency.gold = args.gold;
      }
      mcpLogger.info(`Also updated runtime client stats for ${args.username}`);
    }

    // Force save to persist changes
    this.userManager.forceSave();

    mcpLogger.info(`Set stats for user ${args.username}: ${JSON.stringify(updates)}`);

    return {
      username: args.username,
      message: `Stats updated for '${args.username}'`,
      updatedFields: Object.keys(updates).concat(args.gold !== undefined ? ['gold'] : []),
      newValues: {
        ...updates,
        ...(args.gold !== undefined ? { gold: args.gold } : {}),
      },
    };
  }

  /**
   * Advance the game timer by a specific number of ticks (for testing)
   */
  private advanceGameTicks(ticks: number) {
    if (typeof ticks !== 'number' || ticks <= 0) {
      throw new Error('Invalid ticks value: must be a positive number');
    }

    this.gameTimerManager.advanceTicks(ticks);
    mcpLogger.info(`Advanced game timer by ${ticks} ticks`);

    return {
      ticksAdvanced: ticks,
      currentTick: this.gameTimerManager.getTickCount(),
      message: `Advanced game timer by ${ticks} ticks`,
    };
  }

  /**
   * Get the current game tick count
   */
  private getGameTick() {
    const tickCount = this.gameTimerManager.getTickCount();
    return {
      tickCount,
      message: `Current game tick: ${tickCount}`,
    };
  }

  /**
   * Enable or disable test mode (pauses/resumes the game timer)
   */
  private setTestMode(enabled: boolean) {
    if (typeof enabled !== 'boolean') {
      throw new Error('Invalid enabled value: must be a boolean');
    }

    this.gameTimerManager.setTestMode(enabled);
    mcpLogger.info(`Set test mode to ${enabled}`);

    return {
      testMode: enabled,
      message: enabled
        ? 'Test mode enabled: timer paused, use advance_game_ticks to advance time'
        : 'Test mode disabled: timer resumed',
    };
  }

  /**
   * Sync artifacts to hub codespace
   */
  private async syncArtifactsToHub(
    dryRun?: boolean,
    hubCodespace?: string
  ): Promise<{ success: boolean; artifactsSynced: number; details: string[] }> {
    const { execFileSync } = await import('child_process');
    const args: string[] = [];

    if (dryRun) args.push('--dry-run');
    if (hubCodespace) args.push(`--hub=${hubCodespace}`);

    try {
      const scriptPath = join(__dirname, '../../scripts/sync-to-hub.sh');
      const result = execFileSync(scriptPath, args, {
        encoding: 'utf-8',
        timeout: 300000, // 5 minute timeout
        env: { ...process.env },
      });

      // Parse output for synced count
      const syncedMatch = result.match(/Synced:\s*(\d+)/);
      const artifactsSynced = syncedMatch ? parseInt(syncedMatch[1], 10) : 0;

      return {
        success: true,
        artifactsSynced,
        details: result.split('\n').filter((line) => line.trim()),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      mcpLogger.error(`Failed to sync artifacts to hub: ${errorMsg}`);
      return {
        success: false,
        artifactsSynced: 0,
        details: [errorMsg],
      };
    }
  }

  /**
   * Sync artifacts from hub codespace
   */
  private async syncArtifactsFromHub(
    dryRun?: boolean,
    hubCodespace?: string,
    force?: boolean
  ): Promise<{ success: boolean; artifactsSynced: number; details: string[] }> {
    const { execSync } = await import('child_process');
    const args: string[] = [];

    if (dryRun) args.push('--dry-run');
    if (hubCodespace) args.push(`--hub=${hubCodespace}`);
    if (force) args.push('--force');

    try {
      const scriptPath = join(__dirname, '../../scripts/sync-from-hub.sh');
      const result = execSync(`${scriptPath} ${args.join(' ')}`, {
        encoding: 'utf-8',
        timeout: 300000, // 5 minute timeout
        env: { ...process.env },
      });

      // Parse output for pulled count
      const pulledMatch = result.match(/Pulled:\s*(\d+)/);
      const artifactsSynced = pulledMatch ? parseInt(pulledMatch[1], 10) : 0;

      return {
        success: true,
        artifactsSynced,
        details: result.split('\n').filter((line) => line.trim()),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      mcpLogger.error(`Failed to sync artifacts from hub: ${errorMsg}`);
      return {
        success: false,
        artifactsSynced: 0,
        details: [errorMsg],
      };
    }
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer = this.app.listen(this.port, '0.0.0.0', () => {
        systemLogger.info(`MCP Server started on http://localhost:${this.port}`);
        mcpLogger.info(`MCP Server started on port ${this.port}`);
        resolve();
      });

      // Handle port already in use error
      this.httpServer?.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          mcpLogger.error(`Port ${this.port} is already in use`);
          // Yellow warning with colored message
          console.log(`\x1b[33m⚠️  MCP Server could not start, port already in use\x1b[0m`);
          reject(error);
        } else {
          mcpLogger.error(`MCP Server error: ${error.message}`);
          reject(error);
        }
      });
    });
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    // Clear the cleanup interval
    clearInterval(this.cleanupInterval);

    // Clean up temp users before stopping
    const cleanedCount = this.virtualSessionManager.cleanupTempUsers();
    if (cleanedCount > 0) {
      mcpLogger.info(`Cleaned up ${cleanedCount} temp users on shutdown`);
    }

    return new Promise((resolve) => {
      if (this.httpServer) {
        this.httpServer.close(() => {
          mcpLogger.info('MCP Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get the port the server is running on
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Get the VirtualSessionManager for programmatic session control
   */
  getVirtualSessionManager(): VirtualSessionManager {
    return this.virtualSessionManager;
  }

  /**
   * Get the StateLoader for snapshot management
   */
  getStateLoader(): StateLoader {
    return this.stateLoader;
  }
}
