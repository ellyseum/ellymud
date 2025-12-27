/**
 * Unit tests for LoginState class
 * @module states/login.state.test
 */

import { LoginState } from './login.state';
import { ClientStateType } from '../types';
import { UserManager } from '../user/userManager';
import { createMockClient, createMockUserManager } from '../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

jest.mock('../utils/formatters', () => ({
  formatUsername: jest.fn(
    (username: string) => username.charAt(0).toUpperCase() + username.slice(1)
  ),
  standardizeUsername: jest.fn((username: string) => username.toLowerCase()),
}));

jest.mock('../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../utils/fileUtils', () => ({
  createSessionReferenceFile: jest.fn(),
}));

jest.mock('../config', () => ({
  __esModule: true,
  default: {},
  DISABLE_REMOTE_ADMIN: false,
  RESTRICTED_USERNAMES: ['admin', 'system', 'root'],
}));

import { writeToClient } from '../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('LoginState', () => {
  let loginState: LoginState;
  let mockUserManager: UserManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserManager = createMockUserManager();
    loginState = new LoginState(mockUserManager);
  });

  describe('name property', () => {
    it('should have LOGIN as the state name', () => {
      expect(loginState.name).toBe(ClientStateType.LOGIN);
    });
  });

  describe('enter', () => {
    it('should initialize stateData with maskInput false', () => {
      const client = createMockClient();

      loginState.enter(client);

      expect(client.stateData.maskInput).toBe(false);
      expect(client.stateData.passwordAttempts).toBe(0);
    });

    it('should prompt user for username', () => {
      const client = createMockClient();

      loginState.enter(client);

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('username'));
    });
  });

  describe('exit', () => {
    it('should disable maskInput on exit', () => {
      const client = createMockClient({
        stateData: { maskInput: true },
      });

      loginState.exit(client);

      expect(client.stateData.maskInput).toBe(false);
      expect(client.connection.setMaskInput).toHaveBeenCalledWith(false);
    });

    it('should not call setMaskInput if mask was not enabled', () => {
      const client = createMockClient({
        stateData: { maskInput: false },
      });

      loginState.exit(client);

      expect(client.connection.setMaskInput).not.toHaveBeenCalled();
    });
  });

  describe('handle', () => {
    describe('new user signup', () => {
      it('should transition to SIGNUP on "new" command', () => {
        const client = createMockClient();

        loginState.handle(client, 'new');

        expect(client.stateData.transitionTo).toBe(ClientStateType.SIGNUP);
      });

      it('should handle case-insensitive "new" command', () => {
        const client = createMockClient();

        loginState.handle(client, 'NEW');

        expect(client.stateData.transitionTo).toBe(ClientStateType.SIGNUP);
      });
    });

    describe('transfer request handling', () => {
      it('should process transfer request approval', () => {
        const client = createMockClient({
          stateData: {
            awaitingTransferRequest: true,
            username: 'testuser',
          },
        });

        loginState.handle(client, 'y');

        expect(mockUserManager.requestSessionTransfer).toHaveBeenCalledWith('testuser', client);
      });

      it('should handle transfer request denial', () => {
        const client = createMockClient({
          stateData: {
            awaitingTransferRequest: true,
            username: 'testuser',
          },
        });

        loginState.handle(client, 'n');

        expect(client.stateData.awaitingTransferRequest).toBeUndefined();
        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('cancelled')
        );
      });

      it('should handle transfer request with missing username', () => {
        const client = createMockClient({
          stateData: {
            awaitingTransferRequest: true,
            // username intentionally missing
          },
        });

        loginState.handle(client, 'y');

        expect(client.stateData.transitionTo).toBe(ClientStateType.LOGIN);
        expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Error'));
      });

      it('should handle failed transfer request', () => {
        (mockUserManager.requestSessionTransfer as jest.Mock).mockReturnValue(false);

        const client = createMockClient({
          stateData: {
            awaitingTransferRequest: true,
            username: 'testuser',
          },
        });

        loginState.handle(client, 'y');

        expect(client.stateData.transitionTo).toBe(ClientStateType.LOGIN);
        expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Error'));
      });
    });

    describe('username validation', () => {
      it('should reject empty username', () => {
        const client = createMockClient();

        loginState.handle(client, '');

        expect(mockWriteToClient).toHaveBeenCalled();
        // Should not transition
        expect(client.stateData.transitionTo).toBeUndefined();
      });

      it('should reject username with invalid characters', () => {
        const client = createMockClient();

        loginState.handle(client, 'user@name!');

        expect(mockWriteToClient).toHaveBeenCalled();
      });
    });

    describe('password handling', () => {
      it('should prompt for password when user exists', () => {
        (mockUserManager.userExists as jest.Mock).mockReturnValue(true);
        const client = createMockClient();

        loginState.handle(client, 'existinguser');

        expect(client.stateData.awaitingPassword).toBe(true);
        expect(client.stateData.username).toBe('existinguser');
      });
    });
  });
});
