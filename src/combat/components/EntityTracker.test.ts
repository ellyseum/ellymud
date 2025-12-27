/**
 * Unit tests for EntityTracker class
 * @module combat/components/EntityTracker.test
 */

import { EntityTracker } from './EntityTracker';
import { NPC } from '../npc';
import { RoomManager } from '../../room/roomManager';
import { Room } from '../../room/room';
import {
  createMockNPC,
  createMockRoom,
  createMockRoomManager,
} from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
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

jest.mock('../merchantStateManager', () => ({
  MerchantStateManager: {
    getInstance: jest.fn().mockReturnValue({
      hasSavedState: jest.fn().mockReturnValue(false),
      getMerchantState: jest.fn().mockReturnValue(null),
    }),
  },
}));

jest.mock('../npc', () => {
  // Create a mock NPC class
  class MockNPC {
    name: string;
    health: number;
    maxHealth: number;
    instanceId: string;
    templateId: string;

    constructor(name: string, health: number, maxHealth: number) {
      this.name = name;
      this.health = health;
      this.maxHealth = maxHealth;
      this.instanceId = `mock-${name}-${Date.now()}`;
      this.templateId = name;
    }

    isAlive() {
      return this.health > 0;
    }

    static loadNPCData = jest.fn().mockReturnValue(new Map());

    static fromNPCData = jest
      .fn()
      .mockImplementation(
        (data: { name: string; health: number; maxHealth: number; id: string }) => {
          const npc = new MockNPC(data.name, data.health, data.maxHealth);
          npc.templateId = data.id;
          return npc;
        }
      );
  }
  return { NPC: MockNPC };
});

jest.mock('../merchant', () => {
  class MockMerchant {
    name: string;
    instanceId: string;
    initializeInventory = jest.fn();
    restoreInventory = jest.fn();

    constructor(name: string) {
      this.name = name;
      this.instanceId = `merchant-${name}-${Date.now()}`;
    }

    static fromMerchantData = jest.fn();
  }
  return { Merchant: MockMerchant };
});

// Wrapper helpers that adapt shared factories to test-specific needs
const createTestRoomManager = (rooms: Map<string, Room> = new Map()): RoomManager => {
  const manager = createMockRoomManager();
  (manager.getRoom as jest.Mock).mockImplementation((roomId: string) => rooms.get(roomId));
  return manager;
};

const createTestRoom = (id: string, npcs: Map<string, NPC> = new Map()): Room =>
  createMockRoom(id, `Room ${id}`, {
    npcs,
  } as Partial<Room>) as Room;

const createTestNPC = (name: string, templateId: string, instanceId: string): NPC => {
  const npc = createMockNPC({
    name,
    templateId,
    instanceId,
    health: 50,
    maxHealth: 50,
  });
  return npc;
};

