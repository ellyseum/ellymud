import express, { Request, Response } from "express";
import cors from "cors";
import { Server as HttpServer } from "http";
import { UserManager } from "../user/userManager.js";
import { RoomManager } from "../room/roomManager.js";
import { ClientManager } from "../client/clientManager.js";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { systemLogger } from "../utils/logger.js";

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
  private logger: winston.Logger;

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

    // Set up logger
    this.logger = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        })
      ),
      transports: [
        new DailyRotateFile({
          filename: join(process.cwd(), "logs", "mcp", "mcp-%DATE%.log"),
          datePattern: "YYYY-MM-DD",
          maxFiles: "14d",
          auditFile: join(process.cwd(), "logs", "audit", "mcp-audit.json"),
        }),
      ],
    });

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Enable CORS for all origins (suitable for local development)
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: false
    }));
    this.app.use(express.json());

    // Log all requests
    this.app.use((req, res, next) => {
      this.logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // MCP Protocol JSON-RPC endpoint
    this.app.post("/", (req: Request, res: Response) => {
      const { jsonrpc, method, params, id } = req.body;

      // Log the incoming request for debugging
      this.logger.info(`MCP Request: method=${method}, jsonrpc=${jsonrpc}, id=${id}`);
      this.logger.debug(`Full request body: ${JSON.stringify(req.body)}`);

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
        this.logger.info(`Handling MCP notification: ${method}`);
        
        // Acknowledge all notifications with 200 OK but no JSON-RPC response
        if (method === "notifications/initialized") {
          this.logger.info("Client initialized notification received");
          res.status(200).end();
          return;
        }
        
        // Other notifications
        this.logger.info(`Received notification: ${method}`);
        res.status(200).end();
        return;
      }

      // Handle MCP protocol methods (requests that need responses)
      if (method === "initialize") {
        this.logger.info("Handling MCP initialize request");
        res.json({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
              resources: {}
            },
            serverInfo: {
              name: "EllyMUD MCP Server",
              version: "1.0.0"
            }
          }
        });
        return;
      }

      if (method === "tools/list") {
        this.logger.info("Handling MCP tools/list request");
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
        this.logger.info(`Handling MCP tools/call request: ${params?.name}`);
        this.handleToolCall(params, id, res);
        return;
      }

      // Unknown method
      this.logger.warn(`Unknown MCP method: ${method}`);
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
        ],
      });
    });

    // API endpoints
    this.app.get("/api/online-users", async (req: Request, res: Response) => {
      try {
        const data = await this.getOnlineUsers();
        this.logger.info(`Retrieved ${data.count} online users`);
        res.json({ success: true, data });
      } catch (error) {
        this.logger.error(`Error getting online users: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get("/api/users/:username", async (req: Request, res: Response) => {
      try {
        const data = await this.getUserData(req.params.username);
        this.logger.info(`Retrieved user data for ${req.params.username}`);
        res.json({ success: true, data });
      } catch (error) {
        this.logger.error(`Error getting user data: ${error}`);
        res.status(404).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get("/api/rooms/:roomId", async (req: Request, res: Response) => {
      try {
        const data = await this.getRoomData(req.params.roomId);
        this.logger.info(`Retrieved room data for ${req.params.roomId}`);
        res.json({ success: true, data });
      } catch (error) {
        this.logger.error(`Error getting room data: ${error}`);
        res.status(404).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get("/api/rooms", async (req: Request, res: Response) => {
      try {
        const data = await this.getAllRooms();
        this.logger.info(`Retrieved ${data.count} rooms`);
        res.json({ success: true, data });
      } catch (error) {
        this.logger.error(`Error getting all rooms: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get("/api/items", async (req: Request, res: Response) => {
      try {
        const data = await this.getAllItems();
        this.logger.info(`Retrieved ${data.count} items`);
        res.json({ success: true, data });
      } catch (error) {
        this.logger.error(`Error getting all items: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get("/api/npcs", async (req: Request, res: Response) => {
      try {
        const data = await this.getAllNPCs();
        this.logger.info(`Retrieved ${data.count} NPCs`);
        res.json({ success: true, data });
      } catch (error) {
        this.logger.error(`Error getting all NPCs: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get("/api/combat-state", async (req: Request, res: Response) => {
      try {
        const data = await this.getCombatState();
        this.logger.info(
          `Retrieved ${data.activeCombatSessions} combat sessions`
        );
        res.json({ success: true, data });
      } catch (error) {
        this.logger.error(`Error getting combat state: ${error}`);
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
        this.logger.info(
          `Searched ${logType} logs for "${searchTerm}" - found ${data.results.length} results`
        );
        res.json({ success: true, data });
      } catch (error) {
        this.logger.error(`Error searching logs: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get("/api/config", async (req: Request, res: Response) => {
      try {
        const data = await this.getGameConfig();
        this.logger.info("Retrieved game config");
        res.json({ success: true, data });
      } catch (error) {
        this.logger.error(`Error getting game config: ${error}`);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  private async getOnlineUsers() {
    const clients = Array.from(this.clientManager.getClients().values());
    const onlineUsers = clients.map((client) => ({
      username: client.user?.username || "Not logged in",
      state: client.state || "Unknown",
      roomId: client.user?.currentRoomId || null,
      sessionId: client.id,
      connectedAt: client.connectedAt,
      isAdmin: client.user?.role === "admin" || false,
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

    return {
      ...room,
      currentUsers: usersInRoom,
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
      this.logger.error(`Error calling tool ${name}: ${error}`);
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
    return new Promise((resolve) => {
      this.httpServer = this.app.listen(this.port, '0.0.0.0', () => {
        systemLogger.info(`MCP Server started on http://localhost:${this.port}`);
        this.logger.info(`MCP Server started on port ${this.port}`);
        resolve();
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
          this.logger.info("MCP Server stopped");
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
