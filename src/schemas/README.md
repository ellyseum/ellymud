# JSON Schemas

JSON Schema definitions for validating game data files.

## Contents

| File       | Description                             |
| ---------- | --------------------------------------- |
| `index.ts` | Schema exports and validation functions |

## Purpose

Schemas validate JSON data files to ensure data integrity:

- **Load-time Validation**: Data validated when server starts
- **Error Prevention**: Catch malformed data before it causes issues
- **Type Safety**: Ensure data matches expected structure
- **Documentation**: Schemas document expected data format

## Validated Files

Schemas exist for:

- `users.json` - User account structure
- `rooms.json` - Room definitions
- `items.json` - Item templates
- `npcs.json` - NPC templates
- `mud-config.json` - Game configuration

## Validation Flow

1. Server starts and loads JSON files
2. Each file is validated against its schema
3. Validation errors are logged with details
4. Server refuses to start with invalid data

## Related

- [data/](../../data/) - Data files validated by schemas
- [src/utils/jsonUtils.ts](../utils/jsonUtils.ts) - Uses schemas for validation
- [src/utils/validateFiles.ts](../utils/validateFiles.ts) - Validation utilities
