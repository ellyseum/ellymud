import fs from 'fs';
import path from 'path';
import { ClientManager } from './client/clientManager';
import { CommandHandler } from './command/commandHandler';
import config from './config';
import { ConsoleManager } from './console/consoleManager';
import { LocalSessionManager } from './console/localSessionManager';
import { UserAdminMenu } from './console/userAdminMenu';
import { UserMonitor } from './console/userMonitor';
import { IConnection } from './connection/interfaces/connection.interface';
import { RoomManager } from './room/roomManager';
import { APIServer } from './server/apiServer';
import { ShutdownManager } from './server/shutdownManager';
import { TelnetServer } from './server/telnetServer';
import { WebSocketServer } from './server/webSocketServer';
import { AdminSetup } from './setup/adminSetup'; // Import AdminSetup
import { StateMachine } from './state/stateMachine';
import { SnakeGameState } from './states/snake-game.state';
import { EditorState } from './states/editor.state';
import { GameTimerManager } from './timer/gameTimerManager';
import { ConnectedClient, GlobalWithSkipMCP, MUDConfig, ServerStats } from './types';
import { UserManager } from './user/userManager';
import { MCPServer } from './mcp/mcpServer';
import { CommandRegistry } from './command/commandRegistry';
import { isDebugMode } from './utils/debugUtils'; // Import the isDebugMode function
import { clearSessionReferenceFile } from './utils/fileUtils'; // Import the clearSessionReferenceFile function
import { systemLogger } from './utils/logger';
import { getPromptText } from './utils/promptFormatter'; // Import the getPromptText function
import { TestModeOptions } from './testing/testMode';

export class GameServer {
  private telnetServer: TelnetServer;
  private webSocketServer: WebSocketServer;
  private apiServer: APIServer;
  private clientManager: ClientManager;
  private userManager: UserManager;
  private roomManager: RoomManager;
  private commandHandler: CommandHandler;
  private stateMachine: StateMachine;
  private gameTimerManager: GameTimerManager;
  private serverStats: ServerStats;
  private idleCheckInterval: NodeJS.Timeout;
  private shutdownTimerActive: boolean = false;
  private shutdownTimer: NodeJS.Timeout | null = null;
  private consoleManager: ConsoleManager;
  private localSessionManager: LocalSessionManager;
  private userMonitor: UserMonitor;
  private userAdminMenu: UserAdminMenu;
  private shutdownManager: ShutdownManager;
  private mcpServer: MCPServer;

