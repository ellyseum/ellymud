import express, { Request, Response } from "express";
import cors from "cors";
import { Server as HttpServer } from "http";
import { UserManager } from "../user/userManager";
import { RoomManager } from "../room/roomManager";
import { ClientManager } from "../client/clientManager";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { systemLogger, mcpLogger } from "../utils/logger";

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
  private port: number;

  constructor(
    userManager: UserManager,
    roomManager: RoomManager,
    clientManager: ClientManager,
    port: number = 3100
  ) {
    this.userManager = userManager;
    this.roomManager = roomManager;
    this.clientManager = clientManager;
    this.port = port;

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Enable CORS for all origins (suitable for local development)
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      credentials: false
    }));
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
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Unauthorized - Invalid or missing API key"
          },
          id: null
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
    this.app.post("/", (req: Request, res: Response) => {
      const { jsonrpc, method, params, id } = req.body;

      // Log the incoming request for debugging
      mcpLogger.info(`MCP Request: method=${method}, jsonrpc=${jsonrpc}, id=${id}`);
      mcpLogger.debug(`Full request body: ${JSON.stringify(req.body)}`);

      // Validate JSON-RPC 2.0 format
      if (jsonrpc !== "2.0") {
        res.status(400).json({
          jsonrpc: "2.0",
          id: id || null,
          error: {
            code: -32600,
            message: "Invalid Request: jsonrpc must be '2.0'"
          }
        });
        return;
      }

      // Handle notifications (no id, no response needed)
      if (id === null || id === undefined) {
        mcpLogger.info(`Handling MCP notification: ${method}`);
        
        // Acknowledge all notifications with 200 OK but no JSON-RPC response
        if (method === "notifications/initialized") {
          mcpLogger.info("Client initialized notification received");
          res.status(200).end();
          return;
        }
        
        // Other notifications
        mcpLogger.info(`Received notification: ${method}`);
        res.status(200).end();
        return;
      }

      // Handle MCP protocol methods (requests that need responses)
      if (method === "initialize") {
        mcpLogger.info("Handling MCP initialize request");
        res.json({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
              resources: {},
              prompts: {}
            },
            serverInfo: {
              name: "EllyMUD MCP Server",
              version: "1.0.0"
            },
            instructions: "EllyMUD MCP Server - API Key authentication via X-API-Key header"
          }
        });
        return;
      }

      if (method === "tools/list") {
        mcpLogger.info("Handling MCP tools/list request");
        res.json({
          jsonrpc: "2.0",
          id,
          result: {
            tools: this.getMCPToolsList()
          }
        });
        return;
      }

      if (method === "tools/call") {
        mcpLogger.info(`Handling MCP tools/call request: ${params?.name}`);
        this.handleToolCall(params, id, res);
        return;
      }

      if (method === "prompts/list") {
        mcpLogger.info("Handling MCP prompts/list request");
        res.json({
          jsonrpc: "2.0",
          id,
          result: {
            prompts: []
          }
        });
        return;
      }

      if (method === "resources/list") {
        mcpLogger.info("Handling MCP resources/list request");
        res.json({
          jsonrpc: "2.0",
          id,
          result: {
            resources: []
          }
        });
        return;
      }

      // Unknown method
      mcpLogger.warn(`Unknown MCP method: ${method}`);
      res.status(400).json({
        jsonrpc: "2.0",
        id: id || null,
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        }
      });
    });

    // Root endpoint - MCP server info (GET for browser access)
    this.app.get("/", (req: Request, res: Response) => {
      res.json({
        name: "EllyMUD MCP Server",
        version: "1.0.0",
        description: "Model Context Protocol server providing access to EllyMUD game state and data",
        protocol: "MCP (Model Context Protocol) via JSON-RPC 2.0",
        endpoints: {
          mcp: "POST / (JSON-RPC 2.0)",
          health: "/health",
          tools: "/tools",
          api: "/api/*"
        },
        documentation: "See /tools for available endpoints"
      });
    });

    // Health check
    this.app.get("/health", (req: Request, res: Response) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // List all available tools
    this.app.get("/tools", (req: Request, res: Response) => {
      res.json({
        tools: [
          {
            name: "get_online_users",
            description:
              "Get list of currently connected users with their current state and location",
            endpoint: "/api/online-users",
            method: "GET",
          },
          {
            name: "get_user_data",
            description:
              "Get detailed information about a specific user including stats, inventory, and equipment",
            endpoint: "/api/users/:username",
            method: "GET",
          },
          {
            name: "get_room_data",
            description:
              "Get detailed information about a specific room including description, exits, items, NPCs, and current occupants",
            endpoint: "/api/rooms/:roomId",
            method: "GET",
          },
          {
            name: "get_all_rooms",
            description: "Get a list of all rooms in the game world",
            endpoint: "/api/rooms",
            method: "GET",
          },
          {
            name: "get_all_items",
            description: "Get a list of all item templates in the game",
            endpoint: "/api/items",
            method: "GET",
          },
          {
            name: "get_all_npcs",
            description: "Get a list of all NPC templates in the game",
            endpoint: "/api/npcs",
            method: "GET",
          },
          {
            name: "get_combat_state",
            description:
              "Get information about active combat sessions in the game",
            endpoint: "/api/combat-state",
            method: "GET",
          },
          {
            name: "search_logs",
            description:
              "Search through player logs or system logs for debugging",
            endpoint: "/api/logs/search",
            method: "POST",
            body: {
              logType: "player | system | error | raw-session",
              searchTerm: "string",
              username: "string (optional, required for player/raw-session)",
            },
          },
          {
            name: "get_game_config",
            description: "Get current game configuration settings",
            endpoint: "/api/config",
            method: "GET",
          },
          {
            name: "tail_user_session",
            description:
              "Get the last N lines of a user's raw session log to see exactly what they are seeing. If username not provided and only one user is online, uses that user automatically.",
            endpoint: "/api/tail-session",
            method: "POST",
            body: {
              username: "string (optional if only 1 user online)",
              lines: "number (optional, default 500, max 500)",
            },
          },
        ],
      });
    });

    // API endpoints
    this.app.get("/api/online-users", async (req: Request, res: Response) => {
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

    this.app.get("/api/users/:username", async (req: Request, res: Response) => {
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

    this.app.get("/api/rooms/:roomId", async (req: Request, res: Response) => {
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

    this.app.get("/api/rooms", async (req: Request, res: Response) => {
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

    this.app.get("/api/items", async (req: Request, res: Response) => {
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

    this.app.get("/api/npcs", async (req: Request, res: Response) => {
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

    this.app.get("/api/combat-state", async (req: Request, res: Response) => {
      try {
        const data = await this.getCombatState();
        mcpLogger.info(
          `Retrieved ${data.activeCombatSessions} combat sessions`
        );
        res.json({ success: true, data });
      } catch (error) {
        mcpLogger.error(`Error getting combat state: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.post("/api/logs/search", async (req: Request, res: Response) => {
      try {
        const { logType, searchTerm, username } = req.body;
        if (!logType || !searchTerm) {
          return res.status(400).json({
            success: false,
            error: "logType and searchTerm are required",
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

    this.app.get("/api/config", async (req: Request, res: Response) => {
      try {
        const data = await this.getGameConfig();
        mcpLogger.info("Retrieved game config");
        res.json({ success: true, data });
      } catch (error) {
        mcpLogger.error(`Error getting game config: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.post("/api/tail-session", async (req: Request, res: Response) => {
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
              error: "No users currently online",
            });
          }
          if (onlineUsers.count === 1) {
            username = onlineUsers.users[0].username;
            mcpLogger.info(`Auto-selected only online user: ${username}`);
          } else {
            return res.status(400).json({
              success: false,
              error: `Multiple users online (${onlineUsers.count}). Please specify username.`,
              availableUsers: onlineUsers.users.map(u => u.username),
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
  }

  private async getOnlineUsers() {
    // Import SudoCommand to check admin status
    const { SudoCommand } = await import("../command/commands/sudo.command.js");
    
    const clients = Array.from(this.clientManager.getClients().values());
    const onlineUsers = clients.map((client) => ({
      username: client.user?.username || "Not logged in",
      state: client.state || "Unknown",
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
      experienceValue: npc.experienceValue
    }));

    const itemInstancesArray = Array.from(room.getItemInstances().entries()).map(([instanceId, templateId]) => ({
      instanceId,
      templateId
    }));

    return {
      id: room.id,
      name: room.name,
      description: room.description,
      exits: room.exits,
      items: room.items,
      currency: room.currency,
      currentUsers: usersInRoom,
      npcs: npcsArray,
      itemInstances: itemInstancesArray
    };
  }

  private async getAllRooms() {
    const rooms = this.roomManager.getAllRooms();
    return {
      count: rooms.length,
      rooms: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description?.substring(0, 100) + "...",
        exits: Object.keys(r.exits || {}),
      })),
    };
  }

  private async getAllItems() {
    try {
      const itemsPath = join(process.cwd(), "data", "items.json");
      const itemsData = JSON.parse(readFileSync(itemsPath, "utf-8"));
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
      const npcsPath = join(process.cwd(), "data", "npcs.json");
      const npcsData = JSON.parse(readFileSync(npcsPath, "utf-8"));
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
      .filter(
        (client) => client.state === "authenticated" && client.stateData?.inCombat
      )
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

  private async searchLogs(
    logType: string,
    searchTerm: string,
    username?: string
  ) {
    try {
      let logDir: string;
      let logFiles: string[];

      switch (logType) {
        case "player":
          if (!username) {
            throw new Error("username is required for player logs");
          }
          logDir = join(process.cwd(), "logs", "players");
          logFiles = readdirSync(logDir).filter((f) =>
            f.startsWith(username + "-")
          );
          break;

        case "raw-session":
          if (!username) {
            throw new Error("username is required for raw-session logs");
          }
          logDir = join(process.cwd(), "logs", "raw-sessions");
          logFiles = readdirSync(logDir).filter((f) => f.includes(username));
          break;

        case "system":
          logDir = join(process.cwd(), "logs");
          logFiles = readdirSync(logDir).filter((f) => f.startsWith("system-"));
          break;

        case "error":
          logDir = join(process.cwd(), "logs");
          logFiles = readdirSync(logDir).filter((f) => f.startsWith("error-"));
          break;

        default:
          throw new Error(`Unknown log type: ${logType}`);
      }

      // Search through log files
      const results: Array<{ file: string; matches: string[] }> = [];
      const searchRegex = new RegExp(searchTerm, "gi");

      for (const file of logFiles.slice(-5)) {
        // Only search last 5 files
        const content = readFileSync(join(logDir, file), "utf-8");
        const lines = content.split("\n");
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
      const configPath = join(process.cwd(), "data", "mud-config.json");
      const configData = JSON.parse(readFileSync(configPath, "utf-8"));
      return configData;
    } catch (error) {
      throw new Error(`Failed to read game config: ${error}`);
    }
  }

  private async tailUserSession(username: string | undefined, lines: number = 500) {
    // Import SudoCommand to check admin status
    const { SudoCommand } = await import("../command/commands/sudo.command.js");
    
    // Get list of online users
    const clients = Array.from(this.clientManager.getClients().values());
    const onlineUsers = clients
      .filter((c) => c.user?.username)
      .map((c) => ({
        username: c.user!.username,
        client: c,
        isAdmin: SudoCommand.isAuthorizedUser(c.user!.username)
      }));

    // If no username provided, auto-select based on rules
    if (!username) {
      if (onlineUsers.length === 0) {
        throw new Error("No users currently online");
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
            `Multiple admin users online. Please specify username: ${adminUsers.map(u => u.username).join(", ")}`
          );
        } else {
          // No admins, multiple regular users - ask LLM to choose
          throw new Error(
            `Multiple users online. Please specify username: ${onlineUsers.map(u => u.username).join(", ")}`
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
    const sessionId = (userClient.connection as any).getId ? 
      (userClient.connection as any).getId() : 
      'unknown';
      
    if (sessionId === 'unknown') {
      throw new Error(`Unable to retrieve session ID for user '${username}'`);
    }

    const today = new Date().toISOString().split('T')[0];
    const logFilePath = join(
      process.cwd(),
      "logs",
      "raw-sessions",
      `${sessionId}-${today}.log`
    );

    // Check if log file exists
    if (!require('fs').existsSync(logFilePath)) {
      return {
        username,
        sessionId,
        lines: 0,
        content: "(No session log file found for today)",
        logFile: logFilePath,
      };
    }

    // Read the last N lines from the file
    const content = readFileSync(logFilePath, "utf-8");
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
        name: "get_online_users",
        description: "Get list of currently connected users with their current state and location",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "get_user_data",
        description: "Get detailed information about a specific user including stats, inventory, and equipment",
        inputSchema: {
          type: "object",
          properties: {
            username: { type: "string", description: "The username to look up" }
          },
          required: ["username"]
        }
      },
      {
        name: "get_room_data",
        description: "Get detailed information about a specific room including description, exits, items, NPCs, and current occupants",
        inputSchema: {
          type: "object",
          properties: {
            roomId: { type: "string", description: "The room ID to look up" }
          },
          required: ["roomId"]
        }
      },
      {
        name: "get_all_rooms",
        description: "Get a list of all rooms in the game world",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "get_all_items",
        description: "Get a list of all item templates in the game",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "get_all_npcs",
        description: "Get a list of all NPC templates in the game",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "get_combat_state",
        description: "Get information about active combat sessions in the game",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "get_game_config",
        description: "Get current game configuration settings",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "tail_user_session",
        description: "Get the last N lines of a user's raw session log to see exactly what they are seeing. Automatically selects user if only one is online.",
        inputSchema: {
          type: "object",
          properties: {
            username: { 
              type: "string", 
              description: "Username to tail (optional if only 1 user online)" 
            },
            lines: { 
              type: "number", 
              description: "Number of lines to retrieve (default 500, max 500)" 
            }
          },
          required: []
        }
      }
    ];
  }

  /**
   * Handle MCP tool call
   */
  private async handleToolCall(params: any, id: any, res: Response) {
    const { name, arguments: args } = params;

    try {
      let result;
      
      switch (name) {
        case "get_online_users":
          result = await this.getOnlineUsers();
          break;
        case "get_user_data":
          result = await this.getUserData(args.username);
          break;
        case "get_room_data":
          result = await this.getRoomData(args.roomId);
          break;
        case "get_all_rooms":
          result = await this.getAllRooms();
          break;
        case "get_all_items":
          result = await this.getAllItems();
          break;
        case "get_all_npcs":
          result = await this.getAllNPCs();
          break;
        case "get_combat_state":
          result = await this.getCombatState();
          break;
        case "get_game_config":
          result = await this.getGameConfig();
          break;
        case "tail_user_session":
          result = await this.tailUserSession(args.username, args.lines);
          break;
        default:
          res.status(400).json({
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Unknown tool: ${name}`
            }
          });
          return;
      }

      res.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      });
    } catch (error) {
      mcpLogger.error(`Error calling tool ${name}: ${error}`);
      res.status(500).json({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : String(error)
        }
      });
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
    return new Promise((resolve) => {
      if (this.httpServer) {
        this.httpServer.close(() => {
          mcpLogger.info("MCP Server stopped");
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
}
