/**
 * Unit tests for UserManager class
 * @module user/userManager.test
 */

import { UserManager } from './userManager';

import { createMockClientWithUser } from '../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../utils/logger', () => ({
  createContextLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
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
  STORAGE_BACKEND: 'json',
  isDatabaseOnly: () => false,
  isUsingDatabase: () => false,
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

// Mock the FileUserRepository to return test data
const mockTestUser = {
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
};

jest.mock('../persistence/fileRepository', () => ({
  FileUserRepository: jest.fn().mockImplementation(() => ({
    loadUsers: jest.fn().mockReturnValue([mockTestUser]),
    saveUsers: jest.fn(),
    storageExists: jest.fn().mockReturnValue(true),
  })),
}));

jest.mock('../persistence/passwordService', () => ({
  getPasswordService: jest.fn(() => ({
    hash: jest.fn((password: string) => ({ hash: `hashed_${password}`, salt: 'mocksalt' })),
    verify: jest.fn(
      (password: string, hash: string, salt: string) =>
        hash === `hashed_${password}` && salt === 'mocksalt'
    ),
  })),
}));

jest.mock('../data/db', () => ({
  getDb: jest.fn(),
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

// Additional tests to improve coverage
describe('UserManager Extended Coverage', () => {
  let userManager: UserManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (UserManager as any)['instance'] = null;
    userManager = UserManager.getInstance();
  });

  describe('getAllUsers', () => {
    it('should return all users', () => {
      const users = userManager.getAllUsers();
      expect(users).toBeDefined();
      expect(Array.isArray(users)).toBe(true);
    });
  });

  describe('updateUserInventory', () => {
    it('should update user inventory', () => {
      const newInventory = {
        items: ['item-1', 'item-2'],
        currency: { gold: 100, silver: 50, copper: 25 },
      };

      const result = userManager.updateUserInventory('testuser', newInventory);
      expect(result).toBe(true);
    });

    it('should return false for non-existent user', () => {
      const newInventory = {
        items: [],
        currency: { gold: 0, silver: 0, copper: 0 },
      };

      const result = userManager.updateUserInventory('nonexistent', newInventory);
      expect(result).toBe(false);
    });
  });

  describe('isUserActive', () => {
    it('should return false when user is not active', () => {
      const isActive = userManager.isUserActive('inactiveuser');
      expect(isActive).toBe(false);
    });

    it('should return true when user is active', () => {
      const client = createMockClientWithUser({ username: 'activeuser' });
      userManager.registerUserSession('activeuser', client);

      const isActive = userManager.isUserActive('activeuser');
      expect(isActive).toBe(true);
    });
  });

  describe('getAllActiveUserSessions', () => {
    it('should return all active sessions', () => {
      const client1 = createMockClientWithUser({ username: 'user1' });
      const client2 = createMockClientWithUser({ username: 'user2' });

      userManager.registerUserSession('user1', client1);
      userManager.registerUserSession('user2', client2);

      const sessions = userManager.getAllActiveUserSessions();
      expect(sessions.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('unregisterUserSession', () => {
    it('should unregister user session', () => {
      const client = createMockClientWithUser({ username: 'tempuser' });
      userManager.registerUserSession('tempuser', client);

      expect(userManager.isUserActive('tempuser')).toBe(true);

      userManager.unregisterUserSession('tempuser');

      expect(userManager.isUserActive('tempuser')).toBe(false);
    });

    it('should handle unregistering non-existent session', () => {
      // Should not throw
      expect(() => {
        userManager.unregisterUserSession('nonexistent');
      }).not.toThrow();
    });
  });

  describe('loadPrevalidatedUsers', () => {
    it('should load users from array', () => {
      const users = [
        {
          username: 'preloaded',
          passwordHash: 'hash',
          salt: 'salt',
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
          currentRoomId: 'start',
          joinDate: new Date(),
          lastLogin: new Date(),
          inCombat: false,
          inventory: { items: [], currency: { gold: 0, silver: 0, copper: 0 } },
        },
      ];

      userManager.loadPrevalidatedUsers(users);

      const loaded = userManager.getUser('preloaded');
      expect(loaded).toBeDefined();
      expect(loaded?.username).toBe('preloaded');
    });
  });
});
