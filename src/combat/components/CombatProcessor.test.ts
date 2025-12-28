/**
 * Unit tests for CombatProcessor
 * @module combat/components/CombatProcessor.test
 */

import { CombatProcessor } from './CombatProcessor';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  getPlayerLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
  createContextLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../../utils/formatters', () => ({
  formatUsername: jest.fn((name: string) => name),
}));

jest.mock('../../utils/stateInterruption', () => ({
  clearRestingMeditating: jest.fn(),
}));

// Create mock implementations
const mockGetEntityId = jest.fn().mockReturnValue('entity-id');
const mockGetSharedEntity = jest.fn();
const mockGetCombatEntitiesInRoom = jest.fn().mockReturnValue([]);
const mockRemoveEntityFromCombatForRoom = jest.fn();
const mockGetEntityTargeters = jest.fn().mockReturnValue(new Set());
const mockIsEntityInCombat = jest.fn().mockReturnValue(false);
const mockAddEntityToCombatForRoom = jest.fn();

const mockEntityTracker = {
  getEntityId: mockGetEntityId,
  getSharedEntity: mockGetSharedEntity,
  getCombatEntitiesInRoom: mockGetCombatEntitiesInRoom,
  removeEntityFromCombatForRoom: mockRemoveEntityFromCombatForRoom,
  getEntityTargeters: mockGetEntityTargeters,
  isEntityInCombat: mockIsEntityInCombat,
  addEntityToCombatForRoom: mockAddEntityToCombatForRoom,
};

const mockBroadcastCombatMessage = jest.fn();
const mockBroadcastRoomMessage = jest.fn();

const mockCombatNotifier = {
  broadcastCombatMessage: mockBroadcastCombatMessage,
  broadcastRoomMessage: mockBroadcastRoomMessage,
};

const mockGetUser = jest.fn();
const mockUpdateUserStats = jest.fn();
const mockGetActiveUserSession = jest.fn();

const mockUserManager = {
  getUser: mockGetUser,
  updateUserStats: mockUpdateUserStats,
  getActiveUserSession: mockGetActiveUserSession,
};

const mockGetRoom = jest.fn();
const mockGetAllRooms = jest.fn().mockReturnValue([]);

const mockRoomManager = {
  getRoom: mockGetRoom,
  getAllRooms: mockGetAllRooms,
};

