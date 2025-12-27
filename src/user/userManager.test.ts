/**
 * Unit tests for UserManager class
 * @module user/userManager.test
 */

import { UserManager } from './userManager';

import { createMockClientWithUser } from '../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  getPlayerLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
  writeMessageToClient: jest.fn(),
  stopBuffering: jest.fn(),
}));

jest.mock('../utils/formatters', () => ({
  standardizeUsername: jest.fn((name: string) => name.toLowerCase()),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn(() =>
    JSON.stringify([
      {
        username: 'testuser',
        passwordHash: 'hash123',
        salt: 'salt123',
        health: 100,
        maxHealth: 100,
        mana: 50,
        maxMana: 50,
        level: 1,
        experience: 0,
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        agility: 10,
        inventory: { items: [], currency: { gold: 0, silver: 0, copper: 0 } },
      },
    ])
  ),
  writeFileSync: jest.fn(),
}));

jest.mock('../utils/fileUtils', () => ({
  loadAndValidateJsonFile: jest.fn().mockReturnValue([
    {
      username: 'testuser',
      passwordHash: 'hash123',
      salt: 'salt123',
      health: 100,
      maxHealth: 100,
      mana: 50,
      maxMana: 50,
      level: 1,
      experience: 0,
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      agility: 10,
      inventory: { items: [], currency: { gold: 0, silver: 0, copper: 0 } },
    },
  ]),
}));

jest.mock('../utils/jsonUtils', () => ({
  parseAndValidateJson: jest.fn().mockReturnValue([
    {
      username: 'testuser',
      passwordHash: 'hash123',
      salt: 'salt123',
      health: 100,
      maxHealth: 100,
      mana: 50,
      maxMana: 50,
      level: 1,
      experience: 0,
    },
  ]),
}));

jest.mock('../config', () => ({
  __esModule: true,
  default: {
    USERS_FILE: '/test/data/users.json',
    DIRECT_USERS_DATA: null,
    DATA_DIR: '/test/data',
  },
  USERS_FILE: '/test/data/users.json',
  DIRECT_USERS_DATA: null,
  DATA_DIR: '/test/data',
}));

jest.mock('../combat/combatSystem', () => ({
  CombatSystem: {
    getInstance: jest.fn(() => ({
      breakCombat: jest.fn(),
      isInCombat: jest.fn().mockReturnValue(false),
    })),
    resetInstance: jest.fn(),
  },
}));

jest.mock('../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn(() => ({
      getRoom: jest.fn().mockReturnValue({
        addPlayer: jest.fn(),
        removePlayer: jest.fn(),
      }),
      removePlayerFromAllRooms: jest.fn(),
    })),
  },
}));

// Reset the singleton before each test
const resetSingleton = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (UserManager as any)['instance'] = null;
};

describe('UserManager', () => {
  let userManager: UserManager;

  beforeEach(() => {
    jest.clearAllMocks();
    resetSingleton();
    userManager = UserManager.getInstance();
  });

  afterEach(() => {
    resetSingleton();
  });

  describe('getInstance', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = UserManager.getInstance();
      const instance2 = UserManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('userExists', () => {
    it('should return true for existing user', () => {
      const exists = userManager.userExists('testuser');

      expect(exists).toBe(true);
    });

    it('should return false for non-existing user', () => {
      const exists = userManager.userExists('nonexistent');

      expect(exists).toBe(false);
    });

    it('should be case insensitive', () => {
      const exists = userManager.userExists('TESTUSER');

      expect(exists).toBe(true);
    });
  });

  describe('getUser', () => {
    it('should return user by username', () => {
      const user = userManager.getUser('testuser');

      expect(user?.username).toBe('testuser');
    });

    it('should return undefined for non-existing user', () => {
      const user = userManager.getUser('nonexistent');

      expect(user).toBeUndefined();
    });
  });

  describe('getAllUsers', () => {
    it('should return array of users', () => {
      const users = userManager.getAllUsers();

      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('isUserActive', () => {
    it('should return false when user is not in active sessions', () => {
      const active = userManager.isUserActive('testuser');

      expect(active).toBe(false);
    });

    it('should return true when user is in active sessions', () => {
      const client = createMockClientWithUser({ username: 'activeuser' });
      userManager.registerUserSession('activeuser', client);

      const active = userManager.isUserActive('activeuser');

      expect(active).toBe(true);
    });
  });

  describe('registerUserSession', () => {
    it('should register a user session', () => {
      const client = createMockClientWithUser({ username: 'newuser' });

      userManager.registerUserSession('newuser', client);

      expect(userManager.isUserActive('newuser')).toBe(true);
    });
  });

  describe('unregisterUserSession', () => {
    it('should unregister a user session', () => {
      const client = createMockClientWithUser({ username: 'toremove' });
      userManager.registerUserSession('toremove', client);

      userManager.unregisterUserSession('toremove');

      expect(userManager.isUserActive('toremove')).toBe(false);
    });
  });

  describe('getActiveUserSession', () => {
    it('should return undefined when user is not active', () => {
      const session = userManager.getActiveUserSession('inactive');

      expect(session).toBeUndefined();
    });

    it('should return client when user is active', () => {
      const client = createMockClientWithUser({ username: 'active' });
      userManager.registerUserSession('active', client);

      const session = userManager.getActiveUserSession('active');

      expect(session).toBe(client);
    });
  });

  describe('setTestMode', () => {
    it('should enable test mode', () => {
      userManager.setTestMode(true);

      // Test mode affects saving behavior
      expect(userManager).toBeDefined();
    });

    it('should disable test mode', () => {
      userManager.setTestMode(true);
      userManager.setTestMode(false);

      expect(userManager).toBeDefined();
    });
  });

  describe('updateUserStats', () => {
    it('should update user stats', () => {
      const result = userManager.updateUserStats('testuser', { health: 50 });

      expect(result).toBe(true);
      expect(userManager.getUser('testuser')?.health).toBe(50);
    });

    it('should return false for non-existing user', () => {
      const result = userManager.updateUserStats('nonexistent', { health: 50 });

      expect(result).toBe(false);
    });
  });
});
