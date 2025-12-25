import { ClientState, ClientStateType, ConnectedClient } from '../types';
import { colorize } from '../utils/colors';
import { writeFormattedMessageToClient, drawCommandPrompt } from '../utils/socketWriter';
import { RoomManager } from '../room/roomManager';
import { formatUsername } from '../utils/formatters';
import { createContextLogger } from '../utils/logger';

// Create context-specific logger for GameState
const gameLogger = createContextLogger('GameState');

export class GameState implements ClientState {
  name = ClientStateType.GAME;
  private clients: Map<string, ConnectedClient>;
  private roomManager: RoomManager;

  // Static reference to the global clients map
  private static globalClients: Map<string, ConnectedClient> | null = null;

  constructor(clients: Map<string, ConnectedClient>) {
    this.clients = clients;
    this.roomManager = RoomManager.getInstance(clients);
  }

  /**
   * Set the global clients map - to be called from the server initialization
   */
  public static setGlobalClients(clients: Map<string, ConnectedClient>): void {
    GameState.globalClients = clients;
  }

  enter(client: ConnectedClient): void {
    // Get access to the global clients map if available
    if (GameState.globalClients) {
      this.clients = GameState.globalClients;
      this.roomManager = RoomManager.getInstance(this.clients);
    }

    if (!client.user) {
      client.stateData.transitionTo = ClientStateType.LOGIN;
      return;
    }

    // Determine which room to enter
    const roomId =
      client.stateData?.previousRoomId ||
      client.user.currentRoomId ||
      this.roomManager.getStartingRoomId();

    // Get the room and add player
    const room = this.roomManager.getRoom(roomId);
    if (room) {
      room.addPlayer(client.user.username);
      client.user.currentRoomId = roomId;

      // Get the username for messaging
      const username = formatUsername(client.user.username);

      // Broadcast to all players that this player has entered the room
      this.broadcastToRoom(roomId, `${username} enters the area.\r\n`, client);

      gameLogger.debug(`User ${username} entered game state in room ${roomId}`);
    } else {
      // Fallback to starting room if specified room doesn't exist
      const startingRoomId = this.roomManager.getStartingRoomId();
      const startingRoom = this.roomManager.getRoom(startingRoomId);
      if (startingRoom) {
        startingRoom.addPlayer(client.user.username);
        client.user.currentRoomId = startingRoomId;
        gameLogger.warn(
          `Room ${roomId} not found, placing user in starting room ${startingRoomId}`
        );
      }
    }

    // Clear previous room ID from state data (it's been used)
    delete client.stateData.previousRoomId;

    // Clear any suppressed prompt flag
    client.stateData.suppressPrompt = false;

    // Show room description
    this.roomManager.lookRoom(client);

    // Draw the command prompt
    drawCommandPrompt(client);
  }

  handle(client: ConnectedClient, input: string): void {
    // GameState doesn't handle input directly - commands go through CommandHandler
    // This is a passthrough state for input handling
    gameLogger.debug(`GameState received input: "${input}" - should be handled by CommandHandler`);
  }

  exit(client: ConnectedClient): void {
    // Check what state we're transitioning to
    const nextState = client.stateData?.transitionTo;

    if (client.user) {
      const username = formatUsername(client.user.username);

      // If transitioning to EDITOR, detach player from room with broadcast
      if (nextState === ClientStateType.EDITOR) {
        const currentRoomId = client.user.currentRoomId;

        // Store current room for return
        client.stateData.previousRoomId = currentRoomId;

        // Broadcast player leaving
        if (currentRoomId) {
          this.broadcastToRoom(currentRoomId, `${username} leaves the area.\r\n`, client);
        }

        // Remove player from all rooms
        this.roomManager.removePlayerFromAllRooms(client.user.username);

        // Clear combat state (room ID is preserved in stateData for return)
        client.user.inCombat = false;

        gameLogger.debug(
          `User ${username} leaving game state for editor, was in room ${currentRoomId}`
        );
      } else {
        gameLogger.debug(`User ${username} leaving game state for ${nextState}`);
      }
    }
  }

  /**
   * Broadcasts a message to all players in a specific room, except the sender
   */
  private broadcastToRoom(roomId: string, message: string, excludeClient?: ConnectedClient): void {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;

    this.clients.forEach((c) => {
      if (c !== excludeClient && c.authenticated && c.user && c.user.currentRoomId === roomId) {
        writeFormattedMessageToClient(c, colorize(message, 'bright'));
      }
    });
  }
}
