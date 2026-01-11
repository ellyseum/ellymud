import { ClientState, ClientStateType, ConnectedClient } from '../types';
import { colorize } from '../utils/colors';
import { writeFormattedMessageToClient, drawCommandPrompt } from '../utils/socketWriter';
import { RoomManager, EMERGENCY_ROOM_ID } from '../room/roomManager';
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
    // Treat emergency void room as "no saved room" - always find a real room
    const savedRoomId = client.user.currentRoomId;
    const effectiveSavedRoom =
      savedRoomId && savedRoomId !== EMERGENCY_ROOM_ID ? savedRoomId : null;

    const roomId =
      client.stateData?.previousRoomId ||
      effectiveSavedRoom ||
      this.roomManager.getStartingRoomId();

    // Get the room and add player
    const room = this.roomManager.getRoom(roomId);
    if (room) {
      room.addPlayer(client.user.username);
      // Only save room ID if it's not the emergency room
      if (roomId !== EMERGENCY_ROOM_ID) {
        client.user.currentRoomId = roomId;
      }

      // Get the username for messaging
      const username = formatUsername(client.user.username);

      // Broadcast to all players that this player has entered the room
      this.broadcastToRoom(roomId, `${username} enters the area.\r\n`, client);

      gameLogger.debug(`User ${username} entered game state in room ${roomId}`);
    } else {
      // Fallback to starting room if specified room doesn't exist
      const startingRoomId = this.roomManager.getStartingRoomId();
      // getRoom will auto-create the emergency room if startingRoomId is EMERGENCY_ROOM_ID
      const startingRoom = this.roomManager.getRoom(startingRoomId);

      if (startingRoom) {
        startingRoom.addPlayer(client.user.username);
        // Only save room ID if it's not the emergency room
        if (startingRoomId !== EMERGENCY_ROOM_ID) {
          client.user.currentRoomId = startingRoomId;
        }

        // Show appropriate message based on room type
        if (startingRoomId === EMERGENCY_ROOM_ID) {
          writeFormattedMessageToClient(
            client,
            colorize('\r\n⚠ No rooms exist in this world yet!\r\n', 'yellow') +
              colorize(
                'You have been placed in the Void. Read the instructions below to create your world.\r\n\r\n',
                'cyan'
              )
          );
          gameLogger.warn(
            `No rooms exist! User ${client.user.username} placed in emergency void room`
          );
        } else {
          writeFormattedMessageToClient(
            client,
            colorize(
              `Your previous location no longer exists. You have been moved to ${startingRoom.name}.\r\n`,
              'yellow'
            )
          );
          gameLogger.warn(
            `Room ${roomId} not found, placing user in starting room ${startingRoomId}`
          );
        }
      } else {
        // This should never happen now that getRoom auto-creates emergency room
        gameLogger.error(`Critical: Could not get any room for user ${client.user.username}`);
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
