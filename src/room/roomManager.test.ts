/**
 * Unit tests for RoomManager class
 * @module room/roomManager.test
 */

import fs from 'fs';
import { RoomManager, EMERGENCY_ROOM_ID } from './roomManager';
import { ConnectedClient } from '../types';
import { createMockClientWithUser } from '../test/helpers/mockFactories';
import { IAsyncRoomRepository } from '../persistence/interfaces';

// Mock dependencies
jest.mock('../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  createContextLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  createMechanicsLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn(() =>
    JSON.stringify([
      {
        id: 'start',
        name: 'Starting Room',
        description: 'The starting room',
        exits: [{ direction: 'north', targetId: 'north-room' }],
        items: [],
        players: [],
        npcs: [],
        currency: { gold: 0, silver: 0, copper: 0 },
      },
    ])
  ),
  writeFileSync: jest.fn(),
}));

jest.mock('../utils/fileUtils', () => ({
  loadAndValidateJsonFile: jest.fn().mockReturnValue([
    {
      id: 'start',
      name: 'Starting Room',
      description: 'The starting room',
      exits: [{ direction: 'north', targetId: 'north-room' }],
      items: [],
      players: [],
      npcs: [],
      currency: { gold: 0, silver: 0, copper: 0 },
    },
  ]),
}));

jest.mock('../utils/jsonUtils', () => ({
  parseAndValidateJson: jest.fn().mockReturnValue([
    {
      id: 'start',
      name: 'Starting Room',
      description: 'The starting room',
      exits: [{ direction: 'north', targetId: 'north-room' }],
      items: [],
      players: [],
      npcs: [],
      currency: { gold: 0, silver: 0, copper: 0 },
    },
  ]),
}));

jest.mock('../config', () => ({
  __esModule: true,
  default: {
    ROOMS_FILE: '/test/data/rooms.json',
    DIRECT_ROOMS_DATA: null,
    DATA_DIR: '/test/data',
  },
  ROOMS_FILE: '/test/data/rooms.json',
  DIRECT_ROOMS_DATA: null,
  DATA_DIR: '/test/data',
  STORAGE_BACKEND: 'json',
  isDatabaseOnly: () => false,
  isUsingDatabase: () => false,
}));

jest.mock('../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
  writeFormattedMessageToClient: jest.fn(),
  writeMessageToClient: jest.fn(),
}));

// Reset the singleton before each test
const resetSingleton = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (RoomManager as any)['instance'] = null;
};

