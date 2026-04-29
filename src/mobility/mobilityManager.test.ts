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
              isAlive: () => true,
              getAllAggressors: () => [],
            } as unknown as NPC,
          ],
        ]),
        exits: [],
        players: [],
        effectiveMaxMobs: () => null,
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
        effectiveMaxMobs: () => null,
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
        isAlive: () => true,
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
        isAlive: () => true,
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
        isAlive: () => true,
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
        effectiveMaxMobs: () => null,
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
        isAlive: () => true,
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
        effectiveMaxMobs: () => null,
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
        effectiveMaxMobs: () => null,
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
        isAlive: () => true,
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
        effectiveMaxMobs: () => null,
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
        isAlive: () => true,
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
        effectiveMaxMobs: () => null,
      } as unknown as Room;

      const mockTownRoom = {
        id: 'town-1',
        areaId: 'town', // Different area
        npcs: new Map(),
        players: [],
        effectiveMaxMobs: () => null,
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

  describe('processOverflow (population cap dispersal)', () => {
    /** Build N inline mock NPCs with the minimum surface processOverflow + executeNpcMove rely on. */
    const makeNpcs = (count: number, prefix = 'rat'): NPC[] =>
      Array.from(
        { length: count },
        (_, i) =>
          ({
            instanceId: `${prefix}-${i}`,
            templateId: prefix,
            name: prefix,
            isMerchant: () => false,
            isAlive: () => true,
            getAllAggressors: () => [] as string[],
          }) as unknown as NPC
      );

    const makeRoom = (
      id: string,
      npcs: NPC[],
      cap: number | null,
      exits: { direction: string; roomId: string }[] = []
    ): Room =>
      ({
        id,
        areaId: 'forest',
        npcs: new Map(npcs.map((n) => [n.instanceId, n])),
        getNPC: jest.fn((iid: string) => npcs.find((n) => n.instanceId === iid)),
        addNPC: jest.fn().mockReturnValue(true),
        removeNPC: jest.fn(function (this: { npcs: Map<string, NPC> }, iid: string) {
          this.npcs.delete(iid);
        }),
        exits,
        players: [],
        flags: [],
        effectiveMaxMobs: () => cap,
      }) as unknown as Room;

    /** Register N NPCs on the manager so getCountableNpcs picks them up. */
    const registerAll = (npcs: NPC[], room: Room): void => {
      // Bypass normal registerNPC (requires loadNPCData lookup) by reaching into the
      // private field directly — same pattern other unit tests use elsewhere.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = (mobilityManager as any).mobileNPCs as Map<string, unknown>;
      for (const npc of npcs) {
        m.set(npc.instanceId, {
          instanceId: npc.instanceId,
          templateId: npc.templateId,
          lastMoveTick: 0,
          movementTicks: 1000, // unreasonably high so processNormalMovement never picks them
          staysInArea: true,
          currentRoomId: room.id,
          spawnAreaId: room.areaId,
        });
      }
    };

    it('disperses overflow when room is over cap', () => {
      const npcs = makeNpcs(4); // 4 in the room, cap 2
      const overflowRoom = makeRoom('a', npcs, 2, [{ direction: 'north', roomId: 'b' }]);
      const calmRoom = makeRoom('b', [], 5);

      mockRoomManager.getAllRooms.mockReturnValue([overflowRoom, calmRoom]);
      mockRoomManager.getRoom.mockImplementation((id) =>
        id === 'a' ? overflowRoom : id === 'b' ? calmRoom : undefined
      );

      mobilityManager.initialize();
      registerAll(npcs, overflowRoom);

      mobilityManager.processTick(1);

      // 2 of the 4 should be removed and re-added at neighbor.
      expect((overflowRoom.removeNPC as jest.Mock).mock.calls.length).toBe(2);
      expect((calmRoom.addNPC as jest.Mock).mock.calls.length).toBe(2);
    });

    it('exempts mobs in combat from dispersal', () => {
      const npcs = makeNpcs(4);
      // 2 of the 4 are in combat (have aggressors)
      (npcs[0] as unknown as { getAllAggressors: () => string[] }).getAllAggressors = () => [
        'admin',
      ];
      (npcs[1] as unknown as { getAllAggressors: () => string[] }).getAllAggressors = () => [
        'admin',
      ];

      const room = makeRoom('a', npcs, 2, [{ direction: 'north', roomId: 'b' }]);
      const dest = makeRoom('b', [], 5);

      mockRoomManager.getAllRooms.mockReturnValue([room, dest]);
      mockRoomManager.getRoom.mockImplementation((id) =>
        id === 'a' ? room : id === 'b' ? dest : undefined
      );

      mobilityManager.initialize();
      registerAll(npcs, room);

      mobilityManager.processTick(1);

      // Only the 2 non-combat mobs are eligible. Overflow is also 2, so both
      // get evicted. The 2 in-combat mobs stay.
      const removedIds = (room.removeNPC as jest.Mock).mock.calls.map((c) => c[0]);
      expect(removedIds).not.toContain('rat-0');
      expect(removedIds).not.toContain('rat-1');
      expect(removedIds.length).toBe(2);
    });

    it('stays put when no neighbor has capacity', () => {
      const npcs = makeNpcs(3);
      const room = makeRoom('a', npcs, 1, [{ direction: 'north', roomId: 'b' }]);
      const fullRoom = makeRoom('b', makeNpcs(5, 'wolf'), 5); // already at cap

      mockRoomManager.getAllRooms.mockReturnValue([room, fullRoom]);
      mockRoomManager.getRoom.mockImplementation((id) =>
        id === 'a' ? room : id === 'b' ? fullRoom : undefined
      );

      mobilityManager.initialize();
      registerAll(npcs, room);
      registerAll(makeNpcs(5, 'wolf'), fullRoom);

      mobilityManager.processTick(1);

      // Source is over cap but the only neighbor is also full → nobody moves.
      expect((room.removeNPC as jest.Mock).mock.calls.length).toBe(0);
    });

    it('skips dispersal when no cap is configured', () => {
      const npcs = makeNpcs(10);
      const room = makeRoom('a', npcs, null, [{ direction: 'north', roomId: 'b' }]);
      const dest = makeRoom('b', [], null);

      mockRoomManager.getAllRooms.mockReturnValue([room, dest]);
      mockRoomManager.getRoom.mockImplementation((id) =>
        id === 'a' ? room : id === 'b' ? dest : undefined
      );

      mobilityManager.initialize();
      registerAll(npcs, room);

      mobilityManager.processTick(1);

      expect((room.removeNPC as jest.Mock).mock.calls.length).toBe(0);
    });

    it('updates virtual occupancy across dispersals so the same neighbor does not get overloaded', () => {
      const npcs = makeNpcs(5); // 5 mobs in source, cap 1, overflow 4
      const room = makeRoom('a', npcs, 1, [
        { direction: 'north', roomId: 'b' },
        { direction: 'south', roomId: 'c' },
      ]);
      // Two neighbors, slack of 2 each — cap should let exactly 2 each
      const destB = makeRoom('b', [], 2);
      const destC = makeRoom('c', [], 2);

      mockRoomManager.getAllRooms.mockReturnValue([room, destB, destC]);
      mockRoomManager.getRoom.mockImplementation((id) =>
        id === 'a' ? room : id === 'b' ? destB : id === 'c' ? destC : undefined
      );

      mobilityManager.initialize();
      registerAll(npcs, room);

      mobilityManager.processTick(1);

      const bCount = (destB.addNPC as jest.Mock).mock.calls.length;
      const cCount = (destC.addNPC as jest.Mock).mock.calls.length;
      // Total dispersed should be 4, and neither neighbor gets all of them.
      expect(bCount + cCount).toBe(4);
      expect(bCount).toBeLessThanOrEqual(2);
      expect(cCount).toBeLessThanOrEqual(2);
    });
  });
});
