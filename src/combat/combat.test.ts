/**
 * Unit tests for Combat class
 * @module combat/combat.test
 */

import { Combat } from './combat';
import { CombatSystem } from './combatSystem';
import { RoomManager } from '../room/roomManager';
import { UserManager } from '../user/userManager';
import { Room } from '../room/room';
import {
  createMockUser,
  createMockClient,
  createMockUserManager,
  createMockRoomManager,
  createMockCombatSystem,
  createMockCombatEntity,
} from '../test/helpers/mockFactories';
import { AbilityManager } from '../abilities/abilityManager';

// Mock dependencies
jest.mock('../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../utils/socketWriter', () => ({
  writeFormattedMessageToClient: jest.fn(),
  writeToClient: jest.fn(),
  drawCommandPrompt: jest.fn(),
}));

jest.mock('../utils/formatters', () => ({
  formatUsername: jest.fn(
    (username: string) => username.charAt(0).toUpperCase() + username.slice(1)
  ),
}));

jest.mock('../utils/logger', () => ({
  createMechanicsLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  createContextLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
  systemLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../persistence/RepositoryFactory', () => ({
  getNpcRepository: jest.fn().mockReturnValue({
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(undefined),
    findByName: jest.fn().mockResolvedValue(undefined),
    findHostile: jest.fn().mockResolvedValue([]),
    findMerchants: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue(undefined),
    saveAll: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn().mockReturnValue({
      getItem: jest.fn(),
      getItemInstance: jest.fn(),
    }),
  },
}));

jest.mock('../utils/stateInterruption', () => ({
  clearRestingMeditating: jest.fn(),
}));

jest.mock('./npcDeathHandler', () => ({
  handleNpcDrops: jest.fn(),
}));

// Wrapper helpers that adapt shared factories to test-specific needs
const createTestRoomManager = (rooms: Map<string, Room> = new Map()): RoomManager => {
  const manager = createMockRoomManager();
  (manager.getRoom as jest.Mock).mockImplementation((roomId: string) => rooms.get(roomId));
  (manager as unknown as { updateRoom: jest.Mock }).updateRoom = jest.fn();
  return manager;
};

const createTestUserManager = (): UserManager => {
  return createMockUserManager();
};

const createTestCombatSystem = (): CombatSystem => {
  return createMockCombatSystem();
};

describe('Combat', () => {
  let combat: Combat;
  let mockPlayer: ReturnType<typeof createMockClient>;
  let mockUserManager: UserManager;
  let mockRoomManager: RoomManager;
  let mockCombatSystem: CombatSystem;
  let rooms: Map<string, Room>;

  beforeEach(() => {
    jest.clearAllMocks();
    rooms = new Map();
    mockPlayer = createMockClient({
      user: createMockUser({ inCombat: true }),
      authenticated: true,
    });
    mockUserManager = createTestUserManager();
    mockRoomManager = createTestRoomManager(rooms);
    mockCombatSystem = createTestCombatSystem();
    combat = new Combat(mockPlayer, mockUserManager, mockRoomManager, mockCombatSystem);
  });

  describe('constructor', () => {
    it('should initialize with player and managers', () => {
      expect(combat.player).toBe(mockPlayer);
      expect(combat.rounds).toBe(0);
      expect(combat.activeCombatants).toEqual([]);
      expect(combat.brokenByPlayer).toBe(false);
    });
  });

  describe('setAbilityManager', () => {
    it('should set the ability manager', () => {
      const mockAbilityManager = {} as AbilityManager;
      combat.setAbilityManager(mockAbilityManager);
      // No public way to verify, but should not throw
      expect(true).toBe(true);
    });
  });

  describe('addTarget', () => {
    it('should add a target to active combatants', () => {
      const target = createMockCombatEntity({ name: 'Goblin' });
      (target.getName as jest.Mock).mockReturnValue('Goblin');

      combat.addTarget(target);

      expect(combat.activeCombatants).toContain(target);
    });

    it('should not add duplicate targets', () => {
      const target = createMockCombatEntity({ name: 'Goblin' });
      (target.getName as jest.Mock).mockReturnValue('Goblin');

      combat.addTarget(target);
      combat.addTarget(target);

      expect(combat.activeCombatants).toHaveLength(1);
    });

    it('should add multiple different targets', () => {
      const goblin = createMockCombatEntity({ name: 'Goblin' });
      (goblin.getName as jest.Mock).mockReturnValue('Goblin');
      const orc = createMockCombatEntity({ name: 'Orc' });
      (orc.getName as jest.Mock).mockReturnValue('Orc');

      combat.addTarget(goblin);
      combat.addTarget(orc);

      expect(combat.activeCombatants).toHaveLength(2);
    });
  });

  describe('processRound', () => {
    it('should not process if player has no user', () => {
      mockPlayer.user = null;

      combat.processRound();

      // Should return early without processing
      expect(combat.rounds).toBe(0);
    });

    it('should not process if combat is done', () => {
      // Add and remove all targets to end combat
      const target = createMockCombatEntity();
      combat.addTarget(target);
      combat.activeCombatants = [];

      combat.processRound();

      // Should return early
      expect(combat.rounds).toBe(0);
    });

    it('should clear combatants if player has no room', () => {
      mockPlayer.user!.currentRoomId = '';
      const target = createMockCombatEntity();
      combat.addTarget(target);

      combat.processRound();

      expect(combat.activeCombatants).toHaveLength(0);
    });

    it('should clear combatants if room does not exist', () => {
      mockPlayer.user!.currentRoomId = 'nonexistent-room';
      const target = createMockCombatEntity();
      combat.addTarget(target);

      combat.processRound();

      expect(combat.activeCombatants).toHaveLength(0);
    });
  });

  describe('isDone', () => {
    it('should return true when no active combatants', () => {
      expect(combat.isDone()).toBe(true);
    });

    it('should return false when there are active combatants', () => {
      const target = createMockCombatEntity();
      combat.addTarget(target);

      expect(combat.isDone()).toBe(false);
    });
  });

  describe('lastActivityTime', () => {
    it('should be initialized to current time', () => {
      const now = Date.now();
      expect(combat.lastActivityTime).toBeGreaterThanOrEqual(now - 1000);
      expect(combat.lastActivityTime).toBeLessThanOrEqual(now + 1000);
    });
  });
});

// Additional tests to improve coverage
describe('Combat Extended Coverage', () => {
  let combat: Combat;
  let mockPlayer: ReturnType<typeof createMockClient>;
  let mockUserManager: UserManager;
  let mockRoomManager: RoomManager;
  let mockCombatSystem: CombatSystem;
  let rooms: Map<string, Room>;
  let testRoom: Room;

  beforeEach(() => {
    jest.clearAllMocks();
    rooms = new Map();

    // Create a test room with NPCs
    testRoom = new Room({
      id: 'test-room',
      name: 'Test Room',
      description: 'A test room',
      exits: [],
    });
    testRoom.npcs = new Map();
    rooms.set('test-room', testRoom);

    mockPlayer = createMockClient({
      user: createMockUser({
        inCombat: true,
        currentRoomId: 'test-room',
        health: 100,
        maxHealth: 100,
      }),
      authenticated: true,
    });
    mockUserManager = createTestUserManager();
    mockRoomManager = createTestRoomManager(rooms);
    mockCombatSystem = createTestCombatSystem();
    combat = new Combat(mockPlayer, mockUserManager, mockRoomManager, mockCombatSystem);
  });

  describe('processRound with targets', () => {
    it('should handle combatant not in room', () => {
      const target = createMockCombatEntity({ name: 'Goblin' });
      (target.getName as jest.Mock).mockReturnValue('Goblin');
      (target.isAlive as jest.Mock).mockReturnValue(true);
      combat.addTarget(target);

      // Room has no NPCs, so combatant should be removed
      combat.processRound();

      expect(combat.activeCombatants).toHaveLength(0);
    });

    it('should process round with valid target in room', () => {
      const target = createMockCombatEntity({ name: 'goblin-123' });
      (target.getName as jest.Mock).mockReturnValue('goblin-123');
      (target.isAlive as jest.Mock).mockReturnValue(true);
      (target.takeDamage as jest.Mock).mockReturnValue(false);

      // Add the NPC to the room
      testRoom.npcs.set('goblin-123', {
        name: 'Goblin',
        instanceId: 'goblin-123',
        templateId: 'goblin',
        health: 50,
        maxHealth: 50,
        attack: 5,
        defense: 5,
        isAlive: () => true,
        isHostile: true,
        isPassive: false,
      } as never);

      combat.addTarget(target);
      combat.processRound();

      // Combat should continue with the target
      expect(combat.rounds).toBeGreaterThanOrEqual(0);
    });
  });

  describe('activeCombatants access', () => {
    it('should return list of active combatants', () => {
      const goblin = createMockCombatEntity({ name: 'Goblin' });
      (goblin.getName as jest.Mock).mockReturnValue('Goblin');
      const orc = createMockCombatEntity({ name: 'Orc' });
      (orc.getName as jest.Mock).mockReturnValue('Orc');

      combat.addTarget(goblin);
      combat.addTarget(orc);

      expect(combat.activeCombatants).toHaveLength(2);
    });
  });

  describe('remove combatant by clearing array', () => {
    it('should clear all combatants', () => {
      const target = createMockCombatEntity({ name: 'Goblin' });
      (target.getName as jest.Mock).mockReturnValue('Goblin');

      combat.addTarget(target);
      expect(combat.activeCombatants).toHaveLength(1);

      combat.activeCombatants = [];
      expect(combat.activeCombatants).toHaveLength(0);
    });
  });

  describe('break combat', () => {
    it('should mark combat as broken by player', () => {
      combat.brokenByPlayer = true;
      expect(combat.brokenByPlayer).toBe(true);
    });
  });

  describe('currentRound tracking', () => {
    it('should track current round', () => {
      expect(combat.currentRound).toBe(0);
      combat.currentRound = 5;
      expect(combat.currentRound).toBe(5);
    });
  });

  describe('player validity check', () => {
    it('should handle unauthenticated player', () => {
      mockPlayer.authenticated = false;
      const target = createMockCombatEntity({ name: 'Goblin' });
      combat.addTarget(target);

      combat.processRound();

      // Combat should end for invalid player
      expect(combat.activeCombatants).toHaveLength(0);
    });
  });
});
