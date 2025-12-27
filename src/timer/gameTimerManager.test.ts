import { GameTimerManager } from './gameTimerManager';
import { UserManager } from '../user/userManager';
import { RoomManager } from '../room/roomManager';
import { CombatSystem } from '../combat/combatSystem';
import { EffectManager } from '../effects/effectManager';

// Mock dependencies
jest.mock('../user/userManager');
jest.mock('../room/roomManager');
jest.mock('../combat/combatSystem');
jest.mock('../effects/effectManager');
jest.mock('../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  createContextLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  createMechanicsLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  getPlayerLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));
jest.mock('../utils/socketWriter', () => ({
  drawCommandPrompt: jest.fn(),
}));

// Helper to reset singleton for testing
const resetSingleton = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (GameTimerManager as any)['instance'] = null;
};

describe('GameTimerManager', () => {
  let mockUserManager: jest.Mocked<UserManager>;
  let mockRoomManager: jest.Mocked<RoomManager>;
  let mockCombatSystem: jest.Mocked<CombatSystem>;
  let mockEffectManager: jest.Mocked<EffectManager>;

  beforeEach(() => {
    resetSingleton();
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup mocks
    mockUserManager = {
      getUsers: jest.fn().mockReturnValue(new Map()),
      saveUsers: jest.fn().mockResolvedValue(undefined),
      getAllActiveUserSessions: jest.fn().mockReturnValue(new Map()),
    } as unknown as jest.Mocked<UserManager>;

    mockRoomManager = {
      saveRooms: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RoomManager>;

    mockCombatSystem = {
      processCombatRound: jest.fn(),
      processRoomCombat: jest.fn(),
    } as unknown as jest.Mocked<CombatSystem>;

    mockEffectManager = {
      processGameTick: jest.fn(),
    } as unknown as jest.Mocked<EffectManager>;

    // Mock static getInstance methods
    (UserManager.getInstance as jest.Mock).mockReturnValue(mockUserManager);
    (RoomManager.getInstance as jest.Mock).mockReturnValue(mockRoomManager);
    (CombatSystem.getInstance as jest.Mock).mockReturnValue(mockCombatSystem);
    (EffectManager.getInstance as jest.Mock).mockReturnValue(mockEffectManager);
  });

  afterEach(() => {
    const instance = GameTimerManager.getInstance(mockUserManager, mockRoomManager);
    if (instance.isRunning()) {
      instance.stop();
    }
    resetSingleton();
    jest.useRealTimers();
  });

  describe('getInstance', () => {
    it('should return a GameTimerManager instance', () => {
      const instance = GameTimerManager.getInstance(mockUserManager, mockRoomManager);
      expect(instance).toBeInstanceOf(GameTimerManager);
    });

    it('should return the same instance on multiple calls (singleton pattern)', () => {
      const instance1 = GameTimerManager.getInstance(mockUserManager, mockRoomManager);
      const instance2 = GameTimerManager.getInstance(mockUserManager, mockRoomManager);
      expect(instance1).toBe(instance2);
    });
  });

  describe('advanceTicks', () => {
    it('should advance tick count by specified amount', () => {
      const manager = GameTimerManager.getInstance(mockUserManager, mockRoomManager);
      const initialCount = manager.getTickCount();

      manager.advanceTicks(5);

      expect(manager.getTickCount()).toBe(initialCount + 5);
    });

    it('should process effects for each tick', () => {
      const manager = GameTimerManager.getInstance(mockUserManager, mockRoomManager);

      manager.advanceTicks(3);

      expect(mockEffectManager.processGameTick).toHaveBeenCalledTimes(3);
    });

    it('should process combat rounds for each tick', () => {
      const manager = GameTimerManager.getInstance(mockUserManager, mockRoomManager);

      manager.advanceTicks(3);

      expect(mockCombatSystem.processCombatRound).toHaveBeenCalledTimes(3);
      expect(mockCombatSystem.processRoomCombat).toHaveBeenCalledTimes(3);
    });

    it('should advance 12 ticks for regeneration testing', () => {
      const manager = GameTimerManager.getInstance(mockUserManager, mockRoomManager);
      const initialCount = manager.getTickCount();

      manager.advanceTicks(12);

      expect(manager.getTickCount()).toBe(initialCount + 12);
      expect(mockEffectManager.processGameTick).toHaveBeenCalledTimes(12);
    });

    it('should work with single tick', () => {
      const manager = GameTimerManager.getInstance(mockUserManager, mockRoomManager);
      const initialCount = manager.getTickCount();

      manager.advanceTicks(1);

      expect(manager.getTickCount()).toBe(initialCount + 1);
      expect(mockCombatSystem.processCombatRound).toHaveBeenCalledTimes(1);
    });

    it('should handle zero ticks gracefully', () => {
      const manager = GameTimerManager.getInstance(mockUserManager, mockRoomManager);
      const initialCount = manager.getTickCount();

      manager.advanceTicks(0);

      expect(manager.getTickCount()).toBe(initialCount);
      expect(mockEffectManager.processGameTick).not.toHaveBeenCalled();
    });
  });

  describe('setTestMode', () => {
    it('should enable test mode', () => {
      const manager = GameTimerManager.getInstance(mockUserManager, mockRoomManager);

      manager.setTestMode(true);

      expect(manager.isTestMode()).toBe(true);
    });

    it('should disable test mode', () => {
      const manager = GameTimerManager.getInstance(mockUserManager, mockRoomManager);
      manager.setTestMode(true);

      manager.setTestMode(false);

      expect(manager.isTestMode()).toBe(false);
    });

    it('should stop timer when enabling test mode while running', () => {
      const manager = GameTimerManager.getInstance(mockUserManager, mockRoomManager);
      manager.start();
      expect(manager.isRunning()).toBe(true);

      manager.setTestMode(true);

      expect(manager.isRunning()).toBe(false);
      expect(manager.isTestMode()).toBe(true);
    });
  });

  describe('isTestMode', () => {
    it('should return false by default', () => {
      const manager = GameTimerManager.getInstance(mockUserManager, mockRoomManager);
      expect(manager.isTestMode()).toBe(false);
    });

    it('should return true after enabling test mode', () => {
      const manager = GameTimerManager.getInstance(mockUserManager, mockRoomManager);
      manager.setTestMode(true);
      expect(manager.isTestMode()).toBe(true);
    });
  });

  describe('start in test mode', () => {
    it('should prevent timer from starting when test mode is active', () => {
      const manager = GameTimerManager.getInstance(mockUserManager, mockRoomManager);
      manager.setTestMode(true);

      manager.start();

      expect(manager.isRunning()).toBe(false);
    });

    it('should allow advanceTicks to work in test mode', () => {
      const manager = GameTimerManager.getInstance(mockUserManager, mockRoomManager);
      manager.setTestMode(true);
      const initialCount = manager.getTickCount();

      manager.advanceTicks(5);

      expect(manager.getTickCount()).toBe(initialCount + 5);
    });
  });

  describe('getTickCount', () => {
    it('should return 0 initially', () => {
      const manager = GameTimerManager.getInstance(mockUserManager, mockRoomManager);
      manager.resetTickCount();
      expect(manager.getTickCount()).toBe(0);
    });

    it('should increment with each tick', () => {
      const manager = GameTimerManager.getInstance(mockUserManager, mockRoomManager);
      manager.resetTickCount();

      manager.forceTick();

      expect(manager.getTickCount()).toBe(1);
    });
  });

  describe('resetTickCount', () => {
    it('should reset tick count to zero', () => {
      const manager = GameTimerManager.getInstance(mockUserManager, mockRoomManager);
      manager.advanceTicks(10);

      manager.resetTickCount();

      expect(manager.getTickCount()).toBe(0);
    });
  });
});
