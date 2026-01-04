import { GameServer } from '../app';
import { TelnetServer } from '../server/telnetServer';
import { ClientManager } from '../client/clientManager';
import { UserManager } from '../user/userManager';
import { CommandHandler } from '../command/commandHandler';
import { ShutdownManager } from '../server/shutdownManager';
import { LocalSessionManager } from './localSessionManager';
import { UserMonitor } from './userMonitor';
import { UserAdminMenu } from './userAdminMenu';
import { ConsoleInterface } from './consoleInterface';
import { AutoSessionHandler } from './autoSessionHandler';
import { RoomManager } from '../room/roomManager';
import { GameTimerManager } from '../timer/gameTimerManager';
import { HTTP_PORT, STORAGE_BACKEND } from '../config';
import adminAuth from '../admin/adminAuth';

/**
 * ConsoleManager orchestrates all console-related functionality
 * This class has been refactored to delegate specific tasks to specialized components
 */
export class ConsoleManager {
  // Core game components
  private gameServer: GameServer;
  private telnetServer: TelnetServer;
  private clientManager: ClientManager;
  private userManager: UserManager;
  private commandHandler: CommandHandler;
  private shutdownManager: ShutdownManager;

  // Specialized console components - initialize with default values to satisfy TypeScript
  private localSessionManager!: LocalSessionManager;
  private userMonitor!: UserMonitor;
  private userAdminMenu!: UserAdminMenu;
  private consoleInterface!: ConsoleInterface;
  private autoSessionHandler!: AutoSessionHandler;

  constructor(
    gameServer: GameServer,
    telnetServer: TelnetServer,
    clientManager: ClientManager,
    userManager: UserManager,
    commandHandler: CommandHandler,
    shutdownManager: ShutdownManager
  ) {
    this.gameServer = gameServer;
    this.telnetServer = telnetServer;
    this.clientManager = clientManager;
    this.userManager = userManager;
    this.commandHandler = commandHandler;
    this.shutdownManager = shutdownManager;

    // Initialize components immediately in the constructor
    this.initializeComponents();
  }

  private initializeComponents(): void {
    // Initialize all specialized components

    // LocalSessionManager - handles local client sessions
    this.localSessionManager = new LocalSessionManager(this, this.telnetServer);

    // ConsoleInterface - handles keyboard shortcuts and main menu
    this.consoleInterface = new ConsoleInterface(
      this.gameServer,
      this.shutdownManager,
      this.clientManager,
      this.handleKeyCommand.bind(this)
    );

    // UserMonitor - handles monitoring user sessions
    this.userMonitor = new UserMonitor(
      this.clientManager,
      () => this.consoleInterface.setupKeyListener(),
      this.commandHandler
    );

    // UserAdminMenu - handles user administration
    this.userAdminMenu = new UserAdminMenu(
      this.userManager,
      this.clientManager,
      this.commandHandler,
      this.localSessionManager,
      this.telnetServer,
      this.gameServer,
      () => this.consoleInterface.setupKeyListener()
    );

    // AutoSessionHandler - handles CLI auto-sessions
    this.autoSessionHandler = new AutoSessionHandler(this.localSessionManager, this.telnetServer);
  }

  /**
   * Set up the main keyboard shortcuts listener
   */
  public setupKeyListener(): void {
    this.consoleInterface.setupKeyListener();
  }

  /**
   * Remove the main key listener (to be used by components temporarily)
   */
  public removeMainKeyListener(): void {
    this.consoleInterface.removeMainKeyListener();
  }

  /**
   * Handle key commands from the console interface
   */
  private handleKeyCommand(command: string): void {
    switch (command) {
      case 'l':
        this.localSessionManager.startLocalClientSession(this.telnetServer.getActualPort());
        break;
      case 'a':
        this.removeMainKeyListener();
        this.localSessionManager.startLocalAdminSession(this.telnetServer.getActualPort());
        break;
      case 'u':
        this.removeMainKeyListener();
        this.userAdminMenu.startUserAdminMenu();
        break;
      case 'm':
        this.removeMainKeyListener();
        this.userMonitor.startMonitorUserSession();
        break;
      case 's':
        this.removeMainKeyListener();
        this.consoleInterface.sendSystemMessage();
        break;
      case 't':
        this.displayServerStats();
        break;
      case 'q':
        this.removeMainKeyListener();
        this.consoleInterface.showShutdownOptions();
        break;
    }
  }

  /**
   * Start a local user session (for regular users)
   */
  public startLocalUserSession(port: number, username?: string): void {
    this.localSessionManager.startLocalUserSession(port, username);
  }

  /**
   * Start a local admin session
   */
  public startLocalAdminSession(port: number): void {
    this.localSessionManager.startLocalAdminSession(port);
  }

  /**
   * Start an auto-admin session (for CLI mode)
   */
  public async startAutoAdminSession(): Promise<void> {
    return this.autoSessionHandler.startAutoAdminSession();
  }

  /**
   * Start an auto-user session (for CLI mode)
   */
  public async startAutoUserSession(): Promise<void> {
    return this.autoSessionHandler.startAutoUserSession();
  }

  /**
   * Start an auto-forced session (for CLI mode)
   */
  public async startAutoForcedSession(username: string): Promise<void> {
    return this.autoSessionHandler.startAutoForcedSession(username);
  }

  /**
   * Send a system message to all users
   */
  public sendSystemMessage(): void {
    this.consoleInterface.sendSystemMessage();
  }

  /**
   * Show shutdown options menu
   */
  public showShutdownOptions(): void {
    this.consoleInterface.showShutdownOptions();
  }

