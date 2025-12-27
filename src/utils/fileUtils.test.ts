/**
 * Unit tests for File Utilities
 * @module utils/fileUtils.test
 */

import fs from 'fs';
import {
  loadAndValidateJsonFile,
  saveJsonFile,
  createSessionReferenceFile,
  clearSessionReferenceFile,
} from './fileUtils';
import { createMockConnection, createMockClient } from '../test/helpers/mockFactories';

// Mock dependencies
jest.mock('fs');
jest.mock('./logger', () => ({
  systemLogger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock('./jsonUtils', () => ({
  parseAndValidateJson: jest.fn(),
}));
jest.mock('./debugUtils', () => ({
  isDebugMode: jest.fn(),
}));

import { systemLogger } from './logger';
import { parseAndValidateJson } from './jsonUtils';
import { isDebugMode } from './debugUtils';

const mockFs = fs as jest.Mocked<typeof fs>;
const mockParseAndValidateJson = parseAndValidateJson as jest.MockedFunction<
  typeof parseAndValidateJson
>;
const mockIsDebugMode = isDebugMode as jest.MockedFunction<typeof isDebugMode>;

describe('fileUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadAndValidateJsonFile', () => {
    describe('file not found', () => {
      it('should return undefined and log warning when file does not exist', () => {
        mockFs.existsSync.mockReturnValue(false);

        const result = loadAndValidateJsonFile('/path/to/nonexistent.json', 'rooms');

        expect(result).toBeUndefined();
        expect(systemLogger.warn).toHaveBeenCalledWith('File not found: /path/to/nonexistent.json');
      });
    });

    describe('successful file loading', () => {
      it('should read and validate rooms file', () => {
        const mockRoomsData = [{ id: 'room1', name: 'Test Room' }];
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockRoomsData));
        mockParseAndValidateJson.mockReturnValue(mockRoomsData);

        const result = loadAndValidateJsonFile('/path/to/rooms.json', 'rooms');

        expect(result).toEqual(mockRoomsData);
        expect(mockFs.readFileSync).toHaveBeenCalledWith('/path/to/rooms.json', 'utf8');
        expect(mockParseAndValidateJson).toHaveBeenCalledWith(
          JSON.stringify(mockRoomsData),
          'rooms'
        );
      });

      it('should read and validate users file', () => {
        const mockUsersData = [{ username: 'testuser' }];
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockUsersData));
        mockParseAndValidateJson.mockReturnValue(mockUsersData);

        const result = loadAndValidateJsonFile('/path/to/users.json', 'users');

        expect(result).toEqual(mockUsersData);
        expect(mockParseAndValidateJson).toHaveBeenCalledWith(
          JSON.stringify(mockUsersData),
          'users'
        );
      });

      it('should read and validate items file', () => {
        const mockItemsData = [{ id: 'item1', name: 'Sword' }];
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockItemsData));
        mockParseAndValidateJson.mockReturnValue(mockItemsData);

        const result = loadAndValidateJsonFile('/path/to/items.json', 'items');

        expect(result).toEqual(mockItemsData);
        expect(mockParseAndValidateJson).toHaveBeenCalledWith(
          JSON.stringify(mockItemsData),
          'items'
        );
      });

      it('should read and validate npcs file', () => {
        const mockNpcsData = [{ id: 'npc1', name: 'Goblin' }];
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockNpcsData));
        mockParseAndValidateJson.mockReturnValue(mockNpcsData);

        const result = loadAndValidateJsonFile('/path/to/npcs.json', 'npcs');

        expect(result).toEqual(mockNpcsData);
        expect(mockParseAndValidateJson).toHaveBeenCalledWith(JSON.stringify(mockNpcsData), 'npcs');
      });
    });

    describe('validation failures', () => {
      it('should return undefined when validation fails', () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue('{}');
        mockParseAndValidateJson.mockReturnValue(undefined);

        const result = loadAndValidateJsonFile('/path/to/invalid.json', 'rooms');

        expect(result).toBeUndefined();
      });
    });

    describe('error handling', () => {
      it('should log error and return undefined on read error', () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockImplementation(() => {
          throw new Error('Read error');
        });

        const result = loadAndValidateJsonFile('/path/to/error.json', 'rooms');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Error loading rooms'),
          expect.any(Error)
        );
      });
    });
  });

  describe('saveJsonFile', () => {
    describe('successful save', () => {
      it('should save data to file with pretty formatting', () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.writeFileSync.mockImplementation(() => undefined);

        const data = { key: 'value' };
        const result = saveJsonFile('/path/to/file.json', data);

        expect(result).toBe(true);
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          '/path/to/file.json',
          JSON.stringify(data, null, 2),
          'utf8'
        );
      });

      it('should create directory if it does not exist', () => {
        mockFs.existsSync.mockReturnValue(false);
        mockFs.mkdirSync.mockImplementation(() => '/path/to');
        mockFs.writeFileSync.mockImplementation(() => undefined);

        const data = { key: 'value' };
        const result = saveJsonFile('/path/to/file.json', data);

        expect(result).toBe(true);
        expect(mockFs.mkdirSync).toHaveBeenCalledWith('/path/to', { recursive: true });
      });
    });

    describe('save with arrays', () => {
      it('should save array data correctly', () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.writeFileSync.mockImplementation(() => undefined);

        const data = [{ id: 1 }, { id: 2 }];
        const result = saveJsonFile('/path/to/array.json', data);

        expect(result).toBe(true);
        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          '/path/to/array.json',
          JSON.stringify(data, null, 2),
          'utf8'
        );
      });
    });

    describe('error handling', () => {
      it('should log error and return false on write error', () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.writeFileSync.mockImplementation(() => {
          throw new Error('Write error');
        });

        const result = saveJsonFile('/path/to/error.json', { data: 'test' });

        expect(result).toBe(false);
        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Error saving'),
          expect.any(Error)
        );
      });

      it('should log error and return false when mkdir fails', () => {
        mockFs.existsSync.mockReturnValue(false);
        mockFs.mkdirSync.mockImplementation(() => {
          throw new Error('Mkdir error');
        });

        const result = saveJsonFile('/path/to/new/file.json', { data: 'test' });

        expect(result).toBe(false);
        expect(systemLogger.error).toHaveBeenCalled();
      });
    });
  });

  describe('createSessionReferenceFile', () => {
    beforeEach(() => {
      // Reset mocks
      mockIsDebugMode.mockReturnValue(true);
    });

    describe('when debug mode is disabled', () => {
      it('should not create file and log debug message', () => {
        mockIsDebugMode.mockReturnValue(false);
        const client = createMockClient();

        createSessionReferenceFile(client, 'testuser', false);

        expect(mockFs.writeFileSync).not.toHaveBeenCalled();
        expect(systemLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining('debug mode is disabled')
        );
      });
    });

    describe('when debug mode is enabled', () => {
      it('should create session reference file with user info', () => {
        mockIsDebugMode.mockReturnValue(true);
        mockFs.existsSync.mockReturnValue(true);
        mockFs.writeFileSync.mockImplementation(() => undefined);

        const client = createMockClient();
        createSessionReferenceFile(client, 'testuser', false);

        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
          expect.stringContaining('last-session.md'),
          expect.stringContaining('testuser')
        );
      });

      it('should indicate admin user in file content', () => {
        mockIsDebugMode.mockReturnValue(true);
        mockFs.existsSync.mockReturnValue(true);
        mockFs.writeFileSync.mockImplementation(() => undefined);

        const client = createMockClient();
        createSessionReferenceFile(client, 'adminuser', true);

        const writeCall = mockFs.writeFileSync.mock.calls[0];
        expect(writeCall[1]).toContain('(admin)');
      });

      it('should include raw log path when available', () => {
        mockIsDebugMode.mockReturnValue(true);
        mockFs.existsSync.mockReturnValue(true);
        mockFs.writeFileSync.mockImplementation(() => undefined);

        const mockConnection = createMockConnection();
        (mockConnection.getId as jest.Mock).mockReturnValue('connection-123');
        const client = createMockClient({ connection: mockConnection });

        createSessionReferenceFile(client, 'testuser', false);

        expect(systemLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Found raw log file')
        );
      });

      it('should handle missing raw log file', () => {
        mockIsDebugMode.mockReturnValue(true);
        mockFs.existsSync.mockReturnValue(false);
        mockFs.writeFileSync.mockImplementation(() => undefined);

        const mockConnection = createMockConnection();
        (mockConnection.getId as jest.Mock).mockReturnValue('connection-456');
        const client = createMockClient({ connection: mockConnection });

        createSessionReferenceFile(client, 'testuser', false);

        expect(systemLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Raw log file not found')
        );
      });
    });

    describe('error handling', () => {
      it('should log error when file creation fails', () => {
        mockIsDebugMode.mockReturnValue(true);
        mockFs.existsSync.mockReturnValue(true);
        mockFs.writeFileSync.mockImplementation(() => {
          throw new Error('Write failed');
        });

        const client = createMockClient();
        createSessionReferenceFile(client, 'testuser', false);

        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to create session reference file')
        );
      });
    });

    describe('edge cases', () => {
      it('should handle client without connection', () => {
        mockIsDebugMode.mockReturnValue(true);
        mockFs.existsSync.mockReturnValue(false);
        mockFs.writeFileSync.mockImplementation(() => undefined);

        const client = createMockClient();
        // @ts-expect-error - Testing null connection
        client.connection = null;

        createSessionReferenceFile(client, 'testuser', false);

        // Should still create file, just without raw log path
        expect(mockFs.writeFileSync).toHaveBeenCalled();
      });
    });
  });

  describe('clearSessionReferenceFile', () => {
    it('should write placeholder content to last-session.md', () => {
      mockFs.writeFileSync.mockImplementation(() => undefined);

      clearSessionReferenceFile();

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('last-session.md'),
        expect.stringContaining('User Name: None')
      );
    });

    it('should include N/A for Date Time', () => {
      mockFs.writeFileSync.mockImplementation(() => undefined);

      clearSessionReferenceFile();

      const writeCall = mockFs.writeFileSync.mock.calls[0];
      expect(writeCall[1]).toContain('Date Time: N/A');
    });

    it('should include Not available for log paths', () => {
      mockFs.writeFileSync.mockImplementation(() => undefined);

      clearSessionReferenceFile();

      const writeCall = mockFs.writeFileSync.mock.calls[0];
      expect(writeCall[1]).toContain('Raw Log: Not available');
      expect(writeCall[1]).toContain('User Log: Not available');
    });

    it('should log debug message on success', () => {
      mockFs.writeFileSync.mockImplementation(() => undefined);

      clearSessionReferenceFile();

      expect(systemLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Cleared session reference file')
      );
    });

    describe('error handling', () => {
      it('should log error when write fails', () => {
        mockFs.writeFileSync.mockImplementation(() => {
          throw new Error('Write error');
        });

        clearSessionReferenceFile();

        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to clear session reference file')
        );
      });
    });
  });
});
