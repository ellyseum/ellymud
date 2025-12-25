import { ClientState, ClientStateType, ConnectedClient } from '../types';
import { colorize } from '../utils/colors';
import { writeToClient, writeFormattedMessageToClient } from '../utils/socketWriter';
import { RoomManager } from '../room/roomManager';
import { formatUsername } from '../utils/formatters';
import { createContextLogger } from '../utils/logger';

// Create context-specific logger for EditorState
const editorLogger = createContextLogger('EditorState');

export class EditorState implements ClientState {
  name = ClientStateType.EDITOR;
  private clients: Map<string, ConnectedClient>;

  // Static reference to the global clients map
  private static globalClients: Map<string, ConnectedClient> | null = null;

  constructor() {
    // Initialize clients as an empty map - will get the real one in enter()
    this.clients = new Map<string, ConnectedClient>();
  }

  /**
   * Set the global clients map - to be called from the server initialization
   */
  public static setGlobalClients(clients: Map<string, ConnectedClient>): void {
    EditorState.globalClients = clients;
  }

  enter(client: ConnectedClient): void {
    // Get access to the global clients map - CRITICAL: must be set via setGlobalClients
    if (EditorState.globalClients) {
      this.clients = EditorState.globalClients;
    } else if (client.stateData.clientsMap) {
      this.clients = client.stateData.clientsMap;
    } else {
      // SAFETY: If globalClients not set, log error but don't break the game
      editorLogger.error(
        'EditorState.globalClients not set! Call EditorState.setGlobalClients() during server init.'
      );
    }

    // Capture previous room ID before detaching
    if (client.user) {
      client.stateData.previousRoomId = client.user.currentRoomId;
      // Also capture previous state to return to
      client.stateData.previousState = client.state;

      // Get RoomManager instance - DON'T pass clients map to avoid overwriting global state
      // Just get the existing instance
      const roomManager = RoomManager.getInstance(
        this.clients.size > 0 ? this.clients : EditorState.globalClients || new Map()
      );

      // Get the username for messaging
      const username = formatUsername(client.user.username);

      // Broadcast to all players that this player has left the game
      this.broadcastToAllPlayers(`${username} has left the game.\r\n`, client);

      // Detach player from all rooms
      roomManager.removePlayerFromAllRooms(client.user.username);

      // Clear current room ID so player isn't targeted by NPCs (use empty string since it's not optional)
      client.user.currentRoomId = '';

      // Clear combat state (room ID is preserved in stateData for return)
      client.user.inCombat = false;

      editorLogger.debug(
        `User ${username} entered editor state from room ${client.stateData.previousRoomId}`
      );
    }

    // Clear masking (in case it was set)
    client.stateData.maskInput = false;
    client.connection.setMaskInput(false);

    // Suppress prompts in editor state
    client.stateData.suppressPrompt = true;

    // Display editor message
    this.clearScreen(client);
    writeToClient(client, colorize('You are in the character editor.\r\n', 'cyan'));
    writeToClient(client, colorize("Press 'x' to return to the game.\r\n", 'dim'));
  }

  handle(client: ConnectedClient, input: string): void {
    // Check for 'x' or 'X' to exit editor state
    if (input.toLowerCase() === 'x') {
      this.exitEditor(client);
      return;
    }

    // Any other input just shows the editor message again
    writeToClient(client, colorize('You are in the character editor.\r\n', 'cyan'));
    writeToClient(client, colorize("Press 'x' to return to the game.\r\n", 'dim'));
  }

  private exitEditor(client: ConnectedClient): void {
    if (client.user) {
      const username = formatUsername(client.user.username);
      editorLogger.debug(
        `User ${username} exiting editor state, returning to room ${client.stateData.previousRoomId}`
      );
    }

    // Transition back to AUTHENTICATED state (the working command state)
    // This will trigger re-entry via AuthenticatedState.enter() which handles room attachment
    client.stateData.transitionTo = ClientStateType.AUTHENTICATED;
  }

  /**
   * Broadcasts a message to all authenticated players in the game
   */
  private broadcastToAllPlayers(message: string, excludeClient?: ConnectedClient): void {
    editorLogger.debug(`Broadcasting to ${this.clients.size} clients: ${message.trim()}`);
    let broadcastCount = 0;
    this.clients.forEach((c) => {
      if (c !== excludeClient && c.authenticated && c.user && c.user.currentRoomId) {
        writeFormattedMessageToClient(c, colorize(message, 'yellow'));
        broadcastCount++;
      }
    });
    editorLogger.debug(`Broadcast sent to ${broadcastCount} clients`);
  }

  private clearScreen(client: ConnectedClient): void {
    // ANSI escape code to clear the screen and move the cursor to the top-left corner
    writeToClient(client, '\u001b[2J\u001b[H');
  }

  exit(client: ConnectedClient): void {
    // Clear suppressPrompt flag
    client.stateData.suppressPrompt = false;

    if (client.user) {
      const username = client.user.username;
      editorLogger.debug(`User ${username} leaving editor state`);
    }
  }
}
