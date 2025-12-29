/**
 * Unit tests for TelnetConnection
 * @module connection/telnet.connection.test
 */

import { TelnetConnection } from './telnet.connection';
import { Socket } from 'net';

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

describe('TelnetConnection', () => {
  let mockSocket: jest.Mocked<Socket>;
  let connection: TelnetConnection;
  const eventHandlers: Map<string, ((...args: unknown[]) => void)[]> = new Map();

  beforeEach(() => {
    jest.clearAllMocks();
    eventHandlers.clear();

    // Create a mock net.Socket
    mockSocket = {
      on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (!eventHandlers.has(event)) {
          eventHandlers.set(event, []);
        }
        eventHandlers.get(event)!.push(handler);
        return mockSocket;
      }),
      write: jest.fn().mockReturnValue(true),
      end: jest.fn(),
      writable: true,
      remoteAddress: '192.168.0.1',
    } as unknown as jest.Mocked<Socket>;

    connection = new TelnetConnection(mockSocket);
  });

  describe('constructor', () => {
    it('should create connection with auto-generated id', () => {
      expect(connection.getId()).toMatch(/^telnet-\d+-\d+$/);
    });

    it('should set up socket event listeners', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('end', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should send telnet negotiations on creation', () => {
      // Should have called write for telnet negotiations
      expect(mockSocket.write).toHaveBeenCalled();
    });
  });

  describe('getId', () => {
    it('should return the connection id', () => {
      const id = connection.getId();
      expect(id).toMatch(/^telnet-\d+-\d+$/);
    });
  });

  describe('getType', () => {
    it('should return "telnet"', () => {
      expect(connection.getType()).toBe('telnet');
    });
  });

  describe('write', () => {
    it('should write data to socket when writable', () => {
      connection.write('Hello, World!');

      expect(mockSocket.write).toHaveBeenCalledWith('Hello, World!');
    });

    it('should not write when socket is not writable', () => {
      // Create a new socket with writable set to false
      const nonWritableSocket = {
        ...mockSocket,
        writable: false,
        write: jest.fn(),
      } as unknown as jest.Mocked<Socket>;

      const conn = new TelnetConnection(nonWritableSocket);
      jest.clearAllMocks();

      conn.write('Test');

      expect(nonWritableSocket.write).not.toHaveBeenCalled();
    });

    it('should log output when raw logging is enabled', () => {
      connection.enableRawLogging(true);
      connection.write('Test output');

      expect(mockGetSessionLogger).toHaveBeenCalled();
    });
  });

  describe('end', () => {
    it('should end the socket', () => {
      connection.end();

      expect(mockSocket.end).toHaveBeenCalled();
    });

    it('should close session logger when raw logging is enabled', () => {
      connection.enableRawLogging(true);
      connection.end();

      expect(mockCloseSessionLogger).toHaveBeenCalled();
    });
  });

  describe('setMaskInput', () => {
    it('should enable masking', () => {
      expect(() => connection.setMaskInput(true)).not.toThrow();
    });

    it('should disable masking', () => {
      connection.setMaskInput(true);
      expect(() => connection.setMaskInput(false)).not.toThrow();
    });

    it('should log password complete when disabling mask with raw logging', () => {
      connection.enableRawLogging(true);
      connection.setMaskInput(true);
      connection.setMaskInput(false);

      const mockLogger = mockGetSessionLogger(connection.getId());
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
    it('should return true by default', () => {
      expect(connection.isRawLoggingEnabled()).toBe(true);
    });

    it('should return false when disabled', () => {
      connection.enableRawLogging(false);
      expect(connection.isRawLoggingEnabled()).toBe(false);
    });
  });

  describe('remoteAddress', () => {
    it('should return the socket remote address', () => {
      expect(connection.remoteAddress).toBe('192.168.0.1');
    });

    it('should return "unknown" when address is not available', () => {
      const socketWithoutAddress = {
        ...mockSocket,
        remoteAddress: undefined,
      } as unknown as jest.Mocked<Socket>;

      const conn = new TelnetConnection(socketWithoutAddress);
      expect(conn.remoteAddress).toBe('unknown');
    });
  });

  describe('event handling', () => {
    describe('data events', () => {
      it('should emit data event for normal characters', () => {
        const dataHandler = jest.fn();
        connection.on('data', dataHandler);

        const dataHandlers = eventHandlers.get('data');
        // Send simple ASCII text
        dataHandlers![0](Buffer.from('hello'));

        expect(dataHandler).toHaveBeenCalledWith('hello');
      });

      it('should handle carriage return', () => {
        const dataHandler = jest.fn();
        connection.on('data', dataHandler);

        const dataHandlers = eventHandlers.get('data');
        dataHandlers![0](Buffer.from([13])); // CR

        expect(dataHandler).toHaveBeenCalledWith('\r');
      });

      it('should handle CRLF sequence', () => {
        const dataHandler = jest.fn();
        connection.on('data', dataHandler);

        const dataHandlers = eventHandlers.get('data');
        dataHandlers![0](Buffer.from([13, 10])); // CR LF

        expect(dataHandler).toHaveBeenCalledWith('\r');
      });

      it('should handle backspace', () => {
        const dataHandler = jest.fn();
        connection.on('data', dataHandler);

        const dataHandlers = eventHandlers.get('data');
        dataHandlers![0](Buffer.from([8])); // Backspace

        expect(dataHandler).toHaveBeenCalledWith('\b');
      });

      it('should handle delete key as regular character (note: DEL 127 > 32)', () => {
        const dataHandler = jest.fn();
        connection.on('data', dataHandler);

        const dataHandlers = eventHandlers.get('data');
        dataHandlers![0](Buffer.from([127])); // DEL

        // Note: DEL (127) is > 32 so it goes to the else branch as a regular char
        // This is the actual behavior of the implementation
        expect(dataHandler).toHaveBeenCalledWith(String.fromCharCode(127));
      });

      it('should handle line feed', () => {
        const dataHandler = jest.fn();
        connection.on('data', dataHandler);

        const dataHandlers = eventHandlers.get('data');
        dataHandlers![0](Buffer.from([10])); // LF

        expect(dataHandler).toHaveBeenCalledWith('\n');
      });

      it('should skip IAC telnet commands', () => {
        const dataHandler = jest.fn();
        connection.on('data', dataHandler);

        const dataHandlers = eventHandlers.get('data');
        // IAC WILL ECHO
        dataHandlers![0](Buffer.from([255, 251, 1, 65])); // IAC WILL ECHO + 'A'

        expect(dataHandler).toHaveBeenCalledWith('A');
      });

      it('should log input when raw logging is enabled and not masking', () => {
        connection.enableRawLogging(true);
        connection.setMaskInput(false);
        jest.clearAllMocks();

        const dataHandlers = eventHandlers.get('data');
        dataHandlers![0](Buffer.from('test'));

        const mockLogger = mockGetSessionLogger(connection.getId());
        expect(mockLogger.logInput).toHaveBeenCalledWith('test');
      });

      it('should log masked message once when in password mode', () => {
        connection.enableRawLogging(true);
        connection.setMaskInput(true);
        jest.clearAllMocks();

        const dataHandlers = eventHandlers.get('data');
        dataHandlers![0](Buffer.from('p'));
        dataHandlers![0](Buffer.from('a'));
        dataHandlers![0](Buffer.from('s'));
        dataHandlers![0](Buffer.from('s'));

        const mockLogger = mockGetSessionLogger(connection.getId());
        // Should only log the masked message once
        expect(mockLogger.logInput).toHaveBeenCalledTimes(1);
        expect(mockLogger.logInput).toHaveBeenCalledWith('[PASSWORD INPUT MASKED]');
      });

      it('should handle up arrow escape sequence', () => {
        const dataHandler = jest.fn();
        connection.on('data', dataHandler);

        const dataHandlers = eventHandlers.get('data');
        // ESC [ A (up arrow)
        dataHandlers![0](Buffer.from([27, 91, 65]));

        expect(dataHandler).toHaveBeenCalledWith('\u001b[A');
      });

      it('should handle down arrow escape sequence', () => {
        const dataHandler = jest.fn();
        connection.on('data', dataHandler);

        const dataHandlers = eventHandlers.get('data');
        // ESC [ B (down arrow)
        dataHandlers![0](Buffer.from([27, 91, 66]));

        expect(dataHandler).toHaveBeenCalledWith('\u001b[B');
      });
    });

    describe('end events', () => {
      it('should emit end event on socket end', () => {
        const endHandler = jest.fn();
        connection.on('end', endHandler);

        const endHandlers = eventHandlers.get('end');
        endHandlers![0]();

        expect(endHandler).toHaveBeenCalled();
      });

      it('should close session logger on end when raw logging enabled', () => {
        connection.enableRawLogging(true);

        const endHandlers = eventHandlers.get('end');
        endHandlers![0]();

        expect(mockCloseSessionLogger).toHaveBeenCalled();
      });
    });

    describe('error events', () => {
      it('should emit error event on socket error', () => {
        const errorHandler = jest.fn();
        connection.on('error', errorHandler);

        const error = new Error('Socket error');
        const errorHandlers = eventHandlers.get('error');
        errorHandlers![0](error);

        expect(errorHandler).toHaveBeenCalledWith(error);
      });

      it('should log error when raw logging enabled', () => {
        // Need to add error handler to prevent unhandled error
        connection.on('error', jest.fn());
        connection.enableRawLogging(true);

        const error = new Error('Connection reset');
        const errorHandlers = eventHandlers.get('error');
        errorHandlers![0](error);

        const mockLogger = mockGetSessionLogger(connection.getId());
        expect(mockLogger.logOutput).toHaveBeenCalledWith('[ERROR] Connection reset');
      });
    });
  });

  describe('telnet negotiations', () => {
    it('should send WILL ECHO on creation', () => {
      // Check that write was called with telnet negotiation bytes
      const writeCalls = mockSocket.write.mock.calls;
      const allBytes: number[] = [];

      writeCalls.forEach((call) => {
        const buf = call[0] as Buffer;
        if (Buffer.isBuffer(buf)) {
          allBytes.push(...Array.from(buf));
        }
      });

      // IAC (255) WILL (251) ECHO (1) should be present
      expect(allBytes).toContain(255); // IAC
      expect(allBytes).toContain(251); // WILL
      expect(allBytes).toContain(1); // ECHO
    });

    it('should send DO SUPPRESS_GO_AHEAD on creation', () => {
      const writeCalls = mockSocket.write.mock.calls;
      const allBytes: number[] = [];

      writeCalls.forEach((call) => {
        const buf = call[0] as Buffer;
        if (Buffer.isBuffer(buf)) {
          allBytes.push(...Array.from(buf));
        }
      });

      // IAC (255) DO (253) SGA (3) should be present
      expect(allBytes).toContain(255); // IAC
      expect(allBytes).toContain(253); // DO
      expect(allBytes).toContain(3); // SUPPRESS_GO_AHEAD
    });
  });
});
