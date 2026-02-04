/**
 * Unit tests for ClientManager
 * @module client/clientManager.test
 */

import { ClientManager } from './clientManager';
import { ClientStateType, ConnectedClient } from '../types';
import {
  createMockConnection,
  createMockUser,
  createMockUserManager,
  createMockRoomManager,
} from '../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  createContextLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  getPlayerLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock WalkCommand to avoid import chain issues
jest.mock('../command/commands/walk.command', () => ({
  WalkCommand: {
    isWalking: jest.fn().mockReturnValue(false),
    interrupt: jest.fn(),
  },
}));

jest.mock('../utils/formatters', () => ({
  formatUsername: jest.fn((name: string) => name.charAt(0).toUpperCase() + name.slice(1)),
}));

jest.mock('../utils/promptFormatter', () => ({
  getPromptText: jest.fn().mockReturnValue('[HP=100/100]: '),
}));

jest.mock('../utils/socketWriter', () => ({
  stopBuffering: jest.fn(),
  writeToClient: jest.fn(),
}));

jest.mock('../combat/combatSystem', () => ({
  CombatSystem: {
    getInstance: jest.fn().mockReturnValue({
      handlePlayerDisconnect: jest.fn(),
    }),
  },
}));

import { systemLogger } from '../utils/logger';
import { stopBuffering, writeToClient } from '../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('ClientManager', () => {
  let clientManager: ClientManager;
  let mockUserManager: ReturnType<typeof createMockUserManager>;
  let mockRoomManager: ReturnType<typeof createMockRoomManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton for each test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ClientManager as any)['instance'] = undefined;

    mockUserManager = createMockUserManager();
    mockRoomManager = createMockRoomManager();
    // Add missing methods to mock
    (
      mockRoomManager as unknown as { removePlayerFromAllRooms: jest.Mock }
    ).removePlayerFromAllRooms = jest.fn();
    (mockUserManager as unknown as { cancelTransfer: jest.Mock }).cancelTransfer = jest.fn();

    clientManager = ClientManager.getInstance(mockUserManager, mockRoomManager);
  });

  afterEach(() => {
    // Reset singleton
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ClientManager as any)['instance'] = undefined;
  });

  describe('getInstance', () => {
    it('should create a singleton instance', () => {
      const instance1 = ClientManager.getInstance(mockUserManager, mockRoomManager);
      const instance2 = ClientManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should throw if managers not provided on first call', () => {
      // Reset singleton
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ClientManager as any)['instance'] = undefined;

      expect(() => ClientManager.getInstance()).toThrow(
        'UserManager and RoomManager must be provided when creating ClientManager instance'
      );
    });
  });

  describe('getClients', () => {
    it('should return the clients map', () => {
      const clients = clientManager.getClients();

      expect(clients).toBeInstanceOf(Map);
      expect(clients.size).toBe(0);
    });
  });

  describe('setStateMachine', () => {
    it('should set the state machine', () => {
      const mockStateMachine = {
        transitionTo: jest.fn(),
        handleInput: jest.fn(),
      };

      clientManager.setStateMachine(mockStateMachine as never);

      // Verify by setting up a client which should trigger transitionTo
      const mockConnection = createMockConnection();
      clientManager.setupClient(mockConnection);

      expect(mockStateMachine.transitionTo).toHaveBeenCalled();
    });
  });

  describe('setProcessInputFunction', () => {
    it('should set the process input function', () => {
      const processInput = jest.fn();
      clientManager.setProcessInputFunction(processInput);

      // Set up a client to test
      const mockConnection = createMockConnection();
      const client = clientManager.setupClient(mockConnection);

      // Simulate Enter key press to trigger processInput
      clientManager.handleClientData(client, '\r\n');

      expect(processInput).toHaveBeenCalledWith(client, '');
    });
  });

  describe('setupClient', () => {
    it('should create and register a new client', () => {
      const mockConnection = createMockConnection();

      const client = clientManager.setupClient(mockConnection);

      expect(client).toBeDefined();
      expect(client.id).toBeDefined();
      expect(client.connection).toBe(mockConnection);
      expect(client.user).toBeNull();
      expect(client.authenticated).toBe(false);
      expect(client.buffer).toBe('');
      expect(client.state).toBe(ClientStateType.CONNECTING);
    });

    it('should register event handlers on the connection', () => {
      const mockConnection = createMockConnection();

      clientManager.setupClient(mockConnection);

      expect(mockConnection.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith('end', expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should add client to clients map', () => {
      const mockConnection = createMockConnection();
      const connectionId = 'test-connection-id';
      mockConnection.getId.mockReturnValue(connectionId);

      clientManager.setupClient(mockConnection);

      const clients = clientManager.getClients();
      expect(clients.has(connectionId)).toBe(true);
    });

    it('should set isConsoleClient for console connections', () => {
      const mockConnection = createMockConnection();
      mockConnection.getType.mockReturnValue('console' as 'telnet' | 'websocket');

      const client = clientManager.setupClient(mockConnection);

      expect(client.isConsoleClient).toBe(true);
    });

    it('should set ipAddress for telnet connections', () => {
      const mockConnection = createMockConnection('telnet');
      mockConnection.remoteAddress = '192.168.1.1';

      const client = clientManager.setupClient(mockConnection);

      expect(client.ipAddress).toBe('192.168.1.1');
    });
  });

  describe('handleClientData', () => {
    let client: ConnectedClient;
    let mockConnection: ReturnType<typeof createMockConnection>;

    beforeEach(() => {
      mockConnection = createMockConnection('telnet');
      client = clientManager.setupClient(mockConnection);
    });

    describe('input blocking', () => {
      it('should block input when isInputBlocked is true for authenticated clients', () => {
        client.isInputBlocked = true;
        client.authenticated = true;

        clientManager.handleClientData(client, 'test');

        expect(mockConnection.write).not.toHaveBeenCalled();
      });

      it('should allow Ctrl+C even when input is blocked', () => {
        client.isInputBlocked = true;
        client.authenticated = true;

        // Ctrl+C should pass through without error
        expect(() => clientManager.handleClientData(client, '\u0003')).not.toThrow();
      });
    });

    describe('normal input', () => {
      it('should echo characters to the client', () => {
        clientManager.handleClientData(client, 'a');

        expect(mockWriteToClient).toHaveBeenCalledWith(client, 'a');
        expect(client.buffer).toBe('a');
      });

      it('should accumulate characters in buffer', () => {
        clientManager.handleClientData(client, 'h');
        clientManager.handleClientData(client, 'e');
        clientManager.handleClientData(client, 'l');
        clientManager.handleClientData(client, 'l');
        clientManager.handleClientData(client, 'o');

        expect(client.buffer).toBe('hello');
      });

      it('should set isTyping when buffer starts being filled', () => {
        expect(client.isTyping).toBe(false);

        clientManager.handleClientData(client, 'a');

        expect(client.isTyping).toBe(true);
      });
    });

    describe('backspace handling', () => {
      it('should handle backspace character (\\b)', () => {
        client.buffer = 'test';
        client.cursorPos = 4;

        clientManager.handleClientData(client, '\b');

        expect(client.buffer).toBe('tes');
        expect(mockWriteToClient).toHaveBeenCalledWith(client, '\b \b');
      });

      it('should handle DEL character (\\x7F)', () => {
        client.buffer = 'test';
        client.cursorPos = 4;

        clientManager.handleClientData(client, '\x7F');

        expect(client.buffer).toBe('tes');
      });

      it('should not backspace on empty buffer', () => {
        client.buffer = '';
        client.cursorPos = 0;

        clientManager.handleClientData(client, '\b');

        expect(client.buffer).toBe('');
        expect(mockWriteToClient).not.toHaveBeenCalled();
      });

      it('should stop buffering when buffer becomes empty', () => {
        client.buffer = 'a';
        client.cursorPos = 1;

        clientManager.handleClientData(client, '\b');

        expect(stopBuffering).toHaveBeenCalledWith(client);
      });
    });

    describe('enter handling', () => {
      it('should process input on CR+LF', () => {
        const processInput = jest.fn();
        clientManager.setProcessInputFunction(processInput);
        client.buffer = 'test command';

        clientManager.handleClientData(client, '\r\n');

        expect(processInput).toHaveBeenCalledWith(client, 'test command');
        expect(client.buffer).toBe('');
      });

      it('should process input on CR only', () => {
        const processInput = jest.fn();
        clientManager.setProcessInputFunction(processInput);
        client.buffer = 'test';

        clientManager.handleClientData(client, '\r');

        expect(processInput).toHaveBeenCalledWith(client, 'test');
      });

      it('should process input on LF only', () => {
        const processInput = jest.fn();
        clientManager.setProcessInputFunction(processInput);
        client.buffer = 'test';

        clientManager.handleClientData(client, '\n');

        expect(processInput).toHaveBeenCalledWith(client, 'test');
      });

      it('should echo newline and stop buffering', () => {
        clientManager.handleClientData(client, '\r\n');

        expect(mockWriteToClient).toHaveBeenCalledWith(client, '\r\n');
        expect(stopBuffering).toHaveBeenCalledWith(client);
      });
    });

    describe('Ctrl+U handling', () => {
      it('should clear the entire input line', () => {
        client.buffer = 'test';
        client.cursorPos = 4;

        clientManager.handleClientData(client, '\u0015');

        expect(client.buffer).toBe('');
        expect(client.cursorPos).toBe(0);
        expect(mockConnection.write).toHaveBeenCalledWith('\b \b\b \b\b \b\b \b');
        expect(stopBuffering).toHaveBeenCalledWith(client);
      });

      it('should do nothing if buffer is empty', () => {
        client.buffer = '';
        client.cursorPos = 0;

        clientManager.handleClientData(client, '\u0015');

        expect(mockConnection.write).not.toHaveBeenCalled();
      });
    });

    describe('masked input (password entry)', () => {
      it('should show asterisks when maskInput is enabled', () => {
        client.stateData = { maskInput: true };

        clientManager.handleClientData(client, 'p');

        expect(mockWriteToClient).toHaveBeenCalledWith(client, '*');
        expect(client.buffer).toBe('p');
      });
    });

    describe('special state handling', () => {
      it('should route input to state machine for SNAKE_GAME state', () => {
        const mockStateMachine = {
          transitionTo: jest.fn(),
          handleInput: jest.fn(),
        };
        clientManager.setStateMachine(mockStateMachine as never);
        client.state = ClientStateType.SNAKE_GAME;

        clientManager.handleClientData(client, 'w');

        expect(mockStateMachine.handleInput).toHaveBeenCalledWith(client, 'w');
      });

      it('should route input to state machine for EDITOR state', () => {
        const mockStateMachine = {
          transitionTo: jest.fn(),
          handleInput: jest.fn(),
        };
        clientManager.setStateMachine(mockStateMachine as never);
        client.state = ClientStateType.EDITOR;

        clientManager.handleClientData(client, 'x');

        expect(mockStateMachine.handleInput).toHaveBeenCalledWith(client, 'x');
      });
    });

    describe('movement buffering', () => {
      it('should buffer commands during movement', () => {
        client.stateData = { isMoving: true };

        clientManager.handleClientData(client, 'l');
        clientManager.handleClientData(client, 'o');
        clientManager.handleClientData(client, 'o');
        clientManager.handleClientData(client, 'k');

        expect(client.buffer).toBe('look');
      });

      it('should queue commands on enter during movement', () => {
        client.stateData = { isMoving: true };
        client.buffer = 'look';

        clientManager.handleClientData(client, '\r');

        expect(client.stateData.movementCommandQueue).toContain('look');
        expect(client.buffer).toBe('');
      });
    });

    describe('arrow key handling', () => {
      beforeEach(() => {
        const user = createMockUser();
        user.commandHistory = ['first', 'second', 'third'];
        user.currentHistoryIndex = -1;
        client.user = user;
      });

      it('should navigate up in command history', () => {
        client.buffer = '';

        clientManager.handleClientData(client, '\u001b[A'); // Up arrow

        expect(client.buffer).toBe('third');
      });

      it('should navigate down in command history', () => {
        client.user!.currentHistoryIndex = 1;
        client.buffer = 'second';

        clientManager.handleClientData(client, '\u001b[B'); // Down arrow

        expect(client.buffer).toBe('third');
      });

      it('should move cursor left', () => {
        client.buffer = 'test';
        client.cursorPos = 4;

        clientManager.handleClientData(client, '\u001b[D'); // Left arrow

        expect(client.cursorPos).toBe(3);
        expect(mockConnection.write).toHaveBeenCalledWith('\u001b[D');
      });

      it('should move cursor right', () => {
        client.buffer = 'test';
        client.cursorPos = 2;

        clientManager.handleClientData(client, '\u001b[C'); // Right arrow

        expect(client.cursorPos).toBe(3);
        expect(mockConnection.write).toHaveBeenCalledWith('\u001b[C');
      });

      it('should not move cursor left past beginning', () => {
        client.buffer = 'test';
        client.cursorPos = 0;

        clientManager.handleClientData(client, '\u001b[D');

        expect(client.cursorPos).toBe(0);
      });

      it('should not move cursor right past end', () => {
        client.buffer = 'test';
        client.cursorPos = 4;

        clientManager.handleClientData(client, '\u001b[C');

        expect(client.cursorPos).toBe(4);
      });

      it('should handle Shift+Left to move to beginning', () => {
        client.buffer = 'test';
        client.cursorPos = 4;

        clientManager.handleClientData(client, '\u001b[1;2D');

        expect(client.cursorPos).toBe(0);
      });

      it('should handle Shift+Right to move to end', () => {
        client.buffer = 'test';
        client.cursorPos = 0;

        clientManager.handleClientData(client, '\u001b[1;2C');

        expect(client.cursorPos).toBe(4);
      });
    });
  });

  describe('handleClientDisconnect', () => {
    let client: ConnectedClient;
    let mockConnection: ReturnType<typeof createMockConnection>;

    beforeEach(() => {
      mockConnection = createMockConnection('telnet');
      client = clientManager.setupClient(mockConnection);
    });

    it('should remove client from clients map', () => {
      const clientId = mockConnection.getId();

      clientManager.handleClientDisconnect(client, clientId, false);

      expect(clientManager.getClients().has(clientId)).toBe(false);
    });

    it('should unregister user session for authenticated clients', () => {
      client.user = createMockUser({ username: 'testuser' });
      client.authenticated = true;
      const clientId = mockConnection.getId();

      clientManager.handleClientDisconnect(client, clientId, false);

      expect(mockUserManager.unregisterUserSession).toHaveBeenCalledWith('testuser');
    });

    it('should remove player from all rooms', () => {
      client.user = createMockUser({ username: 'testuser' });
      client.authenticated = true;
      const clientId = mockConnection.getId();

      clientManager.handleClientDisconnect(client, clientId, false);

      expect(
        (mockRoomManager as unknown as { removePlayerFromAllRooms: jest.Mock })
          .removePlayerFromAllRooms
      ).toHaveBeenCalledWith('testuser');
    });

    it('should cancel pending transfer if waiting', () => {
      client.user = createMockUser({ username: 'testuser' });
      client.stateData = { waitingForTransfer: true };
      const clientId = mockConnection.getId();

      clientManager.handleClientDisconnect(client, clientId, false);

      expect(
        (mockUserManager as unknown as { cancelTransfer: jest.Mock }).cancelTransfer
      ).toHaveBeenCalledWith('testuser');
    });

    it('should handle monitored client with admin socket', () => {
      const mockAdminSocket = {
        emit: jest.fn(),
        connected: true,
      };
      client.isBeingMonitored = true;
      client.adminMonitorSocket = mockAdminSocket as never;
      client.user = createMockUser({ username: 'testuser' });
      const clientId = mockConnection.getId();

      clientManager.handleClientDisconnect(client, clientId, false);

      expect(mockAdminSocket.emit).toHaveBeenCalledWith('monitor-ended', expect.any(Object));
      expect(client.isBeingMonitored).toBe(false);
    });
  });

  describe('broadcastSystemMessage', () => {
    it('should send message to all authenticated clients', () => {
      const mockConnection1 = createMockConnection('telnet');
      const mockConnection2 = createMockConnection('telnet');
      mockConnection1.getId.mockReturnValue('client1');
      mockConnection2.getId.mockReturnValue('client2');

      const client1 = clientManager.setupClient(mockConnection1);
      const client2 = clientManager.setupClient(mockConnection2);

      client1.authenticated = true;
      client2.authenticated = true;

      clientManager.broadcastSystemMessage('Test broadcast');

      expect(mockConnection1.write).toHaveBeenCalledWith('\r\nTest broadcast\r\n');
      expect(mockConnection2.write).toHaveBeenCalledWith('\r\nTest broadcast\r\n');
    });

    it('should exclude specified client', () => {
      const mockConnection1 = createMockConnection('telnet');
      const mockConnection2 = createMockConnection('telnet');
      mockConnection1.getId.mockReturnValue('client1');
      mockConnection2.getId.mockReturnValue('client2');

      const client1 = clientManager.setupClient(mockConnection1);
      const client2 = clientManager.setupClient(mockConnection2);

      client1.authenticated = true;
      client2.authenticated = true;

      // Clear mock call counts
      jest.clearAllMocks();

      clientManager.broadcastSystemMessage('Test broadcast', client1);

      // Only client2 should receive the message
      expect(mockConnection1.write).not.toHaveBeenCalledWith('\r\nTest broadcast\r\n');
      expect(mockConnection2.write).toHaveBeenCalledWith('\r\nTest broadcast\r\n');
    });

    it('should not send to unauthenticated clients', () => {
      const mockConnection = createMockConnection('telnet');
      const client = clientManager.setupClient(mockConnection);
      client.authenticated = false;

      jest.clearAllMocks();

      clientManager.broadcastSystemMessage('Test');

      expect(mockConnection.write).not.toHaveBeenCalled();
    });
  });

  describe('checkForIdleClients', () => {
    it('should do nothing if timeout is 0 or negative', () => {
      const mockConnection = createMockConnection('telnet');
      const client = clientManager.setupClient(mockConnection);
      client.authenticated = true;
      client.lastActivity = Date.now() - 1000000; // Very old

      clientManager.checkForIdleClients(0);

      expect(mockConnection.write).not.toHaveBeenCalledWith(
        expect.stringContaining('disconnected due to inactivity')
      );
    });

    it('should disconnect idle authenticated clients', () => {
      jest.useFakeTimers();
      const mockConnection = createMockConnection('telnet');
      const client = clientManager.setupClient(mockConnection);
      client.authenticated = true;
      client.lastActivity = Date.now() - 11 * 60 * 1000; // 11 minutes ago

      clientManager.checkForIdleClients(10); // 10 minute timeout

      expect(mockConnection.write).toHaveBeenCalledWith(
        expect.stringContaining('disconnected due to inactivity')
      );

      jest.useRealTimers();
    });

    it('should skip monitored clients', () => {
      const mockConnection = createMockConnection('telnet');
      const client = clientManager.setupClient(mockConnection);
      client.authenticated = true;
      client.isBeingMonitored = true;
      client.lastActivity = Date.now() - 1000000; // Very old

      jest.clearAllMocks();

      clientManager.checkForIdleClients(10);

      expect(mockConnection.write).not.toHaveBeenCalledWith(
        expect.stringContaining('disconnected due to inactivity')
      );
      expect(systemLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Skipping idle check for monitored client')
      );
    });

    it('should skip unauthenticated clients', () => {
      const mockConnection = createMockConnection('telnet');
      const client = clientManager.setupClient(mockConnection);
      client.authenticated = false;
      client.lastActivity = Date.now() - 1000000; // Very old

      jest.clearAllMocks();

      clientManager.checkForIdleClients(10);

      expect(mockConnection.write).not.toHaveBeenCalledWith(
        expect.stringContaining('disconnected due to inactivity')
      );
    });
  });

  describe('getClientByUsername', () => {
    it('should find client by username (case insensitive)', () => {
      const mockConnection = createMockConnection('telnet');
      mockConnection.getId.mockReturnValue('test-id');
      const client = clientManager.setupClient(mockConnection);
      client.user = createMockUser({ username: 'TestUser' });

      const found = clientManager.getClientByUsername('testuser');

      expect(found).toBe(client);
    });

    it('should return undefined if username not found', () => {
      const found = clientManager.getClientByUsername('nonexistent');

      expect(found).toBeUndefined();
    });

    it('should return undefined for clients without users', () => {
      const mockConnection = createMockConnection('telnet');
      clientManager.setupClient(mockConnection);

      const found = clientManager.getClientByUsername('anyuser');

      expect(found).toBeUndefined();
    });
  });
});
