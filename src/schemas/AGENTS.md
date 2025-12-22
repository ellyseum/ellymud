# JSON Schemas - LLM Context

## Overview

JSON Schema definitions for validating data files. Ensures data integrity when loading users, rooms, items, and configuration.

## File Reference

### `index.ts`

**Purpose**: Export schemas and validation functions

```typescript
export const userSchema = { /* ... */ };
export const roomSchema = { /* ... */ };
export const itemSchema = { /* ... */ };
export const npcSchema = { /* ... */ };
export const configSchema = { /* ... */ };

export function validateUser(data: unknown): ValidationResult;
export function validateRoom(data: unknown): ValidationResult;
// etc.
```

## Schema Examples

### User Schema

```json
{
  "type": "object",
  "required": ["username", "passwordHash", "salt"],
  "properties": {
    "username": { "type": "string" },
    "passwordHash": { "type": "string" },
    "salt": { "type": "string" },
    "isAdmin": { "type": "boolean" },
    "health": { "type": "number", "minimum": 0 },
    "maxHealth": { "type": "number", "minimum": 1 }
  }
}
```

### Room Schema

```json
{
  "type": "object",
  "required": ["id", "name"],
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "exits": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "direction": { "type": "string" },
          "targetRoomId": { "type": "string" }
        }
      }
    }
  }
}
```

## Usage

```typescript
import { validateUser, userSchema } from './schemas';
import { parseAndValidateJson } from './utils/jsonUtils';

// Validate data
const result = parseAndValidateJson(jsonString, userSchema);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

## Related Context

- [`../../data/`](../../data/) - Data files validated by schemas
- [`../utils/jsonUtils.ts`](../utils/jsonUtils.ts) - Validation utilities
- [`../utils/fileUtils.ts`](../utils/fileUtils.ts) - File loading with validation
