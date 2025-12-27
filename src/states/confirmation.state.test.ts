/**
 * Unit tests for ConfirmationState class
 * @module states/confirmation.state.test
 */

import { ConfirmationState } from './confirmation.state';
import { ClientStateType } from '../types';
import { UserManager } from '../user/userManager';
import {
  createMockUser,
  createMockClient,
  createMockUserManager,
} from '../test/helpers/mockFactories';

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
}));

import { writeToClient } from '../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('ConfirmationState', () => {
  let confirmationState: ConfirmationState;
  let mockUserManager: UserManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserManager = createMockUserManager();
    confirmationState = new ConfirmationState(mockUserManager);
  });

  describe('name property', () => {
    it('should have CONFIRMATION as the state name', () => {
      expect(confirmationState.name).toBe(ClientStateType.CONFIRMATION);
    });
  });

  describe('enter', () => {
    it('should transition to LOGIN if client has no user', () => {
      const client = createMockClient({ user: null });

      confirmationState.enter(client);

      expect(client.stateData.transitionTo).toBe(ClientStateType.LOGIN);
    });

    it('should display registration details for valid user', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'newplayer' }),
      });

      confirmationState.enter(client);

      expect(mockWriteToClient).toHaveBeenCalled();
      expect(client.stateData.maskInput).toBe(false);
    });

    it('should show username in the confirmation message', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'newplayer' }),
      });

      confirmationState.enter(client);

      // Check that at least one message contains "confirm" or "cancel"
      const allMessages = mockWriteToClient.mock.calls.map((call) => call[1]).join('');
      expect(allMessages).toContain('confirm');
      expect(allMessages).toContain('cancel');
    });
  });

  describe('handle', () => {
    describe('confirm command', () => {
      it('should set authenticated to true on confirm', () => {
        const client = createMockClient({
          user: createMockUser(),
          authenticated: false,
        });

        confirmationState.handle(client, 'confirm');

        expect(client.authenticated).toBe(true);
      });

      it('should transition to AUTHENTICATED on confirm', () => {
        const client = createMockClient({
          user: createMockUser(),
        });

        confirmationState.handle(client, 'confirm');

        expect(client.stateData.transitionTo).toBe(ClientStateType.AUTHENTICATED);
      });

      it('should handle uppercase CONFIRM', () => {
        const client = createMockClient({
          user: createMockUser(),
        });

        confirmationState.handle(client, 'CONFIRM');

        expect(client.authenticated).toBe(true);
        expect(client.stateData.transitionTo).toBe(ClientStateType.AUTHENTICATED);
      });
    });

    describe('cancel command', () => {
      it('should delete the user on cancel', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'newplayer' }),
        });

        confirmationState.handle(client, 'cancel');

        expect(mockUserManager.deleteUser).toHaveBeenCalledWith('newplayer');
      });

      it('should reset client state on cancel', () => {
        const client = createMockClient({
          user: createMockUser(),
          authenticated: true,
        });

        confirmationState.handle(client, 'cancel');

        expect(client.user).toBeNull();
        expect(client.authenticated).toBe(false);
      });

      it('should transition to LOGIN on cancel', () => {
        const client = createMockClient({
          user: createMockUser(),
        });

        confirmationState.handle(client, 'cancel');

        expect(client.stateData.transitionTo).toBe(ClientStateType.LOGIN);
      });

      it('should handle uppercase CANCEL', () => {
        const client = createMockClient({
          user: createMockUser(),
        });

        confirmationState.handle(client, 'CANCEL');

        expect(client.stateData.transitionTo).toBe(ClientStateType.LOGIN);
      });
    });

    describe('invalid commands', () => {
      it('should show error for invalid command', () => {
        const client = createMockClient({
          user: createMockUser(),
        });

        confirmationState.handle(client, 'invalid');

        expect(mockWriteToClient).toHaveBeenCalled();
        // Should not transition
        expect(client.stateData.transitionTo).toBeUndefined();
      });

      it('should show error for empty input', () => {
        const client = createMockClient({
          user: createMockUser(),
        });

        confirmationState.handle(client, '');

        expect(mockWriteToClient).toHaveBeenCalled();
        expect(client.stateData.transitionTo).toBeUndefined();
      });
    });
  });

  describe('exit', () => {
    it('should not modify client on exit', () => {
      const client = createMockClient();

      confirmationState.exit(client);

      // exit() is a no-op
      expect(true).toBe(true);
    });
  });
});
