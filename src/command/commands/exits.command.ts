import { ConnectedClient } from '../../types';
import { Command } from '../command.interface';
import { RoomManager } from '../../room/roomManager';
import { writeToClient } from '../../utils/socketWriter';

export class ExitsCommand implements Command {
  name = 'exits';
  description = "Show the current room's exits";
  private roomManager: RoomManager;

  constructor(clients: Map<string, ConnectedClient>) {
    this.roomManager = RoomManager.getInstance(clients);
  }

  execute(client: ConnectedClient, _args: string): void {
    if (!client.user) return;
    const roomId = client.user.currentRoomId || this.roomManager.getStartingRoomId();
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;
    writeToClient(client, room.getExitsLine());
  }
}