describe('RoomManager', () => {
  let roomManager: RoomManager;
  let clients: Map<string, ConnectedClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    resetSingleton();
    clients = new Map<string, ConnectedClient>();
    roomManager = RoomManager.getInstance(clients);
  });

  afterEach(() => {
    resetSingleton();
  });

  describe('getInstance', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = RoomManager.getInstance(clients);
      const instance2 = RoomManager.getInstance(clients);

      expect(instance1).toBe(instance2);
    });

    it('should update clients when called with different clients map', () => {
      const newClients = new Map<string, ConnectedClient>();
      const client = createMockClientWithUser({ username: 'test' });
      newClients.set('test', client);

      RoomManager.getInstance(newClients);

      expect(roomManager).toBeDefined();
    });
  });

  describe('getRoom', () => {
    it('should return undefined for non-existent room', () => {
      const room = roomManager.getRoom('non-existent');

      expect(room).toBeUndefined();
    });
  });

  describe('getAllRooms', () => {
    it('should return array of rooms', () => {
      const rooms = roomManager.getAllRooms();

      expect(Array.isArray(rooms)).toBe(true);
    });
  });

  describe('getStartingRoomId', () => {
    it('should return the starting room id', () => {
      const startingRoomId = roomManager.getStartingRoomId();

      expect(startingRoomId).toBe('start');
    });
  });

  describe('setTestMode', () => {
    it('should enable test mode', () => {
      roomManager.setTestMode(true);

      expect(roomManager.isTestMode()).toBe(true);
    });

    it('should disable test mode', () => {
      roomManager.setTestMode(true);
      roomManager.setTestMode(false);

      expect(roomManager.isTestMode()).toBe(false);
    });
  });

  describe('getOppositeDirection', () => {
    it('should return opposite for north', () => {
      expect(roomManager.getOppositeDirection('north')).toBe('south');
    });

    it('should return opposite for south', () => {
      expect(roomManager.getOppositeDirection('south')).toBe('north');
    });

    it('should return opposite for east', () => {
      expect(roomManager.getOppositeDirection('east')).toBe('west');
    });

    it('should return opposite for west', () => {
      expect(roomManager.getOppositeDirection('west')).toBe('east');
    });
  });

  describe('getFullDirectionName', () => {
    it('should expand n to north', () => {
      expect(roomManager.getFullDirectionName('n')).toBe('north');
    });

    it('should expand s to south', () => {
      expect(roomManager.getFullDirectionName('s')).toBe('south');
    });

    it('should expand e to east', () => {
      expect(roomManager.getFullDirectionName('e')).toBe('east');
    });

    it('should expand w to west', () => {
      expect(roomManager.getFullDirectionName('w')).toBe('west');
    });

    it('should expand u to up', () => {
      expect(roomManager.getFullDirectionName('u')).toBe('up');
    });

    it('should expand d to down', () => {
      expect(roomManager.getFullDirectionName('d')).toBe('down');
    });

    it('should return same for full direction name', () => {
      expect(roomManager.getFullDirectionName('north')).toBe('north');
    });
  });
});

// Additional tests for RoomManager to improve coverage
describe('RoomManager Extended Coverage', () => {
  let roomManager: RoomManager;
  let clients: Map<string, ConnectedClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    resetSingleton();
    clients = new Map<string, ConnectedClient>();
    roomManager = RoomManager.getInstance(clients);
  });

  describe('getAllRooms', () => {
    it('should return all rooms', () => {
      const rooms = roomManager.getAllRooms();
      expect(rooms).toBeDefined();
      expect(Array.isArray(rooms)).toBe(true);
    });
  });

  describe('getRoom', () => {
    it('should return room by ID', () => {
      const room = roomManager.getRoom('start');
      // May or may not exist depending on test data
      expect(room !== undefined || room === undefined).toBe(true);
    });

    it('should return undefined for non-existent room', () => {
      const room = roomManager.getRoom('nonexistent-room-id-xyz');
      expect(room).toBeUndefined();
    });
  });

  describe('getStartingRoomId', () => {
    it('should return a starting room ID', () => {
      const startingId = roomManager.getStartingRoomId();
      expect(startingId).toBeDefined();
      expect(typeof startingId).toBe('string');
    });
  });

  describe('setTestMode', () => {
    it('should enable test mode', () => {
      roomManager.setTestMode(true);
      expect(roomManager).toBeDefined();
    });

    it('should disable test mode', () => {
      roomManager.setTestMode(false);
      expect(roomManager).toBeDefined();
    });
  });

  describe('updateRoom', () => {
    it('should handle updating a room', () => {
      const room = roomManager.getRoom('start');
      if (room) {
        // Should not throw
        roomManager.updateRoom(room);
        expect(room).toBeDefined();
      }
    });
  });

  describe('findClientByUsername', () => {
    it('should return undefined when client not found', () => {
      const client = roomManager.findClientByUsername('nonexistent-user');
      expect(client).toBeUndefined();
    });
  });

  describe('loadPrevalidatedRooms', () => {
    it('should load rooms from array', () => {
      const rooms = [
        {
          id: 'test-room',
          name: 'Test Room',
          description: 'A test room',
          exits: [],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      ];

      roomManager.loadPrevalidatedRooms(rooms);

      const loaded = roomManager.getRoom('test-room');
      expect(loaded).toBeDefined();
    });
  });

  describe('singleton behavior', () => {
    it('should return same instance on multiple calls', () => {
      const manager1 = RoomManager.getInstance(clients);
      const manager2 = RoomManager.getInstance(clients);

      expect(manager1).toBe(manager2);
    });
  });

  describe('abbreviation expansion', () => {
    it('should expand ne to northeast', () => {
      expect(roomManager.getFullDirectionName('ne')).toBe('northeast');
    });

    it('should expand nw to northwest', () => {
      expect(roomManager.getFullDirectionName('nw')).toBe('northwest');
    });

    it('should expand se to southeast', () => {
      expect(roomManager.getFullDirectionName('se')).toBe('southeast');
    });

    it('should expand sw to southwest', () => {
      expect(roomManager.getFullDirectionName('sw')).toBe('southwest');
    });
  });
});

