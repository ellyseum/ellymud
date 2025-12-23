# EllyMUD Architecture

This document provides a comprehensive overview of EllyMUD's architecture, design patterns, and code organization.

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Core Design Patterns](#core-design-patterns)
- [Component Overview](#component-overview)
- [Data Flow](#data-flow)
- [State Machine](#state-machine)
- [Network Layer](#network-layer)
- [Database and Persistence](#database-and-persistence)
- [Key Subsystems](#key-subsystems)

## High-Level Architecture

EllyMUD is built on Node.js using TypeScript and follows a modular, event-driven architecture.

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                              │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐              │
│  │  Telnet  │  │ WebSocket│  │ Web Browser│              │
│  └────┬─────┘  └─────┬────┘  └──────┬─────┘              │
└───────┼──────────────┼──────────────┼─────────────────────┘
        │              │              │
        └──────────────┴──────────────┘
                       │
        ┌──────────────┴──────────────┐
        │     Connection Layer        │
        │  ┌──────────────────────┐  │
        │  │  ClientManager       │  │
        │  │  (Singleton)         │  │
        │  └──────────────────────┘  │
        └──────────────┬──────────────┘
                       │
        ┌──────────────┴──────────────┐
        │     State Machine           │
        │  ┌──────────────────────┐  │
        │  │ ConnectingState      │  │
        │  │ LoginState           │  │
        │  │ AuthenticatedState   │  │
        │  │ CombatState          │  │
        │  └──────────────────────┘  │
        └──────────────┬──────────────┘
                       │
        ┌──────────────┴──────────────────────────┐
        │         Core Managers (Singletons)      │
        │  ┌───────────┐ ┌──────────┐ ┌────────┐│
        │  │   User    │ │  Room    │ │ Combat ││
        │  │  Manager  │ │ Manager  │ │ Manager││
        │  └───────────┘ └──────────┘ └────────┘│
        │  ┌───────────┐ ┌──────────┐           │
        │  │   Item    │ │  Timer   │           │
        │  │  Manager  │ │ Manager  │           │
        │  └───────────┘ └──────────┘           │
        └────────────────────┬────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │          Data Layer (JSON)              │
        │  ┌────────┐ ┌────────┐ ┌──────────┐   │
        │  │ Users  │ │ Rooms  │ │  Items   │   │
        │  │  .json │ │  .json │ │   .json  │   │
        │  └────────┘ └────────┘ └──────────┘   │
        └─────────────────────────────────────────┘
```

## Core Design Patterns

### 1. Singleton Pattern

All manager classes use the Singleton pattern to ensure a single source of truth:

```typescript
class UserManager {
  private static instance: UserManager;

  private constructor() {
    // Private constructor prevents direct instantiation
  }

  public static getInstance(): UserManager {
    if (!UserManager.instance) {
      UserManager.instance = new UserManager();
    }
    return UserManager.instance;
  }
}

// Usage:
const userManager = UserManager.getInstance();
```

**Key Managers:**

- `UserManager` - User data and authentication
- `RoomManager` - Room data and navigation
- `ClientManager` - Active connections
- `GameTimerManager` - Game ticks and periodic events
- `ItemManager` - Item management

### 2. State Machine Pattern

Client interactions are controlled by a finite state machine:

```typescript
interface State {
  name: string;
  onEnter(client: Client): Promise<void>;
  handleInput(client: Client, input: string): Promise<void>;
  onExit(client: Client): Promise<void>;
}
```

**State Transitions:**

```
ConnectingState → LoginState → AuthenticatedState ⇄ CombatState
                                       ↓
                                   DisconnectedState
```

### 3. Command Pattern

Commands are encapsulated as objects implementing a common interface:

```typescript
interface Command {
  name: string;
  aliases: string[];
  description: string;
  usage: string;
  requiredRole?: Role;

  execute(client: Client, args: string[]): Promise<void>;
}
```

Commands are registered in `CommandRegistry` and dispatched by `CommandHandler`.

### 4. Observer Pattern

Event-driven architecture for game events:

```typescript
// Combat events
client.on('combatStart', (npc) => {
  /* ... */
});
client.on('combatEnd', (result) => {
  /* ... */
});

// Connection events
socket.on('data', (data) => {
  /* ... */
});
socket.on('close', () => {
  /* ... */
});
```

## Component Overview

### Entry Point: `src/server.ts`

- Application entry point
- Handles command-line arguments
- Creates and starts `GameServer`
- Manages auto-login sessions

### Core Application: `src/app.ts`

The `GameServer` class orchestrates all components:

```typescript
class GameServer {
  private telnetServer: TelnetServer;
  private httpServer: http.Server;
  private webSocketServer: WebSocketServer;
  private clientManager: ClientManager;
  private gameTimerManager: GameTimerManager;

  async start(): Promise<void> {
    // Initialize all subsystems
  }
}
```

### Configuration: `src/config.ts`

Centralized configuration from environment variables and command-line arguments:

```typescript
export const TELNET_PORT = 8023;
export const HTTP_PORT = 8080;
export const AUTO_ADMIN_SESSION = false;
export const AUTO_USER_SESSION = false;
```

### Type Definitions: `src/types/`

Shared TypeScript interfaces and types:

- `User` - User account data
- `Room` - Room structure
- `Item` - Item properties
- `Client` - Client connection data
- `Effect` - Status effects

## Data Flow

### User Login Flow

```
1. Client connects
   ↓
2. ConnectingState: Initial connection established
   ↓
3. LoginState: Prompt for username
   ↓
4. LoginState: Prompt for password
   ↓
5. UserManager: Authenticate credentials
   ↓
6. AuthenticatedState: User successfully logged in
   ↓
7. Load user data (stats, inventory, location)
   ↓
8. Place user in their current room
   ↓
9. Send welcome message and room description
```

### Command Execution Flow

```
1. Client sends input: "attack goblin"
   ↓
2. Current State receives input
   ↓
3. CommandHandler.parse("attack goblin")
   ↓
4. CommandRegistry.get("attack")
   ↓
5. AttackCommand.execute(client, ["goblin"])
   ↓
6. CombatManager.startCombat(client, target)
   ↓
7. State transition to CombatState
   ↓
8. Combat resolution
   ↓
9. Results sent to client
```

### Room Movement Flow

```
1. User executes: "north"
   ↓
2. MoveCommand validates exit exists
   ↓
3. Check if user can move (combat, effects, etc.)
   ↓
4. Remove user from current room
   ↓
5. Update user.roomId to new room
   ↓
6. Add user to new room
   ↓
7. Notify old room: "Player left north"
   ↓
8. Notify new room: "Player arrived from south"
   ↓
9. Send new room description to user
   ↓
10. Save user data
```

## State Machine

### State Interface

```typescript
interface State {
  name: string;

  // Called when entering this state
  onEnter(client: Client): Promise<void>;

  // Called for each line of input
  handleInput(client: Client, input: string): Promise<void>;

  // Called when leaving this state
  onExit(client: Client): Promise<void>;
}
```

### State Descriptions

#### ConnectingState

- Initial state when client connects
- Displays welcome banner
- Transitions to LoginState

#### LoginState

- Handles username/password entry
- Creates new accounts
- Authenticates existing users
- Transitions to AuthenticatedState on success

#### AuthenticatedState

- Main gameplay state
- Processes commands
- Handles movement, combat initiation, item use
- Can transition to CombatState

#### CombatState

- Active combat with NPCs or players
- Turn-based combat loop
- Combat commands only
- Returns to AuthenticatedState when combat ends

### State Data

Each state can store temporary data in `client.stateData`:

```typescript
// Example: Combat state data
client.stateData = {
  opponent: npc,
  combatStartTime: Date.now(),
  turnCount: 0,
};
```

## Network Layer

### Telnet Server (`src/connection/telnetServer.ts`)

- Raw TCP socket connections
- Handles Telnet protocol negotiation
- Line-buffered input
- ANSI color support

```typescript
socket.on('data', (data) => {
  // Process telnet data
  // Buffer lines
  // Send to state machine
});
```

### WebSocket Server (`src/connection/webSocketServer.ts`)

- Socket.io for WebSocket communication
- JSON message protocol
- Same command processing as Telnet
- Additional events for web client

```typescript
socket.on('message', (data) => {
  // Parse JSON message
  // Process command
  // Send response
});
```

### HTTP Server (`src/server/httpServer.ts`)

- Serves static web client files
- Admin panel endpoints
- Express.js framework
- CORS enabled for development

## Database and Persistence

### File-Based Storage

Data is stored as JSON files in the `data/` directory:

```
data/
├── users/
│   ├── admin.json
│   └── player1.json
├── rooms/
│   ├── room-001.json
│   └── room-002.json
└── items/
    ├── sword.json
    └── potion.json
```

### Schema Validation

All data is validated using JSON schemas in `src/schemas/`:

```typescript
// src/schemas/userSchema.ts
export const userSchema = {
  type: 'object',
  required: ['id', 'username', 'password'],
  properties: {
    id: { type: 'string' },
    username: { type: 'string' },
    password: { type: 'string' },
    stats: { type: 'object' },
  },
};
```

### Data Loading

Managers load data on initialization:

```typescript
class UserManager {
  private users: Map<string, User> = new Map();

  async loadUsers(): Promise<void> {
    const files = await fs.readdir('data/users');
    for (const file of files) {
      const user = await this.loadUser(file);
      this.users.set(user.id, user);
    }
  }
}
```

### Data Persistence

Data is saved asynchronously:

```typescript
async saveUser(user: User): Promise<void> {
  const data = JSON.stringify(user, null, 2);
  await fs.writeFile(`data/users/${user.id}.json`, data);
}
```

## Key Subsystems

### Command System (`src/command/`)

**Components:**

- `CommandRegistry` - Stores all available commands
- `CommandHandler` - Parses input and dispatches commands
- `commands/` - Individual command implementations

**Adding a New Command:**

```typescript
// src/command/commands/myCommand.ts
export class MyCommand implements Command {
  name = 'mycommand';
  aliases = ['mc'];
  description = 'Does something cool';
  usage = 'mycommand <argument>';

  async execute(client: Client, args: string[]): Promise<void> {
    writeToClient(client, 'Doing something cool!');
  }
}

// Register in CommandRegistry
CommandRegistry.register(new MyCommand());
```

### Combat System (`src/combat/`)

**Components:**

- `CombatManager` - Manages combat instances
- `CombatState` - State for active combat
- `NPCAIManager` - AI for NPC behavior
- `DamageCalculator` - Damage formulas

**Combat Flow:**

1. Player initiates combat (attack command)
2. Transition to CombatState
3. Turn-based loop:
   - Player action
   - NPC action
   - Apply damage
   - Check win conditions
4. Combat resolution
5. Award experience and loot
6. Return to AuthenticatedState

### Timer System (`src/timer/`)

Manages periodic events:

```typescript
class GameTimerManager {
  private timers: Map<string, NodeJS.Timer> = new Map();

  registerTimer(id: string, callback: () => void, interval: number): void {
    const timer = setInterval(callback, interval);
    this.timers.set(id, timer);
  }
}
```

**Common Timers:**

- Health regeneration
- Mana regeneration
- NPC respawning
- Effect expiration
- Auto-save

### Effects System (`src/effects/`)

Status effects that can be applied to players/NPCs:

```typescript
interface Effect {
  id: string;
  type: EffectType;
  duration: number;
  intensity: number;
  stackBehavior: StackBehavior;
}
```

**Effect Types:**

- Buffs (increased stats)
- Debuffs (decreased stats)
- Damage over time
- Healing over time
- Crowd control (stun, slow, etc.)

### Room System (`src/room/`)

**Components:**

- `RoomManager` - Manages all rooms
- `RoomService` - Room operations
- `NPCSpawner` - Spawns NPCs in rooms

**Room Structure:**

```typescript
interface Room {
  id: string;
  name: string;
  description: string;
  exits: { [direction: string]: string };
  players: string[]; // User IDs
  npcs: string[]; // NPC IDs
  items: string[]; // Item IDs
}
```

### User System (`src/user/`)

**Components:**

- `UserManager` - User CRUD operations
- `AuthService` - Authentication logic

### MCP Server (`src/mcp/`)

The Model Context Protocol server provides AI tools with access to game data.

**Components:**

- `MCPServer` - HTTP server for MCP protocol
- Express.js middleware for routing and authentication
- API endpoints for game data access

**Features:**

- **RESTful API** - HTTP endpoints for all game data
- **API Key Authentication** - Secure access control via `X-API-Key` header
- **Auto-generated Keys** - First-run setup prompts for key generation
- **Read-only Access** - All endpoints provide read-only views of game state
- **Live Data** - Access to runtime state (online users, active combat)
- **Static Data** - Access to configuration (rooms, items, NPCs)
- **Log Search** - Query logs for debugging

**Key Endpoints:**

```typescript
GET  /health              // Health check (no auth)
GET  /tools               // List available tools
GET  /api/online-users    // Currently connected users
GET  /api/users/:username // Specific user data
GET  /api/rooms/:id       // Specific room data
GET  /api/rooms           // All rooms
GET  /api/items           // All item templates
GET  /api/npcs            // All NPC templates
GET  /api/combat-state    // Active combat sessions
POST /api/logs/search     // Search logs
GET  /api/config          // Game configuration
```

**Integration:**

- Starts automatically on port 3100 when game server starts
- Requires `ELLYMUD_MCP_API_KEY` environment variable
- Won't start if API key is missing (security feature)
- VS Code integration via `.vscode/mcp.json`
- Works with GitHub Copilot, Claude, and other MCP clients

**Security:**

- 256-bit API keys (64 hex characters)
- Key validation on all requests (except `/health`)
- Keys stored in `.env` (not version controlled)
- All requests logged with IP addresses
- Failed authentication attempts logged

See [src/mcp/README.md](../src/mcp/README.md) for detailed documentation.

- `StatsManager` - Character statistics

**User Structure:**

```typescript
interface User {
  id: string;
  username: string;
  password: string; // Hashed
  role: Role;
  stats: Stats;
  inventory: Item[];
  equipment: Equipment;
  roomId: string;
  effects: Effect[];
}
```

### Logging System (`src/utils/logger.ts`)

Multiple log types with daily rotation:

- `systemLogger` - General server events
- `errorLogger` - Error messages
- `exceptionLogger` - Uncaught exceptions
- `rejectionLogger` - Unhandled promise rejections
- `mcpLogger` - MCP server events

**Player Logs:**

- `logs/players/{username}-{date}.log` - Player actions
- `logs/raw-sessions/{sessionId}-{date}.log` - Raw I/O

## Security Architecture

### Password Security

- Passwords are hashed using bcrypt
- Salt is generated per password
- Plaintext passwords never stored or logged

### Input Validation

- All user input is validated
- Command arguments are sanitized
- File paths are validated

### Role-Based Access Control (RBAC)

```typescript
enum Role {
  USER = 'user',
  ADMIN = 'admin',
}

// Commands can require specific roles
if (command.requiredRole && client.user.role !== command.requiredRole) {
  writeToClient(client, 'Permission denied.');
  return;
}
```

### Session Management

- Sessions stored in memory
- Session IDs are UUIDs
- Timeout mechanisms prevent stale sessions

## Extensibility

### Adding New Features

1. **New Command**: Create in `src/command/commands/`, register in registry
2. **New State**: Implement `State` interface, register in state machine
3. **New Manager**: Follow singleton pattern, add to `GameServer`
4. **New Effect**: Add to `EffectType` enum, implement in effects system
5. **New NPC Type**: Add to NPC configuration, update AI if needed

### Configuration Points

- Environment variables (`.env`)
- Command-line arguments
- JSON data files
- TypeScript constants in `config.ts`

## Performance Considerations

### Memory Management

- Singleton pattern reduces object creation
- Connection pooling for active clients
- Periodic cleanup of inactive sessions

### I/O Optimization

- Async file operations
- Batched writes for high-frequency updates
- Log rotation prevents disk space issues

### Scalability Limitations

- Single-process architecture
- In-memory data storage
- File-based persistence

**For Production:**

- Consider database backend (PostgreSQL, MongoDB)
- Implement horizontal scaling with Redis for sessions
- Use message queue for inter-process communication

## Code Organization

```
src/
├── admin/          # Admin interface and commands
├── app.ts          # Main GameServer class
├── client/         # Client connection management
├── combat/         # Combat system
├── command/        # Command system
├── config/         # Configuration files
├── config.ts       # Main configuration
├── connection/     # Network layer (Telnet, WebSocket)
├── console/        # Server console interface
├── data/           # Data management utilities
├── effects/        # Status effects system
├── mcp/            # MCP server integration
├── room/           # Room management
├── schemas/        # JSON validation schemas
├── server/         # HTTP server
├── server.ts       # Entry point
├── setup/          # Initial setup scripts
├── state/          # State machine
├── states/         # State implementations
├── timer/          # Game timers
├── types/          # TypeScript type definitions
├── types.ts        # Core type definitions
├── user/           # User management
└── utils/          # Utility functions
```

## Further Reading

- [Development Guide](development.md) - Contributing code
- [Deployment Guide](deployment.md) - Production setup
- [Commands Reference](commands.md) - All commands

---

[← Back to Documentation](README.md)
