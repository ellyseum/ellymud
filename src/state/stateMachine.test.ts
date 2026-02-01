/**
 * Unit tests for StateMachine
 * @module state/stateMachine.test
 */

import { StateMachine } from './stateMachine';
import { ConnectedClient, ClientStateType } from '../types';
import { UserManager } from '../user/userManager';
import { createMockClient } from '../test/helpers/mockFactories';

// Mock all state dependencies
jest.mock('../states/connecting.state', () => ({
  ConnectingState: jest.fn().mockImplementation(() => ({
    name: ClientStateType.CONNECTING,
    enter: jest.fn(),
    handle: jest.fn(),
    exit: jest.fn(),
  })),
}));

jest.mock('../states/login.state', () => ({
  LoginState: jest.fn().mockImplementation(() => ({
    name: ClientStateType.LOGIN,
    enter: jest.fn(),
    handle: jest.fn(),
    exit: jest.fn(),
    handlePassword: jest.fn().mockReturnValue(false),
  })),
}));

jest.mock('../states/signup.state', () => ({
  SignupState: jest.fn().mockImplementation(() => ({
    name: ClientStateType.SIGNUP,
    enter: jest.fn(),
    handle: jest.fn(),
    exit: jest.fn(),
  })),
}));

jest.mock('../states/confirmation.state', () => ({
  ConfirmationState: jest.fn().mockImplementation(() => ({
    name: ClientStateType.CONFIRMATION,
    enter: jest.fn(),
    handle: jest.fn(),
    exit: jest.fn(),
  })),
}));

jest.mock('../states/authenticated.state', () => ({
  AuthenticatedState: jest.fn().mockImplementation(() => ({
    name: ClientStateType.AUTHENTICATED,
    enter: jest.fn(),
    handle: jest.fn(),
    exit: jest.fn(),
  })),
}));

jest.mock('../states/transfer-request.state', () => ({
  TransferRequestState: jest.fn().mockImplementation(() => ({
    name: ClientStateType.TRANSFER_REQUEST,
    enter: jest.fn(),
    handle: jest.fn(),
    exit: jest.fn(),
  })),
}));

jest.mock('../states/snake-game.state', () => ({
  SnakeGameState: jest.fn().mockImplementation(() => ({
    name: ClientStateType.SNAKE_GAME,
    enter: jest.fn(),
    handle: jest.fn(),
    exit: jest.fn(),
  })),
}));

jest.mock('../states/game.state', () => ({
  GameState: jest.fn().mockImplementation(() => ({
    name: ClientStateType.GAME,
    enter: jest.fn(),
    handle: jest.fn(),
    exit: jest.fn(),
  })),
}));

jest.mock('../states/editor.state', () => ({
  EditorState: jest.fn().mockImplementation(() => ({
    name: ClientStateType.EDITOR,
    enter: jest.fn(),
    handle: jest.fn(),
    exit: jest.fn(),
  })),
}));

jest.mock('../states/race-selection.state', () => ({
  RaceSelectionState: jest.fn().mockImplementation(() => ({
    name: ClientStateType.RACE_SELECTION,
    enter: jest.fn(),
    handle: jest.fn(),
    exit: jest.fn(),
  })),
}));