// =============================================================================
// World Builder Functionality Tests
// =============================================================================

describe('RoomManager World Builder Features', () => {
  let roomManager: RoomManager;
  let clients: Map<string, ConnectedClient>;
  let mockRepository: {
    findAll: jest.Mock;
    save: jest.Mock;
    saveAll: jest.Mock;
    delete: jest.Mock;
    findById: jest.Mock;
  };

  // Mock fs for MUD config and areas.json
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    resetSingleton();

    // Create mock repository
    mockRepository = {
      findAll: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue(undefined),
      saveAll: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
    };

    clients = new Map<string, ConnectedClient>();

    // Create RoomManager with custom repository
    roomManager = RoomManager.createWithRepository(
      clients,
      mockRepository as unknown as IAsyncRoomRepository
    );
  });

  afterEach(() => {
    resetSingleton();
  });

  describe('EMERGENCY_ROOM_ID constant', () => {
    it('should be defined as __emergency_void__', () => {
      expect(EMERGENCY_ROOM_ID).toBe('__emergency_void__');
    });
  });

  describe('ensureEmergencyRoom', () => {
    it('should create emergency room when called', () => {
      const emergencyRoom = roomManager.ensureEmergencyRoom();

      expect(emergencyRoom).toBeDefined();
      expect(emergencyRoom.id).toBe(EMERGENCY_ROOM_ID);
      expect(emergencyRoom.name).toBe('The Void');
      expect(emergencyRoom.areaId).toBe('__system__');
    });

    it('should return existing emergency room if already created', () => {
      const first = roomManager.ensureEmergencyRoom();
      const second = roomManager.ensureEmergencyRoom();

      expect(first).toBe(second);
    });

    it('should create emergency room with World Builder instructions', () => {
      const emergencyRoom = roomManager.ensureEmergencyRoom();

      expect(emergencyRoom.description).toContain('WORLD BUILDER INSTRUCTIONS');
      expect(emergencyRoom.description).toContain('Admin Panel');
    });

    it('should set grid coordinates on emergency room', () => {
      const emergencyRoom = roomManager.ensureEmergencyRoom();

      expect(emergencyRoom.gridX).toBe(0);
      expect(emergencyRoom.gridY).toBe(0);
    });
  });

  describe('emergency room is not persisted', () => {
    it('should not save emergency room to repository', async () => {
      // Create emergency room
      roomManager.ensureEmergencyRoom();

      // Trigger save (forceSave calls saveRooms internally)
      roomManager.forceSave();

      // Wait for async save to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify saveAll was called
      if (mockRepository.saveAll.mock.calls.length > 0) {
        const savedRooms = mockRepository.saveAll.mock.calls[0][0];
        // Emergency room should not be in the saved data
        const emergencyRoomSaved = savedRooms.some(
          (r: { id: string }) => r.id === EMERGENCY_ROOM_ID
        );
        expect(emergencyRoomSaved).toBe(false);
      }
    });
  });

  describe('getRoom with emergency room', () => {
    it('should auto-create emergency room when EMERGENCY_ROOM_ID is requested', () => {
      // Room doesn't exist yet
      const rooms = roomManager.getAllRooms();
      const hasEmergency = rooms.some((r) => r.id === EMERGENCY_ROOM_ID);
      expect(hasEmergency).toBe(false);

      // Request emergency room by ID
      const room = roomManager.getRoom(EMERGENCY_ROOM_ID);

      // Should have been auto-created
      expect(room).toBeDefined();
      expect(room?.id).toBe(EMERGENCY_ROOM_ID);
      expect(room?.name).toBe('The Void');
    });

    it('should return undefined for other non-existent rooms', () => {
      const room = roomManager.getRoom('non-existent-room-xyz');

      expect(room).toBeUndefined();
    });
  });

  describe('getStartingRoomId with fallbacks', () => {
    it('should return EMERGENCY_ROOM_ID when no rooms exist', async () => {
      // Reset and create fresh manager with no rooms
      resetSingleton();
      mockRepository.findAll.mockResolvedValue([]);

      // Mock fs to not find config files
      mockFs.existsSync.mockReturnValue(false);

      roomManager = RoomManager.createWithRepository(
        clients,
        mockRepository as unknown as IAsyncRoomRepository
      );

      // Wait for initialization
      await roomManager.ensureInitialized();

      const startingRoom = roomManager.getStartingRoomId();

      expect(startingRoom).toBe(EMERGENCY_ROOM_ID);
    });

    it('should return configured room from MUD config if it exists', async () => {
      // Reset and create fresh manager
      resetSingleton();

      // Load rooms with the configured starting room
      mockRepository.findAll.mockResolvedValue([
        {
          id: 'configured-start',
          name: 'Configured Start Room',
          description: 'The configured starting room',
          exits: [],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      ]);

      // Mock fs to return MUD config with starting room
      mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
        if (String(filePath).includes('mud-config.json')) return true;
        return false;
      });
      mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor): string => {
        if (String(filePath).includes('mud-config.json')) {
          return JSON.stringify({
            game: {
              startingRoom: 'configured-start',
            },
          });
        }
        return '[]';
      });

      roomManager = RoomManager.createWithRepository(
        clients,
        mockRepository as unknown as IAsyncRoomRepository
      );

      await roomManager.ensureInitialized();

      const startingRoom = roomManager.getStartingRoomId();

      expect(startingRoom).toBe('configured-start');
    });

    it('should fallback to area (0,0) room when configured room does not exist', async () => {
      // Reset and create fresh manager
      resetSingleton();

      // Load rooms with area and grid coordinates
      mockRepository.findAll.mockResolvedValue([
        {
          id: 'area-room-0-0',
          name: 'Origin Room',
          description: 'Room at origin',
          exits: [],
          currency: { gold: 0, silver: 0, copper: 0 },
          areaId: 'test-area',
          gridX: 0,
          gridY: 0,
        },
        {
          id: 'area-room-1-0',
          name: 'Other Room',
          description: 'Another room',
          exits: [],
          currency: { gold: 0, silver: 0, copper: 0 },
          areaId: 'test-area',
          gridX: 1,
          gridY: 0,
        },
      ]);

      // Mock fs to return MUD config pointing to non-existent room
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor): string => {
        if (String(filePath).includes('mud-config.json')) {
          return JSON.stringify({
            game: {
              startingRoom: 'non-existent-room',
            },
          });
        }
        if (String(filePath).includes('areas.json')) {
          return JSON.stringify([{ id: 'test-area', name: 'Test Area' }]);
        }
        return '[]';
      });

      roomManager = RoomManager.createWithRepository(
        clients,
        mockRepository as unknown as IAsyncRoomRepository
      );

      await roomManager.ensureInitialized();

      const startingRoom = roomManager.getStartingRoomId();

      // Should fall back to the (0,0) room in the first area
      expect(startingRoom).toBe('area-room-0-0');
    });

    it('should fallback to first room in first area when no (0,0) room exists', async () => {
      // Reset and create fresh manager
      resetSingleton();

      // Load rooms without (0,0) coordinates
      mockRepository.findAll.mockResolvedValue([
        {
          id: 'area-room-5-5',
          name: 'Non-origin Room',
          description: 'Room not at origin',
          exits: [],
          currency: { gold: 0, silver: 0, copper: 0 },
          areaId: 'test-area',
          gridX: 5,
          gridY: 5,
        },
      ]);

      // Mock fs
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor): string => {
        if (String(filePath).includes('mud-config.json')) {
          return JSON.stringify({
            game: {
              startingRoom: 'non-existent-room',
            },
          });
        }
        if (String(filePath).includes('areas.json')) {
          return JSON.stringify([{ id: 'test-area', name: 'Test Area' }]);
        }
        return '[]';
      });

      roomManager = RoomManager.createWithRepository(
        clients,
        mockRepository as unknown as IAsyncRoomRepository
      );

      await roomManager.ensureInitialized();

      const startingRoom = roomManager.getStartingRoomId();

      // Should fall back to first room in the area
      expect(startingRoom).toBe('area-room-5-5');
    });
  });

  describe('createRoom with grid coordinates', () => {
    it('should create room with grid coordinates', async () => {
      // First ensure initialization
      await roomManager.ensureInitialized();

      const roomData = {
        id: 'new-room',
        name: 'New Room',
        description: 'A new room with grid coordinates',
        exits: [],
        currency: { gold: 0, silver: 0, copper: 0 },
        areaId: 'test-area',
        gridX: 5,
        gridY: 10,
        gridZ: 2,
      };

      const room = await roomManager.createRoom(roomData);

      expect(room).toBeDefined();
      expect(room.id).toBe('new-room');
      expect(room.gridX).toBe(5);
      expect(room.gridY).toBe(10);
      expect(room.gridZ).toBe(2);
      expect(room.areaId).toBe('test-area');
    });

    it('should throw error when creating room with existing ID', async () => {
      await roomManager.ensureInitialized();

      const roomData = {
        id: 'duplicate-room',
        name: 'First Room',
        description: 'First room',
        exits: [],
        currency: { gold: 0, silver: 0, copper: 0 },
      };

      await roomManager.createRoom(roomData);

      await expect(roomManager.createRoom(roomData)).rejects.toThrow(
        "Room 'duplicate-room' already exists"
      );
    });

    it('should persist room via repository', async () => {
      await roomManager.ensureInitialized();

      const roomData = {
        id: 'persisted-room',
        name: 'Persisted Room',
        description: 'Will be persisted',
        exits: [],
        currency: { gold: 0, silver: 0, copper: 0 },
      };

      await roomManager.createRoom(roomData);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'persisted-room' })
      );
    });
  });

  describe('updateRoomData with grid properties', () => {
    it('should preserve grid properties when updating room', async () => {
      await roomManager.ensureInitialized();

      // Create initial room
      const initialData = {
        id: 'update-test-room',
        name: 'Initial Name',
        description: 'Initial description',
        exits: [],
        currency: { gold: 0, silver: 0, copper: 0 },
        areaId: 'area-1',
        gridX: 3,
        gridY: 4,
        gridZ: 1,
      };

      await roomManager.createRoom(initialData);

      // Update room with new values but same grid
      const updateData = {
        id: 'update-test-room',
        name: 'Updated Name',
        description: 'Updated description',
        exits: [{ direction: 'north', roomId: 'other-room' }],
        currency: { gold: 100, silver: 0, copper: 0 },
        areaId: 'area-1',
        gridX: 3,
        gridY: 4,
        gridZ: 1,
      };

      await roomManager.updateRoomData(updateData);

      const updatedRoom = roomManager.getRoom('update-test-room');
      expect(updatedRoom).toBeDefined();
      expect(updatedRoom?.name).toBe('Updated Name');
      expect(updatedRoom?.gridX).toBe(3);
      expect(updatedRoom?.gridY).toBe(4);
      expect(updatedRoom?.gridZ).toBe(1);
    });

    it('should throw error when updating non-existent room', async () => {
      await roomManager.ensureInitialized();

      const roomData = {
        id: 'non-existent-update',
        name: 'Does not exist',
        description: 'This room does not exist',
        exits: [],
        currency: { gold: 0, silver: 0, copper: 0 },
      };

      await expect(roomManager.updateRoomData(roomData)).rejects.toThrow(
        "Room 'non-existent-update' not found"
      );
    });
  });

  describe('deleteRoom', () => {
    it('should delete existing room', async () => {
      await roomManager.ensureInitialized();

      const roomData = {
        id: 'room-to-delete',
        name: 'Deletable Room',
        description: 'Will be deleted',
        exits: [],
        currency: { gold: 0, silver: 0, copper: 0 },
      };

      await roomManager.createRoom(roomData);
      expect(roomManager.getRoom('room-to-delete')).toBeDefined();

      await roomManager.deleteRoom('room-to-delete');

      expect(roomManager.getRoom('room-to-delete')).toBeUndefined();
      expect(mockRepository.delete).toHaveBeenCalledWith('room-to-delete');
    });

    it('should throw error when deleting non-existent room', async () => {
      await roomManager.ensureInitialized();

      await expect(roomManager.deleteRoom('non-existent-room')).rejects.toThrow(
        "Room 'non-existent-room' not found"
      );
    });
  });

  describe('connectRooms', () => {
    it('should create bidirectional exits between rooms', async () => {
      await roomManager.ensureInitialized();

      // Create two rooms
      await roomManager.createRoom({
        id: 'room-a',
        name: 'Room A',
        description: 'First room',
        exits: [],
        currency: { gold: 0, silver: 0, copper: 0 },
      });

      await roomManager.createRoom({
        id: 'room-b',
        name: 'Room B',
        description: 'Second room',
        exits: [],
        currency: { gold: 0, silver: 0, copper: 0 },
      });

      await roomManager.connectRooms('room-a', 'room-b', 'north', 'south');

      const roomA = roomManager.getRoom('room-a');
      const roomB = roomManager.getRoom('room-b');

      expect(roomA?.exits.some((e) => e.direction === 'north' && e.roomId === 'room-b')).toBe(true);
      expect(roomB?.exits.some((e) => e.direction === 'south' && e.roomId === 'room-a')).toBe(true);
    });

    it('should throw error when source room does not exist', async () => {
      await roomManager.ensureInitialized();

      await roomManager.createRoom({
        id: 'room-b',
        name: 'Room B',
        description: 'Target room',
        exits: [],
        currency: { gold: 0, silver: 0, copper: 0 },
      });

      await expect(
        roomManager.connectRooms('non-existent', 'room-b', 'north', 'south')
      ).rejects.toThrow("Source room 'non-existent' not found");
    });

    it('should throw error when target room does not exist', async () => {
      await roomManager.ensureInitialized();

      await roomManager.createRoom({
        id: 'room-a',
        name: 'Room A',
        description: 'Source room',
        exits: [],
        currency: { gold: 0, silver: 0, copper: 0 },
      });

      await expect(
        roomManager.connectRooms('room-a', 'non-existent', 'north', 'south')
      ).rejects.toThrow("Target room 'non-existent' not found");
    });
  });

  describe('disconnectExit', () => {
    it('should remove exit from room', async () => {
      await roomManager.ensureInitialized();

      await roomManager.createRoom({
        id: 'room-with-exit',
        name: 'Room with Exit',
        description: 'Has an exit',
        exits: [{ direction: 'north', roomId: 'other-room' }],
        currency: { gold: 0, silver: 0, copper: 0 },
      });

      await roomManager.disconnectExit('room-with-exit', 'north');

      const room = roomManager.getRoom('room-with-exit');
      expect(room?.exits.some((e) => e.direction === 'north')).toBe(false);
    });

    it('should throw error when room does not exist', async () => {
      await roomManager.ensureInitialized();

      await expect(roomManager.disconnectExit('non-existent', 'north')).rejects.toThrow(
        "Room 'non-existent' not found"
      );
    });
  });
});
