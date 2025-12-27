/**
 * Unit tests for RawSessionLogger
 * @module utils/rawSessionLogger.test
 */

// Create mock write stream before imports
const mockWrite = jest.fn();
const mockEnd = jest.fn();

const createMockWriteStream = () => ({
  write: mockWrite,
  end: mockEnd,
  writable: true,
});

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  createWriteStream: jest.fn(() => createMockWriteStream()),
}));

import {
  RawSessionLogger,
  getSessionLogger,
  closeSessionLogger,
  closeAllSessionLoggers,
} from './rawSessionLogger';
import fs from 'fs';

const mockFs = fs as jest.Mocked<typeof fs>;

describe('RawSessionLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWrite.mockClear();
    mockEnd.mockClear();

    // Clear the session loggers between tests
    closeAllSessionLoggers();
  });

  describe('constructor', () => {
    it('should create a new logger with session ID', () => {
      const logger = new RawSessionLogger('test-session-123');

      expect(logger).toBeDefined();
      expect(mockFs.createWriteStream).toHaveBeenCalled();
    });

    it('should create log directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValueOnce(false);

      new RawSessionLogger('test-session-456');

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('logs'),
        expect.objectContaining({ recursive: true })
      );
    });

    it('should write session start message', () => {
      new RawSessionLogger('test-session-789');

      expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('Session started'));
    });
  });

  describe('logInput', () => {
    it('should log input with timestamp', () => {
      const logger = new RawSessionLogger('test-session');
      mockWrite.mockClear();

      logger.logInput('test command');

      expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('>> test command'));
    });

    it('should mask input when masking is active', () => {
      const logger = new RawSessionLogger('test-session');
      logger.setMasking(true);
      mockWrite.mockClear();

      logger.logInput('secret-password');

      expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('PASSWORD INPUT MASKED'));
      expect(mockWrite).not.toHaveBeenCalledWith(expect.stringContaining('secret-password'));
    });

    it('should only log masking message once per masking session', () => {
      const logger = new RawSessionLogger('test-session');
      logger.setMasking(true);
      mockWrite.mockClear();

      logger.logInput('char1');
      logger.logInput('char2');
      logger.logInput('char3');

      // Should only log the mask message once
      const maskCalls = mockWrite.mock.calls.filter((call: string[]) =>
        call[0].includes('PASSWORD INPUT MASKED')
      );
      expect(maskCalls.length).toBe(1);
    });
  });

  describe('logOutput', () => {
    it('should log output with timestamp', () => {
      const logger = new RawSessionLogger('test-session');
      mockWrite.mockClear();

      logger.logOutput('Welcome to EllyMUD!');

      expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('<< Welcome to EllyMUD!'));
    });
  });

  describe('setMasking', () => {
    it('should enable masking', () => {
      const logger = new RawSessionLogger('test-session');

      logger.setMasking(true);

      expect(logger.isMaskingActive()).toBe(true);
    });

    it('should disable masking and log completion message', () => {
      const logger = new RawSessionLogger('test-session');
      logger.setMasking(true);
      mockWrite.mockClear();

      logger.setMasking(false);

      expect(logger.isMaskingActive()).toBe(false);
      expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('PASSWORD INPUT COMPLETE'));
    });

    it('should not log completion when disabling if was not masked', () => {
      const logger = new RawSessionLogger('test-session');
      mockWrite.mockClear();

      logger.setMasking(false);

      expect(mockWrite).not.toHaveBeenCalledWith(
        expect.stringContaining('PASSWORD INPUT COMPLETE')
      );
    });
  });

  describe('closeStream', () => {
    it('should write end message and close stream', () => {
      const logger = new RawSessionLogger('test-session');
      mockWrite.mockClear();

      logger.closeStream();

      expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('Session ended'));
      expect(mockEnd).toHaveBeenCalled();
    });

    it('should handle being called multiple times', () => {
      const logger = new RawSessionLogger('test-session');

      logger.closeStream();
      mockEnd.mockClear();

      // Second close should not throw
      expect(() => logger.closeStream()).not.toThrow();
    });
  });

  describe('isMaskingActive', () => {
    it('should return false by default', () => {
      const logger = new RawSessionLogger('test-session');

      expect(logger.isMaskingActive()).toBe(false);
    });

    it('should return true when masking is enabled', () => {
      const logger = new RawSessionLogger('test-session');
      logger.setMasking(true);

      expect(logger.isMaskingActive()).toBe(true);
    });
  });
});

describe('Session logger factory functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    closeAllSessionLoggers();
  });

  describe('getSessionLogger', () => {
    it('should create a new logger for new session ID', () => {
      const logger = getSessionLogger('session-1');

      expect(logger).toBeInstanceOf(RawSessionLogger);
    });

    it('should return same logger for same session ID', () => {
      const logger1 = getSessionLogger('session-2');
      const logger2 = getSessionLogger('session-2');

      expect(logger1).toBe(logger2);
    });

    it('should return different loggers for different session IDs', () => {
      const logger1 = getSessionLogger('session-a');
      const logger2 = getSessionLogger('session-b');

      expect(logger1).not.toBe(logger2);
    });
  });

  describe('closeSessionLogger', () => {
    it('should close and remove a specific session logger', () => {
      const logger1 = getSessionLogger('session-to-close');

      closeSessionLogger('session-to-close');

      // Getting the same session should create a new logger
      const logger2 = getSessionLogger('session-to-close');
      expect(logger2).not.toBe(logger1);
    });

    it('should not throw for non-existent session', () => {
      expect(() => closeSessionLogger('non-existent-session')).not.toThrow();
    });
  });

  describe('closeAllSessionLoggers', () => {
    it('should close all session loggers', () => {
      getSessionLogger('session-x');
      getSessionLogger('session-y');
      getSessionLogger('session-z');

      closeAllSessionLoggers();

      // Getting any session should create new loggers
      const newLogger = getSessionLogger('session-x');
      expect(newLogger).toBeInstanceOf(RawSessionLogger);
    });
  });
});
