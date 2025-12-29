/**
 * Unit tests for WebSocketConnection
 * @module connection/websocket.connection.test
 */

import { WebSocketConnection } from './websocket.connection';
import WebSocket from 'ws';

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

describe('WebSocketConnection', () => {
  let mockWs: jest.Mocked<WebSocket>;
  let connection: WebSocketConnection;
  const eventHandlers: Map<string, ((...args: unknown[]) => void)[]> = new Map();

  beforeEach(() => {
    jest.clearAllMocks();
    eventHandlers.clear();

    // Create a mock WebSocket
    mockWs = {
      on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (!eventHandlers.has(event)) {
          eventHandlers.set(event, []);
        }
        eventHandlers.get(event)!.push(handler);
        return mockWs;
      }),
      send: jest.fn(),
      close: jest.fn(),
      _socket: {
        remoteAddress: '10.0.0.50',
      },
    } as unknown as jest.Mocked<WebSocket>;

    connection = new WebSocketConnection(mockWs, 'client-abc-123');
  });

  describe('constructor', () => {
    it('should create connection with formatted id', () => {
      expect(connection.getId()).toBe('ws:client-abc-123');
    });

    it('should set up event listeners', () => {
      expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('getId', () => {
    it('should return the formatted connection id', () => {
      expect(connection.getId()).toBe('ws:client-abc-123');
    });
  });

  describe('getType', () => {
    it('should return "websocket"', () => {
      expect(connection.getType()).toBe('websocket');
    });
  });

  describe('write', () => {
    it('should send echo message for single character', () => {
      connection.write('a');

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'echo',
          char: 'a',
        })
      );
    });

    it('should send echo message for backspace sequence', () => {
      connection.write('\b \b');

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'echo',
          char: '\b \b',
        })
      );
    });

    it('should send echo message for newline', () => {
      connection.write('\r\n');

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'echo',
          char: '\r\n',
        })
      );
    });

    it('should send output message for longer text', () => {
      connection.write('Hello, World!');

      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('"type":"output"'));
    });

    it('should convert ANSI codes to HTML in output', () => {
      // Test with a simple newline that should be converted to <br>
      connection.write('Line 1\r\nLine 2');

      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('<br>'));
    });

    it('should log output when raw logging is enabled', () => {
      connection.enableRawLogging(true);
      connection.write('Test output');

      expect(mockGetSessionLogger).toHaveBeenCalledWith('ws:client-abc-123');
    });
  });

  describe('end', () => {
    it('should close the websocket', () => {
      connection.end();

      expect(mockWs.close).toHaveBeenCalled();
    });

    it('should close session logger when raw logging is enabled', () => {
      connection.enableRawLogging(true);
      connection.end();

      expect(mockCloseSessionLogger).toHaveBeenCalledWith('ws:client-abc-123');
    });
  });

  describe('setMaskInput', () => {
    it('should send mask message when enabling', () => {
      connection.setMaskInput(true);

      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: 'mask', mask: true }));
    });

    it('should send mask message when disabling', () => {
      connection.setMaskInput(true);
      connection.setMaskInput(false);

      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: 'mask', mask: false }));
    });

    it('should log password complete when disabling mask with raw logging', () => {
      connection.enableRawLogging(true);
      connection.setMaskInput(true);
      connection.setMaskInput(false);

      const mockLogger = mockGetSessionLogger('ws:client-abc-123');
      expect(mockLogger.logInput).toHaveBeenCalledWith('[PASSWORD INPUT COMPLETE]');
    });
  });

  describe('getRawConnection', () => {
    it('should return the underlying websocket', () => {
      expect(connection.getRawConnection()).toBe(mockWs);
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
      connection.enableRawLogging(false);
      expect(connection.isRawLoggingEnabled()).toBe(false);
    });
  });

  describe('remoteAddress', () => {
    it('should return the socket remote address', () => {
      expect(connection.remoteAddress).toBe('10.0.0.50');
    });

    it('should return "unknown" when address is not available', () => {
      const wsWithoutAddress = {
        ...mockWs,
        _socket: undefined,
      } as unknown as jest.Mocked<WebSocket>;

      const conn = new WebSocketConnection(wsWithoutAddress, 'no-addr');
      expect(conn.remoteAddress).toBe('unknown');
    });
  });

  describe('event handling', () => {
    describe('message events - JSON input', () => {
      it('should emit data event for input type messages', () => {
        const dataHandler = jest.fn();
        connection.on('data', dataHandler);

        const messageHandlers = eventHandlers.get('message');
        messageHandlers![0](Buffer.from(JSON.stringify({ type: 'input', text: 'hello' })));

        expect(dataHandler).toHaveBeenCalledWith('hello');
      });

      it('should log input when raw logging is enabled and not masking', () => {
        connection.enableRawLogging(true);
        connection.setMaskInput(false);
        jest.clearAllMocks();

        const messageHandlers = eventHandlers.get('message');
        messageHandlers![0](Buffer.from(JSON.stringify({ type: 'input', text: 'command' })));

        const mockLogger = mockGetSessionLogger('ws:client-abc-123');
        expect(mockLogger.logInput).toHaveBeenCalledWith('command');
      });

      it('should log masked message once when in password mode', () => {
        connection.enableRawLogging(true);
        connection.setMaskInput(true);
        jest.clearAllMocks();

        const messageHandlers = eventHandlers.get('message');
        messageHandlers![0](Buffer.from(JSON.stringify({ type: 'input', text: 'p' })));
        messageHandlers![0](Buffer.from(JSON.stringify({ type: 'input', text: 'a' })));
        messageHandlers![0](Buffer.from(JSON.stringify({ type: 'input', text: 's' })));

        const mockLogger = mockGetSessionLogger('ws:client-abc-123');
        // Should only log the masked message once
        expect(mockLogger.logInput).toHaveBeenCalledTimes(1);
        expect(mockLogger.logInput).toHaveBeenCalledWith('[PASSWORD INPUT MASKED]');
      });
    });

    describe('message events - keypress type', () => {
      it('should emit data event for keypress type messages', () => {
        const dataHandler = jest.fn();
        connection.on('data', dataHandler);

        const messageHandlers = eventHandlers.get('message');
        messageHandlers![0](Buffer.from(JSON.stringify({ type: 'keypress', key: 'x' })));

        expect(dataHandler).toHaveBeenCalledWith('x');
      });
    });

    describe('message events - special type', () => {
      it('should emit data for newline special key', () => {
        const dataHandler = jest.fn();
        connection.on('data', dataHandler);

        const messageHandlers = eventHandlers.get('message');
        messageHandlers![0](Buffer.from(JSON.stringify({ type: 'special', key: '\r\n' })));

        expect(dataHandler).toHaveBeenCalledWith('\r\n');
      });

      it('should emit data for backspace special key', () => {
        const dataHandler = jest.fn();
        connection.on('data', dataHandler);

        const messageHandlers = eventHandlers.get('message');
        messageHandlers![0](Buffer.from(JSON.stringify({ type: 'special', key: '\b' })));

        expect(dataHandler).toHaveBeenCalledWith('\b');
      });

      it('should emit data for tab special key', () => {
        const dataHandler = jest.fn();
        connection.on('data', dataHandler);

        const messageHandlers = eventHandlers.get('message');
        messageHandlers![0](Buffer.from(JSON.stringify({ type: 'special', key: '\t' })));

        expect(dataHandler).toHaveBeenCalledWith('\t');
      });
    });

    describe('message events - plain text fallback', () => {
      it('should handle non-JSON messages as plain text', () => {
        const dataHandler = jest.fn();
        connection.on('data', dataHandler);

        const messageHandlers = eventHandlers.get('message');
        messageHandlers![0](Buffer.from('plain text input'));

        expect(dataHandler).toHaveBeenCalledWith('plain text input');
      });

      it('should log plain text input when raw logging enabled', () => {
        connection.enableRawLogging(true);
        connection.setMaskInput(false);
        jest.clearAllMocks();

        const messageHandlers = eventHandlers.get('message');
        messageHandlers![0](Buffer.from('plain text'));

        const mockLogger = mockGetSessionLogger('ws:client-abc-123');
        expect(mockLogger.logInput).toHaveBeenCalledWith('plain text');
      });
    });

    describe('close events', () => {
      it('should emit end event on close', () => {
        const endHandler = jest.fn();
        connection.on('end', endHandler);

        const closeHandlers = eventHandlers.get('close');
        closeHandlers![0]();

        expect(endHandler).toHaveBeenCalled();
      });

      it('should close session logger on close when raw logging enabled', () => {
        connection.enableRawLogging(true);

        const closeHandlers = eventHandlers.get('close');
        closeHandlers![0]();

        expect(mockCloseSessionLogger).toHaveBeenCalledWith('ws:client-abc-123');
      });
    });

    describe('error events', () => {
      it('should emit error event on websocket error', () => {
        const errorHandler = jest.fn();
        connection.on('error', errorHandler);

        const error = new Error('WebSocket error');
        const errorHandlers = eventHandlers.get('error');
        errorHandlers![0](error);

        expect(errorHandler).toHaveBeenCalledWith(error);
      });

      it('should log error when raw logging enabled', () => {
        // Need to add error handler to prevent unhandled error
        connection.on('error', jest.fn());
        connection.enableRawLogging(true);

        const error = new Error('Connection lost');
        const errorHandlers = eventHandlers.get('error');
        errorHandlers![0](error);

        const mockLogger = mockGetSessionLogger('ws:client-abc-123');
        expect(mockLogger.logOutput).toHaveBeenCalledWith('[ERROR] Connection lost');
      });
    });
  });

  describe('ANSI to HTML conversion', () => {
    it('should convert newlines to br tags', () => {
      connection.write('Hello\r\nWorld');

      const calls = mockWs.send.mock.calls;
      const lastCall = calls[calls.length - 1][0] as string;
      const parsed = JSON.parse(lastCall);

      expect(parsed.data).toContain('<br>');
    });

    it('should convert LF to br tags', () => {
      connection.write('Line1\nLine2');

      const calls = mockWs.send.mock.calls;
      const lastCall = calls[calls.length - 1][0] as string;
      const parsed = JSON.parse(lastCall);

      expect(parsed.data).toContain('<br>');
    });

    it('should handle reset ANSI code', () => {
      const ESC = String.fromCharCode(27);
      connection.write(`${ESC}[0m`);

      const calls = mockWs.send.mock.calls;
      const lastCall = calls[calls.length - 1][0] as string;
      const parsed = JSON.parse(lastCall);

      expect(parsed.data).toContain('</span>');
    });
  });
});
