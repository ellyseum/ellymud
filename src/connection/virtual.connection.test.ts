/**
 * Unit tests for VirtualConnection
 * @module connection/virtual.connection.test
 */

import { VirtualConnection } from './virtual.connection';

describe('VirtualConnection', () => {
  let connection: VirtualConnection;

  beforeEach(() => {
    connection = new VirtualConnection();
  });

  describe('constructor', () => {
    it('should create a connection with auto-generated id when no sessionId provided', () => {
      const conn = new VirtualConnection();
      expect(conn.getId()).toMatch(/^virtual-\d+-\d+$/);
    });

    it('should create a connection with provided sessionId', () => {
      const conn = new VirtualConnection('custom-session-123');
      expect(conn.getId()).toBe('custom-session-123');
    });
  });

  describe('getId', () => {
    it('should return the connection id', () => {
      const conn = new VirtualConnection('test-id');
      expect(conn.getId()).toBe('test-id');
    });
  });

  describe('getType', () => {
    it('should return "virtual"', () => {
      expect(connection.getType()).toBe('virtual');
    });
  });

  describe('write', () => {
    it('should store data in output buffer', () => {
      connection.write('Hello, World!');
      expect(connection.getOutput()).toBe('Hello, World!');
    });

    it('should accumulate multiple writes', () => {
      connection.write('Hello, ');
      connection.write('World!');
      expect(connection.getOutput()).toBe('Hello, World!');
    });

    it('should not write when connection is disconnected', () => {
      connection.end();
      connection.write('This should not appear');
      expect(connection.getOutput()).toBe('');
    });
  });

  describe('getOutput', () => {
    it('should return accumulated output without clearing', () => {
      connection.write('Test output');

      const output1 = connection.getOutput();
      const output2 = connection.getOutput();

      expect(output1).toBe('Test output');
      expect(output2).toBe('Test output');
    });

    it('should clear buffer when clear=true', () => {
      connection.write('Test output');

      const output1 = connection.getOutput(true);
      const output2 = connection.getOutput();

      expect(output1).toBe('Test output');
      expect(output2).toBe('');
    });

    it('should return empty string when buffer is empty', () => {
      expect(connection.getOutput()).toBe('');
    });
  });

  describe('getOutputLines', () => {
    it('should return output as array of lines', () => {
      connection.write('Line 1');
      connection.write('Line 2');
      connection.write('Line 3');

      const lines = connection.getOutputLines();
      expect(lines).toEqual(['Line 1', 'Line 2', 'Line 3']);
    });

    it('should not clear buffer by default', () => {
      connection.write('Line 1');

      const lines1 = connection.getOutputLines();
      const lines2 = connection.getOutputLines();

      expect(lines1).toEqual(['Line 1']);
      expect(lines2).toEqual(['Line 1']);
    });

    it('should clear buffer when clear=true', () => {
      connection.write('Line 1');

      const lines1 = connection.getOutputLines(true);
      const lines2 = connection.getOutputLines();

      expect(lines1).toEqual(['Line 1']);
      expect(lines2).toEqual([]);
    });
  });

  describe('clearOutput', () => {
    it('should clear the output buffer', () => {
      connection.write('Some output');
      connection.clearOutput();
      expect(connection.getOutput()).toBe('');
    });

    it('should not affect new writes after clearing', () => {
      connection.write('Old output');
      connection.clearOutput();
      connection.write('New output');
      expect(connection.getOutput()).toBe('New output');
    });
  });

  describe('simulateInput', () => {
    it('should emit data event for each character', () => {
      const dataHandler = jest.fn();
      connection.on('data', dataHandler);

      connection.simulateInput('hi');

      expect(dataHandler).toHaveBeenCalledTimes(2);
      expect(dataHandler).toHaveBeenNthCalledWith(1, 'h');
      expect(dataHandler).toHaveBeenNthCalledWith(2, 'i');
    });

    it('should emit data for special characters', () => {
      const dataHandler = jest.fn();
      connection.on('data', dataHandler);

      connection.simulateInput('\r\n');

      expect(dataHandler).toHaveBeenCalledTimes(2);
      expect(dataHandler).toHaveBeenNthCalledWith(1, '\r');
      expect(dataHandler).toHaveBeenNthCalledWith(2, '\n');
    });

    it('should throw error when connection is disconnected', () => {
      connection.end();

      expect(() => connection.simulateInput('test')).toThrow(
        'Cannot send input to disconnected virtual connection'
      );
    });
  });

  describe('end', () => {
    it('should emit end event', () => {
      const endHandler = jest.fn();
      connection.on('end', endHandler);

      connection.end();

      expect(endHandler).toHaveBeenCalledTimes(1);
    });

    it('should mark connection as inactive', () => {
      connection.end();
      expect(connection.isActive()).toBe(false);
    });

    it('should only emit end once even if called multiple times', () => {
      const endHandler = jest.fn();
      connection.on('end', endHandler);

      connection.end();
      connection.end();
      connection.end();

      expect(endHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('setMaskInput', () => {
    it('should accept true', () => {
      expect(() => connection.setMaskInput(true)).not.toThrow();
    });

    it('should accept false', () => {
      expect(() => connection.setMaskInput(false)).not.toThrow();
    });
  });

  describe('getRawConnection', () => {
    it('should return null for virtual connections', () => {
      expect(connection.getRawConnection()).toBeNull();
    });
  });

  describe('raw logging', () => {
    it('should be disabled by default', () => {
      expect(connection.isRawLoggingEnabled()).toBe(false);
    });

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

  describe('isActive', () => {
    it('should return true for new connection', () => {
      expect(connection.isActive()).toBe(true);
    });

    it('should return false after end() is called', () => {
      connection.end();
      expect(connection.isActive()).toBe(false);
    });
  });

  describe('getBufferSize', () => {
    it('should return 0 for empty buffer', () => {
      expect(connection.getBufferSize()).toBe(0);
    });

    it('should return number of write calls', () => {
      connection.write('Line 1');
      connection.write('Line 2');
      connection.write('Line 3');

      expect(connection.getBufferSize()).toBe(3);
    });

    it('should reset to 0 after clearOutput', () => {
      connection.write('Test');
      connection.clearOutput();
      expect(connection.getBufferSize()).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical command-response flow', () => {
      // Simulate server response
      connection.write('Welcome to EllyMUD!\r\n');
      connection.write('Enter your username: ');

      expect(connection.getOutput()).toContain('Welcome to EllyMUD!');
      expect(connection.getOutput()).toContain('Enter your username:');

      // Clear and simulate next response
      connection.clearOutput();
      connection.write('Password: ');

      expect(connection.getOutput()).toBe('Password: ');
    });

    it('should handle input simulation with event handling', () => {
      const receivedChars: string[] = [];
      connection.on('data', (char: string) => {
        receivedChars.push(char);
      });

      connection.simulateInput('test');

      expect(receivedChars).toEqual(['t', 'e', 's', 't']);
    });

    it('should handle connection lifecycle', () => {
      // Active connection
      expect(connection.isActive()).toBe(true);

      // Write some data
      connection.write('Test data');
      expect(connection.getBufferSize()).toBe(1);

      // End connection
      connection.end();
      expect(connection.isActive()).toBe(false);

      // Writes should be ignored after end
      connection.write('More data');
      expect(connection.getBufferSize()).toBe(1);
    });
  });
});