  constructor() {
    try {
      // Initialize server stats
      this.serverStats = {
        startTime: new Date(),
        uptime: 0,
        connectedClients: 0,
        authenticatedUsers: 0,
        totalConnections: 0,
        totalCommands: 0,
        memoryUsage: {
          rss: 0,
          heapTotal: 0,
          heapUsed: 0,
          external: 0,
        },
      };

      // Set up update interval for server stats
      setInterval(() => {
        this.serverStats.uptime = Math.floor(
          (Date.now() - this.serverStats.startTime.getTime()) / 1000
        );
        this.serverStats.connectedClients = this.clientManager?.getClients().size || 0;
        this.serverStats.authenticatedUsers = Array.from(
          this.clientManager?.getClients().values() || []
        ).filter((c) => c.authenticated).length;
        this.serverStats.memoryUsage = process.memoryUsage();
      }, config.SERVER_STATS_UPDATE_INTERVAL);

      // Initialize core components
      this.userManager = UserManager.getInstance();

      // Create client manager with empty clients map first
      this.clientManager = ClientManager.getInstance(
        this.userManager,
        RoomManager.getInstance(new Map<string, ConnectedClient>())
      );

      // Now that clientManager exists, get roomManager with client map from it
      this.roomManager = RoomManager.getInstance(this.clientManager.getClients());

      this.stateMachine = new StateMachine(this.userManager, this.clientManager.getClients());
      this.commandHandler = new CommandHandler(
        this.clientManager.getClients(),
        this.userManager,
        this.roomManager,
        undefined,
        this.stateMachine
      );

      // Set up the state machine and process input function in client manager
      this.clientManager.setStateMachine(this.stateMachine);
      this.clientManager.setProcessInputFunction(this.processInput.bind(this));

      // Initialize game timer manager
      this.gameTimerManager = GameTimerManager.getInstance(this.userManager, this.roomManager);

      // Share the global clients map with SnakeGameState
      SnakeGameState.setGlobalClients(this.clientManager.getClients());

      // Share the global clients map with EditorState
      EditorState.setGlobalClients(this.clientManager.getClients());

      // Create the API server first (since WebSocket server needs its HTTP server)
      this.apiServer = new APIServer(
        this.clientManager.getClients(),
        this.userManager,
        this.roomManager,
        this.gameTimerManager,
        this.serverStats
      );

      // Create the WebSocket server using the HTTP server from API server
      this.webSocketServer = new WebSocketServer(
        this.apiServer.getHttpServer(),
        this.clientManager.getClients(),
        this.serverStats,
        this.setupClient.bind(this),
        this.clientManager.handleClientData.bind(this.clientManager),
        this.processInput.bind(this)
      );

      // Create the Telnet server
      this.telnetServer = new TelnetServer(
        this.clientManager.getClients(),
        this.userManager,
        this.stateMachine,
        this.commandHandler,
        this.serverStats,
        this.setupClient.bind(this),
        this.processInput.bind(this)
      );

      // Create the ShutdownManager
      this.shutdownManager = new ShutdownManager(this.clientManager, this);

      // Create the ConsoleManager with all required parameters
      this.consoleManager = new ConsoleManager(
        this,
        this.telnetServer,
        this.clientManager,
        this.userManager,
        this.commandHandler,
        this.shutdownManager
      );

      // Create the LocalSessionManager
      this.localSessionManager = new LocalSessionManager(this.consoleManager, this.telnetServer);

      // Create UserMonitor with correct parameters
      this.userMonitor = new UserMonitor(
        this.clientManager,
        () => this.consoleManager.setupKeyListener(),
        this.commandHandler
      );

      // Create UserAdminMenu with correct parameters
      this.userAdminMenu = new UserAdminMenu(
        this.userManager,
        this.clientManager,
        this.commandHandler,
        this.localSessionManager,
        this.telnetServer,
        this,
        () => this.consoleManager.setupKeyListener()
      );

      // Set up idle client check interval
      this.idleCheckInterval = setInterval(() => {
        const config = this.loadMUDConfig();
        const idleTimeoutMinutes = config.game.idleTimeout;
        this.clientManager.checkForIdleClients(idleTimeoutMinutes);
      }, config.IDLE_CHECK_INTERVAL);

      // Initialize MCP Server
      this.mcpServer = new MCPServer(
        this.userManager,
        this.roomManager,
        this.clientManager,
        this.gameTimerManager
      );

      // Setup keyboard listeners for console commands after server is started
      // We delegate this now to the ConsoleManager
    } catch (error) {
      // Log the full error details to system log but not to console
      systemLogger.error('Fatal error during GameServer initialization:', error);

      // Re-throw the error to be handled by the main function's catch block
      // This ensures we have a centralized place for user-friendly error messages
      throw error;
    }
  }

  private setupClient(connection: IConnection): void {
    this.clientManager.setupClient(connection);
  }

  private processInput(client: ConnectedClient, input: string): void {
    // Command tracking for stats
    this.serverStats.totalCommands++;

    // Trim whitespace from beginning and end of input
    const trimmedInput = input.trim();

    // Check for forced transitions (like transfer requests)
    if (client.stateData.forcedTransition) {
      const forcedState = client.stateData.forcedTransition;
      delete client.stateData.forcedTransition;
      this.stateMachine.transitionTo(client, forcedState);
      return;
    }

    // Different handling based on the current state
    if (client.authenticated && client.user) {
      // Process command from authenticated user in normal game states
      this.commandHandler.handleCommand(client, trimmedInput);

      // Check for state transitions triggered by commands (e.g., 'state' command)
      if (client.stateData.forcedTransition) {
        const nextState = client.stateData.forcedTransition;
        delete client.stateData.forcedTransition;
        this.stateMachine.transitionTo(client, nextState);
      }
    } else {
      // Handle authentication via state machine for non-authenticated users
      this.stateMachine.handleInput(client, trimmedInput);

      // Check if client should be disconnected (due to too many failed attempts)
      if (client.stateData.disconnect) {
        setTimeout(() => {
          systemLogger.info(`Disconnecting client due to too many failed password attempts`);
          client.connection.end();
        }, 1000); // Brief delay to ensure the error message is sent
      }
    }
  }

