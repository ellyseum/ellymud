import { SpawnManager } from './spawnManager';
import { AreaManager } from '../area/areaManager';
import { RoomManager } from '../room/roomManager';
import { Room } from '../room/room';
import { NPC } from '../combat/npc';
import { Area } from '../area/area';

// Mock dependencies
jest.mock('../area/areaManager');
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

describe('SpawnManager', () => {
  let spawnManager: SpawnManager;
  let mockAreaManager: {
    getAll: jest.Mock<Promise<Area[]>>;
    getInstance: jest.Mock;
    getById: jest.Mock;
  };
  let mockRoomManager: {
    getRoomsByArea: jest.Mock;
    getRoom: jest.Mock;
  };
  let mockRoom: Partial<Room>;

  beforeEach(() => {
    jest.clearAllMocks();
    SpawnManager.resetInstance();

    // Setup mock room
    mockRoom = {
      id: 'test-room-1',
      areaId: 'test-area',
      npcs: new Map(),
      addNPC: jest.fn(),
    };

    // Setup mock area manager
    mockAreaManager = {
      getAll: jest.fn<Promise<Area[]>, []>(),
      getInstance: jest.fn(),
      getById: jest.fn(),
    };

    // Setup mock room manager
    mockRoomManager = {
      getRoomsByArea: jest.fn().mockReturnValue([mockRoom]),
      getRoom: jest.fn().mockReturnValue(mockRoom),
    };

    // Mock NPC.loadNPCData
    (NPC.loadNPCData as jest.Mock).mockReturnValue(
      new Map([
        [
          'goblin',
          {
            id: 'goblin',
            name: 'Goblin',
            health: 25,
            maxHealth: 25,
            damage: [2, 5] as [number, number],
            isHostile: true,
            isPassive: false,
            experienceValue: 100,
            description: 'A mean goblin',
            attackTexts: ['attacks'],
            deathMessages: ['dies'],
            inventory: [],
          },
        ],
      ])
    );

    spawnManager = SpawnManager.getInstance(
      mockAreaManager as unknown as AreaManager,
      mockRoomManager as unknown as RoomManager
    );
  });

  afterEach(() => {
    SpawnManager.resetInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = SpawnManager.getInstance(
        mockAreaManager as unknown as AreaManager,
        mockRoomManager as unknown as RoomManager
      );
      const instance2 = SpawnManager.getInstance(
        mockAreaManager as unknown as AreaManager,
        mockRoomManager as unknown as RoomManager
      );
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize spawn trackers from areas', async () => {
      const testArea: Area = {
        id: 'test-area',
        name: 'Test Area',
        description: 'A test area',
        levelRange: { min: 1, max: 5 },
        flags: [],
        spawnConfig: [
          {
            npcTemplateId: 'goblin',
            maxInstances: 3,
            respawnTicks: 10,
          },
        ],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      };

      mockAreaManager.getAll.mockResolvedValue([testArea]);

      await spawnManager.initialize();

      const status = spawnManager.getStatus();
      expect(status).toHaveLength(1);
      expect(status[0]).toEqual({
        areaId: 'test-area',
        npcTemplateId: 'goblin',
        current: 0,
        max: 3,
      });
    });

    it('should not initialize twice', async () => {
      mockAreaManager.getAll.mockResolvedValue([]);

      await spawnManager.initialize();
      await spawnManager.initialize();

      expect(mockAreaManager.getAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('processTick', () => {
    it('should spawn NPC when below max instances and cooldown passed', async () => {
      const testArea: Area = {
        id: 'test-area',
        name: 'Test Area',
        description: 'A test area',
        levelRange: { min: 1, max: 5 },
        flags: [],
        spawnConfig: [
          {
            npcTemplateId: 'goblin',
            maxInstances: 2,
            respawnTicks: 5,
          },
        ],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      };

      mockAreaManager.getAll.mockResolvedValue([testArea]);

      await spawnManager.initialize();

      // Process tick 6 (past respawn cooldown of 5)
      spawnManager.processTick(6);

      expect(mockRoom.addNPC).toHaveBeenCalledTimes(1);
    });

    it('should not spawn when at max instances', async () => {
      // Setup room with existing NPCs
      const existingNpc = { templateId: 'goblin' } as NPC;
      mockRoom.npcs = new Map([
        ['goblin-1', existingNpc],
        ['goblin-2', existingNpc],
      ]);

      const testArea: Area = {
        id: 'test-area',
        name: 'Test Area',
        description: 'A test area',
        levelRange: { min: 1, max: 5 },
        flags: [],
        spawnConfig: [
          {
            npcTemplateId: 'goblin',
            maxInstances: 2,
            respawnTicks: 5,
          },
        ],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      };

      mockAreaManager.getAll.mockResolvedValue([testArea]);

      await spawnManager.initialize();
      spawnManager.processTick(10);

      expect(mockRoom.addNPC).not.toHaveBeenCalled();
    });

    it('should not spawn when still on cooldown', async () => {
      const testArea: Area = {
        id: 'test-area',
        name: 'Test Area',
        description: 'A test area',
        levelRange: { min: 1, max: 5 },
        flags: [],
        spawnConfig: [
          {
            npcTemplateId: 'goblin',
            maxInstances: 2,
            respawnTicks: 100,
          },
        ],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      };

      mockAreaManager.getAll.mockResolvedValue([testArea]);

      await spawnManager.initialize();

      // Process tick 5 (still before respawn cooldown of 100)
      spawnManager.processTick(5);

      expect(mockRoom.addNPC).not.toHaveBeenCalled();
    });
  });

  describe('notifyNPCDeath', () => {
    it('should remove instance from tracker', async () => {
      const testArea: Area = {
        id: 'test-area',
        name: 'Test Area',
        description: 'A test area',
        levelRange: { min: 1, max: 5 },
        flags: [],
        spawnConfig: [
          {
            npcTemplateId: 'goblin',
            maxInstances: 3,
            respawnTicks: 5,
          },
        ],
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      };

      // Start with one existing goblin
      const existingNpc = { templateId: 'goblin' } as NPC;
      mockRoom.npcs = new Map([['goblin-123', existingNpc]]);

      mockAreaManager.getAll.mockResolvedValue([testArea]);

      await spawnManager.initialize();

      let status = spawnManager.getStatus();
      expect(status[0].current).toBe(1);

      // Simulate NPC death - remove from room
      mockRoom.npcs = new Map();

      spawnManager.notifyNPCDeath('test-area', 'goblin', 'goblin-123');

      status = spawnManager.getStatus();
      expect(status[0].current).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('should return empty array when no trackers', async () => {
      mockAreaManager.getAll.mockResolvedValue([]);
      await spawnManager.initialize();

      const status = spawnManager.getStatus();
      expect(status).toEqual([]);
    });
  });
});
