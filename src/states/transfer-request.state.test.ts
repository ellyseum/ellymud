/**
 * Unit tests for TransferRequestState
 * @module states/transfer-request.state.test
 */

import { TransferRequestState } from './transfer-request.state';
import { ClientStateType } from '../types';
import {
  createMockClient,
  createMockUser,
  createMockConnection,
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
  formatUsername: jest.fn((name: string) => name),
}));

import { writeToClient } from '../utils/socketWriter';
import { UserManager } from '../user/userManager';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('TransferRequestState', () => {
  let transferRequestState: TransferRequestState;
  let mockUserManager: jest.Mocked<UserManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserManager = createMockUserManager();
    transferRequestState = new TransferRequestState(mockUserManager);
  });

  describe('name', () => {
    it('should have correct state name', () => {
      expect(transferRequestState.name).toBe(ClientStateType.TRANSFER_REQUEST);
    });
  });

  describe('enter', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      transferRequestState.enter(client);

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should display transfer request message with user info', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
        stateData: {
          transferClient: {
            connection: createMockConnection('websocket'),
          },
        },
      });

      transferRequestState.enter(client);

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('SESSION TRANSFER REQUEST')
      );
    });

    it('should show web browser for websocket connections', () => {
      const mockConnection = createMockConnection('websocket');
      mockConnection.getId = jest.fn().mockReturnValue('ws:127.0.0.1:1234');

      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
        stateData: {
          transferClient: {
            connection: mockConnection,
          },
        },
      });

      transferRequestState.enter(client);

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('web browser')
      );
    });

    it('should show telnet client for telnet connections', () => {
      const mockConnection = createMockConnection('telnet');
      mockConnection.getId = jest.fn().mockReturnValue('telnet:127.0.0.1:1234');

      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
        stateData: {
          transferClient: {
            connection: mockConnection,
          },
        },
      });

      transferRequestState.enter(client);

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('telnet client')
      );
    });

    it('should ask user for confirmation', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
        stateData: {
          transferClient: {
            connection: createMockConnection('telnet'),
          },
        },
      });

      transferRequestState.enter(client);

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('(y/n)'));
    });

    it('should store return state when not interrupted', () => {
      const client = createMockClient({
        user: createMockUser(),
        stateData: {
          transferClient: {
            connection: createMockConnection('telnet'),
          },
        },
      });

      transferRequestState.enter(client);

      expect(client.stateData.returnToState).toBe(ClientStateType.AUTHENTICATED);
    });
  });

  describe('handle', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      transferRequestState.handle(client, 'y');

      expect(mockUserManager.resolveSessionTransfer).not.toHaveBeenCalled();
    });

    it('should approve transfer on "y"', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      transferRequestState.handle(client, 'y');

      expect(mockUserManager.resolveSessionTransfer).toHaveBeenCalledWith('testuser', true);
    });

    it('should approve transfer on "yes"', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      transferRequestState.handle(client, 'yes');

      expect(mockUserManager.resolveSessionTransfer).toHaveBeenCalledWith('testuser', true);
    });

    it('should approve transfer on "Y" (case insensitive)', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      transferRequestState.handle(client, 'Y');

      expect(mockUserManager.resolveSessionTransfer).toHaveBeenCalledWith('testuser', true);
    });

    it('should deny transfer on "n"', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      transferRequestState.handle(client, 'n');

      expect(mockUserManager.resolveSessionTransfer).toHaveBeenCalledWith('testuser', false);
    });

    it('should deny transfer on any other input', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      transferRequestState.handle(client, 'maybe');

      expect(mockUserManager.resolveSessionTransfer).toHaveBeenCalledWith('testuser', false);
    });
  });

  describe('exit', () => {
    it('should clean up transfer request state', () => {
      const client = createMockClient({
        user: createMockUser(),
        stateData: {
          transferClient: { connection: createMockConnection('telnet') },
          interruptedBy: 'something',
        },
      });

      transferRequestState.exit(client);

      expect(client.stateData.transferClient).toBeUndefined();
      expect(client.stateData.interruptedBy).toBeUndefined();
    });
  });
});
