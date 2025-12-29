/**
 * Unit tests for validateFiles
 * @module utils/validateFiles.test
 */

import { validateJsonFile, validateAllFiles } from './validateFiles';

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock('./jsonUtils', () => ({
  parseAndValidateJson: jest.fn(),
  formatValidationErrors: jest.fn().mockReturnValue('Formatted errors'),
  JsonValidationError: class JsonValidationError extends Error {
    errors?: Array<{ path: string; message: string }>;
    constructor(message: string, errors?: Array<{ path: string; message: string }>) {
      super(message);
      this.name = 'JsonValidationError';
      this.errors = errors;
    }
  },
}));

import fs from 'fs';
import { parseAndValidateJson, JsonValidationError } from './jsonUtils';

const mockFs = fs as jest.Mocked<typeof fs>;
const mockParseAndValidateJson = parseAndValidateJson as jest.MockedFunction<
  typeof parseAndValidateJson
>;

describe('validateFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateJsonFile', () => {
    it('should return invalid when file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = validateJsonFile('/path/to/missing.json', 'rooms');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('File not found');
    });

    it('should return valid for valid JSON file', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{"valid": true}');
      mockParseAndValidateJson.mockReturnValue({ valid: true });

      const result = validateJsonFile('/path/to/valid.json', 'rooms');

      expect(result.valid).toBe(true);
      expect(result.message).toContain('is valid');
      expect(result.data).toEqual({ valid: true });
    });

    it('should return invalid for JSON validation errors', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{"invalid": "data"}');
      mockParseAndValidateJson.mockImplementation(() => {
        const error = new JsonValidationError('Validation failed');
        throw error;
      });

      const result = validateJsonFile('/path/to/invalid.json', 'rooms');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Validation failed');
    });

    it('should return invalid for JSON validation errors with error list', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{"invalid": "data"}');
      mockParseAndValidateJson.mockImplementation(() => {
        const error = new JsonValidationError('Validation failed', [
          { path: '/id', message: 'is required' },
        ]);
        throw error;
      });

      const result = validateJsonFile('/path/to/invalid.json', 'rooms');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Formatted errors');
    });

    it('should return invalid for JSON syntax errors', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{ invalid json');
      mockParseAndValidateJson.mockImplementation(() => {
        throw new SyntaxError('Unexpected token');
      });

      const result = validateJsonFile('/path/to/syntax-error.json', 'rooms');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid JSON syntax');
    });

    it('should return invalid for other errors', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{}');
      mockParseAndValidateJson.mockImplementation(() => {
        throw new Error('Unknown error');
      });

      const result = validateJsonFile('/path/to/error.json', 'rooms');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Error validating');
    });

    it('should handle validation errors with custom messages', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{}');
      mockParseAndValidateJson.mockImplementation(() => {
        throw new Error('Validation failed: invalid schema');
      });

      const result = validateJsonFile('/path/to/error.json', 'rooms');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Validation failed');
    });

    it('should validate users data type', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{"users": []}');
      mockParseAndValidateJson.mockReturnValue({ users: [] });

      const result = validateJsonFile('/path/to/users.json', 'users');

      expect(mockParseAndValidateJson).toHaveBeenCalledWith('{"users": []}', 'users');
      expect(result.valid).toBe(true);
    });

    it('should validate items data type', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{"items": []}');
      mockParseAndValidateJson.mockReturnValue({ items: [] });

      const result = validateJsonFile('/path/to/items.json', 'items');

      expect(mockParseAndValidateJson).toHaveBeenCalledWith('{"items": []}', 'items');
      expect(result.valid).toBe(true);
    });

    it('should validate npcs data type', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{"npcs": []}');
      mockParseAndValidateJson.mockReturnValue({ npcs: [] });

      const result = validateJsonFile('/path/to/npcs.json', 'npcs');

      expect(mockParseAndValidateJson).toHaveBeenCalledWith('{"npcs": []}', 'npcs');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateAllFiles', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should return true when all files are valid', () => {
      // Mock that all files exist and are valid
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{}');
      mockParseAndValidateJson.mockReturnValue({});

      const result = validateAllFiles('/path/to/data');

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Validating files'));
    });

    it('should return false when some files are invalid', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{}');
      mockParseAndValidateJson.mockImplementation(() => {
        throw new Error('Invalid');
      });

      const result = validateAllFiles('/path/to/data');

      expect(result).toBe(false);
    });

    it('should handle missing files with warning', () => {
      // First call returns false (file not found), rest return true
      mockFs.existsSync
        .mockReturnValueOnce(false) // rooms.json not found
        .mockReturnValue(true); // others exist
      mockFs.readFileSync.mockReturnValue('{}');
      mockParseAndValidateJson.mockReturnValue({});

      validateAllFiles('/path/to/data');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('File not found'));
    });
  });
});
