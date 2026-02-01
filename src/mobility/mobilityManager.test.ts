import { MobilityManager } from './mobilityManager';
import { RoomManager } from '../room/roomManager';
import { Room } from '../room/room';
import { NPC } from '../combat/npc';

// Mock the dependencies
jest.mock('../room/roomManager');
jest.mock('../combat/npc');
jest.mock('../utils/logger', () => ({
  createContextLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));
jest.mock('../client/clientManager', () => ({
  ClientManager: {
    getInstance: jest.fn(() => ({
      getClientByUsername: jest.fn(() => null),
    })),
  },
}));
jest.mock('../utils/socketWriter', () => ({
  writeMessageToClient: jest.fn(),
}));

describe('MobilityManager', () => {
  let mobilityManager: MobilityManager;
  let mockRoomManager: jest.Mocked<RoomManager>;

  beforeEach(() => {
    // Reset singleton
    MobilityManager.resetInstance();

    // Create mock RoomManager
    mockRoomManager = {
      getAllRooms: jest.fn(),
      getRoom: jest.fn(),
      getRoomsByArea: jest.fn(),
    } as unknown as jest.Mocked<RoomManager>;

    // Mock NPC data with mobility settings
    const mockNPCData = new Map([
      [
        'wolf',
        {
          id: 'wolf',
          name: 'wolf',
          canMove: true,
          movementTicks: 15,
          staysInArea: true,
        },
      ],
      [
        'merchant_1',
        {
          id: 'merchant_1',
          name: 'Marcus the Merchant',
          canMove: false,
          merchant: true,
        },
      ],
      [
        'goblin',
        {
          id: 'goblin',
          name: 'goblin',
          canMove: true,
          movementTicks: 20,
          staysInArea: false,
        },
      ],
    ]);
    (NPC.loadNPCData as jest.Mock).mockReturnValue(mockNPCData);

    mobilityManager = MobilityManager.getInstance(mockRoomManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = MobilityManager.getInstance(mockRoomManager);
      const instance2 = MobilityManager.getInstance(mockRoomManager);
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should scan all rooms for mobile NPCs', () => {
      const mockRoom = {
        id: 'room-1',
        areaId: 'forest',
        npcs: new Map([
          [
            'wolf-instance-1',
            {
              instanceId: 'wolf-instance-1',
              templateId: 'wolf',
              name: 'wolf',
              isMerchant: () => false,
              getAllAggressors: () => [],
            } as unknown as NPC,
          ],
        ]),
        exits: [],
        players: [],
      } as unknown as Room;

      mockRoomManager.getAllRooms.mockReturnValue([mockRoom]);

      mobilityManager.initialize();

      const status = mobilityManager.getStatus();
      expect(status).toHaveLength(1);
      expect(status[0].templateId).toBe('wolf');
      expect(status[0].movementTicks).toBe(15);
    });

    it('should not register non-mobile NPCs', () => {
      const mockRoom = {
        id: 'room-1',
        areaId: 'town',
        npcs: new Map([
          [
            'merchant-instance-1',
            {
              instanceId: 'merchant-instance-1',
              templateId: 'merchant_1',
              name: 'Marcus the Merchant',
              isMerchant: () => true,
              getAllAggressors: () => [],
            } as unknown as NPC,
          ],
        ]),
        exits: [],
        players: [],
      } as unknown as Room;

      mockRoomManager.getAllRooms.mockReturnValue([mockRoom]);

      mobilityManager.initialize();

      const status = mobilityManager.getStatus();
      expect(status).toHaveLength(0);
    });

    it('should only initialize once', () => {
      mockRoomManager.getAllRooms.mockReturnValue([]);

      mobilityManager.initialize();
      mobilityManager.initialize();

      expect(mockRoomManager.getAllRooms).toHaveBeenCalledTimes(1);
    });
  });

  describe('registerNPC', () => {
    it('should register a mobile NPC', () => {
      mockRoomManager.getAllRooms.mockReturnValue([]);
      mobilityManager.initialize();

      const mockNPC = {
        instanceId: 'wolf-123',
        templateId: 'wolf',
        name: 'wolf',
        isMerchant: () => false,
        getAllAggressors: () => [],
      } as unknown as NPC;

      const mockRoom = {
        id: 'forest-1',
        areaId: 'forest',
      } as Room;

      mobilityManager.registerNPC(mockNPC, mockRoom);

      const status = mobilityManager.getStatus();
      expect(status).toHaveLength(1);
      expect(status[0].instanceId).toBe('wolf-123');
      expect(status[0].staysInArea).toBe(true);
    });
  });

  describe('unregisterNPC', () => {
    it('should remove NPC from tracking', () => {
      mockRoomManager.getAllRooms.mockReturnValue([]);
      mobilityManager.initialize();

      const mockNPC = {
        instanceId: 'wolf-123',
        templateId: 'wolf',
        name: 'wolf',
        isMerchant: () => false,
      } as unknown as NPC;

      const mockRoom = {
        id: 'forest-1',
        areaId: 'forest',
      } as Room;

      mobilityManager.registerNPC(mockNPC, mockRoom);
      expect(mobilityManager.getStatus()).toHaveLength(1);

      mobilityManager.unregisterNPC('wolf-123');
      expect(mobilityManager.getStatus()).toHaveLength(0);
    });
  });

  describe('processTick', () => {
    it('should not move NPC before movementTicks elapsed', () => {
      const mockNPC = {
        instanceId: 'wolf-123',
        templateId: 'wolf',
        name: 'wolf',
        isMerchant: () => false,
        getAllAggressors: () => [],
      } as unknown as NPC;

      const mockRoom = {
        id: 'forest-1',
        areaId: 'forest',
        npcs: new Map([['wolf-123', mockNPC]]),
        getNPC: jest.fn(() => mockNPC),
        removeNPC: jest.fn(),
        exits: [{ direction: 'north', roomId: 'forest-2' }],
        players: [],
      } as unknown as Room;

      mockRoomManager.getAllRooms.mockReturnValue([mockRoom]);
      mockRoomManager.getRoom.mockReturnValue(mockRoom);

      mobilityManager.initialize();

      // Process a tick (movement at tick 15 for wolf)
      mobilityManager.processTick(5);

      // NPC should not have moved
      expect(mockRoom.removeNPC).not.toHaveBeenCalled();
    });

    it('should move NPC after movementTicks elapsed', () => {
      const mockNPC = {
        instanceId: 'wolf-123',
        templateId: 'wolf',
        name: 'wolf',
        isMerchant: () => false,
        getAllAggressors: () => [],
      } as unknown as NPC;

      const mockRoom1 = {
        id: 'forest-1',
        areaId: 'forest',
        npcs: new Map([['wolf-123', mockNPC]]),
        getNPC: jest.fn(() => mockNPC),
        removeNPC: jest.fn(),
        addNPC: jest.fn(),
        exits: [{ direction: 'north', roomId: 'forest-2' }],
        players: [],
      } as unknown as Room;

      const mockRoom2 = {
        id: 'forest-2',
        areaId: 'forest',
        npcs: new Map(),
        getNPC: jest.fn(),
        removeNPC: jest.fn(),
        addNPC: jest.fn(),
        exits: [{ direction: 'south', roomId: 'forest-1' }],
        players: [],
      } as unknown as Room;

      mockRoomManager.getAllRooms.mockReturnValue([mockRoom1]);
      mockRoomManager.getRoom.mockImplementation((id) => {
        if (id === 'forest-1') return mockRoom1;
        if (id === 'forest-2') return mockRoom2;
        return undefined;
      });

      mobilityManager.initialize();

      // Process tick after movementTicks (15) elapsed
      mobilityManager.processTick(16);

      // NPC should have moved
      expect(mockRoom1.removeNPC).toHaveBeenCalledWith('wolf-123');
      expect(mockRoom2.addNPC).toHaveBeenCalledWith(mockNPC);
    });

    it('should not move NPC in combat', () => {
      const mockNPC = {
        instanceId: 'wolf-123',
        templateId: 'wolf',
        name: 'wolf',
        isMerchant: () => false,
        getAllAggressors: () => ['player1'], // Has an aggressor
      } as unknown as NPC;

      const mockRoom = {
        id: 'forest-1',
        areaId: 'forest',
        npcs: new Map([['wolf-123', mockNPC]]),
        getNPC: jest.fn(() => mockNPC),
        removeNPC: jest.fn(),
        exits: [{ direction: 'north', roomId: 'forest-2' }],
        players: [],
      } as unknown as Room;

      mockRoomManager.getAllRooms.mockReturnValue([mockRoom]);
      mockRoomManager.getRoom.mockReturnValue(mockRoom);

      mobilityManager.initialize();
      mobilityManager.processTick(20);

      // NPC should not have moved due to combat
      expect(mockRoom.removeNPC).not.toHaveBeenCalled();
    });

    it('should respect staysInArea setting', () => {
      const mockNPC = {
        instanceId: 'wolf-123',
        templateId: 'wolf',
        name: 'wolf',
        isMerchant: () => false,
        getAllAggressors: () => [],
      } as unknown as NPC;

      const mockRoom1 = {
        id: 'forest-1',
        areaId: 'forest',
        npcs: new Map([['wolf-123', mockNPC]]),
        getNPC: jest.fn(() => mockNPC),
        removeNPC: jest.fn(),
        exits: [{ direction: 'north', roomId: 'town-1' }], // Exit leads to different area
        players: [],
      } as unknown as Room;

      const mockTownRoom = {
        id: 'town-1',
        areaId: 'town', // Different area
        npcs: new Map(),
        players: [],
      } as unknown as Room;

      mockRoomManager.getAllRooms.mockReturnValue([mockRoom1]);
      mockRoomManager.getRoom.mockImplementation((id) => {
        if (id === 'forest-1') return mockRoom1;
        if (id === 'town-1') return mockTownRoom;
        return undefined;
      });

      mobilityManager.initialize();
      mobilityManager.processTick(20);

      // NPC should not move because exit leads to different area
      expect(mockRoom1.removeNPC).not.toHaveBeenCalled();
    });
  });

  describe('reload', () => {
    it('should clear and reinitialize', () => {
      mockRoomManager.getAllRooms.mockReturnValue([]);

      mobilityManager.initialize();
      mobilityManager.reload();

      expect(mockRoomManager.getAllRooms).toHaveBeenCalledTimes(2);
    });
  });
});