  private loadMUDConfig(): MUDConfig {
    const configPath = path.join(config.DATA_DIR, 'mud-config.json');
    if (fs.existsSync(configPath)) {
      try {
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
      } catch (error) {
        systemLogger.error(`Error loading MUD config: ${error}`);
        return {
          game: {
            idleTimeout: 30, // Default idle timeout in minutes
          },
        };
      }
    } else {
      // Create default config
      const defaultConfig = {
        game: {
          idleTimeout: 30, // Default idle timeout in minutes
        },
      };

      try {
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
      } catch (error) {
        systemLogger.error(`Error creating default MUD config: ${error}`);
      }

      return defaultConfig;
    }
  }

  private async checkAndCreateAdminUser(): Promise<boolean> {
    // Use AdminSetup to handle admin creation with force flag support
    return await AdminSetup.checkAndCreateAdminUser(this.userManager);
  }

  public setAdminLoginPending(isPending: boolean): void {
    this.telnetServer.setAdminLoginPending(isPending);
  }

  public isShutdownActive(): boolean {
    return this.shutdownManager.isShutdownActive();
  }

  public scheduleShutdown(minutes: number, reason?: string): void {
    this.shutdownManager.scheduleShutdown(minutes, reason);
  }

  public cancelShutdown(): void {
    this.shutdownManager.cancelShutdown();
  }

  public async start(): Promise<void> {
    try {
      // First check and create admin user if needed
      const adminSetupSuccess = await this.checkAndCreateAdminUser();
      if (!adminSetupSuccess) {
        systemLogger.error('Admin setup failed. Server startup aborted.');
        process.exit(1);
      }

      systemLogger.info('Admin user verified. Starting server components...');

      // Clear the last-session.md file if debug mode is enabled
      if (isDebugMode()) {
        // clearSessionReferenceFile is now statically imported at the top
        clearSessionReferenceFile();
        systemLogger.info('Cleared last-session.md file (debug mode enabled)');
      }

      // Start the API server first
      await this.apiServer.start();

      // Start WebSocket server
      await this.webSocketServer.start();

      // Start Telnet server last
      await this.telnetServer.start();

      // Start game timer
      this.gameTimerManager.start();

      // Start MCP Server (only if API key is available)
      const skipMCPServer = (global as GlobalWithSkipMCP).__SKIP_MCP_SERVER;
      if (!skipMCPServer) {
        try {
          await this.mcpServer.start();
        } catch (error) {
          // Error already logged and displayed by mcpServer.start()
          systemLogger.warn('MCP Server failed to start, continuing without it');
        }
      }

      // Initialize the ConsoleManager - this replaces the direct setupKeyListener call
      if (config.CONSOLE_MODE) {
        this.consoleManager.setupKeyListener();
      }

      systemLogger.info('Game server started successfully!');
      systemLogger.info(
        `TELNET: port ${this.telnetServer.getActualPort()}, API/WS: port ${this.apiServer.getActualPort()}`
      );
      systemLogger.info(
        `Admin interface: http://localhost:${this.apiServer.getActualPort()}/admin`
      );

      // Setup graceful shutdown handler
      this.setupShutdownHandler();

      // Log welcome message with keyboard shortcuts using ConsoleManager
      this.consoleManager.logWelcomeMessage();

      return Promise.resolve();
    } catch (error) {
      systemLogger.error('Error starting game server:', error);
      return Promise.reject(error);
    }
  }

  public async bootTestMode(options: TestModeOptions = {}): Promise<void> {
    try {
      // First check and create admin user if needed
      await this.checkAndCreateAdminUser();

      systemLogger.info('Starting server in TEST MODE...');

      // Start the API server first
      await this.apiServer.start();

      // Start WebSocket server
      await this.webSocketServer.start();

      // Start Telnet server last
      await this.telnetServer.start();

      // Configure Game Timer for Test Mode
      if (options.enableTimer) {
        this.gameTimerManager.start();
      } else {
        this.gameTimerManager.setTestMode(true);
      }

      // Start MCP Server (only if API key is available)
      const skipMCPServer = (global as GlobalWithSkipMCP).__SKIP_MCP_SERVER;
      if (!skipMCPServer) {
        try {
          await this.mcpServer.start();
        } catch (error) {
          systemLogger.warn('MCP Server failed to start, continuing without it');
        }
      }

      systemLogger.info('Game server started in TEST MODE!');
    } catch (error) {
      systemLogger.error(`Failed to boot test mode: ${error}`);
      throw error;
    }
  }

  private setupShutdownHandler(): void {
    // Setup graceful shutdown to save data and properly clean up
    process.on('SIGINT', () => {
      this.shutdown();
    });
  }

