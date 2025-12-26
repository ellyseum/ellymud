import {
  writeToClient,
  writeMessageToClient,
  writeFormattedMessageToClient,
  stopBuffering,
  drawCommandPrompt as reExportedDrawCommandPrompt,
  writeCommandPrompt as reExportedWriteCommandPrompt,
  getPromptText as reExportedGetPromptText,
} from './socketWriter';
import { ConnectedClient, ClientStateType, User } from '../types';
import { IConnection } from '../connection/interfaces/connection.interface';

// Mock the promptFormatter module
jest.mock('./promptFormatter', () => ({
  drawCommandPrompt: jest.fn(),
  writeCommandPrompt: jest.fn(),
  getPromptText: jest.fn().mockReturnValue('[HP=100/100 MP=50/50]: '),
}));

import { drawCommandPrompt } from './promptFormatter';

// Helper to create a mock connection
const createMockConnection = (): jest.Mocked<IConnection> =>
  ({
    write: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    setMaxListeners: jest.fn(),
    getMaxListeners: jest.fn(),
    listeners: jest.fn(),
    rawListeners: jest.fn(),
    listenerCount: jest.fn(),
    prependListener: jest.fn(),
    prependOnceListener: jest.fn(),
    eventNames: jest.fn(),
    getId: jest.fn().mockReturnValue('mock-connection-id'),
    getType: jest.fn().mockReturnValue('mock'),
    setMaskInput: jest.fn(),
    getRawConnection: jest.fn(),
    enableRawLogging: jest.fn(),
    isRawLoggingEnabled: jest.fn().mockReturnValue(false),
    remoteAddress: '127.0.0.1',
  }) as unknown as jest.Mocked<IConnection>;

// Helper to create a mock user
const createMockUser = (overrides: Partial<User> = {}): User => ({
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
    currency: { gold: 0, silver: 0, copper: 0 },
  },
  ...overrides,
});

// Helper to create a mock ConnectedClient
const createMockClient = (overrides: Partial<ConnectedClient> = {}): ConnectedClient => ({
  id: 'test-client-id',
  connection: createMockConnection(),
  user: null,
  authenticated: false,
  buffer: '',
  state: ClientStateType.CONNECTING,
  stateData: {},
  isTyping: false,
  outputBuffer: [],
  connectedAt: Date.now(),
  lastActivity: Date.now(),
  isBeingMonitored: false,
  ...overrides,
});

