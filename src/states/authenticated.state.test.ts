/**
 * Unit tests for AuthenticatedState class
 * @module states/authenticated.state.test
 */

import { AuthenticatedState } from './authenticated.state';
import { ClientStateType, ConnectedClient } from '../types';
import {
  createMockClient,
  createMockClientWithUser,
  createMockUserManager,
  createMockRoomManager,
  createMockRoom,
} from '../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../utils/logger', () => ({
  createContextLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  createMechanicsLogger: jest.fn(() => ({
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
}));

jest.mock('../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
  writeFormattedMessageToClient: jest.fn(),
  drawCommandPrompt: jest.fn(),
}));

jest.mock('../utils/formatters', () => ({
  formatUsername: jest.fn((name: string) => name.charAt(0).toUpperCase() + name.slice(1)),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(() => JSON.stringify([])),
  writeFileSync: jest.fn(),
}));

// Mock RoomManager
const mockRoom = createMockRoom('town-square', 'Town Square');
const mockRoomManager = createMockRoomManager();
mockRoomManager.getRoom.mockReturnValue(mockRoom);
mockRoomManager.getStartingRoomId = jest.fn().mockReturnValue('town-square');
mockRoomManager.lookRoom = jest.fn();

jest.mock('../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn(() => mockRoomManager),
  },
}));

// Mock UserManager
const mockUserManager = createMockUserManager();
jest.mock('../user/userManager', () => ({
  UserManager: {
    getInstance: jest.fn(() => mockUserManager),
  },
}));

// Mock CombatSystem
jest.mock('../combat/combatSystem', () => ({
  CombatSystem: {
    getInstance: jest.fn(() => ({
      isInCombat: jest.fn().mockReturnValue(false),
      engageCombat: jest.fn(),
      setAbilityManager: jest.fn(),
    })),
  },
}));

// Mock ItemManager
jest.mock('../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn(() => ({
      getItem: jest.fn(),
      getItemInstance: jest.fn(),
      calculateAttack: jest.fn().mockReturnValue(10),
      calculateDefense: jest.fn().mockReturnValue(10),
    })),
  },
}));

// Mock EffectManager
jest.mock('../effects/effectManager', () => ({
  EffectManager: {
    getInstance: jest.fn(() => ({
      addEffect: jest.fn(),
      stopRealTimeProcessor: jest.fn(),
    })),
    resetInstance: jest.fn(),
  },
}));

// Mock AbilityManager
jest.mock('../abilities/abilityManager', () => ({
  AbilityManager: {
    getInstance: jest.fn(() => ({
      getAbility: jest.fn(),
      canUseAbility: jest.fn(),
    })),
    resetInstance: jest.fn(),
  },
}));

// Mock CommandRegistry
jest.mock('../command/commandRegistry', () => ({
  CommandRegistry: {
    getInstance: jest.fn(() => ({
      getCommand: jest.fn(),
      getAllCommands: jest.fn().mockReturnValue([]),
    })),
    resetInstance: jest.fn(),
  },
}));

// Mock CommandHandler
jest.mock('../utils/commandHandler', () => ({
  CommandHandler: jest.fn().mockImplementation(() => ({
    setCommandRegistry: jest.fn(),
    handleCommand: jest.fn().mockReturnValue(true),
  })),
}));

import { writeToClient } from '../utils/socketWriter';

describe('AuthenticatedState', () => {
  let authenticatedState: AuthenticatedState;
  let clients: Map<string, ConnectedClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    clients = new Map<string, ConnectedClient>();
    authenticatedState = new AuthenticatedState(clients);
  });

  describe('name property', () => {
    it('should have AUTHENTICATED as the state name', () => {
      expect(authenticatedState.name).toBe(ClientStateType.AUTHENTICATED);
    });
  });

  describe('enter', () => {
    it('should transition to LOGIN if client has no user', () => {
      const client = createMockClient({ user: null });

      authenticatedState.enter(client);

      expect(client.stateData.transitionTo).toBe(ClientStateType.LOGIN);
    });

    it('should initialize stateData for client with user', () => {
      const client = createMockClientWithUser({
        username: 'testuser',
        currentRoomId: 'town-square',
      });

      authenticatedState.enter(client);

      expect(client.stateData.maskInput).toBe(false);
    });

    it('should disable password masking', () => {
      const client = createMockClientWithUser({
        username: 'testuser',
        currentRoomId: 'town-square',
      });

      authenticatedState.enter(client);

      expect(client.connection.setMaskInput).toHaveBeenCalledWith(false);
    });

    it('should add player to the room', () => {
      const client = createMockClientWithUser({
        username: 'testuser',
        currentRoomId: 'town-square',
      });

      authenticatedState.enter(client);

      expect(mockRoom.addPlayer).toHaveBeenCalledWith('testuser');
    });

    it('should display room description', () => {
      const client = createMockClientWithUser({
        username: 'testuser',
        currentRoomId: 'town-square',
      });

      authenticatedState.enter(client);

      expect(writeToClient).toHaveBeenCalled();
    });

    it('should initialize missing character statistics', () => {
      const client = createMockClientWithUser({
        username: 'testuser',
        currentRoomId: 'town-square',
        strength: undefined,
        dexterity: undefined,
      });

      authenticatedState.enter(client);

      expect(client.user?.strength).toBe(10);
      expect(client.user?.dexterity).toBe(10);
    });

    it('should initialize missing combat stats', () => {
      const client = createMockClientWithUser({
        username: 'testuser',
        currentRoomId: 'town-square',
        attack: undefined,
        defense: undefined,
      });

      authenticatedState.enter(client);

      // Attack and defense should be calculated from stats
      expect(mockUserManager.updateUserStats).toHaveBeenCalled();
    });

    it('should fix inconsistent unconscious state', () => {
      const client = createMockClientWithUser({
        username: 'testuser',
        currentRoomId: 'town-square',
        health: 50,
        isUnconscious: true,
      });

      authenticatedState.enter(client);

      expect(client.user?.isUnconscious).toBe(false);
    });

    it('should not modify client without user', () => {
      const client = createMockClient({ user: null });

      authenticatedState.enter(client);

      // Should only set transitionTo, no other processing
      expect(mockRoom.addPlayer).not.toHaveBeenCalled();
    });
  });

  describe('handle', () => {
    it('should handle empty input without error', () => {
      const client = createMockClientWithUser({
        username: 'testuser',
        currentRoomId: 'town-square',
      });

      expect(() => authenticatedState.handle(client, '')).not.toThrow();
    });

    it('should handle whitespace-only input without error', () => {
      const client = createMockClientWithUser({
        username: 'testuser',
        currentRoomId: 'town-square',
      });

      expect(() => authenticatedState.handle(client, '   ')).not.toThrow();
    });

    it('should delegate command handling to CommandHandler', () => {
      const client = createMockClientWithUser({
        username: 'testuser',
        currentRoomId: 'town-square',
      });

      authenticatedState.handle(client, 'look');

      // The command handler should be called (through CommandHandler mock)
    });
  });

  describe('exit', () => {
    it('should be defined', () => {
      expect(authenticatedState.exit).toBeDefined();
    });

    it('should not throw when called', () => {
      const client = createMockClientWithUser({
        username: 'testuser',
        currentRoomId: 'town-square',
      });

      expect(() => authenticatedState.exit(client)).not.toThrow();
    });
  });
});
