/**
 * Mock factory functions for unit tests
 * Consolidates duplicate mock creation code across test files
 * @module test/helpers/mockFactories
 */

import { ConnectedClient, ClientStateType, User, Currency, GameItem } from '../../types';
import { IConnection } from '../../connection/interfaces/connection.interface';
import { Room } from '../../room/room';
import { NPC } from '../../combat/npc';
import { CombatEntity } from '../../combat/combatEntity.interface';
import { CombatSystem } from '../../combat/combatSystem';
import { UserManager } from '../../user/userManager';
import { RoomManager } from '../../room/roomManager';
import { ItemManager } from '../../utils/itemManager';

/**
 * Creates a mock IConnection
 * @param type - Connection type ('telnet' | 'websocket')
 * @returns A mocked IConnection object
 */
export const createMockConnection = (
  type: 'telnet' | 'websocket' = 'telnet'
): jest.Mocked<IConnection> =>
  ({
    write: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    listeners: jest.fn().mockReturnValue([]),
    listenerCount: jest.fn().mockReturnValue(0),
    eventNames: jest.fn().mockReturnValue([]),
    getId: jest.fn().mockReturnValue(`mock-${type}-${Date.now()}`),
    getType: jest.fn().mockReturnValue(type),
    setMaskInput: jest.fn(),
    getRawConnection: jest.fn().mockReturnValue(null),
    remoteAddress: '127.0.0.1',
    enableRawLogging: jest.fn(),
    isRawLoggingEnabled: jest.fn().mockReturnValue(false),
    addListener: jest.fn(),
    prependListener: jest.fn(),
    prependOnceListener: jest.fn(),
    rawListeners: jest.fn().mockReturnValue([]),
    setMaxListeners: jest.fn(),
    getMaxListeners: jest.fn().mockReturnValue(10),
  }) as unknown as jest.Mocked<IConnection>;

/**
 * Creates a default currency object
 * @param overrides - Partial currency overrides
 * @returns Currency object
 */
export const createDefaultCurrency = (overrides: Partial<Currency> = {}): Currency => ({
  gold: 0,
  silver: 0,
  copper: 0,
  ...overrides,
});

/**
 * Creates a mock User
 * @param overrides - Partial user property overrides
 * @returns A User object
 */
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  username: 'testuser',
  health: 100,
  maxHealth: 100,
  mana: 50,
  maxMana: 50,
  experience: 0,
  level: 1,
  strength: 10,
  dexterity: 10,
  agility: 10,
  constitution: 10,
  wisdom: 10,
  intelligence: 10,
  charisma: 10,
  joinDate: new Date(),
  lastLogin: new Date(),
  currentRoomId: 'town-square',
  inventory: {
    items: [],
    currency: createDefaultCurrency(),
  },
  inCombat: false,
  ...overrides,
});

/**
 * Creates a mock ConnectedClient
 * @param overrides - Partial client property overrides
 * @returns A ConnectedClient object
 */
export const createMockClient = (overrides: Partial<ConnectedClient> = {}): ConnectedClient => ({
  id: `test-client-${Date.now()}`,
  connection: createMockConnection(),
  user: null,
  authenticated: false,
  buffer: '',
  state: ClientStateType.AUTHENTICATED,
  stateData: {},
  isTyping: false,
  outputBuffer: [],
  connectedAt: Date.now(),
  lastActivity: Date.now(),
  isBeingMonitored: false,
  ...overrides,
});

/**
 * Creates a mock ConnectedClient with a user already attached
 * @param userOverrides - Partial user property overrides
 * @param clientOverrides - Partial client property overrides
 * @returns A ConnectedClient with user attached
 */
export const createMockClientWithUser = (
  userOverrides: Partial<User> = {},
  clientOverrides: Partial<ConnectedClient> = {}
): ConnectedClient => {
  const user = createMockUser(userOverrides);
  return createMockClient({
    user,
    authenticated: true,
    ...clientOverrides,
  });
};

/**
 * Creates a mock NPC
 * @param overrides - Partial NPC property overrides
 * @returns A mocked NPC object
 */
