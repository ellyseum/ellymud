/**
 * Pathfinder utility for finding shortest paths between rooms.
 * Uses BFS (Breadth-First Search) on the room exit graph.
 *
 * @module utils/pathfinder
 */

import { RoomManager } from '../room/roomManager';
import { Room } from '../room/room';

/**
 * Result of a pathfinding operation
 */
export interface PathResult {
  /** Whether a valid path was found */
  found: boolean;
  /** Sequence of directions to follow (e.g., ["north", "east", "south"]) */
  path: string[];
  /** Sequence of room IDs along the path (including start and end) */
  roomIds: string[];
  /** Total number of steps */
  steps: number;
  /** Error message if path not found */
  error?: string;
}

/**
 * Node used internally for BFS traversal
 */
interface BFSNode {
  roomId: string;
  path: string[]; // Directions taken to reach this room
  roomPath: string[]; // Room IDs visited
}

/**
 * Find the shortest path between two rooms using BFS.
 *
 * @param fromRoomId - Starting room ID
 * @param toRoomId - Destination room ID
 * @param roomManager - RoomManager instance for room lookups
 * @param maxSteps - Maximum path length to search (default: 100)
 * @returns PathResult with path or error
 *
 * @example
 * const result = findPath('town-center-room-1', 'town-center-room-5', roomManager);
 * if (result.found) {
 *   console.log(result.path); // ["north", "northeast", "south"]
 * }
 */
export function findPath(
  fromRoomId: string,
  toRoomId: string,
  roomManager: RoomManager,
  maxSteps: number = 100
): PathResult {
  // Validate start room
  const startRoom = roomManager.getRoom(fromRoomId);
  if (!startRoom) {
    return {
      found: false,
      path: [],
      roomIds: [],
      steps: 0,
      error: `Start room '${fromRoomId}' not found`,
    };
  }

  // Validate end room
  const endRoom = roomManager.getRoom(toRoomId);
  if (!endRoom) {
    return {
      found: false,
      path: [],
      roomIds: [],
      steps: 0,
      error: `Destination room '${toRoomId}' not found`,
    };
  }

  // Same room - no path needed
  if (fromRoomId === toRoomId) {
    return {
      found: true,
      path: [],
      roomIds: [fromRoomId],
      steps: 0,
    };
  }

  // BFS initialization
  const visited = new Set<string>();
  const queue: BFSNode[] = [
    {
      roomId: fromRoomId,
      path: [],
      roomPath: [fromRoomId],
    },
  ];
  visited.add(fromRoomId);

  // BFS traversal
  while (queue.length > 0) {
    const current = queue.shift()!;

    // Check max steps
    if (current.path.length >= maxSteps) {
      continue;
    }

    const room = roomManager.getRoom(current.roomId);
    if (!room) continue;

    // Explore all exits
    for (const exit of room.exits) {
      const nextRoomId = exit.roomId;

      // Skip already visited
      if (visited.has(nextRoomId)) continue;

      // Build new path
      const newPath = [...current.path, exit.direction];
      const newRoomPath = [...current.roomPath, nextRoomId];

      // Found destination!
      if (nextRoomId === toRoomId) {
        return {
          found: true,
          path: newPath,
          roomIds: newRoomPath,
          steps: newPath.length,
        };
      }

      // Add to queue for further exploration
      visited.add(nextRoomId);
      queue.push({
        roomId: nextRoomId,
        path: newPath,
        roomPath: newRoomPath,
      });
    }
  }

  // No path found
  return {
    found: false,
    path: [],
    roomIds: [],
    steps: 0,
    error: `No path exists between '${fromRoomId}' and '${toRoomId}'`,
  };
}

/**
 * Find path to a room by name (fuzzy match within area or globally).
 * Useful for "walk to market" style commands.
 *
 * @param fromRoomId - Starting room ID
 * @param targetName - Name or partial name of destination room
 * @param roomManager - RoomManager instance
 * @param preferSameArea - Prefer rooms in the same area (default: true)
 * @returns PathResult with path or error
 */