  public shutdown(): void {
    systemLogger.info('Shutting down server...');

    // Stop the game timer system
    this.gameTimerManager.stop();

    // Stop MCP Server
    this.mcpServer.stop().catch((error: unknown) => {
      systemLogger.error('Error stopping MCP server:', error);
    });

    // Clear the idle check interval
    clearInterval(this.idleCheckInterval);

    try {
      // Save the data directly instead of using gameTimerManager.forceSave()
      // This avoids the error with this.roomManager.forceSave not being a function
      this.userManager.forceSave();
      this.roomManager.forceSave();

      // Log successful save
      systemLogger.info('Game data saved successfully during shutdown');
    } catch (error) {
      systemLogger.error('Error saving data during shutdown:', error);
    }

    // Stop server components
    this.telnetServer.stop();
    this.webSocketServer.stop();
    this.apiServer.stop();

    // Reset singleton instances
    GameTimerManager.resetInstance();

    // Also reset CommandRegistry instance
    CommandRegistry.resetInstance();

    // Exit the process
    systemLogger.info('Server shutdown complete');
    process.exit(0);
  }

  // Redirect console interface methods to the appropriate modules
  // These act as pass-through methods to maintain compatibility with
  // any code that might be calling these methods directly on GameServer

  public startLocalClientSession(port: number): void {
    this.localSessionManager.startLocalClientSession(port);
  }

  public startLocalAdminSession(port: number): void {
    this.localSessionManager.startLocalAdminSession(port);
  }

  public startLocalUserSession(port: number, username?: string): void {
    this.localSessionManager.startLocalUserSession(port, username);
  }

  public startForcedSession(port: number, username: string): Promise<void> {
    return this.localSessionManager.startForcedSession(port, username);
  }

  public endLocalSession(): void {
    this.localSessionManager.endLocalSession();
  }

  public startMonitorUserSession(): void {
    this.userMonitor.startMonitorUserSession();
  }

  public startUserAdminMenu(): void {
    this.userAdminMenu.startUserAdminMenu();
  }

  public sendSystemMessage(): void {
    this.consoleManager.sendSystemMessage();
  }

  public showShutdownOptions(): void {
    this.consoleManager.showShutdownOptions();
  }

  /**
   * Get the actual Telnet port the server is running on
   */
  public getTelnetPort(): number {
    return this.telnetServer.getActualPort();
  }

  // For automated sessions - delegate to LocalSessionManager
  public async startAutoAdminSession(): Promise<void> {
    // Suppress normal console output for automated sessions
    this.suppressNormalOutput();

    // Allow the server a moment to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Start an admin session
    this.localSessionManager.startLocalAdminSession(this.telnetServer.getActualPort());

    // Set up auto-exit when the session ends
    this.setupAutoExit();
  }

  public async startAutoUserSession(): Promise<void> {
    // Suppress normal console output for automated sessions
    this.suppressNormalOutput();

    // Allow the server a moment to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Start a local client session
    this.localSessionManager.startLocalClientSession(this.telnetServer.getActualPort());

    // Set up auto-exit when the session ends
    this.setupAutoExit();
  }

  /**
   * Start a forced session as a specific user via CLI --forceSession, with auto-exit on quit or Ctrl+C
   */
  public async startAutoForcedSession(username: string): Promise<void> {
    // Suppress normal console output for automated sessions
    this.suppressNormalOutput();

    // Brief delay to let the server initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Start the forced session
    await this.localSessionManager.startForcedSession(this.telnetServer.getActualPort(), username);

    // Auto-exit when the session ends
    this.setupAutoExit();
  }

  private suppressNormalOutput(): void {
    // Don't show the welcome message or keyboard instructions
    // Need to preserve the original method structure for type compatibility
    systemLogger.info = function () {
      // No-op function that maintains the return type
      return systemLogger;
    };
  }

  private setupAutoExit(): void {
    // Override the endLocalSession method to exit when session ends
    const originalEndLocalSession = this.localSessionManager.endLocalSession.bind(
      this.localSessionManager
    );
    this.localSessionManager.endLocalSession = () => {
      originalEndLocalSession();

      // Give time for cleanup before exit
      setTimeout(() => {
        systemLogger.info('Auto-session ended, shutting down server');
        process.exit(0);
      }, 100);
    };
  }

  // Helper to get prompt text function now just forwards to the imported function
  public getPromptText(client: ConnectedClient): string {
    return getPromptText(client);
  }
}

// When this file is run directly, start the server
if (require.main === module) {
  const gameServer = new GameServer();
  gameServer.start().catch((error) => {
    systemLogger.error('Failed to start game server:', error);
    process.exit(1);
  });
}

export default GameServer;
