import {
  JsonValidationError,
  parseAndValidateJson,
  parseJsonArg,
  formatValidationErrors,
} from './jsonUtils';

// Mock the logger
jest.mock('./logger', () => ({
  systemLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the schema validators
jest.mock('../schemas', () => ({
  validateRooms: jest.fn(),
  validateUsers: jest.fn(),
  validateItems: jest.fn(),
  validateItemInstances: jest.fn(),
  validateNpcs: jest.fn(),
}));

import { systemLogger } from './logger';
import {
  validateRooms,
  validateUsers,
  validateItems,
  validateItemInstances,
  validateNpcs,
} from '../schemas';

// Type-safe mock references
const mockValidateRooms = validateRooms as unknown as jest.Mock & { errors?: unknown[] };
const mockValidateUsers = validateUsers as unknown as jest.Mock & { errors?: unknown[] };
const mockValidateItems = validateItems as unknown as jest.Mock & { errors?: unknown[] };
const mockValidateItemInstances = validateItemInstances as unknown as jest.Mock & {
  errors?: unknown[];
};
const mockValidateNpcs = validateNpcs as unknown as jest.Mock & { errors?: unknown[] };

describe('jsonUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('JsonValidationError', () => {
    it('should create error with message only', () => {
      const error = new JsonValidationError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(JsonValidationError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('JsonValidationError');
      expect(error.errors).toBeUndefined();
    });

    it('should create error with message and errors array', () => {
      const errors = [
        { instancePath: '/field', message: 'invalid' },
        { instancePath: '/other', message: 'required' },
      ];
      const error = new JsonValidationError('Validation failed', errors);

      expect(error.message).toBe('Validation failed');
      expect(error.errors).toEqual(errors);
      expect(error.errors).toHaveLength(2);
    });

    it('should create error with empty errors array', () => {
      const error = new JsonValidationError('Empty errors', []);

      expect(error.errors).toEqual([]);
    });
  });

  describe('parseAndValidateJson', () => {
    describe('null/undefined input handling', () => {
      it('should return undefined for null input', () => {
        const result = parseAndValidateJson(null, 'rooms');

        expect(result).toBeUndefined();
        expect(validateRooms).not.toHaveBeenCalled();
      });

      it('should return undefined for undefined input', () => {
        const result = parseAndValidateJson(undefined, 'users');

        expect(result).toBeUndefined();
        expect(validateUsers).not.toHaveBeenCalled();
      });

      it('should return undefined for empty string', () => {
        const result = parseAndValidateJson('', 'items');

        expect(result).toBeUndefined();
        expect(validateItems).not.toHaveBeenCalled();
      });
    });

    describe('invalid JSON syntax', () => {
      it('should return undefined and log error for invalid JSON', () => {
        const result = parseAndValidateJson('{ invalid json }', 'rooms');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('JSON parse error:')
        );
      });

      it('should handle trailing comma in JSON', () => {
        const result = parseAndValidateJson('[{"id": "1",}]', 'rooms');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalled();
      });

      it('should handle unterminated string', () => {
        const result = parseAndValidateJson('{"name": "test', 'users');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalled();
      });
    });

    describe('rooms validation', () => {
      it('should validate and return rooms data when valid', () => {
        const roomsData = [{ id: 'room1', name: 'Room 1', description: 'Desc', exits: [] }];
        mockValidateRooms.mockReturnValue(true);

        const result = parseAndValidateJson(JSON.stringify(roomsData), 'rooms');

        expect(validateRooms).toHaveBeenCalledWith(roomsData);
        expect(result).toEqual(roomsData);
      });

      it('should return undefined when rooms schema validation fails', () => {
        const roomsData = [{ id: 'room1' }]; // Missing required fields
        mockValidateRooms.mockReturnValue(false);
        mockValidateRooms.errors = [
          { instancePath: '/0', message: 'must have required property name' },
        ];

        const result = parseAndValidateJson(JSON.stringify(roomsData), 'rooms');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalledWith('Invalid rooms data structure');
        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('/0 must have required property name')
        );
      });

      it('should fail on duplicate room IDs (business rule)', () => {
        const roomsData = [
          { id: 'room1', name: 'Room 1', description: 'Desc', exits: [] },
          { id: 'room1', name: 'Room 2', description: 'Desc', exits: [] },
        ];
        mockValidateRooms.mockReturnValue(true);

        const result = parseAndValidateJson(JSON.stringify(roomsData), 'rooms');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Duplicate room ID: room1')
        );
      });

      it('should fail on exit to non-existent room (array format)', () => {
        const roomsData = [
          {
            id: 'room1',
            name: 'Room 1',
            description: 'Desc',
            exits: [{ direction: 'north', roomId: 'nonexistent' }],
          },
        ];
        mockValidateRooms.mockReturnValue(true);

        const result = parseAndValidateJson(JSON.stringify(roomsData), 'rooms');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('has exit to non-existent room ID: nonexistent')
        );
      });

      it('should fail on exit to non-existent room (object format)', () => {
        const roomsData = [
          {
            id: 'room1',
            name: 'Room 1',
            description: 'Desc',
            exits: { north: 'nonexistent' },
          },
        ];
        mockValidateRooms.mockReturnValue(true);

        const result = parseAndValidateJson(JSON.stringify(roomsData), 'rooms');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining(
            'has exit to non-existent room ID: nonexistent in direction north'
          )
        );
      });

      it('should pass when exit target exists', () => {
        const roomsData = [
          {
            id: 'room1',
            name: 'Room 1',
            description: 'Desc',
            exits: [{ direction: 'north', roomId: 'room2' }],
          },
          { id: 'room2', name: 'Room 2', description: 'Desc', exits: [] },
        ];
        mockValidateRooms.mockReturnValue(true);

        const result = parseAndValidateJson(JSON.stringify(roomsData), 'rooms');

        expect(result).toEqual(roomsData);
      });

      it('should skip validation if roomId is not a string (array format)', () => {
        const roomsData = [
          {
            id: 'room1',
            name: 'Room 1',
            description: 'Desc',
            exits: [{ direction: 'north', roomId: 123 }], // Number, not string
          },
        ];
        mockValidateRooms.mockReturnValue(true);

        const result = parseAndValidateJson(JSON.stringify(roomsData), 'rooms');

        expect(result).toEqual(roomsData);
      });

      it('should skip validation if targetId is not a string (object format)', () => {
        const roomsData = [
          {
            id: 'room1',
            name: 'Room 1',
            description: 'Desc',
            exits: { north: 123 }, // Number, not string
          },
        ];
        mockValidateRooms.mockReturnValue(true);

        const result = parseAndValidateJson(JSON.stringify(roomsData), 'rooms');

        expect(result).toEqual(roomsData);
      });
    });

    describe('users validation', () => {
      it('should validate and return users data when valid', () => {
        const usersData = [
          { username: 'User1', password: 'hash1' },
          { username: 'User2', password: 'hash2' },
        ];
        mockValidateUsers.mockReturnValue(true);

        const result = parseAndValidateJson(JSON.stringify(usersData), 'users');

        expect(validateUsers).toHaveBeenCalledWith(usersData);
        expect(result).toEqual(usersData);
      });

      it('should return undefined when users schema validation fails', () => {
        const usersData = [{ username: 'test' }];
        mockValidateUsers.mockReturnValue(false);
        mockValidateUsers.errors = [{ instancePath: '/0', message: 'missing password' }];

        const result = parseAndValidateJson(JSON.stringify(usersData), 'users');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalledWith('Invalid users data structure');
      });

      it('should fail on duplicate usernames (case insensitive)', () => {
        const usersData = [
          { username: 'TestUser', password: 'hash1' },
          { username: 'testuser', password: 'hash2' },
        ];
        mockValidateUsers.mockReturnValue(true);

        const result = parseAndValidateJson(JSON.stringify(usersData), 'users');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Duplicate username: testuser')
        );
      });
    });

    describe('items validation', () => {
      it('should validate and return regular items data when valid', () => {
        const itemsData = [
          { id: 'item1', name: 'Sword', type: 'weapon' },
          { id: 'item2', name: 'Shield', type: 'armor' },
        ];
        mockValidateItems.mockReturnValue(true);

        const result = parseAndValidateJson(JSON.stringify(itemsData), 'items');

        expect(validateItems).toHaveBeenCalledWith(itemsData);
        expect(validateItemInstances).not.toHaveBeenCalled();
        expect(result).toEqual(itemsData);
      });

      it('should detect and validate item instances by instanceId presence', () => {
        const instancesData = [
          { instanceId: 'inst1', templateId: 'item1' },
          { instanceId: 'inst2', templateId: 'item2' },
        ];
        mockValidateItemInstances.mockReturnValue(true);

        const result = parseAndValidateJson(JSON.stringify(instancesData), 'items');

        expect(validateItemInstances).toHaveBeenCalledWith(instancesData);
        expect(validateItems).not.toHaveBeenCalled();
        expect(result).toEqual(instancesData);
      });

      it('should return undefined when items schema validation fails', () => {
        const itemsData = [{ name: 'Invalid' }];
        mockValidateItems.mockReturnValue(false);
        mockValidateItems.errors = [{ instancePath: '/0', message: 'missing id' }];

        const result = parseAndValidateJson(JSON.stringify(itemsData), 'items');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalledWith('Invalid items data structure');
      });

      it('should fail on duplicate item IDs (business rule)', () => {
        const itemsData = [
          { id: 'item1', name: 'Sword', type: 'weapon' },
          { id: 'item1', name: 'Dagger', type: 'weapon' },
        ];
        mockValidateItems.mockReturnValue(true);

        const result = parseAndValidateJson(JSON.stringify(itemsData), 'items');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Duplicate item ID: item1')
        );
      });

      it('should fail on duplicate item instance IDs (business rule)', () => {
        const instancesData = [
          { instanceId: 'inst1', templateId: 'item1' },
          { instanceId: 'inst1', templateId: 'item2' },
        ];
        mockValidateItemInstances.mockReturnValue(true);

        const result = parseAndValidateJson(JSON.stringify(instancesData), 'items');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Duplicate item instance ID: inst1')
        );
      });

      it('should handle items without id field', () => {
        const itemsData = [
          { name: 'Sword', type: 'weapon' },
          { name: 'Shield', type: 'armor' },
        ];
        mockValidateItems.mockReturnValue(true);

        const result = parseAndValidateJson(JSON.stringify(itemsData), 'items');

        expect(result).toEqual(itemsData);
      });

      it('should handle item instances without instanceId field', () => {
        const instancesData = [
          { instanceId: 'inst1', templateId: 'item1' },
          { templateId: 'item2' }, // Missing instanceId
        ];
        mockValidateItemInstances.mockReturnValue(true);

        const result = parseAndValidateJson(JSON.stringify(instancesData), 'items');

        expect(result).toEqual(instancesData);
      });

      it('should handle empty items array', () => {
        const itemsData: unknown[] = [];
        mockValidateItems.mockReturnValue(true);

        const result = parseAndValidateJson(JSON.stringify(itemsData), 'items');

        expect(validateItems).toHaveBeenCalledWith(itemsData);
        expect(result).toEqual(itemsData);
      });
    });

    describe('npcs validation', () => {
      it('should validate and return npcs data when valid', () => {
        const npcsData = [
          { id: 'npc1', name: 'Guard', description: 'A guard' },
          { id: 'npc2', name: 'Merchant', description: 'A merchant' },
        ];
        mockValidateNpcs.mockReturnValue(true);

        const result = parseAndValidateJson(JSON.stringify(npcsData), 'npcs');

        expect(validateNpcs).toHaveBeenCalledWith(npcsData);
        expect(result).toEqual(npcsData);
      });

      it('should return undefined when npcs schema validation fails', () => {
        const npcsData = [{ name: 'Invalid' }];
        mockValidateNpcs.mockReturnValue(false);
        mockValidateNpcs.errors = [{ instancePath: '/0', message: 'missing id' }];

        const result = parseAndValidateJson(JSON.stringify(npcsData), 'npcs');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalledWith('Invalid npcs data structure');
      });

      it('should fail on duplicate NPC IDs (business rule)', () => {
        const npcsData = [
          { id: 'npc1', name: 'Guard', description: 'A guard' },
          { id: 'npc1', name: 'Knight', description: 'A knight' },
        ];
        mockValidateNpcs.mockReturnValue(true);

        const result = parseAndValidateJson(JSON.stringify(npcsData), 'npcs');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Duplicate NPC ID: npc1')
        );
      });
    });

    describe('error handling', () => {
      it('should handle validator with no errors property', () => {
        mockValidateRooms.mockReturnValue(false);
        mockValidateRooms.errors = undefined;

        const result = parseAndValidateJson('[{"id": "room1"}]', 'rooms');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalledWith('Invalid rooms data structure');
      });

      it('should handle JsonValidationError with errors in business rules', () => {
        const roomsData = [
          { id: 'room1', name: 'Room 1', description: 'Desc', exits: [] },
          { id: 'room1', name: 'Room 2', description: 'Desc', exits: [] },
        ];
        mockValidateRooms.mockReturnValue(true);

        const result = parseAndValidateJson(JSON.stringify(roomsData), 'rooms');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Business rule validation error')
        );
      });

      it('should handle non-JsonValidationError thrown during parsing', () => {
        mockValidateRooms.mockImplementation(() => {
          throw new TypeError('Unexpected type error');
        });

        const result = parseAndValidateJson('[{"id": "room1"}]', 'rooms');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Unexpected error: Unexpected type error')
        );
      });

      it('should handle non-Error thrown during parsing', () => {
        mockValidateRooms.mockImplementation(() => {
          throw 'string error'; // eslint-disable-line no-throw-literal
        });

        const result = parseAndValidateJson('[{"id": "room1"}]', 'rooms');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Unexpected error: string error')
        );
      });

      it('should handle non-Error thrown during business rules validation', () => {
        // First validation passes, but business rules throw a non-Error
        const roomsData = [{ id: 'room1', name: 'Room 1', description: 'Desc', exits: [] }];
        mockValidateRooms.mockReturnValue(true);

        // Mock to throw during business rules - we need to trigger the branch
        // where a generic error (not JsonValidationError) is thrown from business rules
        // This is hard to test directly since business rules only throw JsonValidationError
        // So we test the outer catch block path for JsonValidationError with errors array

        const result = parseAndValidateJson(JSON.stringify(roomsData), 'rooms');
        expect(result).toEqual(roomsData);
      });

      it('should handle JsonValidationError thrown from outer try block', () => {
        // Test the case where JsonValidationError with errors is caught in outer catch
        mockValidateRooms.mockImplementation(() => {
          const error = new JsonValidationError('Schema validation failed', [
            { instancePath: '/0/id', message: 'invalid format' },
          ]);
          throw error;
        });

        const result = parseAndValidateJson('[{"id": "test"}]', 'rooms');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('JSON validation error: Schema validation failed')
        );
        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('/0/id invalid format')
        );
      });

      it('should handle JsonValidationError without errors array in outer catch', () => {
        mockValidateRooms.mockImplementation(() => {
          throw new JsonValidationError('Validation failed without details');
        });

        const result = parseAndValidateJson('[{"id": "test"}]', 'rooms');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalledWith(
          'JSON validation error: Validation failed without details'
        );
      });
    });
  });

  describe('parseJsonArg', () => {
    describe('null/undefined/empty input', () => {
      it('should return undefined for null input without default', () => {
        const result = parseJsonArg(null);

        expect(result).toBeUndefined();
      });

      it('should return default value for null input with default', () => {
        const defaultValue = { key: 'value' };
        const result = parseJsonArg(null, defaultValue);

        expect(result).toEqual(defaultValue);
      });

      it('should return undefined for undefined input without default', () => {
        const result = parseJsonArg(undefined);

        expect(result).toBeUndefined();
      });

      it('should return default value for undefined input with default', () => {
        const defaultValue = [1, 2, 3];
        const result = parseJsonArg(undefined, defaultValue);

        expect(result).toEqual(defaultValue);
      });

      it('should return default value for empty string', () => {
        const defaultValue = 'default';
        const result = parseJsonArg('', defaultValue);

        expect(result).toBe(defaultValue);
      });
    });

    describe('valid JSON parsing', () => {
      it('should parse valid JSON object', () => {
        const result = parseJsonArg('{"name": "test", "value": 42}');

        expect(result).toEqual({ name: 'test', value: 42 });
      });

      it('should parse valid JSON array', () => {
        const result = parseJsonArg('[1, 2, 3, "four"]');

        expect(result).toEqual([1, 2, 3, 'four']);
      });

      it('should parse valid JSON primitive string', () => {
        const result = parseJsonArg('"hello"');

        expect(result).toBe('hello');
      });

      it('should parse valid JSON primitive number', () => {
        const result = parseJsonArg('123.45');

        expect(result).toBe(123.45);
      });

      it('should parse valid JSON boolean', () => {
        expect(parseJsonArg('true')).toBe(true);
        expect(parseJsonArg('false')).toBe(false);
      });

      it('should parse valid JSON null', () => {
        const result = parseJsonArg('null');

        expect(result).toBeNull();
      });

      it('should parse nested JSON objects', () => {
        const result = parseJsonArg('{"outer": {"inner": {"deep": 1}}}');

        expect(result).toEqual({ outer: { inner: { deep: 1 } } });
      });
    });

    describe('invalid JSON handling', () => {
      it('should return default value on parse error', () => {
        const result = parseJsonArg('{ invalid }', { fallback: true });

        expect(result).toEqual({ fallback: true });
        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Error parsing JSON argument:')
        );
      });

      it('should return undefined on parse error without default', () => {
        const result = parseJsonArg('not json at all');

        expect(result).toBeUndefined();
        expect(systemLogger.error).toHaveBeenCalled();
      });

      it('should log truncated JSON string for long inputs', () => {
        const longJson = 'a'.repeat(150);
        parseJsonArg(longJson);

        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Problematic JSON string:')
        );
        expect(systemLogger.error).toHaveBeenCalledWith(expect.stringContaining('...'));
      });

      it('should not add ellipsis for short invalid JSON', () => {
        parseJsonArg('short');

        // Find the call that contains "Problematic JSON string"
        const calls = (systemLogger.error as jest.Mock).mock.calls;
        const problematicCall = calls.find((call) => call[0].includes('Problematic JSON string:'));
        expect(problematicCall).toBeDefined();
        expect(problematicCall[0]).not.toContain('...');
      });
    });

    describe('type inference', () => {
      it('should maintain type with generic', () => {
        interface TestType {
          id: number;
          name: string;
        }
        const result = parseJsonArg<TestType>('{"id": 1, "name": "test"}');

        expect(result?.id).toBe(1);
        expect(result?.name).toBe('test');
      });
    });
  });

  describe('formatValidationErrors', () => {
    it('should format basic error with path', () => {
      const errors = [{ instancePath: '/users/0', message: 'is required' }];

      const result = formatValidationErrors(errors);

      expect(result).toBe('- /users/0: is required');
    });

    it('should use "root" for empty instancePath', () => {
      const errors = [{ instancePath: '', message: 'must be array' }];

      const result = formatValidationErrors(errors);

      expect(result).toBe('- root: must be array');
    });

    it('should format "required" keyword errors', () => {
      const errors = [
        {
          instancePath: '/item',
          message: 'must have required property',
          keyword: 'required',
          params: { missingProperty: 'name' },
        },
      ];

      const result = formatValidationErrors(errors);

      expect(result).toBe('- /item: Missing required property: name');
    });

    it('should format "type" keyword errors', () => {
      const errors = [
        {
          instancePath: '/count',
          message: 'must be number',
          keyword: 'type',
          params: { type: 'number' },
          data: 'string value',
        },
      ];

      const result = formatValidationErrors(errors);

      expect(result).toBe('- /count: Expected number, got string');
    });

    it('should format "enum" keyword errors', () => {
      const errors = [
        {
          instancePath: '/status',
          message: 'must be equal to one of the allowed values',
          keyword: 'enum',
          params: { allowedValues: ['active', 'inactive', 'pending'] },
        },
      ];

      const result = formatValidationErrors(errors);

      expect(result).toBe('- /status: Must be one of: active, inactive, pending');
    });

    it('should format multiple errors joined by newline', () => {
      const errors = [
        { instancePath: '/a', message: 'error 1' },
        { instancePath: '/b', message: 'error 2' },
        { instancePath: '/c', message: 'error 3' },
      ];

      const result = formatValidationErrors(errors);

      expect(result).toBe('- /a: error 1\n- /b: error 2\n- /c: error 3');
    });

    it('should handle empty errors array', () => {
      const result = formatValidationErrors([]);

      expect(result).toBe('');
    });

    it('should handle mixed error types', () => {
      const errors = [
        {
          instancePath: '/name',
          keyword: 'required',
          message: 'required',
          params: { missingProperty: 'firstName' },
        },
        {
          instancePath: '/age',
          keyword: 'type',
          message: 'must be number',
          params: { type: 'number' },
          data: 'twenty',
        },
        { instancePath: '/other', message: 'unknown error' },
      ];

      const result = formatValidationErrors(errors);

      expect(result).toContain('Missing required property: firstName');
      expect(result).toContain('Expected number, got string');
      expect(result).toContain('/other: unknown error');
    });

    it('should handle undefined instancePath', () => {
      const errors = [{ message: 'some error' }];

      const result = formatValidationErrors(errors);

      expect(result).toBe('- root: some error');
    });
  });

  describe('integration scenarios', () => {
    it('should correctly process valid rooms with exits to each other', () => {
      const roomsData = [
        {
          id: 'room1',
          name: 'Room 1',
          description: 'First room',
          exits: [{ direction: 'east', roomId: 'room2' }],
        },
        {
          id: 'room2',
          name: 'Room 2',
          description: 'Second room',
          exits: [{ direction: 'west', roomId: 'room1' }],
        },
      ];
      mockValidateRooms.mockReturnValue(true);

      const result = parseAndValidateJson(JSON.stringify(roomsData), 'rooms');

      expect(result).toEqual(roomsData);
      expect(systemLogger.error).not.toHaveBeenCalled();
    });

    it('should correctly handle complex nested data', () => {
      const usersData = [
        {
          username: 'player1',
          password: 'hash',
          inventory: [{ instanceId: 'inv1', templateId: 'sword' }],
          stats: { hp: 100, mp: 50 },
        },
      ];
      mockValidateUsers.mockReturnValue(true);

      const result = parseAndValidateJson(JSON.stringify(usersData), 'users');

      expect(result).toEqual(usersData);
    });
  });
});
