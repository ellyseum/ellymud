# Utility Functions - LLM Context

## Overview

Utilities are shared helper functions used throughout the codebase. The most critical utilities are `socketWriter.ts` (MUST use for all client output) and `colors.ts` (ANSI formatting).

## File Reference

### `socketWriter.ts` ⚠️ CRITICAL

**Purpose**: ALL client output MUST go through these functions

```typescript
// Simple message
export function writeToClient(client: ConnectedClient, data: string): void;

// Message with prompt redraw
export function writeMessageToClient(client: ConnectedClient, message: string): void;

// Formatted message with prompt handling
export function writeFormattedMessageToClient(
  client: ConnectedClient,
  message: string,
  drawPrompt?: boolean
): void;

// Flush buffered output
export function stopBuffering(client: ConnectedClient): void;

// Draw command prompt
export function drawCommandPrompt(client: ConnectedClient): void;
```

**Why Use These**:

- Handles prompt redrawing (players typing while receiving messages)
- Handles output buffering
- Handles admin monitoring
- Protocol-agnostic

```typescript
// ✅ ALWAYS use these
writeMessageToClient(client, 'Hello!\r\n');

// ❌ NEVER write directly
client.connection.write('Hello!\r\n');
```

### `colors.ts`

**Purpose**: ANSI color codes for terminal output

```typescript
export type ColorType =
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'brightRed'
  | 'brightGreen'
  | 'brightYellow'
  | 'brightBlue'
  | 'brightMagenta'
  | 'brightCyan'
  | 'brightWhite'
  | 'bold'
  | 'dim'
  | 'reset';

export function colorize(color: ColorType, text: string): string;
export const colors: Record<ColorType, string>;
```

**Usage**:

```typescript
import { colorize } from '../utils/colors';

const message = colorize('red', 'Error!') + ' Something went wrong\r\n';
// Always reset or end with newline to prevent color bleeding
```

### `logger.ts`

**Purpose**: Winston-based logging system

```typescript
export const systemLogger: Logger; // System events
export function getPlayerLogger(username: string): Logger; // Per-player logs
export function createContextLogger(context: string): Logger; // Context-specific
```

**Log Levels**: error, warn, info, debug

**Log Files**:

- `logs/system/system-{date}.log`
- `logs/players/{username}-{date}.log`
- `logs/error/error-{date}.log`

### `formatters.ts`

**Purpose**: Text formatting utilities

```typescript
export function formatUsername(username: string): string;
export function standardizeUsername(username: string): string;
export function formatNumber(num: number): string;
export function formatDuration(seconds: number): string;
```

### `promptFormatter.ts`

**Purpose**: Render command prompts

```typescript
export function drawCommandPrompt(client: ConnectedClient): void;
export function getPromptText(client: ConnectedClient): string;
```

**Prompt Format**: `[HP:100/100 MP:50/50] > `

### `fileUtils.ts`

**Purpose**: File I/O helpers

```typescript
export function loadAndValidateJsonFile<T>(filePath: string, schema?: any): T | null;

export function saveJsonFile(filePath: string, data: any): void;
```

### `jsonUtils.ts`

**Purpose**: JSON parsing with validation

```typescript
export function parseAndValidateJson<T>(
  json: string,
  schema: any
): { valid: boolean; data?: T; errors?: string[] };
```

### `itemNameColorizer.ts`

**Purpose**: Color item names by rarity

```typescript
export function colorizeItemName(item: Item): string;
// Common = white, Uncommon = green, Rare = blue, Epic = purple, Legendary = orange
```

### `rawSessionLogger.ts`

**Purpose**: Log raw I/O for debugging

```typescript
export function logRawInput(sessionId: string, input: string): void;
export function logRawOutput(sessionId: string, output: string): void;
```

### `stateInterruption.ts`

**Purpose**: Handle interruption of resting/meditating states

```typescript
export type InterruptionReason = 'damage' | 'movement' | 'combat' | 'aggression';

// Clear resting/meditating state with appropriate message
export function clearRestingMeditating(
  client: ConnectedClient,
  reason: InterruptionReason,
  silent?: boolean  // true = no message to player
): boolean;  // Returns true if state was cleared

// Check if player is in a resting/meditating state
export function isRestingOrMeditating(client: ConnectedClient): boolean;
```

**Usage** (call from combat, movement, or attack commands):

```typescript
import { clearRestingMeditating } from '../utils/stateInterruption';

// In move.command.ts
clearRestingMeditating(client, 'movement');

// In combat.ts (when damage received)
clearRestingMeditating(client, 'damage');

// In attack.command.ts (when player attacks)
clearRestingMeditating(client, 'aggression');
```

**Interruption Messages** (automatically shown by reason):

