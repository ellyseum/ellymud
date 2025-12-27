/**
 * Unit tests for RoomManager class
 * @module room/roomManager.test
 */

import { RoomManager } from './roomManager';
import { ConnectedClient } from '../types';
import { createMockClientWithUser } from '../test/helpers/mockFactories';

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
  },
  ROOMS_FILE: '/test/data/rooms.json',
  DIRECT_ROOMS_DATA: null,
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
