/**
 * Map Command - Display ASCII map of current area
 *
 * Usage:
 *   map           - Show map of current area
 *   map <area>    - Show map of specified area
 *
 * @module command/commands/map
 */

import { ConnectedClient } from '../../types';
import { Command } from '../command.interface';
import { RoomManager } from '../../room/roomManager';
import { Room } from '../../room/room';
import { colorize } from '../../utils/colors';
import { writeToClient } from '../../utils/socketWriter';

export class MapCommand implements Command {
  name = 'map';
  description = 'Display an ASCII map of the current area';
  aliases = ['m', 'area'];
  private roomManager: RoomManager;

  constructor(private clients: Map<string, ConnectedClient>) {
    this.roomManager = RoomManager.getInstance(clients);
  }

  execute(client: ConnectedClient, args: string): void {
    if (!client.user) {
      writeToClient(client, colorize('You must be logged in.\r\n', 'red'));
      return;
    }

    const currentRoomId = client.user.currentRoomId || this.roomManager.getStartingRoomId();
    const currentRoom = this.roomManager.getRoom(currentRoomId);

    if (!currentRoom) {
      writeToClient(client, colorize('You are in an invalid location.\r\n', 'red'));
      return;
    }

    // Determine which area to display
    const targetAreaId = args.trim().toLowerCase() || currentRoom.areaId;

    if (!targetAreaId) {
      writeToClient(client, colorize('This room is not part of any area.\r\n', 'yellow'));
      return;
    }

    // Get all rooms in the target area
    const areaRooms = this.roomManager.getRoomsByArea(targetAreaId);

    if (areaRooms.length === 0) {
      writeToClient(client, colorize(`No rooms found in area '${targetAreaId}'.\r\n`, 'yellow'));
      return;
    }

    // Check if rooms have grid coordinates
    const roomsWithCoords = areaRooms.filter((r) => r.gridX !== undefined && r.gridY !== undefined);

    if (roomsWithCoords.length === 0) {
      writeToClient(
        client,
        colorize('This area does not have map coordinates defined.\r\n', 'yellow')
      );
      return;
    }

    // Generate and display the map
    const mapOutput = this.generateMap(roomsWithCoords, currentRoomId);
    writeToClient(client, mapOutput);
  }

  /**
   * Check if an exit leads to a different area (cross-area link)
   */
  private isCrossAreaExit(room: Room, exit: { direction: string; roomId: string }): boolean {
    // Qualified IDs (area:room-id) are always cross-area
    if (exit.roomId.includes(':')) {
      const [targetArea] = exit.roomId.split(':');
      return targetArea !== room.areaId;
    }

    // Check if target room exists in a different area
    const targetRoom = this.roomManager.getRoom(exit.roomId);
    if (targetRoom && targetRoom.areaId !== room.areaId) {
      return true;
    }

    return false;
  }