export const createMockNPC = (overrides: Partial<NPC> = {}): NPC => {
  const npc = {
    name: 'Test NPC',
    health: 100,
    maxHealth: 100,
    damage: [5, 10] as [number, number],
    isHostile: false,
    isPassive: false,
    experienceValue: 50,
    templateId: 'test-npc',
    instanceId: `npc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    description: 'A test NPC.',
    attackTexts: ['attacks $TARGET$'],
    deathMessages: ['falls dead'],
    isMerchant: jest.fn().mockReturnValue(false),
    isUser: jest.fn().mockReturnValue(false),
    isAlive: jest.fn().mockReturnValue(true),
    takeDamage: jest.fn().mockImplementation(function (this: { health: number }, dmg: number) {
      const actual = Math.min(dmg, this.health);
      this.health = Math.max(0, this.health - dmg);
      return actual;
    }),
    getAttackDamage: jest.fn().mockReturnValue(7),
    getAttackText: jest.fn().mockReturnValue('attacks you'),
    getDeathMessage: jest.fn().mockReturnValue('falls dead'),
    getName: jest.fn().mockReturnValue('Test NPC'),
    hasAggression: jest.fn().mockReturnValue(false),
    addAggression: jest.fn(),
    removeAggression: jest.fn(),
    getAllAggressors: jest.fn().mockReturnValue([]),
    clearAllAggression: jest.fn(),
    inventory: [],
    ...overrides,
  } as unknown as NPC;
  return npc;
};

/**
 * Creates a mock Room
 * @param id - Room ID
 * @param name - Room name
 * @param overrides - Additional room property overrides
 * @returns A mocked Room object
 */
export const createMockRoom = (
  id: string = 'test-room',
  name: string = 'Test Room',
  overrides: Partial<Room> = {}
): Room => {
  const room = {
    id,
    name,
    description: `A test room called ${name}.`,
    exits: [],
    players: [],
    items: [],
    npcs: [],
    currency: createDefaultCurrency(),
    addPlayer: jest.fn(),
    removePlayer: jest.fn(),
    addNPC: jest.fn(),
    removeNPC: jest.fn(),
    addItem: jest.fn(),
    removeItem: jest.fn(),
    getDescription: jest.fn().mockReturnValue(`A test room called ${name}.`),
    getDescriptionExcludingPlayer: jest
      .fn()
      .mockReturnValue(`${name}\r\nA test room called ${name}.\r\n`),
    getBriefDescriptionExcludingPlayer: jest.fn().mockReturnValue(`${name} [Brief]\r\n`),
    getExits: jest.fn().mockReturnValue([]),
    getExit: jest.fn().mockReturnValue(null),
    getDescriptionForPeeking: jest.fn().mockReturnValue(''),
    ...overrides,
  } as unknown as Room;
  return room;
};

/**
 * Creates a mock GameItem
 * @param overrides - Partial item property overrides
 * @returns A GameItem object
 */
export const createMockGameItem = (overrides: Partial<GameItem> = {}): GameItem => ({
  id: 'test-item',
  name: 'Test Item',
  description: 'A test item.',
  type: 'misc',
  value: 100,
  ...overrides,
});

/**
 * Creates a mock UserManager
 * @returns A mocked UserManager object
 */
export const createMockUserManager = (): jest.Mocked<UserManager> =>
  ({
    getUser: jest.fn().mockReturnValue(null),
    getAllUsers: jest.fn().mockReturnValue([]),
    saveUsers: jest.fn().mockResolvedValue(undefined),
    addUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    userExists: jest.fn().mockReturnValue(false),
    getUserByUsername: jest.fn().mockReturnValue(null),
    getOnlineUsers: jest.fn().mockReturnValue([]),
    isUserOnline: jest.fn().mockReturnValue(false),
    updateUserStats: jest.fn(),
    unregisterUserSession: jest.fn(),
    authenticateUser: jest.fn().mockReturnValue(false),
    createUser: jest.fn(),
    isUserActive: jest.fn().mockReturnValue(false),
    requestSessionTransfer: jest.fn().mockReturnValue(true),
    resolveSessionTransfer: jest.fn(),
    updateUserInventory: jest.fn().mockReturnValue(true),
    getActiveUserSession: jest.fn().mockReturnValue(undefined),
    cancelTransfer: jest.fn(),
    setTestMode: jest.fn(),
    updateLastLogin: jest.fn(),
    registerUserSession: jest.fn(),
    checkBanStatus: jest.fn().mockReturnValue({ banned: false }),
  }) as unknown as jest.Mocked<UserManager>;

/**
 * Creates a mock RoomManager
 * @returns A mocked RoomManager object
 */
export const createMockRoomManager = (): jest.Mocked<RoomManager> =>
  ({
    getRoom: jest.fn().mockReturnValue(null),
    getRoomById: jest.fn().mockReturnValue(null),
    getAllRooms: jest.fn().mockReturnValue([]),
    getStartingRoom: jest.fn().mockReturnValue(null),
    addRoom: jest.fn(),
    removeRoom: jest.fn(),
    getPlayersInRoom: jest.fn().mockReturnValue([]),
    movePlayerToRoom: jest.fn(),
    addPlayerToRoom: jest.fn(),
    removePlayerFromRoom: jest.fn(),
  }) as unknown as jest.Mocked<RoomManager>;

/**
 * Creates a mock logger (for use with jest.mock)
 * @returns A mock logger object with all standard methods
 */
export const createMockLogger = () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
});

/**
 * Creates a mock player logger factory (for getPlayerLogger mock)
 * @returns A function that returns a mock logger
 */
export const createMockPlayerLoggerFactory = () => jest.fn().mockReturnValue(createMockLogger());

/**
 * Creates a mock system logger
 * @returns A mock system logger object
 */
export const createMockSystemLogger = () => createMockLogger();

/**
 * Creates a mock context logger factory (for createContextLogger mock)
 * @returns A function that returns a mock logger
 */
export const createMockContextLoggerFactory = () => jest.fn().mockReturnValue(createMockLogger());

/**
 * Creates a mock CombatEntity
 * @param overrides - Partial combat entity property overrides
 * @returns A mocked CombatEntity object
 */
export const createMockCombatEntity = (overrides: Partial<CombatEntity> = {}): CombatEntity => {
  const entity = {
    name: 'Test Entity',
    health: 100,
    maxHealth: 100,
    damage: [5, 10] as [number, number],
    isHostile: false,
    isPassive: false,
    experienceValue: 50,
    isAlive: jest.fn().mockReturnValue(true),
    takeDamage: jest.fn().mockImplementation(function (this: { health: number }, dmg: number) {
      const actual = Math.min(dmg, this.health);
      this.health = Math.max(0, this.health - dmg);
      return actual;
    }),
    getAttackDamage: jest.fn().mockReturnValue(7),
    getAttackText: jest.fn((target: string) => `attacks ${target}`),
    hasAggression: jest.fn().mockReturnValue(false),
    addAggression: jest.fn(),
    removeAggression: jest.fn(),
    getAllAggressors: jest.fn().mockReturnValue([]),
    clearAllAggression: jest.fn(),
    isUser: jest.fn().mockReturnValue(false),
    getName: jest.fn().mockReturnValue('Test Entity'),
    ...overrides,
  };
  // Update getName to reflect the name if provided in overrides
  if (overrides.name) {
    (entity.getName as jest.Mock).mockReturnValue(overrides.name);
  }
  return entity as CombatEntity;
};

/**
 * Creates a mock CombatSystem
 * @returns A mocked CombatSystem object
 */
export const createMockCombatSystem = (): jest.Mocked<CombatSystem> =>
  ({
    removeCombatForPlayer: jest.fn(),
    findAllClientsByUsername: jest.fn().mockReturnValue([]),
    isInCombat: jest.fn().mockReturnValue(false),
    engageCombat: jest.fn().mockReturnValue(true),
    getCombat: jest.fn().mockReturnValue(null),
    processCombatRounds: jest.fn(),
  }) as unknown as jest.Mocked<CombatSystem>;

/**
 * Creates a mock ItemManager
 * @returns A mocked ItemManager object
 */
export const createMockItemManager = (): jest.Mocked<ItemManager> =>
  ({
    getItemInstance: jest.fn().mockImplementation((instanceId: string) => ({
      instanceId,
      templateId: instanceId.replace('-instance', '-template'),
      properties: {},
    })),
    getItem: jest.fn().mockImplementation((templateId: string) => ({
      id: templateId,
      name: `Item ${templateId}`,
      type: 'misc',
    })),
    saveItemInstances: jest.fn(),
    createItemInstance: jest.fn(),
    deleteItemInstance: jest.fn(),
    getAllItemInstances: jest.fn().mockReturnValue(new Map()),
  }) as unknown as jest.Mocked<ItemManager>;
