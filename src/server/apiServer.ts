import http from 'http';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import { systemLogger } from '../utils/logger';
import { ConnectedClient, ServerStats } from '../types';
import * as AdminApi from '../admin/adminApi';
import { UserManager } from '../user/userManager';
import { RoomManager } from '../room/roomManager';
import { GameTimerManager } from '../timer/gameTimerManager';
import config from '../config';
import rateLimit from 'express-rate-limit';

// Rate limiter for API endpoints to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Stricter rate limiter for login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});

export class APIServer {
  private app: express.Application;
  private httpServer: http.Server;
  private clients: Map<string, ConnectedClient>;
  private userManager: UserManager;
  private roomManager: RoomManager;
  private gameTimerManager: GameTimerManager;
  private serverStats: ServerStats;
  private port: number;

  constructor(
    clients: Map<string, ConnectedClient>,
    userManager: UserManager,
    roomManager: RoomManager,
    gameTimerManager: GameTimerManager,
    serverStats: ServerStats,
    port?: number
  ) {
    this.clients = clients;
    this.userManager = userManager;
    this.roomManager = roomManager;
    this.gameTimerManager = gameTimerManager;
    this.serverStats = serverStats;
    this.port = port ?? config.HTTP_PORT;

    // Create the Express app
    this.app = express();
    this.app.use(cors());
    this.app.use(bodyParser.json());

    // Apply rate limiting to all API routes
    this.app.use('/api/', apiLimiter);

    // Configure API routes
    this.setupApiRoutes();

    // Serve static files
    this.setupStaticFiles();

    // Create the HTTP server with the Express app
    this.httpServer = http.createServer(this.app);

    // Add error handler
    this.httpServer.on('error', (err: Error & { code?: string }) => {
      if (err.code === 'EADDRINUSE') {
        systemLogger.error(`Port ${this.port} is already in use. Is another instance running?`);
        systemLogger.info(`Trying alternative port ${this.port + 1}...`);
        this.port = this.port + 1;
        this.httpServer.listen(this.port);
      } else {
        systemLogger.error('HTTP server error:', err);
      }
    });
  }

  private setupApiRoutes(): void {
    // Admin API routes
    this.app.post('/api/admin/login', loginLimiter, AdminApi.login);
    this.app.get(
      '/api/admin/stats',
      AdminApi.validateToken,
      AdminApi.getServerStats(this.serverStats)
    );
    this.app.get(
      '/api/admin/players',
      AdminApi.validateToken,
      AdminApi.getConnectedPlayers(this.clients, this.userManager)
    );
    this.app.post(
      '/api/admin/players/:clientId/kick',
      AdminApi.validateToken,
      AdminApi.kickPlayer(this.clients)
    );
    this.app.post(
      '/api/admin/players/:clientId/monitor',
      AdminApi.validateToken,
      AdminApi.monitorPlayer(this.clients)
    );

    // Player management endpoints
    this.app.get(
      '/api/admin/players/all',
      AdminApi.validateToken,
      AdminApi.getAllPlayers(this.userManager)
    );
    this.app.get(
      '/api/admin/players/details/:username',
      AdminApi.validateToken,
      AdminApi.getPlayerDetailsById(this.userManager)
    );
    this.app.post(
      '/api/admin/players/update/:username',
      AdminApi.validateToken,
      AdminApi.updatePlayer(this.userManager, this.roomManager)
    );
    this.app.post(
      '/api/admin/players/reset-password/:username',
      AdminApi.validateToken,
      AdminApi.resetPlayerPassword(this.userManager)
    );
    this.app.delete(
      '/api/admin/players/delete/:username',
      AdminApi.validateToken,
      AdminApi.deletePlayer(this.userManager, this.roomManager, this.clients)
    );

    // Game timer system endpoints
    this.app.get(
      '/api/admin/gametimer-config',
      AdminApi.validateToken,
      AdminApi.getGameTimerConfig(this.gameTimerManager)
    );
    this.app.post(
      '/api/admin/gametimer-config',
      AdminApi.validateToken,
      AdminApi.updateGameTimerConfig(this.gameTimerManager)
    );
    this.app.post(
      '/api/admin/force-save',
      AdminApi.validateToken,
      AdminApi.forceSave(this.gameTimerManager)
    );

    // MUD config endpoints
    this.app.get('/api/admin/mud-config', AdminApi.validateToken, AdminApi.getMUDConfig());
    this.app.post('/api/admin/mud-config', AdminApi.validateToken, AdminApi.updateMUDConfig());

    // Pipeline metrics endpoint
    this.app.get(
      '/api/admin/pipeline-metrics',
      AdminApi.validateToken,
      AdminApi.getPipelineMetrics()
    );
  }

  private setupStaticFiles(): void {
    // Serve static files from the public directory
    this.app.use(express.static(config.PUBLIC_DIR));

    // Serve only specific xterm.js packages from node_modules to avoid exposing private files
    const nodeModulesPath = path.join(__dirname, '..', '..', 'node_modules');
    this.app.use('/node_modules/xterm', express.static(path.join(nodeModulesPath, 'xterm')));
    this.app.use(
      '/node_modules/xterm-addon-fit',
      express.static(path.join(nodeModulesPath, 'xterm-addon-fit'))
    );
    this.app.use(
      '/node_modules/xterm-addon-web-links',
      express.static(path.join(nodeModulesPath, 'xterm-addon-web-links'))
    );
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.port, () => {
        const address = this.httpServer.address();
        if (address && typeof address !== 'string') {
          this.port = address.port;
          systemLogger.info(`HTTP server running on port ${address.port}`);
          systemLogger.info(`Admin interface available at http://localhost:${address.port}/admin`);
        } else {
          systemLogger.info(`HTTP server running`);
          systemLogger.info(`Admin interface available`);
        }
        resolve();
      });
    });
  }

  public getHttpServer(): http.Server {
    return this.httpServer;
  }

  public getExpressApp(): express.Application {
    return this.app;
  }

  public getActualPort(): number {
    return this.port;
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.close(() => {
        systemLogger.info('HTTP server stopped');
        resolve();
      });
    });
  }
}