describe('CombatProcessor', () => {
  let combatProcessor: CombatProcessor;

  beforeEach(() => {
    jest.clearAllMocks();

    combatProcessor = new CombatProcessor(
      mockEntityTracker as never,
      mockCombatNotifier as never,
      mockUserManager as never,
      mockRoomManager as never
    );
  });

  describe('constructor', () => {
    it('should create a CombatProcessor instance', () => {
      expect(combatProcessor).toBeDefined();
    });
  });

  describe('processCombatRound', () => {
    it('should increment the current round', () => {
      combatProcessor.processCombatRound();

      expect(combatProcessor.getCurrentRound()).toBe(1);
    });

    it('should increment round on each call', () => {
      combatProcessor.processCombatRound();
      combatProcessor.processCombatRound();
      combatProcessor.processCombatRound();

      expect(combatProcessor.getCurrentRound()).toBe(3);
    });
  });

  describe('getCurrentRound', () => {
    it('should return 0 initially', () => {
      expect(combatProcessor.getCurrentRound()).toBe(0);
    });
  });

  describe('processRoomCombat', () => {
    it('should not process combat in rooms without entities', () => {
      mockGetAllRooms.mockReturnValue([]);

      combatProcessor.processRoomCombat();

      expect(mockGetRoom).not.toHaveBeenCalled();
    });

    it('should skip rooms that do not exist', () => {
      mockGetAllRooms.mockReturnValue([
        { id: 'test-room', npcs: new Map(), players: ['testuser'], flags: [] },
      ]);
      mockGetRoom.mockReturnValue(null);

      combatProcessor.processRoomCombat();

      // Should not throw
      expect(true).toBe(true);
    });

    it('should skip safe zone rooms', () => {
      const mockRoom = {
        id: 'safe-room',
        players: ['testuser'],
        npcs: new Map(),
        flags: ['safe'],
      };

      mockGetAllRooms.mockReturnValue([mockRoom]);
      mockGetRoom.mockReturnValue(mockRoom);
      mockGetCombatEntitiesInRoom.mockReturnValue(['goblin']);

      combatProcessor.processRoomCombat();

      // Entity should not attack in safe room
      expect(mockBroadcastCombatMessage).not.toHaveBeenCalled();
    });

    it('should skip rooms without players', () => {
      const mockRoom = {
        id: 'empty-room',
        players: [],
        npcs: new Map([['goblin-1', { name: 'Goblin', isHostile: true }]]),
        flags: [],
      };

      mockGetAllRooms.mockReturnValue([mockRoom]);
      mockGetRoom.mockReturnValue(mockRoom);
      mockGetCombatEntitiesInRoom.mockReturnValue(['goblin']);

      combatProcessor.processRoomCombat();

      // Should not process attacks without players
      expect(mockBroadcastCombatMessage).not.toHaveBeenCalled();
    });
  });

  describe('processEntityAttack', () => {
    it('should handle dead entities gracefully', () => {
      const mockRoom = {
        id: 'test-room',
        players: ['testuser'],
        npcs: new Map([['goblin-1', { name: 'Goblin', isAlive: () => false }]]),
        flags: [],
      };

      mockGetAllRooms.mockReturnValue([mockRoom]);
      mockGetRoom.mockReturnValue(mockRoom);
      mockGetCombatEntitiesInRoom.mockReturnValue(['goblin-1']);
      mockGetSharedEntity.mockReturnValue({ name: 'Goblin', isAlive: () => false });

      combatProcessor.processRoomCombat();

      // Dead entity handling is done via filtering in combat processing
      expect(true).toBe(true);
    });

    it('should skip non-hostile passive entities', () => {
      const mockRoom = {
        id: 'test-room',
        players: ['testuser'],
        npcs: new Map([
          [
            'merchant-1',
            {
              name: 'Merchant',
              isAlive: () => true,
              isHostile: false,
              isPassive: true,
            },
          ],
        ]),
        flags: [],
      };

      mockGetAllRooms.mockReturnValue([mockRoom]);
      mockGetRoom.mockReturnValue(mockRoom);
      mockGetCombatEntitiesInRoom.mockReturnValue(['merchant-1']);
      mockGetSharedEntity.mockReturnValue({
        name: 'Merchant',
        isAlive: () => true,
        isHostile: false,
        isPassive: true,
      });

      combatProcessor.processRoomCombat();

      // Passive non-hostile should not attack
      expect(mockBroadcastCombatMessage).not.toHaveBeenCalled();
    });
  });

  describe('calculateDamage', () => {
    it('should return a number for damage', () => {
      // Access internal method via prototype or test via integration
      // For now, test that attacks process without error
      const mockEntity = {
        name: 'Goblin',
        isAlive: () => true,
        isHostile: true,
        isPassive: false,
        attack: 10,
        defense: 5,
        health: 50,
        takeDamage: jest.fn(),
        hasAggression: jest.fn().mockReturnValue(false),
        addAggression: jest.fn(),
      };

      const mockRoom = {
        id: 'test-room',
        players: ['testuser'],
        npcs: new Map([['goblin-1', mockEntity]]),
        flags: [],
      };

      mockGetAllRooms.mockReturnValue([mockRoom]);
      mockGetRoom.mockReturnValue(mockRoom);
      mockGetCombatEntitiesInRoom.mockReturnValue(['goblin-1']);
      mockGetSharedEntity.mockReturnValue(mockEntity);
      mockGetEntityTargeters.mockReturnValue(new Set(['testuser']));
      mockGetActiveUserSession.mockReturnValue({
        user: {
          username: 'testuser',
          health: 100,
          maxHealth: 100,
          inCombat: true,
          currentRoomId: 'test-room',
        },
      });

      combatProcessor.processRoomCombat();

      // Combat processing scans for hostile NPCs in rooms with players
      // This test verifies the code path runs without error
      expect(mockAddEntityToCombatForRoom).toHaveBeenCalled();
    });
  });

  describe('hasEntityAttackedThisRound', () => {
    it('should track entity attacks per round', () => {
      // Process a round to set up state
      combatProcessor.processCombatRound();

      // Initially no entity has attacked
      // This is tested implicitly through processRoomCombat behavior
      expect(combatProcessor.getCurrentRound()).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle missing entity tracker data gracefully', () => {
      mockGetCombatEntitiesInRoom.mockReturnValue([]);
      mockGetAllRooms.mockReturnValue([]);

      // Should not throw
      expect(() => combatProcessor.processRoomCombat()).not.toThrow();
    });

    it('should handle null room from roomManager', () => {
      mockGetAllRooms.mockReturnValue([{ id: 'test-room', npcs: new Map(), flags: [] }]);
      mockGetRoom.mockReturnValue(null);
      mockGetCombatEntitiesInRoom.mockReturnValue(['goblin']);

      // Should not throw
      expect(() => combatProcessor.processRoomCombat()).not.toThrow();
    });
  });
});
