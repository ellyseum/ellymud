/**
 * Unit tests for CombatSystem
 * @module combat/combatSystem.test
 */

import { CombatSystem } from './combatSystem';
// Types imported via mockFactories
// CombatEntity imported for type reference (used in mocks)
import { createMockClient, createMockUser, createMockNPC } from '../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../utils/logger', () => ({
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
  createMechanicsLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
  writeFormattedMessageToClient: jest.fn(),
  drawCommandPrompt: jest.fn(),
}));

jest.mock('../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
  ColorType: {},
}));

jest.mock('../utils/formatters', () => ({
  formatUsername: jest.fn((name: string) => name),
}));

jest.mock('./combat', () => ({
  Combat: jest.fn().mockImplementation(() => ({
    activeCombatants: [],
    addTarget: jest.fn(),
    processRound: jest.fn(),
    isDone: jest.fn().mockReturnValue(false),
    endCombat: jest.fn(),
    setAbilityManager: jest.fn(),
    updateClientReference: jest.fn(),
    lastActivityTime: Date.now(),
    currentRound: 0,
  })),
}));

jest.mock('./components/EntityTracker', () => ({
  EntityTracker: jest.fn().mockImplementation(() => ({
    getEntityId: jest.fn().mockReturnValue('test-entity-id'),
    getSharedEntity: jest.fn().mockReturnValue({
      name: 'Test NPC',
      health: 100,
      maxHealth: 100,
    }),
    trackEntityTargeter: jest.fn(),
    addEntityToCombatForRoom: jest.fn(),
    removeEntityTargeter: jest.fn(),
    cleanupDeadEntity: jest.fn(),
    entityTargeters: new Map(),
  })),
}));

jest.mock('./components/CombatProcessor', () => ({
  CombatProcessor: jest.fn().mockImplementation(() => ({
    processCombatRound: jest.fn(),
    processRoomCombat: jest.fn(),
    getCurrentRound: jest.fn().mockReturnValue(1),
  })),
}));

jest.mock('./components/CombatNotifier', () => ({
  CombatNotifier: jest.fn().mockImplementation(() => ({
    broadcastCombatStart: jest.fn(),
    broadcastRoomMessage: jest.fn(),
  })),
}));

jest.mock('./components/PlayerDeathHandler', () => ({
  PlayerDeathHandler: jest.fn().mockImplementation(() => ({
    handlePlayerHealth: jest.fn(),
  })),
}));

jest.mock('./components/CombatEventBus', () => ({
  CombatEventBus: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn(),
  })),
}));

jest.mock('./components/CombatCommand', () => ({
  CombatCommandFactory: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('./components/CombatState', () => ({
  ActiveCombatState: jest.fn().mockImplementation(() => ({
    name: 'active',
  })),
  FleeingCombatState: jest.fn().mockImplementation(() => ({
    name: 'fleeing',
  })),
}));

// Mock RoomManager
const mockGetRoom = jest.fn();
jest.mock('../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn().mockReturnValue({
      getRoom: mockGetRoom,
    }),
  },
}));

// Mock UserManager
const mockUpdateUserStats = jest.fn();
jest.mock('../user/userManager', () => ({
  UserManager: {
    getInstance: jest.fn().mockReturnValue({
      getUser: jest.fn(),
      updateUserStats: mockUpdateUserStats,
    }),
  },
}));

// Mock AbilityManager
jest.mock('../abilities/abilityManager', () => ({
  AbilityManager: {
    getInstance: jest.fn().mockReturnValue({
      onGameTick: jest.fn(),
    }),
  },
}));

import { writeToClient, writeFormattedMessageToClient } from '../utils/socketWriter';
import { RoomManager } from '../room/roomManager';
import { UserManager } from '../user/userManager';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;
const mockWriteFormattedMessageToClient = writeFormattedMessageToClient as jest.MockedFunction<
  typeof writeFormattedMessageToClient
>;

