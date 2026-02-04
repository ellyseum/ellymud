/**
 * Unit tests for MapCommand
 * @module command/commands/map.command.test
 */

import { MapCommand } from './map.command';
import { ConnectedClient } from '../../types';
import { createMockUser, createMockClient } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

const mockGetRoom = jest.fn();
const mockGetRoomsByArea = jest.fn();
const mockGetStartingRoomId = jest.fn().mockReturnValue('start');

jest.mock('../../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn().mockReturnValue({
      getRoom: (...args: unknown[]) => mockGetRoom(...args),
      getRoomsByArea: (...args: unknown[]) => mockGetRoomsByArea(...args),
      getStartingRoomId: (...args: unknown[]) => mockGetStartingRoomId(...args),
    }),
  },
}));

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('MapCommand', () => {
  let mapCommand: MapCommand;
  let clients: Map<string, ConnectedClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    clients = new Map();
    mapCommand = new MapCommand(clients);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(mapCommand.name).toBe('map');
    });

    it('should have aliases', () => {
      expect(mapCommand.aliases).toContain('m');
      expect(mapCommand.aliases).toContain('area');
    });

    it('should have a description', () => {
      expect(mapCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should require user to be logged in', () => {
      const client = createMockClient({ user: null });

      mapCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('logged in'));
    });

    it('should show error for invalid location', () => {
      const client = createMockClient({ user: createMockUser() });
      mockGetRoom.mockReturnValue(null);

      mapCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('invalid location')
      );
    });

    it('should show error when room has no area', () => {
      const client = createMockClient({ user: createMockUser() });
      mockGetRoom.mockReturnValue({
        id: 'test-room',
        name: 'Test Room',
        areaId: undefined,
        exits: [],
      });

      mapCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('not part of any area')
      );
    });

    it('should show error when area has no rooms', () => {
      const client = createMockClient({ user: createMockUser() });
      mockGetRoom.mockReturnValue({
        id: 'test-room',
        name: 'Test Room',
        areaId: 'test-area',
        exits: [],
      });
      mockGetRoomsByArea.mockReturnValue([]);

      mapCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('No rooms found')
      );
    });

    it('should show error when rooms have no grid coordinates', () => {
      const client = createMockClient({ user: createMockUser() });
      mockGetRoom.mockReturnValue({
        id: 'test-room',
        name: 'Test Room',
        areaId: 'test-area',
        exits: [],
      });
      mockGetRoomsByArea.mockReturnValue([
        { id: 'room-1', name: 'Room 1', areaId: 'test-area', exits: [] }, // No gridX/gridY
      ]);

      mapCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('map coordinates')
      );
    });

    it('should render map with current room marker', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'room-1' }),
      });
      mockGetRoom.mockReturnValue({
        id: 'room-1',
        name: 'Room 1',
        areaId: 'test-area',
        gridX: 0,
        gridY: 0,
        exits: [],
      });
      mockGetRoomsByArea.mockReturnValue([
        { id: 'room-1', name: 'Room 1', areaId: 'test-area', gridX: 0, gridY: 0, exits: [] },
      ]);

      mapCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Map:'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('@')); // Current room marker
    });

    it('should show connections between rooms', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'room-1' }),
      });
      mockGetRoom.mockReturnValue({
        id: 'room-1',
        name: 'Room 1',
        areaId: 'test-area',
        gridX: 0,
        gridY: 0,
        exits: [{ direction: 'north', roomId: 'room-2' }],
      });
      mockGetRoomsByArea.mockReturnValue([
        {
          id: 'room-1',
          name: 'Room 1',
          areaId: 'test-area',
          gridX: 0,
          gridY: 1,
          exits: [{ direction: 'north', roomId: 'room-2' }],
        },
        {
          id: 'room-2',
          name: 'Room 2',
          areaId: 'test-area',
          gridX: 0,
          gridY: 0,
          exits: [{ direction: 'south', roomId: 'room-1' }],
        },
      ]);

      mapCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('|')); // North/south connection
    });

    it('should allow specifying a different area', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'room-1' }),
      });
      mockGetRoom.mockReturnValue({
        id: 'room-1',
        name: 'Room 1',
        areaId: 'current-area',
        gridX: 0,
        gridY: 0,
        exits: [],
      });
      mockGetRoomsByArea.mockReturnValue([
        {
          id: 'other-room',
          name: 'Other Room',
          areaId: 'other-area',
          gridX: 0,
          gridY: 0,
          exits: [],
        },
      ]);

      mapCommand.execute(client, 'other-area');

      expect(mockGetRoomsByArea).toHaveBeenCalledWith('other-area');
    });

    it('should show legend', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'room-1' }),
      });
      mockGetRoom.mockReturnValue({
        id: 'room-1',
        name: 'Room 1',
        areaId: 'test-area',
        gridX: 0,
        gridY: 0,
        exits: [],
      });
      mockGetRoomsByArea.mockReturnValue([
        { id: 'room-1', name: 'Room 1', areaId: 'test-area', gridX: 0, gridY: 0, exits: [] },
      ]);

      mapCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Legend'));
    });

    it('should handle diagonal exits', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'room-1' }),
      });
      mockGetRoom.mockReturnValue({
        id: 'room-1',
        name: 'Room 1',
        areaId: 'test-area',
        gridX: 0,
        gridY: 0,
        exits: [{ direction: 'northeast', roomId: 'room-2' }],
      });
      mockGetRoomsByArea.mockReturnValue([
        {
          id: 'room-1',
          name: 'Room 1',
          areaId: 'test-area',
          gridX: 0,
          gridY: 1,
          exits: [{ direction: 'northeast', roomId: 'room-2' }],
        },
        {
          id: 'room-2',
          name: 'Room 2',
          areaId: 'test-area',
          gridX: 1,
          gridY: 0,
          exits: [],
        },
      ]);

      mapCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('/')); // NE connection
    });
  });
});