| Reason     | Rest Message                              | Meditate Message                         |
|------------|-------------------------------------------|------------------------------------------|
| damage     | You are jolted from your rest by the attack! | Your meditation is broken by the attack! |
| movement   | You stand up and stop resting.            | You stand up, breaking your meditation.  |
| combat     | You cannot rest while in combat!          | You cannot meditate while in combat!     |
| aggression | You stand up and prepare for battle.      | You break your meditation to attack.     |

## Conventions

### Color Usage

```typescript
// Errors in red
colorize('red', 'Error: ');

// Success in green
colorize('green', 'Success!');

// Important info in yellow
colorize('yellow', 'Warning: ');

// Player names in cyan
colorize('cyan', username);

// NPC names in yellow
colorize('yellow', npcName);
```

### Logging Conventions

```typescript
// System events
systemLogger.info('Server started');
systemLogger.error('Failed to load rooms', { error });

// Player events
const playerLog = getPlayerLogger(username);
playerLog.info('Player logged in');

// Context-specific
const combatLog = createContextLogger('Combat');
combatLog.debug('Processing combat tick');
```

## Gotchas & Warnings

- ⚠️ **Socket Writing**: ALWAYS use `socketWriter.ts` functions
- ⚠️ **Line Endings**: Use `\r\n` for Telnet compatibility
- ⚠️ **Color Reset**: Colors can "bleed"—end with reset or newline
- ⚠️ **Logging Passwords**: NEVER log sensitive data
- ⚠️ **File Paths**: Use `path.join()` for cross-platform

### `itemManager.ts`

**Purpose**: Singleton manager for item templates and item instances with multi-backend persistence (JSON, SQLite, Postgres).

**Key Exports**:
```typescript
export class ItemManager {
  static getInstance(): ItemManager;
  static resetInstance(): void;
  static createWithRepository(repository: IItemRepository): ItemManager;

  // Item templates
  getItem(itemId: string): GameItem | undefined;
  getAllItems(): GameItem[];
  addItem(item: GameItem): void;
  updateItem(item: GameItem): boolean;
  
  // Item instances
  getItemInstance(instanceId: string): ItemInstance | undefined;
  createItemInstance(templateId: string, createdBy: string): ItemInstance | undefined;
  
  // Persistence
  saveItems(): void;
  saveItemInstances(): void;
  loadPrevalidatedItems(itemData: GameItem[]): void;
  loadPrevalidatedItemInstances(instanceData: ItemInstance[]): void;
}
```

**Storage Backend Branching**:
The manager uses `STORAGE_BACKEND` config to determine persistence strategy:

```typescript
import { STORAGE_BACKEND } from '../config';

// In loadItems() / saveItems() / loadItemInstances() / saveItemInstances():
if (STORAGE_BACKEND === 'json') {
  // JSON only - use FileItemRepository
} else if (STORAGE_BACKEND === 'sqlite' || STORAGE_BACKEND === 'postgres') {
  // Database-only mode - use Kysely methods
} else {
  // 'auto' mode - load from repository first, then sync with database
}
```

**Database Methods** (private, called internally based on backend):

```typescript
// Load item templates from database
private async loadItemsFromDatabase(): Promise<void>

// Save item templates to database (with upsert)
private async saveItemsToDatabase(): Promise<void>

// Load item instances from database
private async loadItemInstancesFromDatabase(): Promise<void>

// Save item instances to database (with upsert)
private async saveItemInstancesToDatabase(): Promise<void>
```

**Database Tables Used**:
- `item_templates` - Item template definitions (id, name, description, type, slot, value, weight, stats, requirements)
- `item_instances` - Runtime item instances (instance_id, template_id, created, created_by, properties, history)

**Test Mode**:
```typescript
// Set testMode to skip persistence during tests
itemManager['testMode'] = true;
```

**Usage Example**:
```typescript
const itemManager = ItemManager.getInstance();

// Get an item template
const sword = itemManager.getItem('sword-001');

// Create an instance of an item
const instance = itemManager.createItemInstance('sword-001', 'player1');

// Save changes (auto-routes to correct backend)
itemManager.saveItems();
itemManager.saveItemInstances();
```

**Dependencies**: `../config`, `../data/db`, `../persistence/interfaces`, `../persistence/fileRepository`
**Used By**: Commands, combat system, merchant system, user inventory

## Related Context

- [`../command/`](../command/) - Commands use socketWriter
- [`../states/`](../states/) - States use socketWriter
- [`../combat/`](../combat/) - Combat uses colors
- [`../data/`](../data/) - Database connection and schema (getDb, ensureInitialized)
- [`../persistence/`](../persistence/) - Repository interfaces and file repository