describe('socketWriter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('writeToClient', () => {
    describe('basic functionality', () => {
      it('should write data directly to the client connection', () => {
        const client = createMockClient();
        const data = 'Hello, World!\r\n';

        writeToClient(client, data);

        expect(client.connection.write).toHaveBeenCalledWith(data);
        expect(client.connection.write).toHaveBeenCalledTimes(1);
      });

      it('should write empty string to connection', () => {
        const client = createMockClient();

        writeToClient(client, '');

        expect(client.connection.write).toHaveBeenCalledWith('');
      });

      it('should write messages with special characters', () => {
        const client = createMockClient();
        const specialMessage = 'Test with ANSI: \x1b[31mRed\x1b[0m and newlines\r\n';

        writeToClient(client, specialMessage);

        expect(client.connection.write).toHaveBeenCalledWith(specialMessage);
      });

      it('should write messages with unicode characters', () => {
        const client = createMockClient();
        const unicodeMessage = 'Hello 世界 🌍\r\n';

        writeToClient(client, unicodeMessage);

        expect(client.connection.write).toHaveBeenCalledWith(unicodeMessage);
      });
    });

    describe('monitoring functionality', () => {
      it('should not emit to admin socket when client is not being monitored', () => {
        const mockAdminSocket = { emit: jest.fn() };
        const client = createMockClient({
          isBeingMonitored: false,
          adminMonitorSocket: mockAdminSocket,
        });

        writeToClient(client, 'Test message');

        expect(mockAdminSocket.emit).not.toHaveBeenCalled();
      });

      it('should emit to admin socket when client is being monitored', () => {
        const mockAdminSocket = { emit: jest.fn() };
        const client = createMockClient({
          isBeingMonitored: true,
          adminMonitorSocket: mockAdminSocket,
        });
        const data = 'Monitored message\r\n';

        writeToClient(client, data);

        expect(client.connection.write).toHaveBeenCalledWith(data);
        expect(mockAdminSocket.emit).toHaveBeenCalledWith('monitor-output', { data });
        expect(mockAdminSocket.emit).toHaveBeenCalledTimes(1);
      });

      it('should not emit when being monitored but no admin socket provided', () => {
        const client = createMockClient({
          isBeingMonitored: true,
          adminMonitorSocket: undefined,
        });

        // Should not throw
        expect(() => writeToClient(client, 'Test')).not.toThrow();
        expect(client.connection.write).toHaveBeenCalledWith('Test');
      });

      it('should emit multiple messages to admin socket when monitored', () => {
        const mockAdminSocket = { emit: jest.fn() };
        const client = createMockClient({
          isBeingMonitored: true,
          adminMonitorSocket: mockAdminSocket,
        });

        writeToClient(client, 'First message');
        writeToClient(client, 'Second message');

        expect(mockAdminSocket.emit).toHaveBeenCalledTimes(2);
        expect(mockAdminSocket.emit).toHaveBeenNthCalledWith(1, 'monitor-output', {
          data: 'First message',
        });
        expect(mockAdminSocket.emit).toHaveBeenNthCalledWith(2, 'monitor-output', {
          data: 'Second message',
        });
      });
    });
  });

  describe('writeMessageToClient', () => {
    describe('unauthenticated client (no user)', () => {
      it('should write directly without clearing line when client has no user', () => {
        const client = createMockClient({ user: null });
        const message = 'Welcome to EllyMUD!\r\n';

        writeMessageToClient(client, message);

        expect(client.connection.write).toHaveBeenCalledWith(message);
        expect(client.connection.write).toHaveBeenCalledTimes(1);
        expect(drawCommandPrompt).not.toHaveBeenCalled();
      });

      it('should handle empty message for unauthenticated client', () => {
        const client = createMockClient({ user: null });

        writeMessageToClient(client, '');

        expect(client.connection.write).toHaveBeenCalledWith('');
        expect(drawCommandPrompt).not.toHaveBeenCalled();
      });
    });

    describe('authenticated client (with user)', () => {
      it('should clear line, write message, and redraw prompt', () => {
        const user = createMockUser();
        const client = createMockClient({ user, authenticated: true });
        const message = 'You see a goblin!\r\n';
        const clearLineSequence = '\r\x1B[K';

        writeMessageToClient(client, message);

        // Should call write 2 times: clear line, then message
        expect(client.connection.write).toHaveBeenCalledTimes(2);
        expect(client.connection.write).toHaveBeenNthCalledWith(1, clearLineSequence);
        expect(client.connection.write).toHaveBeenNthCalledWith(2, message);
        expect(drawCommandPrompt).toHaveBeenCalledWith(client);
      });

      it('should handle ANSI escape codes in messages', () => {
        const user = createMockUser();
        const client = createMockClient({ user, authenticated: true });
        const coloredMessage = '\x1b[31mCritical hit!\x1b[0m\r\n';

        writeMessageToClient(client, coloredMessage);

        expect(client.connection.write).toHaveBeenNthCalledWith(2, coloredMessage);
        expect(drawCommandPrompt).toHaveBeenCalledWith(client);
      });

      it('should handle multi-line messages', () => {
        const user = createMockUser();
        const client = createMockClient({ user, authenticated: true });
        const multiLineMessage = 'Line 1\r\nLine 2\r\nLine 3\r\n';

        writeMessageToClient(client, multiLineMessage);

        expect(client.connection.write).toHaveBeenNthCalledWith(2, multiLineMessage);
        expect(drawCommandPrompt).toHaveBeenCalledWith(client);
      });
    });

    describe('monitored client with user', () => {
      it('should emit all writes to admin socket when monitored', () => {
        const mockAdminSocket = { emit: jest.fn() };
        const user = createMockUser();
        const client = createMockClient({
          user,
          authenticated: true,
          isBeingMonitored: true,
          adminMonitorSocket: mockAdminSocket,
        });

        writeMessageToClient(client, 'Test message');

        // Clear line and message should both be emitted
        expect(mockAdminSocket.emit).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('writeFormattedMessageToClient', () => {
    describe('unauthenticated client', () => {
      it('should write directly when client is not authenticated', () => {
        const client = createMockClient({ authenticated: false, user: null });
        const message = 'Please login first.\r\n';

        writeFormattedMessageToClient(client, message);

        expect(client.connection.write).toHaveBeenCalledWith(message);
        expect(client.connection.write).toHaveBeenCalledTimes(1);
        expect(drawCommandPrompt).not.toHaveBeenCalled();
      });

      it('should write directly when client has no user even if authenticated flag is true', () => {
        const client = createMockClient({ authenticated: true, user: null });
        const message = 'No user attached.\r\n';

        writeFormattedMessageToClient(client, message);

        expect(client.connection.write).toHaveBeenCalledWith(message);
        expect(client.connection.write).toHaveBeenCalledTimes(1);
        expect(drawCommandPrompt).not.toHaveBeenCalled();
      });
    });

    describe('authenticated client', () => {
      it('should clear line, write message, and draw prompt by default', () => {
        const user = createMockUser();
        const client = createMockClient({ user, authenticated: true });
        const message = 'You picked up the sword.\r\n';
        const clearLineSequence = '\r\x1B[K';

        writeFormattedMessageToClient(client, message);

        expect(client.connection.write).toHaveBeenCalledTimes(2);
        expect(client.connection.write).toHaveBeenNthCalledWith(1, clearLineSequence);
        expect(client.connection.write).toHaveBeenNthCalledWith(2, message);
        expect(drawCommandPrompt).toHaveBeenCalledWith(client);
      });

      it('should not draw prompt when drawPrompt is false', () => {
        const user = createMockUser();
        const client = createMockClient({ user, authenticated: true });
        const message = 'Partial output...\r\n';
        const clearLineSequence = '\r\x1B[K';

        writeFormattedMessageToClient(client, message, false);

        expect(client.connection.write).toHaveBeenCalledTimes(2);
        expect(client.connection.write).toHaveBeenNthCalledWith(1, clearLineSequence);
        expect(client.connection.write).toHaveBeenNthCalledWith(2, message);
        expect(drawCommandPrompt).not.toHaveBeenCalled();
      });

      it('should draw prompt when drawPrompt is explicitly true', () => {
        const user = createMockUser();
        const client = createMockClient({ user, authenticated: true });
        const message = 'Test message\r\n';

        writeFormattedMessageToClient(client, message, true);

        expect(drawCommandPrompt).toHaveBeenCalledWith(client);
      });
    });

    describe('edge cases', () => {
      it('should handle empty message for authenticated client', () => {
        const user = createMockUser();
        const client = createMockClient({ user, authenticated: true });

        writeFormattedMessageToClient(client, '');

        expect(client.connection.write).toHaveBeenNthCalledWith(1, '\r\x1B[K');
        expect(client.connection.write).toHaveBeenNthCalledWith(2, '');
        expect(drawCommandPrompt).toHaveBeenCalled();
      });

      it('should handle message with only ANSI codes', () => {
        const user = createMockUser();
        const client = createMockClient({ user, authenticated: true });
        const ansiOnly = '\x1b[2J\x1b[H'; // Clear screen and home cursor

        writeFormattedMessageToClient(client, ansiOnly);

        expect(client.connection.write).toHaveBeenNthCalledWith(2, ansiOnly);
      });
    });
  });

  describe('stopBuffering', () => {
    describe('basic functionality', () => {
      it('should reset isTyping flag', () => {
        const client = createMockClient({ isTyping: true, outputBuffer: [] });

        stopBuffering(client);

        expect(client.isTyping).toBe(false);
      });

      it('should do nothing when buffer is empty', () => {
        const client = createMockClient({ isTyping: true, outputBuffer: [] });

        stopBuffering(client);

        expect(client.connection.write).not.toHaveBeenCalled();
        expect(drawCommandPrompt).not.toHaveBeenCalled();
      });
    });

    describe('processing buffered messages', () => {
      it('should process and clear buffered messages', () => {
        const client = createMockClient({
          isTyping: true,
          outputBuffer: ['Message 1\r\n', 'Message 2\r\n'],
        });

        stopBuffering(client);

        expect(client.connection.write).toHaveBeenCalledWith('Message 1\r\n');
        expect(client.connection.write).toHaveBeenCalledWith('Message 2\r\n');
        expect(client.outputBuffer).toEqual([]);
      });

      it('should process buffered messages in order', () => {
        const client = createMockClient({
          isTyping: true,
          outputBuffer: ['First', 'Second', 'Third'],
        });
        const writeOrder: string[] = [];
        (client.connection.write as jest.Mock).mockImplementation((data: string) => {
          writeOrder.push(data);
        });

        stopBuffering(client);

        expect(writeOrder).toEqual(['First', 'Second', 'Third']);
      });

      it('should draw prompt after processing buffer for authenticated user', () => {
        const user = createMockUser();
        const client = createMockClient({
          user,
          authenticated: true,
          isTyping: true,
          outputBuffer: ['Buffered message\r\n'],
        });

        stopBuffering(client);

        expect(client.connection.write).toHaveBeenCalledWith('Buffered message\r\n');
        expect(drawCommandPrompt).toHaveBeenCalledWith(client);
      });

      it('should not draw prompt after processing buffer for unauthenticated user', () => {
        const client = createMockClient({
          user: null,
          authenticated: false,
          isTyping: true,
          outputBuffer: ['Buffered message\r\n'],
        });

        stopBuffering(client);

        expect(client.connection.write).toHaveBeenCalledWith('Buffered message\r\n');
        expect(drawCommandPrompt).not.toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      it('should handle buffer with empty strings', () => {
        const client = createMockClient({
          isTyping: true,
          outputBuffer: ['', 'Valid message', ''],
        });

        stopBuffering(client);

        expect(client.connection.write).toHaveBeenCalledTimes(3);
        expect(client.outputBuffer).toEqual([]);
      });

      it('should handle client that was not typing', () => {
        const client = createMockClient({
          isTyping: false,
          outputBuffer: ['Message'],
        });

        stopBuffering(client);

        // Should still process buffer and set isTyping to false
        expect(client.isTyping).toBe(false);
        expect(client.connection.write).toHaveBeenCalledWith('Message');
      });

      it('should handle large buffer', () => {
        const largeBuffer = Array(100)
          .fill(null)
          .map((_, i) => `Message ${i}\r\n`);
        const client = createMockClient({
          isTyping: true,
          outputBuffer: largeBuffer,
        });

        stopBuffering(client);

        expect(client.connection.write).toHaveBeenCalledTimes(100);
        expect(client.outputBuffer).toEqual([]);
      });
    });

    describe('monitored client', () => {
      it('should emit buffered messages to admin socket when monitored', () => {
        const mockAdminSocket = { emit: jest.fn() };
        const client = createMockClient({
          isTyping: true,
          outputBuffer: ['Buffered 1', 'Buffered 2'],
          isBeingMonitored: true,
          adminMonitorSocket: mockAdminSocket,
        });

        stopBuffering(client);

        expect(mockAdminSocket.emit).toHaveBeenCalledTimes(2);
        expect(mockAdminSocket.emit).toHaveBeenNthCalledWith(1, 'monitor-output', {
          data: 'Buffered 1',
        });
        expect(mockAdminSocket.emit).toHaveBeenNthCalledWith(2, 'monitor-output', {
          data: 'Buffered 2',
        });
      });
    });
  });

  describe('re-exported functions', () => {
    it('should re-export drawCommandPrompt from promptFormatter', () => {
      // Verify re-export is defined and is a function
      expect(reExportedDrawCommandPrompt).toBeDefined();
      expect(typeof reExportedDrawCommandPrompt).toBe('function');
    });

    it('should re-export writeCommandPrompt from promptFormatter', () => {
      expect(reExportedWriteCommandPrompt).toBeDefined();
      expect(typeof reExportedWriteCommandPrompt).toBe('function');
    });

    it('should re-export getPromptText from promptFormatter', () => {
      expect(reExportedGetPromptText).toBeDefined();
      expect(typeof reExportedGetPromptText).toBe('function');
    });
  });

  describe('integration scenarios', () => {
    it('should handle a typical login message sequence', () => {
      const client = createMockClient({ user: null });

      // Before login - no user
      writeMessageToClient(client, 'Enter your username: ');
      expect(client.connection.write).toHaveBeenLastCalledWith('Enter your username: ');

      // After login - with user
      const user = createMockUser();
      client.user = user;
      client.authenticated = true;

      writeMessageToClient(client, 'Welcome back, testuser!\r\n');
      expect(drawCommandPrompt).toHaveBeenCalled();
    });

    it('should handle combat message sequence', () => {
      const user = createMockUser({ inCombat: true });
      const client = createMockClient({ user, authenticated: true });

      writeFormattedMessageToClient(client, 'You attack the goblin!\r\n');
      writeFormattedMessageToClient(client, 'The goblin attacks you!\r\n');
      writeFormattedMessageToClient(client, 'You defeat the goblin!\r\n');

      // Each message should clear line and write
      expect(client.connection.write).toHaveBeenCalledTimes(6); // 3 clears + 3 messages
      expect(drawCommandPrompt).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed authenticated and unauthenticated messages', () => {
      const user = createMockUser();
      const client = createMockClient({ user: null, authenticated: false });

      // Unauthenticated
      writeFormattedMessageToClient(client, 'Login prompt...');
      expect(drawCommandPrompt).not.toHaveBeenCalled();

      // Become authenticated
      client.user = user;
      client.authenticated = true;
      jest.clearAllMocks();

      // Authenticated
      writeFormattedMessageToClient(client, 'Welcome!');
      expect(drawCommandPrompt).toHaveBeenCalled();
    });
  });
});
