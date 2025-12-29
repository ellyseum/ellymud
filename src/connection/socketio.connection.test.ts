/**
 * Unit tests for SocketIOConnection
 * @module connection/socketio.connection.test
 */

import { SocketIOConnection } from './socketio.connection';
import { Socket } from 'socket.io';

// Mock the raw session logger
jest.mock('../utils/rawSessionLogger', () => ({
  getSessionLogger: jest.fn().mockReturnValue({
    logInput: jest.fn(),
    logOutput: jest.fn(),
  }),
  closeSessionLogger: jest.fn(),
}));

import { getSessionLogger, closeSessionLogger } from '../utils/rawSessionLogger';

const mockGetSessionLogger = getSessionLogger as jest.MockedFunction<typeof getSessionLogger>;
const mockCloseSessionLogger = closeSessionLogger as jest.MockedFunction<typeof closeSessionLogger>;

describe('SocketIOConnection', () => {
  let mockSocket: jest.Mocked<Socket>;
  let connection: SocketIOConnection;
  const eventHandlers: Map<string, ((...args: unknown[]) => void)[]> = new Map();

  beforeEach(() => {
    jest.clearAllMocks();
    eventHandlers.clear();

    // Create a mock Socket.IO socket
    mockSocket = {
      id: 'test-socket-id-123',
      on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (!eventHandlers.has(event)) {
          eventHandlers.set(event, []);
        }
        eventHandlers.get(event)!.push(handler);
        return mockSocket;
      }),
      emit: jest.fn(),
      disconnect: jest.fn(),
      handshake: {
        address: '192.168.1.100',
      },
    } as unknown as jest.Mocked<Socket>;

    connection = new SocketIOConnection(mockSocket);
  });

  describe('constructor', () => {
    it('should create connection with socket id', () => {
      expect(connection.getId()).toBe('test-socket-id-123');
    });

    it('should set up event listeners', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('keypress', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('special', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('getId', () => {
    it('should return the socket id', () => {
      expect(connection.getId()).toBe('test-socket-id-123');
    });
  });

  describe('getType', () => {
    it('should return "websocket"', () => {
      expect(connection.getType()).toBe('websocket');
    });
  });

  describe('write', () => {
    it('should emit output to socket', () => {
      connection.write('Hello, World!');

      expect(mockSocket.emit).toHaveBeenCalledWith('output', { data: 'Hello, World!' });
    });

    it('should log output when raw logging is enabled', () => {
      connection.enableRawLogging(true);
      connection.write('Test output');

      expect(mockGetSessionLogger).toHaveBeenCalledWith('test-socket-id-123');
    });
  });

  describe('end', () => {
    it('should disconnect the socket', () => {
      connection.end();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should close session logger when raw logging is enabled', () => {
      connection.enableRawLogging(true);
      connection.end();

      expect(mockCloseSessionLogger).toHaveBeenCalledWith('test-socket-id-123');
    });
  });

  describe('setMaskInput', () => {
    it('should emit mask event to socket when enabling', () => {
      connection.setMaskInput(true);

      expect(mockSocket.emit).toHaveBeenCalledWith('mask', { mask: true });
    });

    it('should emit mask event to socket when disabling', () => {
      connection.setMaskInput(true);
      connection.setMaskInput(false);

      expect(mockSocket.emit).toHaveBeenCalledWith('mask', { mask: false });
    });

    it('should log password complete when disabling mask with raw logging', () => {
      connection.enableRawLogging(true);
      connection.setMaskInput(true);
      connection.setMaskInput(false);

      const mockLogger = mockGetSessionLogger('test-socket-id-123');
      expect(mockLogger.logInput).toHaveBeenCalledWith('[PASSWORD INPUT COMPLETE]');
    });
  });

  describe('getRawConnection', () => {
    it('should return the underlying socket', () => {
      expect(connection.getRawConnection()).toBe(mockSocket);
    });
  });

  describe('enableRawLogging', () => {
    it('should enable raw logging', () => {
      connection.enableRawLogging(true);
      expect(connection.isRawLoggingEnabled()).toBe(true);
    });

    it('should disable raw logging', () => {
      connection.enableRawLogging(true);
      connection.enableRawLogging(false);
      expect(connection.isRawLoggingEnabled()).toBe(false);
    });
  });

  describe('isRawLoggingEnabled', () => {
    it('should return true when logging is enabled', () => {
      connection.enableRawLogging(true);
      expect(connection.isRawLoggingEnabled()).toBe(true);
    });

    it('should return false when logging is disabled', () => {
      expect(connection.isRawLoggingEnabled()).toBe(true); // Default is true
      connection.enableRawLogging(false);
      expect(connection.isRawLoggingEnabled()).toBe(false);
    });
  });

  describe('remoteAddress', () => {
    it('should return the handshake address', () => {
      expect(connection.remoteAddress).toBe('192.168.1.100');
    });

    it('should return "unknown" when address is not available', () => {
      const socketWithoutAddress = {
        ...mockSocket,
        handshake: { address: '' },
      } as unknown as jest.Mocked<Socket>;

      const conn = new SocketIOConnection(socketWithoutAddress);
      expect(conn.remoteAddress).toBe('unknown');
    });
  });

  describe('event handling', () => {
    describe('keypress events', () => {
      it('should emit data event on keypress', () => {
        const dataHandler = jest.fn();
        connection.on('data', dataHandler);

        // Trigger the keypress handler
        const keypressHandlers = eventHandlers.get('keypress');
        expect(keypressHandlers).toBeDefined();
        keypressHandlers![0]('a');

        expect(dataHandler).toHaveBeenCalledWith('a');
      });

      it('should log input when raw logging is enabled and not masking', () => {
        connection.enableRawLogging(true);
        connection.setMaskInput(false);

        const keypressHandlers = eventHandlers.get('keypress');
        keypressHandlers![0]('test');

        const mockLogger = mockGetSessionLogger('test-socket-id-123');
        expect(mockLogger.logInput).toHaveBeenCalledWith('test');
      });

      it('should log masked message once when in password mode', () => {
        connection.enableRawLogging(true);
        connection.setMaskInput(true);
        jest.clearAllMocks();

        const keypressHandlers = eventHandlers.get('keypress');
        keypressHandlers![0]('p');
        keypressHandlers![0]('a');
        keypressHandlers![0]('s');
        keypressHandlers![0]('s');

        const mockLogger = mockGetSessionLogger('test-socket-id-123');
        // Should only log the masked message once
        expect(mockLogger.logInput).toHaveBeenCalledTimes(1);
        expect(mockLogger.logInput).toHaveBeenCalledWith('[PASSWORD INPUT MASKED]');
      });
    });

    describe('special events', () => {
      it('should emit arrow key codes for up arrow', () => {
        const dataHandler = jest.fn();
        connection.on('data', dataHandler);

        const specialHandlers = eventHandlers.get('special');
        specialHandlers![0]({ key: 'up' });

        expect(dataHandler).toHaveBeenCalledWith('\u001b[A');
      });

      it('should emit arrow key codes for down arrow', () => {
        const dataHandler = jest.fn();
        connection.on('data', dataHandler);

        const specialHandlers = eventHandlers.get('special');
        specialHandlers![0]({ key: 'down' });

        expect(dataHandler).toHaveBeenCalledWith('\u001b[B');
      });

      it('should emit arrow key codes for left arrow', () => {
        const dataHandler = jest.fn();
        connection.on('data', dataHandler);

        const specialHandlers = eventHandlers.get('special');
        specialHandlers![0]({ key: 'left' });

        expect(dataHandler).toHaveBeenCalledWith('\u001b[D');
      });

      it('should emit arrow key codes for right arrow', () => {
        const dataHandler = jest.fn();
        connection.on('data', dataHandler);

        const specialHandlers = eventHandlers.get('special');
        specialHandlers![0]({ key: 'right' });

        expect(dataHandler).toHaveBeenCalledWith('\u001b[C');
      });

      it('should log special keys when raw logging enabled', () => {
        connection.enableRawLogging(true);
        connection.setMaskInput(false);

        const specialHandlers = eventHandlers.get('special');
        specialHandlers![0]({ key: 'up' });

        const mockLogger = mockGetSessionLogger('test-socket-id-123');
        expect(mockLogger.logInput).toHaveBeenCalledWith('[SPECIAL:up]');
      });
    });

    describe('disconnect events', () => {
      it('should emit end event on disconnect', () => {
        const endHandler = jest.fn();
        connection.on('end', endHandler);

        const disconnectHandlers = eventHandlers.get('disconnect');
        disconnectHandlers![0]();

        expect(endHandler).toHaveBeenCalled();
      });

      it('should close session logger on disconnect when raw logging enabled', () => {
        connection.enableRawLogging(true);

        const disconnectHandlers = eventHandlers.get('disconnect');
        disconnectHandlers![0]();

        expect(mockCloseSessionLogger).toHaveBeenCalledWith('test-socket-id-123');
      });
    });

    describe('error events', () => {
      it('should emit error event on socket error', () => {
        const errorHandler = jest.fn();
        connection.on('error', errorHandler);

        const error = new Error('Test error');
        const errorHandlers = eventHandlers.get('error');
        errorHandlers![0](error);

        expect(errorHandler).toHaveBeenCalledWith(error);
      });

      it('should log error when raw logging enabled', () => {
        // Need to add error handler to prevent unhandled error
        connection.on('error', jest.fn());
        connection.enableRawLogging(true);

        const error = new Error('Connection failed');
        const errorHandlers = eventHandlers.get('error');
        errorHandlers![0](error);

        const mockLogger = mockGetSessionLogger('test-socket-id-123');
        expect(mockLogger.logOutput).toHaveBeenCalledWith('[ERROR] Connection failed');
      });
    });
  });
});
