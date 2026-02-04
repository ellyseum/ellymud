/**
 * Unit tests for pathfinder utility
 * @module utils/pathfinder.test
 */

import { findPath, findPathByName, areRoomsConnected, getReachableRooms } from './pathfinder';
import { RoomManager } from '../room/roomManager';
import { Room } from '../room/room';

// Mock RoomManager
const createMockRoomManager = (rooms: Map<string, Partial<Room>>) => {
  return {
    getRoom: jest.fn((id: string) => rooms.get(id) as Room | undefined),
    getAllRooms: jest.fn(() => Array.from(rooms.values()) as Room[]),
    getRoomsByArea: jest.fn(
      (areaId: string) => Array.from(rooms.values()).filter((r) => r.areaId === areaId) as Room[]
    ),
  } as unknown as RoomManager;
};

describe('pathfinder', () => {
  describe('findPath', () => {
    it('should return found: true with empty path for same room', () => {
      const rooms = new Map([['room-1', { id: 'room-1', name: 'Room 1', exits: [] }]]);
      const rm = createMockRoomManager(rooms);

      const result = findPath('room-1', 'room-1', rm);

      expect(result.found).toBe(true);
      expect(result.path).toEqual([]);
      expect(result.roomIds).toEqual(['room-1']);
      expect(result.steps).toBe(0);
    });

    it('should find direct neighbor path', () => {
      const rooms = new Map([
        [
          'room-1',
          { id: 'room-1', name: 'Room 1', exits: [{ direction: 'north', roomId: 'room-2' }] },
        ],
        [
          'room-2',
          { id: 'room-2', name: 'Room 2', exits: [{ direction: 'south', roomId: 'room-1' }] },
        ],
      ]);
      const rm = createMockRoomManager(rooms);

      const result = findPath('room-1', 'room-2', rm);

      expect(result.found).toBe(true);
      expect(result.path).toEqual(['north']);
      expect(result.roomIds).toEqual(['room-1', 'room-2']);
      expect(result.steps).toBe(1);
    });

    it('should find multi-step path', () => {
      const rooms = new Map([
        [
          'room-1',
          { id: 'room-1', name: 'Room 1', exits: [{ direction: 'north', roomId: 'room-2' }] },
        ],
        [
          'room-2',
          { id: 'room-2', name: 'Room 2', exits: [{ direction: 'east', roomId: 'room-3' }] },
        ],
        ['room-3', { id: 'room-3', name: 'Room 3', exits: [] }],
      ]);
      const rm = createMockRoomManager(rooms);

      const result = findPath('room-1', 'room-3', rm);

      expect(result.found).toBe(true);
      expect(result.path).toEqual(['north', 'east']);
      expect(result.steps).toBe(2);
    });

    it('should return error for invalid start room', () => {
      const rooms = new Map([['room-1', { id: 'room-1', name: 'Room 1', exits: [] }]]);
      const rm = createMockRoomManager(rooms);

      const result = findPath('invalid', 'room-1', rm);

      expect(result.found).toBe(false);
      expect(result.error).toContain('Start room');
    });

    it('should return error for invalid destination room', () => {
      const rooms = new Map([['room-1', { id: 'room-1', name: 'Room 1', exits: [] }]]);
      const rm = createMockRoomManager(rooms);

      const result = findPath('room-1', 'invalid', rm);

      expect(result.found).toBe(false);
      expect(result.error).toContain('Destination room');
    });

    it('should return error when no path exists', () => {
      const rooms = new Map([
        ['room-1', { id: 'room-1', name: 'Room 1', exits: [] }],
        ['room-2', { id: 'room-2', name: 'Room 2', exits: [] }],
      ]);
      const rm = createMockRoomManager(rooms);

      const result = findPath('room-1', 'room-2', rm);

      expect(result.found).toBe(false);
      expect(result.error).toContain('No path exists');
    });

    it('should respect maxSteps limit', () => {
      const rooms = new Map([
        [
          'room-1',
          { id: 'room-1', name: 'Room 1', exits: [{ direction: 'north', roomId: 'room-2' }] },
        ],
        [
          'room-2',
          { id: 'room-2', name: 'Room 2', exits: [{ direction: 'north', roomId: 'room-3' }] },
        ],
        ['room-3', { id: 'room-3', name: 'Room 3', exits: [] }],
      ]);
      const rm = createMockRoomManager(rooms);

      const result = findPath('room-1', 'room-3', rm, 1);

      expect(result.found).toBe(false);
    });

    it('should handle one-way exits correctly', () => {
      const rooms = new Map([
        [
          'room-1',
          { id: 'room-1', name: 'Room 1', exits: [{ direction: 'north', roomId: 'room-2' }] },
        ],
        ['room-2', { id: 'room-2', name: 'Room 2', exits: [] }], // No exit back
      ]);
      const rm = createMockRoomManager(rooms);

      // Can go from 1 to 2
      const forward = findPath('room-1', 'room-2', rm);
      expect(forward.found).toBe(true);

      // Cannot go from 2 to 1
      const backward = findPath('room-2', 'room-1', rm);
      expect(backward.found).toBe(false);
    });

    it('should handle diagonal directions', () => {
      const rooms = new Map([
        [
          'room-1',
          { id: 'room-1', name: 'Room 1', exits: [{ direction: 'northeast', roomId: 'room-2' }] },
        ],
        ['room-2', { id: 'room-2', name: 'Room 2', exits: [] }],
      ]);
      const rm = createMockRoomManager(rooms);

      const result = findPath('room-1', 'room-2', rm);

      expect(result.found).toBe(true);
      expect(result.path).toEqual(['northeast']);
    });

    it('should find shortest path when multiple paths exist', () => {
      // Room layout:
      // room-1 --north--> room-2 --east--> room-3
      // room-1 --east--> room-3 (shorter)
      const rooms = new Map([
        [
          'room-1',
          {
            id: 'room-1',
            name: 'Room 1',
            exits: [
              { direction: 'north', roomId: 'room-2' },
              { direction: 'east', roomId: 'room-3' },
            ],
          },
        ],
        [
          'room-2',
          { id: 'room-2', name: 'Room 2', exits: [{ direction: 'east', roomId: 'room-3' }] },
        ],
        ['room-3', { id: 'room-3', name: 'Room 3', exits: [] }],
      ]);
      const rm = createMockRoomManager(rooms);

      const result = findPath('room-1', 'room-3', rm);

      expect(result.found).toBe(true);
      expect(result.steps).toBe(1);
      expect(result.path).toEqual(['east']);
    });
  });

  describe('findPathByName', () => {
    it('should find room by name', () => {
      const rooms = new Map([
        [
          'room-1',
          {
            id: 'room-1',
            name: 'Town Square',
            areaId: 'town',
            exits: [{ direction: 'north', roomId: 'room-2' }],
          },
        ],
        ['room-2', { id: 'room-2', name: 'Market', areaId: 'town', exits: [] }],
      ]);
      const rm = createMockRoomManager(rooms);

      const result = findPathByName('room-1', 'Market', rm);

      expect(result.found).toBe(true);
      expect(result.path).toEqual(['north']);
    });

    it('should find room by partial name match', () => {
      const rooms = new Map([
        [
          'room-1',
          {
            id: 'room-1',
            name: 'Town Square',
            areaId: 'town',
            exits: [{ direction: 'north', roomId: 'room-2' }],
          },
        ],
        ['room-2', { id: 'room-2', name: 'Busy Market Plaza', areaId: 'town', exits: [] }],
      ]);
      const rm = createMockRoomManager(rooms);

      const result = findPathByName('room-1', 'market', rm);

      expect(result.found).toBe(true);
    });

    it('should find room by ID', () => {
      const rooms = new Map([
        [
          'room-1',
          {
            id: 'room-1',
            name: 'Town Square',
            areaId: 'town',
            exits: [{ direction: 'north', roomId: 'special-room' }],
          },
        ],
        ['special-room', { id: 'special-room', name: 'A Room', areaId: 'town', exits: [] }],
      ]);
      const rm = createMockRoomManager(rooms);

      const result = findPathByName('room-1', 'special-room', rm);

      expect(result.found).toBe(true);
    });

    it('should prefer rooms in same area', () => {
      const rooms = new Map([
        [
          'room-1',
          {
            id: 'room-1',
            name: 'Start',
            areaId: 'town',
            exits: [
              { direction: 'north', roomId: 'town-market' },
              { direction: 'south', roomId: 'forest-market' },
            ],
          },
        ],
        ['town-market', { id: 'town-market', name: 'Market', areaId: 'town', exits: [] }],
        ['forest-market', { id: 'forest-market', name: 'Market', areaId: 'forest', exits: [] }],
      ]);
      const rm = createMockRoomManager(rooms);

      const result = findPathByName('room-1', 'market', rm, true);

      expect(result.found).toBe(true);
      expect(result.path).toEqual(['north']); // Town market (same area)
    });

    it('should return error for no matching room', () => {
      const rooms = new Map([['room-1', { id: 'room-1', name: 'Start', exits: [] }]]);
      const rm = createMockRoomManager(rooms);

      const result = findPathByName('room-1', 'nonexistent', rm);

      expect(result.found).toBe(false);
      expect(result.error).toContain('No room found');
    });

    it('should return error for unreachable matching room', () => {
      const rooms = new Map([
        ['room-1', { id: 'room-1', name: 'Start', areaId: 'town', exits: [] }],
        ['room-2', { id: 'room-2', name: 'Market', areaId: 'town', exits: [] }],
      ]);
      const rm = createMockRoomManager(rooms);

      const result = findPathByName('room-1', 'market', rm);

      expect(result.found).toBe(false);
      expect(result.error).toContain('No reachable room');
    });

    it('should match "1" to "Room 1" not "Room 11" (ends-with priority)', () => {
      // Rooms with similar numeric suffixes
      const rooms = new Map([
        [
          'start',
          {
            id: 'start',
            name: 'Start',
            areaId: 'test',
            exits: [
              { direction: 'north', roomId: 'room-1' },
              { direction: 'east', roomId: 'room-11' },
            ],
          },
        ],
        ['room-1', { id: 'room-1', name: 'Room 1', areaId: 'test', exits: [] }],
        ['room-11', { id: 'room-11', name: 'Room 11', areaId: 'test', exits: [] }],
      ]);
      const rm = createMockRoomManager(rooms);

      // "1" should match "Room 1" (ends with "1") not "Room 11" (ends with "11")
      const result = findPathByName('start', '1', rm);

      expect(result.found).toBe(true);
      expect(result.path).toEqual(['north']); // Path to Room 1, not Room 11
    });

    it('should match "2" to "Room 2" not "Room 12" (ends-with priority)', () => {
      const rooms = new Map([
        [
          'start',
          {
            id: 'start',
            name: 'Start',
            areaId: 'test',
            exits: [
              { direction: 'north', roomId: 'room-2' },
              { direction: 'east', roomId: 'room-12' },
            ],
          },
        ],
        ['room-2', { id: 'room-2', name: 'Room 2', areaId: 'test', exits: [] }],
        ['room-12', { id: 'room-12', name: 'Room 12', areaId: 'test', exits: [] }],
      ]);
      const rm = createMockRoomManager(rooms);

      const result = findPathByName('start', '2', rm);

      expect(result.found).toBe(true);
      expect(result.path).toEqual(['north']); // Path to Room 2, not Room 12
    });

    it('should match "Room 1" exactly over "Room 10"', () => {
      const rooms = new Map([
        [
          'start',
          {
            id: 'start',
            name: 'Start',
            areaId: 'test',
            exits: [
              { direction: 'north', roomId: 'room-1' },
              { direction: 'east', roomId: 'room-10' },
            ],
          },
        ],
        ['room-1', { id: 'room-1', name: 'Room 1', areaId: 'test', exits: [] }],
        ['room-10', { id: 'room-10', name: 'Room 10', areaId: 'test', exits: [] }],
      ]);
      const rm = createMockRoomManager(rooms);

      const result = findPathByName('start', 'room 1', rm);

      expect(result.found).toBe(true);
      expect(result.path).toEqual(['north']); // Room 1, not Room 10
    });
  });

  describe('areRoomsConnected', () => {
    it('should return true for connected rooms', () => {
      const rooms = new Map([
        ['room-1', { id: 'room-1', exits: [{ direction: 'north', roomId: 'room-2' }] }],
        ['room-2', { id: 'room-2', exits: [] }],
      ]);
      const rm = createMockRoomManager(rooms);

      expect(areRoomsConnected('room-1', 'room-2', rm)).toBe(true);
    });

    it('should return false for disconnected rooms', () => {
      const rooms = new Map([
        ['room-1', { id: 'room-1', exits: [] }],
        ['room-2', { id: 'room-2', exits: [] }],
      ]);
      const rm = createMockRoomManager(rooms);

      expect(areRoomsConnected('room-1', 'room-2', rm)).toBe(false);
    });

    it('should return true for same room', () => {
      const rooms = new Map([['room-1', { id: 'room-1', exits: [] }]]);
      const rm = createMockRoomManager(rooms);

      expect(areRoomsConnected('room-1', 'room-1', rm)).toBe(true);
    });
  });

  describe('getReachableRooms', () => {
    it('should return all reachable rooms within range', () => {
      const rooms = new Map([
        ['room-1', { id: 'room-1', exits: [{ direction: 'north', roomId: 'room-2' }] }],
        ['room-2', { id: 'room-2', exits: [{ direction: 'north', roomId: 'room-3' }] }],
        ['room-3', { id: 'room-3', exits: [] }],
      ]);
      const rm = createMockRoomManager(rooms);

      const reachable = getReachableRooms('room-1', rm, 2);

      expect(reachable.size).toBe(3);
      expect(reachable.get('room-1')).toBe(0);
      expect(reachable.get('room-2')).toBe(1);
      expect(reachable.get('room-3')).toBe(2);
    });

    it('should respect maxSteps limit', () => {
      const rooms = new Map([
        ['room-1', { id: 'room-1', exits: [{ direction: 'north', roomId: 'room-2' }] }],
        ['room-2', { id: 'room-2', exits: [{ direction: 'north', roomId: 'room-3' }] }],
        ['room-3', { id: 'room-3', exits: [] }],
      ]);
      const rm = createMockRoomManager(rooms);

      const reachable = getReachableRooms('room-1', rm, 1);

      expect(reachable.size).toBe(2);
      expect(reachable.has('room-1')).toBe(true);
      expect(reachable.has('room-2')).toBe(true);
      expect(reachable.has('room-3')).toBe(false);
    });

    it('should include starting room at distance 0', () => {
      const rooms = new Map([['room-1', { id: 'room-1', exits: [] }]]);
      const rm = createMockRoomManager(rooms);

      const reachable = getReachableRooms('room-1', rm, 5);

      expect(reachable.get('room-1')).toBe(0);
    });
  });
});