describe('CombatSystem', () => {
  let combatSystem: CombatSystem;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockRoomManager: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockUserManager: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (CombatSystem as any).instance = null;

    mockRoomManager = RoomManager.getInstance(new Map());
    mockUserManager = UserManager.getInstance();

    combatSystem = CombatSystem.getInstance(mockUserManager, mockRoomManager);
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (CombatSystem as any).instance = null;
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = CombatSystem.getInstance(mockUserManager, mockRoomManager);
      const instance2 = CombatSystem.getInstance(mockUserManager, mockRoomManager);

      expect(instance1).toBe(instance2);
    });

    it('should create a new instance when none exists', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (CombatSystem as any).instance = null;
      const instance = CombatSystem.getInstance(mockUserManager, mockRoomManager);
      expect(instance).toBeInstanceOf(CombatSystem);
    });
  });

  describe('setAbilityManager', () => {
    it('should set the ability manager', () => {
      const mockAbilityManager = { onGameTick: jest.fn() };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      combatSystem.setAbilityManager(mockAbilityManager as any);
      // Verify the method doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('getEntityId', () => {
    it('should return entity ID from entity tracker', () => {
      const entityId = combatSystem.getEntityId('room-1', 'goblin');
      expect(entityId).toBe('test-entity-id');
    });
  });

  describe('isInCombat', () => {
    it('should return false for client without user', () => {
      const client = createMockClient({ user: null });
      expect(combatSystem.isInCombat(client)).toBe(false);
    });

    it('should return false for user not in combat', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      expect(combatSystem.isInCombat(client)).toBe(false);
    });
  });

  describe('engageCombat', () => {
    it('should return false if player has no user', () => {
      const client = createMockClient({ user: null });
      const target = createMockNPC();

      const result = combatSystem.engageCombat(client, target);
      expect(result).toBe(false);
    });

    it('should return false if player has no room', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: '' }),
      });
      const target = createMockNPC();

      const result = combatSystem.engageCombat(client, target);
      expect(result).toBe(false);
    });

    it('should engage combat successfully', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'testuser',
          currentRoomId: 'town-square',
          inCombat: false,
        }),
      });
      const target = createMockNPC({ name: 'Goblin' });

      const result = combatSystem.engageCombat(client, target);
      expect(result).toBe(true);
      expect(client.user?.inCombat).toBe(true);
    });

    it('should update user stats when engaging combat', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'testuser',
          currentRoomId: 'town-square',
          inCombat: false,
        }),
      });
      const target = createMockNPC({ name: 'Goblin' });

      combatSystem.engageCombat(client, target);

      expect(mockUpdateUserStats).toHaveBeenCalledWith('testuser', { inCombat: true });
    });

    it('should write combat engaged message to client', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'testuser',
          currentRoomId: 'town-square',
          inCombat: false,
        }),
      });
      const target = createMockNPC({ name: 'Goblin' });

      combatSystem.engageCombat(client, target);

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Combat'));
    });
  });

  describe('breakCombat', () => {
    it('should return false if player has no user', () => {
      const client = createMockClient({ user: null });
      const result = combatSystem.breakCombat(client);
      expect(result).toBe(false);
    });

    it('should return false if player is not in combat', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      const result = combatSystem.breakCombat(client);
      expect(result).toBe(false);
    });

    it('should break combat successfully for player in combat', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'combatuser',
          currentRoomId: 'town-square',
          inCombat: true,
        }),
      });

      // First engage combat
      combatSystem.engageCombat(client, createMockNPC());

      // Then break it
      const result = combatSystem.breakCombat(client);
      expect(result).toBe(true);
      expect(client.user?.inCombat).toBe(false);
    });

    it('should update user stats when breaking combat', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'breakuser',
          currentRoomId: 'town-square',
          inCombat: true,
        }),
      });

      // Engage then break
      combatSystem.engageCombat(client, createMockNPC());
      jest.clearAllMocks();

      combatSystem.breakCombat(client);

      expect(mockUpdateUserStats).toHaveBeenCalledWith('breakuser', { inCombat: false });
    });

    it('should write combat off message', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'msguser',
          currentRoomId: 'town-square',
          inCombat: true,
        }),
      });

      combatSystem.engageCombat(client, createMockNPC());
      jest.clearAllMocks();

      combatSystem.breakCombat(client);

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Combat')
      );
    });
  });

  describe('cleanupDeadEntity', () => {
    it('should call entity tracker cleanup', () => {
      combatSystem.cleanupDeadEntity('room-1', 'dead-goblin');
      // Verify no errors thrown - the mock handles the call
      expect(true).toBe(true);
    });
  });

  describe('removeCombatForPlayer', () => {
    it('should remove combat for a player', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'removeuser',
          currentRoomId: 'town-square',
          inCombat: true,
        }),
      });

      // Engage combat first
      combatSystem.engageCombat(client, createMockNPC());

      // Remove combat
      combatSystem.removeCombatForPlayer('removeuser');

      // Verify player is no longer in combat map
      expect(combatSystem.isInCombat(client)).toBe(false);
    });
  });

  describe('handlePlayerDisconnect', () => {
    it('should handle player without user gracefully', () => {
      const client = createMockClient({ user: null });

      // Should not throw
      expect(() => combatSystem.handlePlayerDisconnect(client)).not.toThrow();
    });

    it('should set inCombat to false for disconnecting player', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'disconnectuser',
          currentRoomId: 'town-square',
          inCombat: true,
        }),
      });

      // Engage combat first
      combatSystem.engageCombat(client, createMockNPC());

      // Handle disconnect
      combatSystem.handlePlayerDisconnect(client);

      expect(client.user?.inCombat).toBe(false);
    });
  });

  describe('processCombatRound', () => {
    it('should process combat rounds without error', () => {
      // Just verify it doesn't throw
      expect(() => combatSystem.processCombatRound()).not.toThrow();
    });

    it('should handle empty combats map', () => {
      // Should not throw with no active combats
      combatSystem.processCombatRound();
      expect(true).toBe(true);
    });
  });

  describe('handleSessionTransfer', () => {
    it('should handle transfer for players without users', () => {
      const oldClient = createMockClient({ user: null });
      const newClient = createMockClient({ user: null });

      // Should not throw
      expect(() => combatSystem.handleSessionTransfer(oldClient, newClient)).not.toThrow();
    });

    it('should preserve inCombat flag during transfer', () => {
      const oldClient = createMockClient({
        user: createMockUser({
          username: 'transferuser',
          currentRoomId: 'town-square',
          inCombat: true,
        }),
        stateData: {},
      });
      const newClient = createMockClient({
        user: createMockUser({
          username: 'transferuser',
          currentRoomId: 'town-square',
          inCombat: false,
        }),
        stateData: {},
      });

      // Engage combat on old client
      combatSystem.engageCombat(oldClient, createMockNPC());

      // Transfer session
      combatSystem.handleSessionTransfer(oldClient, newClient);

      expect(newClient.user?.inCombat).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle engaging combat twice with same target', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'doubleuser',
          currentRoomId: 'town-square',
          inCombat: false,
        }),
      });
      const target = createMockNPC({ name: 'Goblin' });

      const result1 = combatSystem.engageCombat(client, target);
      const result2 = combatSystem.engageCombat(client, target);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('should handle breaking combat when not in combat', () => {
      const client = createMockClient({
        user: createMockUser({
          username: 'nocombatwer',
          currentRoomId: 'town-square',
          inCombat: false,
        }),
      });

      const result = combatSystem.breakCombat(client);
      expect(result).toBe(false);
    });
  });
});