export function findPathByName(
  fromRoomId: string,
  targetName: string,
  roomManager: RoomManager,
  preferSameArea: boolean = true
): PathResult {
  const startRoom = roomManager.getRoom(fromRoomId);
  if (!startRoom) {
    return {
      found: false,
      path: [],
      roomIds: [],
      steps: 0,
      error: `Start room '${fromRoomId}' not found`,
    };
  }

  const targetLower = targetName.toLowerCase();

  // Helper to check if target matches as a complete word/token in text
  // e.g., "1" matches "Room 1" but not "Room 11"
  const matchesAsWord = (text: string, target: string): boolean => {
    const pattern = new RegExp(
      `(^|[\\s\\-_])${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s\\-_])`,
      'i'
    );
    return pattern.test(text);
  };

  // Helper to find candidates in a room list with match priority
  const findCandidates = (rooms: Room[]): Room[] => {
    // Priority 1: Exact match on name or ID
    const exactMatches = rooms.filter(
      (room) => room.name.toLowerCase() === targetLower || room.id.toLowerCase() === targetLower
    );
    if (exactMatches.length > 0) return exactMatches;

    // Priority 2: Starts-with match (e.g., "room 1" matches "Room 1" but not "Room 10")
    const startsWithMatches = rooms.filter(
      (room) =>
        room.name.toLowerCase().startsWith(targetLower) ||
        room.id.toLowerCase().startsWith(targetLower)
    );
    if (startsWithMatches.length > 0) return startsWithMatches;

    // Priority 3: Ends-with match (e.g., "1" matches "Room 1" but not "Room 11")
    const endsWithMatches = rooms.filter(
      (room) =>
        room.name.toLowerCase().endsWith(targetLower) || room.id.toLowerCase().endsWith(targetLower)
    );
    if (endsWithMatches.length > 0) return endsWithMatches;

    // Priority 4: Word boundary match (target appears as complete word/token)
    // e.g., "market" in "Old Market Square" but not "supermarket"
    const wordMatches = rooms.filter(
      (room) => matchesAsWord(room.name, targetLower) || matchesAsWord(room.id, targetLower)
    );
    if (wordMatches.length > 0) return wordMatches;

    // Priority 5: Contains match (fuzzy)
    return rooms.filter(
      (room) =>
        room.name.toLowerCase().includes(targetLower) || room.id.toLowerCase().includes(targetLower)
    );
  };

  let candidates: Room[] = [];

  // Search same area first if preferred
  if (preferSameArea && startRoom.areaId) {
    const areaRooms = roomManager.getRoomsByArea(startRoom.areaId);
    candidates = findCandidates(areaRooms);
  }

  // Fall back to global search if no matches in area
  if (candidates.length === 0) {
    const allRooms = roomManager.getAllRooms();
    candidates = findCandidates(allRooms);
  }

  if (candidates.length === 0) {
    return {
      found: false,
      path: [],
      roomIds: [],
      steps: 0,
      error: `No room found matching '${targetName}'`,
    };
  }

  // Find shortest path among candidates (excluding current room - they want to GO somewhere)
  let bestResult: PathResult | null = null;

  for (const candidate of candidates) {
    // Skip current room - user wants to walk TO a destination, not stay put
    if (candidate.id === fromRoomId) continue;

    const result = findPath(fromRoomId, candidate.id, roomManager);
    if (result.found) {
      if (!bestResult || result.steps < bestResult.steps) {
        bestResult = result;
      }
    }
  }

  // If all candidates were the current room, report "already there"
  if (!bestResult && candidates.length === 1 && candidates[0].id === fromRoomId) {
    return {
      found: true,
      path: [],
      roomIds: [fromRoomId],
      steps: 0,
    };
  }

  if (!bestResult) {
    return {
      found: false,
      path: [],
      roomIds: [],
      steps: 0,
      error: `No reachable room found matching '${targetName}'`,
    };
  }

  return bestResult;
}

/**
 * Check if two rooms are connected (any path exists).
 * Faster than findPath when you only need connectivity.
 */
export function areRoomsConnected(
  roomId1: string,
  roomId2: string,
  roomManager: RoomManager,
  maxSteps: number = 100
): boolean {
  const result = findPath(roomId1, roomId2, roomManager, maxSteps);
  return result.found;
}

/**
 * Get all rooms reachable from a starting room within N steps.
 * Useful for familiar companion range checking.
 */
export function getReachableRooms(
  fromRoomId: string,
  roomManager: RoomManager,
  maxSteps: number
): Map<string, number> {
  const reachable = new Map<string, number>(); // roomId -> distance
  const visited = new Set<string>();
  const queue: { roomId: string; distance: number }[] = [{ roomId: fromRoomId, distance: 0 }];
  visited.add(fromRoomId);
  reachable.set(fromRoomId, 0);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.distance >= maxSteps) continue;

    const room = roomManager.getRoom(current.roomId);
    if (!room) continue;

    for (const exit of room.exits) {
      if (!visited.has(exit.roomId)) {
        visited.add(exit.roomId);
        const newDistance = current.distance + 1;
        reachable.set(exit.roomId, newDistance);
        queue.push({ roomId: exit.roomId, distance: newDistance });
      }
    }
  }

  return reachable;
}
