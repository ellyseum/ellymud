import { ConnectedClient } from '../../types';
import { Command } from '../command.interface';
import { colorize } from '../../utils/colors';
import { writeFormattedMessageToClient } from '../../utils/socketWriter';
import { UserManager } from '../../user/userManager';
import { RoomManager } from '../../room/roomManager';

export class SneakCommand implements Command {
  name = 'sneak';
  description = 'Toggle sneak mode - move silently and avoid NPC detection';
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

    // Can't sneak if in combat
    if (client.user.inCombat) {
      writeFormattedMessageToClient(
        client,
        colorize("You can't sneak while in combat!\r\n", 'red')
      );
      return;
    }

    // Check if any NPCs in the room have aggression toward this player
    const room = this.roomManager.getRoom(client.user.currentRoomId);
    if (room) {
      for (const npc of room.npcs.values()) {
        if (npc.hasAggression(client.user.username)) {
          writeFormattedMessageToClient(
            client,
            colorize("You can't sneak - enemies are watching you!\r\n", 'red')
          );
          return;
        }
      }
    }

    // Toggle sneak mode
    client.user.isSneaking = !client.user.isSneaking;

    if (client.user.isSneaking) {
      writeFormattedMessageToClient(client, colorize('You begin moving stealthily...\r\n', 'cyan'));

      // Notify room (but only if not already hiding)
      if (!client.user.isHiding && room) {
        this.roomManager.notifyPlayersInRoom(
          client.user.currentRoomId,
          colorize(`${client.user.username} slips into the shadows.\r\n`, 'gray'),
          client.user.username
        );
      }
    } else {
      writeFormattedMessageToClient(
        client,
        colorize('You stop sneaking and move normally.\r\n', 'yellow')
      );

      // Notify room (but only if not hiding)
      if (!client.user.isHiding && room) {
        this.roomManager.notifyPlayersInRoom(
          client.user.currentRoomId,
          colorize(`${client.user.username} emerges from the shadows.\r\n`, 'gray'),
          client.user.username
        );
      }
    }

    // Persist the state
    this.userManager.updateUserStats(client.user.username, {
      isSneaking: client.user.isSneaking,
    });
  }
}
