// WebSocket server uses any for socket handling
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { systemLogger } from '../utils/logger';
import { SocketIOConnection } from '../connection/socketio.connection';
import { IConnection } from '../connection/interfaces/connection.interface';
import { ConnectedClient, ServerStats } from '../types';
import { RoomManager } from '../room/roomManager';
import { colorize } from '../utils/colors';
import { getPromptText } from '../utils/promptFormatter';
import { writeMessageToClient } from '../utils/socketWriter';
import { createAdminMessageBox } from '../utils/messageFormatter';
import config from '../config';

export class WebSocketServer {
  private io: SocketIOServer;
  private httpServer: http.Server;
  private clients: Map<string, ConnectedClient>;
  private serverStats: ServerStats;
  private jwtSecret: string;
  private actualPort: number = config.WS_PORT;

  constructor(
    httpServer: http.Server,
    clients: Map<string, ConnectedClient>,
    serverStats: ServerStats,
    setupClientFn: (connection: IConnection) => void,
    handleClientDataFn: (client: ConnectedClient, data: string) => void,
    processInputFn: (client: ConnectedClient, input: string) => void
  ) {
    this.httpServer = httpServer;
    this.clients = clients;
    this.serverStats = serverStats;
    this.jwtSecret = config.JWT_SECRET;

    // Create Socket.IO server for WebSocket connections with CORS enabled
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    systemLogger.info('[WebSocketServer] Socket.IO server initialized');

    // Debug: Log all raw engine connections and events
    this.io.engine.on('connection', (rawSocket) => {
      systemLogger.info(`[WebSocketServer] Engine connection from ${rawSocket.remoteAddress}`);

      rawSocket.on('message', (data: Buffer | string) => {
        const msg = typeof data === 'string' ? data : data.toString();
        systemLogger.info(`[WebSocketServer] Engine message: ${msg.substring(0, 100)}`);
      });

      rawSocket.on('close', (reason: string) => {
        systemLogger.info(`[WebSocketServer] Engine socket closed: ${reason}`);
      });

      rawSocket.on('error', (err: Error) => {
        systemLogger.info(`[WebSocketServer] Engine socket error: ${err.message}`);
      });
    });

    // Add Socket.IO handler for ALL connections (default namespace)
    // Both game clients and admin dashboard connect here via io()
    this.io.on('connection', (socket) => {
      systemLogger.info(`[WebSocketServer] Socket connected: ${socket.id}`);

      // Set up monitor handlers BEFORE creating game client connection
      // This way admin dashboard sockets work without becoming game clients

      // Handle monitoring requests (from admin dashboard)
      socket.on('monitor-user', (data) => {
        systemLogger.info(`[Monitor] Received monitor-user request: ${JSON.stringify(data)}`);
        const { clientId, token } = data;

        // Verify admin token
        jwt.verify(token, this.jwtSecret, (err: jwt.VerifyErrors | null) => {
          if (err) {
            systemLogger.info(`[Monitor] Token verification failed: ${err.message}`);
            socket.emit('monitor-error', { message: 'Authentication failed' });
            return;
          }

          systemLogger.info(`[Monitor] Token verified, looking for client: ${clientId}`);

          const client = this.clients.get(clientId);
          if (!client) {
            systemLogger.info(`[Monitor] Client not found: ${clientId}`);
            socket.emit('monitor-error', { message: 'Client not found' });
            return;
          }

          systemLogger.info(
            `[Monitor] Client found, setting up monitoring for ${client.user?.username || 'unknown user'}`
          );

          // Store the admin socket for this client and set monitoring flag
          client.adminMonitorSocket = socket;
          client.isBeingMonitored = true;

          systemLogger.info(
            `Admin is now monitoring client ${clientId}${client.user ? ` (${client.user.username})` : ''}`
          );

          // Send initial data to the admin
          socket.emit('monitor-connected', {
            username: client.user ? client.user.username : 'Unknown',
            message: 'Monitoring session established',
          });
          systemLogger.info(`[Monitor] Sent monitor-connected event`);

          // Send current room description and prompt to orient the admin
          if (client.user) {
            const roomManager = RoomManager.getInstance(this.clients);
            const roomId = client.user.currentRoomId || roomManager.getStartingRoomId();
            const room = roomManager.getRoom(roomId);

            if (room) {
              // Get the room description excluding the monitored player
              const roomDescription = room.getDescriptionExcludingPlayer(client.user.username);

              // Get the user's prompt
              const promptText = getPromptText(client);

              // Get the user's current input buffer
              const inputBuffer = client.buffer || '';

              // Send the full context: room description + prompt + current input buffer
              socket.emit('monitor-output', {
                data: roomDescription + promptText + inputBuffer,
              });
            }
          }

          // Set up handler for admin commands
          socket.on('admin-command', (commandData) => {
            if (commandData.clientId === clientId && client.authenticated) {
              const commandStr = commandData.command;
              socket.emit('monitor-output', {
                data: `${colorize('> ' + commandStr, 'green')}\r\n`,
              });

              if (client.buffer.length > 0) {
                const promptText = getPromptText(client);
                const promptLength = promptText.length;
                client.connection.write(
                  '\r' + ' '.repeat(promptLength + client.buffer.length) + '\r'
                );
                client.connection.write(promptText);
                client.buffer = '';
              }

              setTimeout(() => {
                if (client.isInputBlocked === true) {
                  client.connection.write(`\r\n\x1b[33mAdmin executed: ${commandStr}\x1b[0m\r\n`);
                  const line = commandStr.trim();
                  client.connection.write('\r\n');
                  processInputFn(client, line);
                } else {
                  for (const char of commandStr) {
                    handleClientDataFn(client, char);
                  }
                  handleClientDataFn(client, '\r');
                }
              }, 50);
            }
          });

          // Handle block user input toggle button
          socket.on('block-user-input', (blockData) => {
            if (blockData.clientId === clientId && client.authenticated) {
              client.isInputBlocked = blockData.blocked;
              systemLogger.info(
                `Admin has ${blockData.blocked ? 'blocked' : 'unblocked'} input for client ${clientId}`
              );
              if (client.authenticated) {
                if (blockData.blocked) {
                  client.connection.write(
                    '\r\n\x1b[33mAn admin has temporarily disabled your input ability.\x1b[0m\r\n'
                  );
                } else {
                  client.connection.write(
                    '\r\n\x1b[33mAn admin has re-enabled your input ability.\x1b[0m\r\n'
                  );
                }
                const promptText = getPromptText(client);
                client.connection.write(promptText);
                if (client.buffer.length > 0) {
                  client.connection.write(client.buffer);
                }
              }
            }
          });

          // Handle admin message
          socket.on('admin-message', (messageData) => {
            if (messageData.clientId === clientId && client.authenticated) {
              systemLogger.info(`Admin sent message to client ${clientId}: ${messageData.message}`);
              const boxedMessage = createAdminMessageBox(messageData.message);
              writeMessageToClient(client, boxedMessage);
              const promptText = getPromptText(client);
              client.connection.write(promptText);
              if (client.buffer.length > 0) {
                client.connection.write(client.buffer);
              }
              socket.emit('monitor-output', {
                data: `\r\n\x1b[36mAdmin message sent successfully\x1b[0m\r\n`,
              });
            }
          });

          // Handle admin disconnect
          socket.on('disconnect', () => {
            if (client && client.adminMonitorSocket === socket) {
              delete client.adminMonitorSocket;
              client.isBeingMonitored = false;
              client.isInputBlocked = false;
            }
          });
        });
      });

      // Handle stop-monitoring event
      socket.on('stop-monitoring', (data) => {
        const clientId = data.clientId;
        if (!clientId) return;
        const client = this.clients.get(clientId);
        if (client && client.adminMonitorSocket === socket) {
          systemLogger.info(`Admin stopped monitoring client ${clientId}`);
          client.isBeingMonitored = false;
          client.isInputBlocked = false;
          client.adminMonitorSocket = undefined;
        }
      });

      // Create game client connection wrapper for ALL sockets
      // Admin sockets just won't send keypress events
      const connection = new SocketIOConnection(socket);
      setupClientFn(connection);
      this.serverStats.totalConnections++;
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      // HTTP server should already be configured in the APIServer class
      // We just need to track when it's listening
      const address = this.httpServer.address();
      if (address && typeof address !== 'string') {
        this.actualPort = address.port;
        systemLogger.info(`Socket.IO server running on port ${address.port}`);
      } else {
        systemLogger.info(`Socket.IO server running`);
      }
      resolve();
    });
  }

  public getSocketIOServer(): SocketIOServer {
    return this.io;
  }

  public getActualPort(): number {
    return this.actualPort;
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close(() => {
        systemLogger.info('Socket.IO server stopped');
        resolve();
      });
    });
  }
}
