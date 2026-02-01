import { ConnectedClient } from '../../types';
import { Command } from '../command.interface';
import { colorize } from '../../utils/colors';
import { writeFormattedMessageToClient } from '../../utils/socketWriter';
import { UserManager } from '../../user/userManager';
import { RoomManager } from '../../room/roomManager';

export class HideCommand implements Command {
  name = 'hide';
  description = 'Hide from everyone in the room - breaks when you move';
  private userManager: UserManager;
  private roomManager: RoomManager;

  constructor(clients: Map<string, ConnectedClient>) {
    this.userManager = UserManager.getInstance();
    this.roomManager = RoomManager.getInstance(clients);
  }

  execute(client: ConnectedClient, _args: string): void {
    if (!client.user) {
      writeFormattedMessageToClient(client, colorize('You must be logged in.\r\n', 'red'));
      return;
    }

    // Can't hide if in combat
    if (client.user.inCombat) {
      writeFormattedMessageToClient(client, colorize("You can't hide while in combat!\r\n", 'red'));
      return;
    }

    // Check if any NPCs in the room have aggression toward this player
    const room = this.roomManager.getRoom(client.user.currentRoomId);
    if (room) {
      for (const npc of room.npcs.values()) {
        if (npc.hasAggression(client.user.username)) {
          writeFormattedMessageToClient(
            client,
            colorize("You can't hide - enemies are watching you!\r\n", 'red')
          );
          return;
        }
      }
    }

    // Toggle hide mode
    client.user.isHiding = !client.user.isHiding;

    if (client.user.isHiding) {
      // First notify the room that player is hiding (before they become invisible)
      if (room) {
        this.roomManager.notifyPlayersInRoom(
          client.user.currentRoomId,
          colorize(
            `${client.user.username} finds a hiding spot and disappears from view.\r\n`,
            'gray'
          ),
          client.user.username
        );
      }

      writeFormattedMessageToClient(
        client,
        colorize('You hide yourself from view. Moving will reveal you.\r\n', 'cyan')
      );
    } else {
      writeFormattedMessageToClient(client, colorize('You step out of hiding.\r\n', 'yellow'));

      // Notify room that player is visible again
      if (room) {
        this.roomManager.notifyPlayersInRoom(
          client.user.currentRoomId,
          colorize(`${client.user.username} steps out of hiding.\r\n`, 'gray'),
          client.user.username
        );
      }
    }

    // Persist the state
    this.userManager.updateUserStats(client.user.username, {
      isHiding: client.user.isHiding,
    });
  }
}