  /**
   * Display welcome message
   */
  public logWelcomeMessage(): void {
    this.consoleInterface.logWelcomeMessage();
  }

  /**
   * Display server statistics and status information
   */
  private displayServerStats(): void {
    const stats = this.gameServer.getServerStats();
    const roomManager = RoomManager.getInstance(this.clientManager.getClients());
    const gameTimer = GameTimerManager.getInstance(this.userManager, roomManager);
    const timerConfig = gameTimer.getConfig();

    // Calculate uptime
    const uptimeSeconds = stats.uptime;
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const uptimeStr =
      days > 0
        ? `${days}d ${hours}h ${minutes}m ${seconds}s`
        : hours > 0
          ? `${hours}h ${minutes}m ${seconds}s`
          : `${minutes}m ${seconds}s`;

    // Get connected clients info
    const clients = this.clientManager.getClients();
    const authenticatedClients = Array.from(clients.values()).filter((c) => c.authenticated);
    const adminClients = authenticatedClients.filter(
      (c) => c.user && adminAuth.isAdmin(c.user.username)
    );

    // Get rooms and NPCs count
    const rooms = roomManager.getAllRooms();
    const totalNpcs = rooms.reduce((count, room) => count + room.npcs.size, 0);

    // Get user counts
    const allUsers = this.userManager.getAllUsers();
    const adminUsers = allUsers.filter((u) => adminAuth.isAdmin(u.username));

    // Memory usage
    const memUsage = process.memoryUsage();
    const formatBytes = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Log file locations
    const logDir = 'logs';

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                     SERVER STATISTICS                         ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║ RUNTIME                                                       ║');
    console.log(`║   Uptime:              ${uptimeStr.padEnd(39)}║`);
    console.log(`║   Started:             ${stats.startTime.toLocaleString().padEnd(39)}║`);
    console.log(`║   Storage Backend:     ${STORAGE_BACKEND.padEnd(39)}║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║ NETWORK                                                       ║');
    console.log(
      `║   Telnet Port:         ${String(this.telnetServer.getActualPort()).padEnd(39)}║`
    );
    console.log(`║   HTTP/WS Port:        ${String(HTTP_PORT).padEnd(39)}║`);
    console.log(`║   Admin UI:            http://localhost:${HTTP_PORT}/admin/`.padEnd(65) + '║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║ USERS                                                         ║');
    console.log(`║   Connected Clients:   ${String(clients.size).padEnd(39)}║`);
    console.log(`║   Authenticated:       ${String(authenticatedClients.length).padEnd(39)}║`);
    console.log(`║   Admins Online:       ${String(adminClients.length).padEnd(39)}║`);
    console.log(`║   Total Registered:    ${String(allUsers.length).padEnd(39)}║`);
    console.log(`║   Admin Accounts:      ${String(adminUsers.length).padEnd(39)}║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║ WORLD                                                         ║');
    console.log(`║   Total Rooms:         ${String(rooms.length).padEnd(39)}║`);
    console.log(`║   Active NPCs:         ${String(totalNpcs).padEnd(39)}║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║ GAME TIMER                                                    ║');
    console.log(
      `║   Status:              ${(gameTimer.isRunning() ? 'Running' : 'Stopped').padEnd(39)}║`
    );
    console.log(`║   Tick Interval:       ${(timerConfig.tickInterval + ' ms').padEnd(39)}║`);
    console.log(`║   Save Interval:       ${(timerConfig.saveInterval + ' ticks').padEnd(39)}║`);
    console.log(`║   Current Tick:        ${String(gameTimer.getTickCount()).padEnd(39)}║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║ MEMORY                                                        ║');
    console.log(`║   Heap Used:           ${formatBytes(memUsage.heapUsed).padEnd(39)}║`);
    console.log(`║   Heap Total:          ${formatBytes(memUsage.heapTotal).padEnd(39)}║`);
    console.log(`║   RSS:                 ${formatBytes(memUsage.rss).padEnd(39)}║`);
    console.log(`║   External:            ${formatBytes(memUsage.external).padEnd(39)}║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║ ACTIVITY                                                      ║');
    console.log(`║   Total Connections:   ${String(stats.totalConnections).padEnd(39)}║`);
    console.log(`║   Total Commands:      ${String(stats.totalCommands).padEnd(39)}║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║ LOG FILES                                                     ║');
    console.log(`║   System:              ${(logDir + '/system/').padEnd(39)}║`);
    console.log(`║   Players:             ${(logDir + '/players/').padEnd(39)}║`);
    console.log(`║   Errors:              ${(logDir + '/error/').padEnd(39)}║`);
    console.log(`║   Raw Sessions:        ${(logDir + '/raw-sessions/').padEnd(39)}║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');

    // List authenticated users if any
    if (authenticatedClients.length > 0) {
      console.log('\n┌─────────────────────────────────────────────────────────────┐');
      console.log('│ ONLINE USERS                                                │');
      console.log('├─────────────────────────────────────────────────────────────┤');
      authenticatedClients.forEach((client) => {
        const username = client.user?.username || 'Unknown';
        const isAdmin = client.user && adminAuth.isAdmin(client.user.username) ? ' [ADMIN]' : '';
        const room = client.user?.currentRoomId || 'Unknown';
        const info = `${username}${isAdmin} - Room: ${room}`;
        console.log(`│   ${info.padEnd(57)}│`);
      });
      console.log('└─────────────────────────────────────────────────────────────┘');
    }

    console.log('');
  }
}
