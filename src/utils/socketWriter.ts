import { ConnectedClient } from '../types';
import { drawCommandPrompt } from './promptFormatter';

// Write directly to the client without buffering
export function writeToClient(client: ConnectedClient, data: string): void {
  // Write directly to the connection
  client.connection.write(data);

  // If this client is being monitored, also send to the admin
  if (client.isBeingMonitored && client.adminMonitorSocket) {
    client.adminMonitorSocket.emit('monitor-output', { data });
  }
}

// Write message to client with proper handling of the prompt
// This function displays messages seamlessly even while the user is typing
// by clearing the line, writing the message, then redrawing the prompt and their input
export function writeMessageToClient(client: ConnectedClient, message: string): void {
  if (!client.user) {
    writeToClient(client, message);
    return;
  }

  // Always clear the line first to handle seamless output while typing
  const clearLineSequence = '\r\x1B[K';
  writeToClient(client, clearLineSequence);

  // Write the actual message
  writeToClient(client, message);

  // Always redraw the prompt (which also redraws the user's current input buffer)
  drawCommandPrompt(client);
}

// Function to reset typing state when user finishes their input
// Note: We no longer buffer output - messages display seamlessly while typing
export function stopBuffering(client: ConnectedClient): void {
  // Reset isTyping flag when user finishes their input
  client.isTyping = false;

  // Process any legacy buffered messages (for backwards compatibility during transition)
  if (client.outputBuffer.length > 0) {
    for (const message of client.outputBuffer) {
      writeToClient(client, message);
    }
    client.outputBuffer = [];

    // Draw prompt if user is authenticated
    if (client.user) {
      drawCommandPrompt(client);
    }
  }
}

/**
 * Writes a formatted message to the client with proper prompt handling
 * Ensures the line is cleared first, then adds the message, then redraws the prompt
 * This works seamlessly even while the user is typing - their input is preserved
 * @param client The connected client to write to
 * @param message The message to send
 * @param drawPrompt Whether to redraw the prompt after writing the message (default: true)
 */
export function writeFormattedMessageToClient(
  client: ConnectedClient,
  message: string,
  drawPrompt: boolean = true
): void {
  // For users who are not authenticated, use simple writeToClient
  if (!client.authenticated || !client.user) {
    writeToClient(client, message);
    return;
  }

  // First clear the current line
  client.connection.write('\r\x1B[K');

  // Write the message
  client.connection.write(message);

  // Only draw the prompt if requested (this also redraws the user's input buffer)
  if (drawPrompt) {
    // Use our utility function to draw the prompt
    drawCommandPrompt(client);
  }
}

// Re-export our prompt functions to make them available to importers
export { writeCommandPrompt, drawCommandPrompt, getPromptText } from './promptFormatter';