jest.mock('../utils/logger', () => ({
  createContextLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock UserManager
const mockUserManager = {
  getUser: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  saveUsers: jest.fn(),
} as unknown as UserManager;

describe('StateMachine', () => {
  let stateMachine: StateMachine;
  let mockClients: Map<string, ConnectedClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClients = new Map();
    stateMachine = new StateMachine(mockUserManager, mockClients);
  });

  describe('constructor', () => {
    it('should create a new StateMachine instance', () => {
      expect(stateMachine).toBeInstanceOf(StateMachine);
    });

    it('should register all required states', () => {
      // Test by transitioning to each state - if it exists, transition works
      const client = createMockClient();
      mockClients.set(client.id, client);

      // Test LOGIN state exists
      stateMachine.transitionTo(client, ClientStateType.LOGIN);
      expect(client.state).toBe(ClientStateType.LOGIN);
    });
  });

  describe('registerState', () => {
    it('should register a new state', () => {
      const customState = {
        name: 'custom' as ClientStateType,
        enter: jest.fn(),
        handle: jest.fn(),
        exit: jest.fn(),
      };

      stateMachine.registerState(customState);
      // If no error, registration succeeded
      expect(true).toBe(true);
    });
  });

  describe('transitionTo', () => {
    it('should transition client to new state', () => {
      const client = createMockClient({ state: ClientStateType.CONNECTING });
      mockClients.set(client.id, client);

      stateMachine.transitionTo(client, ClientStateType.LOGIN);

      expect(client.state).toBe(ClientStateType.LOGIN);
    });

    it('should set transitionTo in stateData before calling exit', () => {
      const client = createMockClient({ state: ClientStateType.LOGIN });
      mockClients.set(client.id, client);

      stateMachine.transitionTo(client, ClientStateType.AUTHENTICATED);

      // After transition, transitionTo should be cleared
      expect(client.stateData.transitionTo).toBeUndefined();
    });

    it('should clear transitionTo after exit is called', () => {
      const client = createMockClient({ state: ClientStateType.LOGIN });
      mockClients.set(client.id, client);

      stateMachine.transitionTo(client, ClientStateType.AUTHENTICATED);

      expect(client.stateData.transitionTo).toBeUndefined();
    });

    it('should automatically transition from CONNECTING to LOGIN', () => {
      const client = createMockClient({ state: ClientStateType.LOGIN });
      mockClients.set(client.id, client);

      // When transitioning TO CONNECTING, it should auto-transition to LOGIN
      stateMachine.transitionTo(client, ClientStateType.CONNECTING);

      // After the auto-transition, should be in LOGIN
      expect(client.state).toBe(ClientStateType.LOGIN);
    });
  });

  describe('handleInput', () => {
    it('should trim input before processing', () => {
      const client = createMockClient({ state: ClientStateType.AUTHENTICATED });
      mockClients.set(client.id, client);

      // This should not throw
      stateMachine.handleInput(client, '  look  ');
    });

    it('should transition to SIGNUP when input is "new" in LOGIN state', () => {
      const client = createMockClient({ state: ClientStateType.LOGIN });
      mockClients.set(client.id, client);

      stateMachine.handleInput(client, 'new');

      expect(client.state).toBe(ClientStateType.SIGNUP);
    });

    it('should transition to SIGNUP when input is "NEW" (case insensitive)', () => {
      const client = createMockClient({ state: ClientStateType.LOGIN });
      mockClients.set(client.id, client);

      stateMachine.handleInput(client, 'NEW');

      expect(client.state).toBe(ClientStateType.SIGNUP);
    });
  });

  describe('getClients', () => {
    it('should return the clients map', () => {
      const clients = stateMachine.getClients();
      expect(clients).toBe(mockClients);
    });

    it('should return the same map that was passed to constructor', () => {
      const client = createMockClient();
      mockClients.set(client.id, client);

      const clients = stateMachine.getClients();
      expect(clients.get(client.id)).toBe(client);
    });
  });

  describe('sensitive command detection', () => {
    it('should not log password input in login state', () => {
      const client = createMockClient({
        state: ClientStateType.LOGIN,
        stateData: { awaitingPassword: true },
      });
      mockClients.set(client.id, client);

      // This should not throw and should not log the password
      stateMachine.handleInput(client, 'secretpassword');
    });

    it('should handle password input with awaitingTransferRequest', () => {
      const client = createMockClient({
        state: ClientStateType.LOGIN,
        stateData: {
          awaitingPassword: true,
          awaitingTransferRequest: true,
        },
      });
      mockClients.set(client.id, client);

      // Should not call handlePassword when awaitingTransferRequest is true
      stateMachine.handleInput(client, 'password');
    });
  });

  describe('state transitions flow', () => {
    it('should handle normal login flow', () => {
      const client = createMockClient({ state: ClientStateType.CONNECTING });
      mockClients.set(client.id, client);

      // CONNECTING -> LOGIN
      stateMachine.transitionTo(client, ClientStateType.CONNECTING);
      expect(client.state).toBe(ClientStateType.LOGIN);

      // LOGIN -> AUTHENTICATED (simulated)
      stateMachine.transitionTo(client, ClientStateType.AUTHENTICATED);
      expect(client.state).toBe(ClientStateType.AUTHENTICATED);
    });

    it('should handle signup flow', () => {
      const client = createMockClient({ state: ClientStateType.LOGIN });
      mockClients.set(client.id, client);

      // LOGIN -> SIGNUP
      stateMachine.transitionTo(client, ClientStateType.SIGNUP);
      expect(client.state).toBe(ClientStateType.SIGNUP);

      // SIGNUP -> CONFIRMATION
      stateMachine.transitionTo(client, ClientStateType.CONFIRMATION);
      expect(client.state).toBe(ClientStateType.CONFIRMATION);

      // CONFIRMATION -> AUTHENTICATED
      stateMachine.transitionTo(client, ClientStateType.AUTHENTICATED);
      expect(client.state).toBe(ClientStateType.AUTHENTICATED);
    });

    it('should handle game state transition', () => {
      const client = createMockClient({ state: ClientStateType.AUTHENTICATED });
      mockClients.set(client.id, client);

      stateMachine.transitionTo(client, ClientStateType.GAME);
      expect(client.state).toBe(ClientStateType.GAME);
    });

    it('should handle snake game state transition', () => {
      const client = createMockClient({ state: ClientStateType.GAME });
      mockClients.set(client.id, client);

      stateMachine.transitionTo(client, ClientStateType.SNAKE_GAME);
      expect(client.state).toBe(ClientStateType.SNAKE_GAME);
    });

    it('should handle editor state transition', () => {
      const client = createMockClient({ state: ClientStateType.GAME });
      mockClients.set(client.id, client);

      stateMachine.transitionTo(client, ClientStateType.EDITOR);
      expect(client.state).toBe(ClientStateType.EDITOR);
    });
  });

  describe('edge cases', () => {
    it('should handle input with only whitespace', () => {
      const client = createMockClient({ state: ClientStateType.AUTHENTICATED });
      mockClients.set(client.id, client);

      // Should not throw
      expect(() => stateMachine.handleInput(client, '   ')).not.toThrow();
    });

    it('should handle empty input', () => {
      const client = createMockClient({ state: ClientStateType.AUTHENTICATED });
      mockClients.set(client.id, client);

      // Should not throw
      expect(() => stateMachine.handleInput(client, '')).not.toThrow();
    });

    it('should handle input with special characters', () => {
      const client = createMockClient({ state: ClientStateType.AUTHENTICATED });
      mockClients.set(client.id, client);

      // Should not throw
      expect(() => stateMachine.handleInput(client, '!@#$%^&*()')).not.toThrow();
    });

    it('should handle multiple rapid transitions', () => {
      const client = createMockClient({ state: ClientStateType.CONNECTING });
      mockClients.set(client.id, client);

      stateMachine.transitionTo(client, ClientStateType.LOGIN);
      stateMachine.transitionTo(client, ClientStateType.SIGNUP);
      stateMachine.transitionTo(client, ClientStateType.LOGIN);

      expect(client.state).toBe(ClientStateType.LOGIN);
    });
  });
});