  /**
   * Generate ASCII map from rooms with grid coordinates
   */
  private generateMap(rooms: Room[], currentRoomId: string): string {
    // Find bounds
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    for (const room of rooms) {
      if (room.gridX !== undefined && room.gridY !== undefined) {
        minX = Math.min(minX, room.gridX);
        maxX = Math.max(maxX, room.gridX);
        minY = Math.min(minY, room.gridY);
        maxY = Math.max(maxY, room.gridY);
      }
    }

    // Create room lookup by coordinates
    const roomGrid = new Map<string, Room>();
    for (const room of rooms) {
      if (room.gridX !== undefined && room.gridY !== undefined) {
        roomGrid.set(`${room.gridX},${room.gridY}`, room);
      }
    }

    // Build the map
    const lines: string[] = [];

    // Header
    const areaId = rooms[0]?.areaId || 'Unknown Area';
    lines.push(colorize(`=== Map: ${areaId} ===`, 'cyan'));
    lines.push('');

    // Track if we have any cross-area exits for the legend
    let hasCrossAreaExits = false;

    // Render grid (iterate from maxY to minY so north appears at top)
    for (let y = maxY; y >= minY; y--) {
      // Each row is 3 lines tall for connections
      const topLine: string[] = [];
      const midLine: string[] = [];
      const botLine: string[] = [];

      for (let x = minX; x <= maxX; x++) {
        const room = roomGrid.get(`${x},${y}`);

        if (room) {
          const isCurrentRoom = room.id === currentRoomId;

          // Determine connections and check for cross-area exits
          const exitN = room.exits.find((e) => e.direction === 'north');
          const exitS = room.exits.find((e) => e.direction === 'south');
          const exitE = room.exits.find((e) => e.direction === 'east');
          const exitW = room.exits.find((e) => e.direction === 'west');
          const exitNE = room.exits.find((e) => e.direction === 'northeast');
          const exitNW = room.exits.find((e) => e.direction === 'northwest');
          const exitSE = room.exits.find((e) => e.direction === 'southeast');
          const exitSW = room.exits.find((e) => e.direction === 'southwest');

          // Check for cross-area connections
          const crossN = exitN && this.isCrossAreaExit(room, exitN);
          const crossS = exitS && this.isCrossAreaExit(room, exitS);
          const crossE = exitE && this.isCrossAreaExit(room, exitE);
          const crossW = exitW && this.isCrossAreaExit(room, exitW);
          const crossNE = exitNE && this.isCrossAreaExit(room, exitNE);
          const crossNW = exitNW && this.isCrossAreaExit(room, exitNW);
          const crossSE = exitSE && this.isCrossAreaExit(room, exitSE);
          const crossSW = exitSW && this.isCrossAreaExit(room, exitSW);

          // Track if room has any cross-area exit
          const hasCrossExit =
            crossN || crossS || crossE || crossW || crossNE || crossNW || crossSE || crossSW;
          if (hasCrossExit) hasCrossAreaExits = true;

          // Helper to get connection char (magenta for cross-area)
          const connChar = (exists: boolean, cross: boolean, char: string) => {
            if (!exists) return ' ';
            return cross ? colorize(char, 'magenta') : char;
          };

          // Top row: NW connection, N connection, NE connection
          topLine.push(connChar(!!exitNW, !!crossNW, '\\'));
          topLine.push(connChar(!!exitN, !!crossN, '|'));
          topLine.push(connChar(!!exitNE, !!crossNE, '/'));

          // Middle row: W connection, room marker, E connection
          midLine.push(connChar(!!exitW, !!crossW, '-'));
          if (isCurrentRoom) {
            midLine.push(colorize('@', 'brightGreen'));
          } else if (hasCrossExit) {
            midLine.push(colorize('*', 'magenta'));
          } else {
            midLine.push(colorize('#', 'white'));
          }
          midLine.push(connChar(!!exitE, !!crossE, '-'));

          // Bottom row: SW connection, S connection, SE connection
          botLine.push(connChar(!!exitSW, !!crossSW, '/'));
          botLine.push(connChar(!!exitS, !!crossS, '|'));
          botLine.push(connChar(!!exitSE, !!crossSE, '\\'));
        } else {
          // Empty cell
          topLine.push('   ');
          midLine.push('   ');
          botLine.push('   ');
        }

        // Add spacing between columns
        if (x < maxX) {
          topLine.push(' ');
          midLine.push(' ');
          botLine.push(' ');
        }
      }

      lines.push(topLine.join(''));
      lines.push(midLine.join(''));
      lines.push(botLine.join(''));
    }

    // Legend
    lines.push('');
    let legend =
      colorize('Legend: ', 'yellow') +
      colorize('@', 'brightGreen') +
      ' = You, ' +
      colorize('#', 'white') +
      ' = Room';
    if (hasCrossAreaExits) {
      legend += ', ' + colorize('*', 'magenta') + ' = Portal';
    }
    lines.push(legend);
    lines.push('');

    return lines.join('\r\n') + '\r\n';
  }
}
