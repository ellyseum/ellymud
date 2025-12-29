// JSON utilities need flexible typing for parsing arbitrary JSON structures
import type { ValidateFunction, ErrorObject } from 'ajv';
import { systemLogger } from './logger';
import {
  validateRooms,
  validateUsers,
  validateItems,
  validateItemInstances,
  validateNpcs,
} from '../schemas';

// Internal validation error type from Ajv (full type)
type AjvError = ErrorObject;

// Simplified validation error interface for external consumers
export interface ValidationErrorInfo {
  instancePath?: string;
  message?: string;
  keyword?: string;
  schemaPath?: string;
  params?: Record<string, unknown>;
  data?: unknown;
}

/**
 * Error class for JSON validation errors
 */
export class JsonValidationError extends Error {
  constructor(
    message: string,
    public errors?: ValidationErrorInfo[]
  ) {
    super(message);
    this.name = 'JsonValidationError';
  }
}

/**
 * Parse and validate JSON input based on its data type
 *
 * @param jsonString The JSON string to parse and validate
 * @param dataType The type of data to validate ('rooms', 'users', 'items', 'npcs')
 * @returns The parsed and validated data or undefined if validation fails
 */
export function parseAndValidateJson<T>(
  jsonString: string | null | undefined,
  dataType: 'rooms' | 'users' | 'items' | 'npcs'
): T | undefined {
  if (!jsonString) {
    return undefined;
  }

  try {
    // Parse the JSON string
    const data = JSON.parse(jsonString);

    // Select the appropriate validator based on data type
    let isValid = false;
    let validator: ValidateFunction;

    switch (dataType) {
      case 'rooms':
        isValid = validateRooms(data);
        validator = validateRooms;
        break;
      case 'users':
        isValid = validateUsers(data);
        validator = validateUsers;
        break;
      case 'items':
        // Check if this might be item instances instead of regular items
        if (data.length > 0 && data[0].instanceId) {
          isValid = validateItemInstances(data);
          validator = validateItemInstances;
        } else {
          isValid = validateItems(data);
          validator = validateItems;
        }
        break;
      case 'npcs':
        isValid = validateNpcs(data);
        validator = validateNpcs;
        break;
    }

    if (!isValid) {
      systemLogger.error(`Invalid ${dataType} data structure`);
      if (validator.errors) {
        validator.errors.forEach((err: AjvError) => {
          systemLogger.error(`- ${err.instancePath} ${err.message}`);
        });
      }
      return undefined;
    }

    // Additional business logic validation
    try {
      validateBusinessRules(data, dataType);
    } catch (error) {
      if (error instanceof JsonValidationError) {
        systemLogger.error(`Business rule validation error: ${error.message}`);
        if (error.errors) {
          error.errors.forEach((err: ValidationErrorInfo) => {
            systemLogger.error(`- ${err.instancePath} ${err.message}`);
          });
        }
      } else {
        systemLogger.error(
          `Business rule validation error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      return undefined;
    }

    return data as T;
  } catch (error) {
    if (error instanceof JsonValidationError) {
      systemLogger.error(`JSON validation error: ${error.message}`);
      if (error.errors) {
        error.errors.forEach((err: ValidationErrorInfo) => {
          systemLogger.error(`- ${err.instancePath} ${err.message}`);
        });
      }
    } else if (error instanceof SyntaxError) {
      systemLogger.error(`JSON parse error: ${error.message}`);
    } else {
      systemLogger.error(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return undefined;
  }
}

/**
 * Additional business rule validations beyond schema validation
 */
function validateBusinessRules(data: unknown, dataType: string): void {
  if (!Array.isArray(data)) return;
  switch (dataType) {
    case 'rooms':
      validateRoomBusinessRules(data);
      break;
    case 'users':
      validateUserBusinessRules(data);
      break;
    case 'items':
      // Detect if these are item instances or regular items
      if (data.length > 0 && isItemInstance(data[0])) {
        validateItemInstanceBusinessRules(data);
      } else {
        validateItemBusinessRules(data);
      }
      break;
    case 'npcs':
      validateNpcBusinessRules(data);
      break;
  }
}

// Type guards for narrowing
function isItemInstance(item: unknown): item is { instanceId: string } {
  return typeof item === 'object' && item !== null && 'instanceId' in item;
}

interface RoomData {
  id: string;
  exits?: Array<{ direction: string; roomId: string }> | Record<string, string>;
}

interface UserData {
  username: string;
}

interface ItemData {
  id?: string;
}

interface ItemInstanceData {
  instanceId?: string;
}

interface NpcData {
  id: string;
}

/**
 * Validate room-specific business rules
 */
function validateRoomBusinessRules(rooms: unknown[]): void {
  // Check for duplicate room IDs
  const roomIds = new Set<string>();
  rooms.forEach((room, index) => {
    const r = room as RoomData;
    if (roomIds.has(r.id)) {
      throw new JsonValidationError(`Duplicate room ID: ${r.id} at index ${index}`);
    }
    roomIds.add(r.id);

    // Check that exit targets exist if exits is an array (current format)
    if (Array.isArray(r.exits)) {
      r.exits.forEach((exit: { direction: string; roomId: string }, exitIndex: number) => {
        // Skip validation if roomId is not a string (could be an object or something else)
        if (
          typeof exit.roomId === 'string' &&
          !rooms.some((rm) => (rm as RoomData).id === exit.roomId)
        ) {
          throw new JsonValidationError(
            `Room ${r.id} has exit to non-existent room ID: ${exit.roomId} at exit index ${exitIndex}`
          );
        }
      });
    }
    // Also handle exits as an object (alternative format)
    else if (r.exits && typeof r.exits === 'object') {
      Object.entries(r.exits).forEach(([direction, targetId]) => {
        // Skip validation if targetId is not a string
        if (typeof targetId === 'string' && !rooms.some((rm) => (rm as RoomData).id === targetId)) {
          throw new JsonValidationError(
            `Room ${r.id} has exit to non-existent room ID: ${targetId} in direction ${direction}`
          );
        }
      });
    }
  });
}

/**
 * Validate user-specific business rules
 */
function validateUserBusinessRules(users: unknown[]): void {
  // Check for duplicate usernames
  const usernames = new Set<string>();
  users.forEach((user, index) => {
    const u = user as UserData;
    if (usernames.has(u.username.toLowerCase())) {
      throw new JsonValidationError(`Duplicate username: ${u.username} at index ${index}`);
    }
    usernames.add(u.username.toLowerCase());
  });
}

/**
 * Validate item-specific business rules
 */
function validateItemBusinessRules(items: unknown[]): void {
  // Check for duplicate item IDs
  const itemIds = new Set<string>();
  items.forEach((item, index) => {
    const i = item as ItemData;
    if (i.id && itemIds.has(i.id)) {
      throw new JsonValidationError(`Duplicate item ID: ${i.id} at index ${index}`);
    }
    if (i.id) {
      itemIds.add(i.id);
    }
  });
}

/**
 * Validate item instance-specific business rules
 */
function validateItemInstanceBusinessRules(instances: unknown[]): void {
  // Check for duplicate instance IDs
  const instanceIds = new Set<string>();
  instances.forEach((instance, index) => {
    const i = instance as ItemInstanceData;
    if (i.instanceId && instanceIds.has(i.instanceId)) {
      throw new JsonValidationError(
        `Duplicate item instance ID: ${i.instanceId} at index ${index}`
      );
    }
    if (i.instanceId) {
      instanceIds.add(i.instanceId);
    }
  });
}

/**
 * Validate NPC-specific business rules
 */
function validateNpcBusinessRules(npcs: unknown[]): void {
  // Check for duplicate NPC IDs
  const npcIds = new Set<string>();
  npcs.forEach((npc, index) => {
    const n = npc as NpcData;
    if (npcIds.has(n.id)) {
      throw new JsonValidationError(`Duplicate NPC ID: ${n.id} at index ${index}`);
    }
    npcIds.add(n.id);
  });
}

/**
 * Simple JSON parsing without validation
 */
export function parseJsonArg<T>(
  jsonString: string | null | undefined,
  defaultValue?: T
): T | undefined {
  if (!jsonString) {
    return defaultValue;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    systemLogger.error(
      `Error parsing JSON argument: ${error instanceof Error ? error.message : String(error)}`
    );
    systemLogger.error(
      `Problematic JSON string: ${jsonString.substring(0, 100)}${jsonString.length > 100 ? '...' : ''}`
    );
    return defaultValue;
  }
}

/**
 * Format validation errors to provide human-readable output
 */
export function formatValidationErrors(errors: ValidationErrorInfo[]): string {
  return errors
    .map((error) => {
      const path = error.instancePath || 'root';
      let message = `- ${path}: ${error.message}`;

      if (error.keyword === 'required' && error.params) {
        const params = error.params as { missingProperty: string };
        message = `- ${path}: Missing required property: ${params.missingProperty}`;
      } else if (error.keyword === 'type' && error.params) {
        const params = error.params as { type: string };
        message = `- ${path}: Expected ${params.type}, got ${typeof error.data}`;
      } else if (error.keyword === 'enum' && error.params) {
        const params = error.params as { allowedValues: string[] };
        message = `- ${path}: Must be one of: ${params.allowedValues.join(', ')}`;
      }

      return message;
    })
    .join('\n');
}