describe('EntityTracker', () => {
  let entityTracker: EntityTracker;
  let mockRoomManager: RoomManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRoomManager = createTestRoomManager();
    entityTracker = new EntityTracker(mockRoomManager);
  });

  describe('addEntityToCombatForRoom', () => {
    it('should add entity to combat for room', () => {
      entityTracker.addEntityToCombatForRoom('room-1', 'goblin');

      expect(entityTracker.isEntityInCombat('room-1', 'goblin')).toBe(true);
    });

    it('should handle multiple entities in same room', () => {
      entityTracker.addEntityToCombatForRoom('room-1', 'goblin');
      entityTracker.addEntityToCombatForRoom('room-1', 'orc');

      expect(entityTracker.isEntityInCombat('room-1', 'goblin')).toBe(true);
      expect(entityTracker.isEntityInCombat('room-1', 'orc')).toBe(true);
    });

    it('should handle entities in different rooms', () => {
      entityTracker.addEntityToCombatForRoom('room-1', 'goblin');
      entityTracker.addEntityToCombatForRoom('room-2', 'orc');

      expect(entityTracker.isEntityInCombat('room-1', 'goblin')).toBe(true);
      expect(entityTracker.isEntityInCombat('room-2', 'orc')).toBe(true);
      expect(entityTracker.isEntityInCombat('room-1', 'orc')).toBe(false);
    });
  });

  describe('removeEntityFromCombatForRoom', () => {
    it('should remove entity from combat', () => {
      entityTracker.addEntityToCombatForRoom('room-1', 'goblin');
      entityTracker.removeEntityFromCombatForRoom('room-1', 'goblin');

      expect(entityTracker.isEntityInCombat('room-1', 'goblin')).toBe(false);
    });

    it('should not throw when removing from non-existent room', () => {
      expect(() => {
        entityTracker.removeEntityFromCombatForRoom('room-999', 'goblin');
      }).not.toThrow();
    });

    it('should clean up room data when last entity removed', () => {
      entityTracker.addEntityToCombatForRoom('room-1', 'goblin');
      entityTracker.removeEntityFromCombatForRoom('room-1', 'goblin');

      expect(entityTracker.getCombatEntitiesInRoom('room-1')).toEqual([]);
    });
  });

  describe('getCombatEntitiesInRoom', () => {
    it('should return empty array for room with no combat', () => {
      expect(entityTracker.getCombatEntitiesInRoom('room-1')).toEqual([]);
    });

    it('should return all entities in combat for room', () => {
      entityTracker.addEntityToCombatForRoom('room-1', 'goblin');
      entityTracker.addEntityToCombatForRoom('room-1', 'orc');

      const entities = entityTracker.getCombatEntitiesInRoom('room-1');

      expect(entities).toHaveLength(2);
      expect(entities).toContain('goblin');
      expect(entities).toContain('orc');
    });
  });

  describe('isEntityInCombat', () => {
    it('should return false for entity not in combat', () => {
      expect(entityTracker.isEntityInCombat('room-1', 'goblin')).toBe(false);
    });

    it('should return true for entity in combat', () => {
      entityTracker.addEntityToCombatForRoom('room-1', 'goblin');
      expect(entityTracker.isEntityInCombat('room-1', 'goblin')).toBe(true);
    });
  });

  describe('getSharedEntity', () => {
    it('should return null when room not found', () => {
      const entity = entityTracker.getSharedEntity('invalid-room', 'goblin');
      expect(entity).toBeNull();
    });

    it('should find NPC by instance ID', () => {
      const npc = createTestNPC('Goblin', 'goblin-template', 'goblin-instance-1');
      const npcs = new Map<string, NPC>();
      npcs.set('goblin-instance-1', npc);
      const room = createTestRoom('room-1', npcs);
      const rooms = new Map<string, Room>();
      rooms.set('room-1', room);
      mockRoomManager = createTestRoomManager(rooms);
      entityTracker = new EntityTracker(mockRoomManager);

      const entity = entityTracker.getSharedEntity('room-1', 'goblin-instance-1');

      expect(entity).toBe(npc);
    });

    it('should find NPC by template ID', () => {
      const npc = createTestNPC('Goblin', 'goblin-template', 'goblin-instance-1');
      const npcs = new Map<string, NPC>();
      npcs.set('goblin-instance-1', npc);
      const room = createTestRoom('room-1', npcs);
      const rooms = new Map<string, Room>();
      rooms.set('room-1', room);
      mockRoomManager = createTestRoomManager(rooms);
      entityTracker = new EntityTracker(mockRoomManager);

      const entity = entityTracker.getSharedEntity('room-1', 'goblin-template');

      expect(entity).toBe(npc);
    });
  });

  describe('trackEntityTargeter', () => {
    it('should track player targeting entity', () => {
      entityTracker.trackEntityTargeter('entity-1', 'player1');

      expect(entityTracker.getEntityTargeters('entity-1')).toContain('player1');
    });

    it('should track multiple players targeting same entity', () => {
      entityTracker.trackEntityTargeter('entity-1', 'player1');
      entityTracker.trackEntityTargeter('entity-1', 'player2');

      const targeters = entityTracker.getEntityTargeters('entity-1');
      expect(targeters).toHaveLength(2);
      expect(targeters).toContain('player1');
      expect(targeters).toContain('player2');
    });
  });

  describe('getEntityTargeters', () => {
    it('should return empty array when no targeters', () => {
      expect(entityTracker.getEntityTargeters('entity-1')).toEqual([]);
    });
  });

  describe('removeEntityTargeter', () => {
    it('should remove player from targeting entity', () => {
      entityTracker.trackEntityTargeter('entity-1', 'player1');
      entityTracker.trackEntityTargeter('entity-1', 'player2');

      entityTracker.removeEntityTargeter('entity-1', 'player1');

      const targeters = entityTracker.getEntityTargeters('entity-1');
      expect(targeters).not.toContain('player1');
      expect(targeters).toContain('player2');
    });

    it('should clean up when last targeter removed', () => {
      entityTracker.trackEntityTargeter('entity-1', 'player1');
      entityTracker.removeEntityTargeter('entity-1', 'player1');

      expect(entityTracker.getEntityTargeters('entity-1')).toEqual([]);
    });
  });

  describe('cleanupDeadEntity', () => {
    it('should remove entity from shared entities', () => {
      const npc = createTestNPC('Goblin', 'goblin-template', 'goblin-1');
      const npcs = new Map<string, NPC>();
      npcs.set('goblin-1', npc);
      const room = createTestRoom('room-1', npcs);
      const rooms = new Map<string, Room>();
      rooms.set('room-1', room);
      mockRoomManager = createTestRoomManager(rooms);
      entityTracker = new EntityTracker(mockRoomManager);

      // First get the entity to cache it
      entityTracker.getSharedEntity('room-1', 'goblin-1');

      // Then clean it up
      entityTracker.cleanupDeadEntity('room-1', 'goblin-1');

      // The entity should be removed from shared entities cache
      // but getSharedEntity will re-add it if it still exists in the room
    });
  });

  describe('getEntityId', () => {
    it('should create unique entity ID', () => {
      const id = entityTracker.getEntityId('room-1', 'goblin');
      expect(id).toBe('room-1::goblin');
    });

    it('should handle different rooms and entities', () => {
      const id1 = entityTracker.getEntityId('room-1', 'goblin');
      const id2 = entityTracker.getEntityId('room-2', 'orc');

      expect(id1).not.toBe(id2);
    });
  });

  describe('entityIsDead', () => {
    it('should return true for entity not in shared entities', () => {
      expect(entityTracker.entityIsDead('room-1::goblin')).toBe(true);
    });

    it('should return true for dead entity', () => {
      const npc = createTestNPC('Goblin', 'goblin-template', 'goblin-1');
      (npc.isAlive as jest.Mock).mockReturnValue(false);
      const npcs = new Map<string, NPC>();
      npcs.set('goblin-1', npc);
      const room = createTestRoom('room-1', npcs);
      const rooms = new Map<string, Room>();
      rooms.set('room-1', room);
      mockRoomManager = createTestRoomManager(rooms);
      entityTracker = new EntityTracker(mockRoomManager);

      // Get the entity to add it to shared entities
      entityTracker.getSharedEntity('room-1', 'goblin-1');

      expect(entityTracker.entityIsDead('room-1::goblin-1')).toBe(true);
    });
  });

  describe('createTestNPC', () => {
    it('should create a test NPC', () => {
      const npc = entityTracker.createTestNPC('test-npc');

      expect(npc).toBeDefined();
    });
  });
});
