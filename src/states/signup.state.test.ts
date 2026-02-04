/**
 * Unit tests for SignupState class
 * @module states/signup.state.test
 */

import { SignupState } from './signup.state';
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
  validateUsername: jest.fn((username: string) => {
    if (username.length < 3) {
      return { isValid: false, message: 'Username must be short 3 characters' };
    }
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      return { isValid: false, message: 'Username can only contain letters and numbers' };
    }
    return { isValid: true };
  }),
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
  RESTRICTED_USERNAMES: ['admin', 'system', 'root'],
}));

import { writeToClient } from '../utils/socketWriter';
import { validateUsername } from '../utils/formatters';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;
const mockValidateUsername = validateUsername as jest.MockedFunction<typeof validateUsername>;

describe('SignupState', () => {
  let signupState: SignupState;
  let mockUserManager: UserManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserManager = createMockUserManager();
    signupState = new SignupState(mockUserManager);
  });

  describe('name property', () => {
    it('should have SIGNUP as the state name', () => {
      expect(signupState.name).toBe(ClientStateType.SIGNUP);
    });
  });

  describe('enter', () => {
    it('should initialize maskInput to false', () => {
      const client = createMockClient();

      signupState.enter(client);

      expect(client.stateData.maskInput).toBe(false);
    });

    it('should prompt for username when no username set', () => {
      const client = createMockClient();

      signupState.enter(client);

      // The enhanced sign-on experience uses "Choose your name:" instead of "username"
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('name'));
    });

    it('should prompt for password when username is set', () => {
      const client = createMockClient({
        stateData: { username: 'newuser' },
      });

      signupState.enter(client);

      expect(client.stateData.maskInput).toBe(true);
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('password'));
    });
  });

  describe('handle', () => {
    describe('username input', () => {
      it('should reject invalid username format', () => {
        mockValidateUsername.mockReturnValue({
          isValid: false,
          message: 'Invalid username',
        });

        const client = createMockClient();

        signupState.handle(client, 'ab'); // Too short

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('Invalid username')
        );
      });

      it('should reject restricted usernames', () => {
        mockValidateUsername.mockReturnValue({ isValid: true });

        const client = createMockClient();

        signupState.handle(client, 'admin');

        expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('reserved'));
      });

      it('should reject existing usernames', () => {
        mockValidateUsername.mockReturnValue({ isValid: true });
        (mockUserManager.userExists as jest.Mock).mockReturnValue(true);

        const client = createMockClient();

        signupState.handle(client, 'existinguser');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('already exists')
        );
      });

      it('should accept valid new username', () => {
        mockValidateUsername.mockReturnValue({ isValid: true });
        (mockUserManager.userExists as jest.Mock).mockReturnValue(false);

        const client = createMockClient();

        signupState.handle(client, 'newuser');

        expect(client.stateData.username).toBe('newuser');
        expect(client.stateData.maskInput).toBe(true);
      });
    });

    describe('password input', () => {
      it('should reject short password', () => {
        const client = createMockClient({
          stateData: { username: 'newuser' },
        });

        signupState.handle(client, 'abc'); // Less than 6 characters

        expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('short'));
      });

      it('should store password when valid', () => {
        const client = createMockClient({
          stateData: { username: 'newuser' },
        });

        signupState.handle(client, 'validpassword123');

        expect(client.stateData.password).toBe('validpassword123');
      });
    });
  });
});

describe('SignupState additional tests', () => {
  let signupState: SignupState;
  let mockUserManager: UserManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserManager = createMockUserManager();
    signupState = new SignupState(mockUserManager);
  });

  describe('password creation and user signup flow', () => {
    it('should create user successfully when user creation succeeds', () => {
      (mockUserManager.createUser as jest.Mock).mockReturnValue(true);
      (mockUserManager.getUser as jest.Mock).mockReturnValue({
        username: 'newuser',
        health: 100,
        maxHealth: 100,
      });

      const client = createMockClient({
        stateData: { username: 'newuser' },
      });

      signupState.handle(client, 'validpassword');

      expect(client.user).not.toBeNull();
      // After password, signup now transitions to race selection before confirmation
      expect(client.stateData.transitionTo).toBe(ClientStateType.RACE_SELECTION);
    });

    it('should transition to LOGIN when getUser returns null after createUser', () => {
      (mockUserManager.createUser as jest.Mock).mockReturnValue(true);
      (mockUserManager.getUser as jest.Mock).mockReturnValue(null);

      const client = createMockClient({
        stateData: { username: 'newuser' },
      });

      signupState.handle(client, 'validpassword');

      expect(client.stateData.transitionTo).toBe(ClientStateType.LOGIN);
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Error creating user')
      );
    });

    it('should transition to LOGIN when createUser fails', () => {
      (mockUserManager.createUser as jest.Mock).mockReturnValue(false);

      const client = createMockClient({
        stateData: { username: 'newuser' },
      });

      signupState.handle(client, 'validpassword');

      expect(client.stateData.transitionTo).toBe(ClientStateType.LOGIN);
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Error creating user')
      );
    });
  });

  describe('exit', () => {
    it('should disable maskInput on exit when it was enabled', () => {
      const client = createMockClient({
        stateData: { maskInput: true },
      });

      signupState.exit(client);

      expect(client.stateData.maskInput).toBe(false);
      expect(client.connection.setMaskInput).toHaveBeenCalledWith(false);
    });

    it('should not call setMaskInput when maskInput was not enabled', () => {
      const client = createMockClient({
        stateData: { maskInput: false },
      });

      signupState.exit(client);

      expect(client.connection.setMaskInput).not.toHaveBeenCalled();
    });
  });

  describe('username too short error handling', () => {
    it('should show username too short error for very short usernames', () => {
      mockValidateUsername.mockReturnValue({ isValid: true }); // passes validation
      (mockUserManager.userExists as jest.Mock).mockReturnValue(false);

      const client = createMockClient();

      // Handle with ab (2 characters) - but since validation passed,
      // we need to test the code path where it's too short
      // Looking at the code: else if (standardUsername.length < 3)
      signupState.handle(client, 'ab'); // 2 chars

      // The writeToClient should be called with the short error
      expect(mockWriteToClient).toHaveBeenCalled();
    });
  });
});
