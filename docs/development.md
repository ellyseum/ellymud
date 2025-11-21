# Development Guide

This guide provides detailed information for developers who want to contribute to EllyMUD or extend it for their own purposes.

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Adding New Features](#adding-new-features)
- [Testing and Debugging](#testing-and-debugging)
- [Common Development Tasks](#common-development-tasks)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Development Environment Setup

### Prerequisites

Ensure you have the following installed:

- **Node.js 18.x or higher**
- **npm 8.x or higher**
- **Git**
- **A code editor** (VS Code recommended)
- **Telnet client** (for testing)

### Recommended VS Code Extensions

- **ESLint** - Linting support
- **Prettier** - Code formatting
- **TypeScript and JavaScript Language Features**
- **GitLens** - Git integration
- **Error Lens** - Inline error highlighting

### Initial Setup

1. **Clone and install:**
   ```bash
   git clone https://github.com/ellyseum/ellymud.git
   cd ellymud
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Verify setup:**
   ```bash
   npm start
   ```

   The server should start successfully on ports 8023 (Telnet) and 8080 (HTTP/WS).

## Project Structure

### Directory Layout

```
ellymud/
├── .github/              # GitHub configuration
│   └── copilot-instructions.md
├── data/                 # JSON data files
│   ├── rooms/
│   ├── users/
│   └── items/
├── docs/                 # Documentation
├── logs/                 # Runtime logs
├── public/               # Web client
│   ├── admin/           # Admin interface
│   ├── index.html
│   ├── client.js
│   └── style.css
├── src/                  # TypeScript source
│   ├── admin/           # Admin functionality
│   ├── client/          # Client management
│   ├── combat/          # Combat system
│   ├── command/         # Command system
│   ├── connection/      # Network layer
│   ├── console/         # Server console
│   ├── effects/         # Status effects
│   ├── room/            # Room management
│   ├── schemas/         # JSON schemas
│   ├── state/           # State machine
│   ├── states/          # State implementations
│   ├── timer/           # Game timers
│   ├── user/            # User management
│   ├── utils/           # Utilities
│   ├── app.ts           # Main application
│   ├── config.ts        # Configuration
│   ├── server.ts        # Entry point
│   └── types.ts         # Type definitions
├── test/                 # Tests (WIP)
├── CONTRIBUTING.md
├── LICENSE
├── README.md
└── package.json
```

### Key Files

- **src/server.ts** - Application entry point
- **src/app.ts** - Main GameServer class
- **src/config.ts** - Configuration management
- **src/types.ts** - Core type definitions

## Development Workflow

### Hot Reload Development

Use watch mode for automatic recompilation:

```bash
npm run watch
```

This watches for file changes and automatically restarts the server.

### Development as Admin

To develop with admin privileges:

```bash
npm run watch:admin
```

### Development as Specific User

To test as a specific user:

```bash
npm run watch -- --forceSession=testuser
```

### Testing Specific Features

1. **Start the server** in one terminal:
   ```bash
   npm run watch
   ```

2. **Connect as a client** in another terminal:
   ```bash
   telnet localhost 8023
   ```

3. **Or use the web client:**
   Open `http://localhost:8080` in your browser

### Making Changes

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** in the `src/` directory

3. **The server auto-reloads** if using `npm run watch`

4. **Test your changes** thoroughly

5. **Commit with descriptive message:**
   ```bash
   git add .
   git commit -m "✨ Add your feature description"
   ```

6. **Push and create PR:**
   ```bash
   git push origin feature/your-feature-name
   ```

## Adding New Features

### Adding a New Command

1. **Create command file:**
   ```typescript
   // src/command/commands/myCommand.ts
   import { Command } from '../commandTypes';
   import { Client } from '../../types';
   import { writeToClient } from '../../utils/socketWriter';
   
   export class MyCommand implements Command {
     name = 'mycommand';
     aliases = ['mc', 'mycmd'];
     description = 'Does something useful';
     usage = 'mycommand <arg1> <arg2>';
     requiredRole = undefined; // or Role.ADMIN
     
     async execute(client: Client, args: string[]): Promise<void> {
       if (args.length < 1) {
         writeToClient(client, `Usage: ${this.usage}`);
         return;
       }
       
       try {
         // Implement command logic
         const result = await this.doSomething(args[0]);
         writeToClient(client, `Success: ${result}`);
       } catch (error) {
         writeToClient(client, 'An error occurred.');
         console.error('MyCommand error:', error);
       }
     }
     
     private async doSomething(arg: string): Promise<string> {
       // Your logic here
       return 'result';
     }
   }
   ```

2. **Register the command:**
   ```typescript
   // src/command/commandRegistry.ts
   import { MyCommand } from './commands/myCommand';
   
   // In the registration section:
   registry.register(new MyCommand());
   ```

3. **Test the command:**
   - Start the server
   - Log in
   - Type: `mycommand test`
   - Verify expected behavior

4. **Update documentation:**
   - Add to `docs/commands.md`
   - Update help text if needed

### Adding a New State

1. **Create state file:**
   ```typescript
   // src/states/myState.ts
   import { State } from '../state/stateTypes';
   import { Client } from '../types';
   import { writeToClient } from '../utils/socketWriter';
   
   export class MyState implements State {
     name = 'MyState';
     
     async onEnter(client: Client): Promise<void> {
       // Initialize state
       client.stateData = { /* initial data */ };
       writeToClient(client, 'Entering my state...');
     }
     
     async handleInput(client: Client, input: string): Promise<void> {
       // Process input
       const trimmed = input.trim().toLowerCase();
       
       if (trimmed === 'exit') {
         // Transition to another state
         await client.changeState('AuthenticatedState');
         return;
       }
       
       // Handle other inputs
     }
     
     async onExit(client: Client): Promise<void> {
       // Cleanup
       delete client.stateData;
     }
   }
   ```

2. **Register the state:**
   ```typescript
   // src/state/stateMachine.ts
   import { MyState } from '../states/myState';
   
   // Add to state registry
   this.states.set('MyState', new MyState());
   ```

3. **Transition to the state:**
   ```typescript
   await client.changeState('MyState');
   ```

### Adding a New Manager

1. **Create manager file:**
   ```typescript
   // src/myfeature/myManager.ts
   export class MyManager {
     private static instance: MyManager;
     private data: Map<string, any> = new Map();
     
     private constructor() {
       // Private constructor for singleton
     }
     
     public static getInstance(): MyManager {
       if (!MyManager.instance) {
         MyManager.instance = new MyManager();
       }
       return MyManager.instance;
     }
     
     public async initialize(): Promise<void> {
       // Load data, set up listeners, etc.
     }
     
     public async doSomething(): Promise<void> {
       // Manager logic
     }
   }
   ```

2. **Initialize in GameServer:**
   ```typescript
   // src/app.ts
   import { MyManager } from './myfeature/myManager';
   
   async start(): Promise<void> {
     // ... other initialization
     await MyManager.getInstance().initialize();
   }
   ```

3. **Use the manager:**
   ```typescript
   const manager = MyManager.getInstance();
   await manager.doSomething();
   ```

### Adding a New NPC Type

1. **Create NPC definition:**
   ```json
   // data/npcs/my-npc.json
   {
     "id": "my-npc-001",
     "name": "Friendly Goblin",
     "description": "A small, friendly goblin",
     "level": 5,
     "stats": {
       "health": 50,
       "maxHealth": 50,
       "damage": 5
     },
     "aggressive": false,
     "loot": ["gold", "dagger"]
   }
   ```

2. **Update NPC spawner:**
   ```typescript
   // src/room/services/npcSpawner.ts
   // Add logic to spawn your NPC type
   ```

3. **Test spawning:**
   - Use admin commands to spawn
   - Verify NPC behavior
   - Test combat interaction

## Testing and Debugging

### Manual Testing

1. **Start server with logging:**
   ```bash
   npm run watch
   ```

2. **Monitor logs:**
   ```bash
   # In another terminal
   tail -f logs/system/system-$(date +%Y-%m-%d).log
   ```

3. **Test scenarios:**
   - Login/logout
   - Command execution
   - Combat
   - State transitions
   - Multiple users

### Debugging Tips

#### Using Console Logs

```typescript
console.log('[DEBUG] User:', client.user.username);
console.log('[DEBUG] State:', client.currentState.name);
console.log('[DEBUG] Args:', JSON.stringify(args));
```

#### Using the Logger

```typescript
import { systemLogger } from './utils/logger';

systemLogger.info('User logged in', { username: user.username });
systemLogger.error('Command failed', { error, command });
```

#### Using Node.js Debugger

1. **Add debugger statement:**
   ```typescript
   debugger; // Execution will pause here
   ```

2. **Start with inspect:**
   ```bash
   node --inspect dist/server.js
   ```

3. **Connect Chrome DevTools:**
   - Open `chrome://inspect`
   - Click "inspect"

#### Checking State

```typescript
// In any command or state:
console.log('Client state:', {
  username: client.user.username,
  state: client.currentState.name,
  stateData: client.stateData,
  roomId: client.user.roomId
});
```

### Log Files

Check these logs for debugging:

```bash
# System events
logs/system/system-YYYY-MM-DD.log

# Errors
logs/error/error-YYYY-MM-DD.log

# Specific user
logs/players/username-YYYY-MM-DD.log

# Raw session
logs/raw-sessions/sessionId-YYYY-MM-DD.log
```

## Common Development Tasks

### Adding a New Room

1. **Create room JSON:**
   ```json
   // data/rooms/my-room.json
   {
     "id": "room-123",
     "name": "Mysterious Cave",
     "description": "A dark cave with glowing crystals",
     "exits": {
       "north": "room-001",
       "south": "room-002"
     },
     "npcs": [],
     "items": []
   }
   ```

2. **Link from existing rooms:**
   - Update adjacent rooms' exits
   - Ensure bidirectional connections

3. **Test navigation:**
   - Move to the room
   - Try all exits
   - Verify descriptions

### Modifying Combat

Combat logic is in `src/combat/`:

```typescript
// src/combat/combatManager.ts
// Modify damage calculation:
private calculateDamage(attacker: User, defender: User): number {
  const base = attacker.stats.strength * 2;
  const random = Math.floor(Math.random() * 10);
  return base + random;
}
```

### Adding Status Effects

1. **Define effect type:**
   ```typescript
   // src/types/effects.ts
   export enum EffectType {
     POISON = 'poison',
     BUFF = 'buff',
     // ... add your effect
     MY_EFFECT = 'my-effect'
   }
   ```

2. **Implement effect logic:**
   ```typescript
   // src/effects/effectManager.ts
   private applyEffect(user: User, effect: Effect): void {
     switch (effect.type) {
       case EffectType.MY_EFFECT:
         // Apply your effect
         break;
     }
   }
   ```

3. **Apply to user:**
   ```typescript
   effectManager.addEffect(user, {
     type: EffectType.MY_EFFECT,
     duration: 30000, // 30 seconds
     intensity: 5
   });
   ```

### Modifying the Web Client

Web client files are in `public/`:

```javascript
// public/client.js
// Add new functionality:
function handleNewFeature() {
  socket.emit('new-feature', { data: 'value' });
}

socket.on('new-feature-response', (data) => {
  displayResult(data);
});
```

```css
/* public/style.css */
.new-feature {
  color: #00ff00;
}
```

## Best Practices

### Code Style

- **Use TypeScript types** - Avoid `any`
- **Async/await** for asynchronous operations
- **Error handling** with try/catch
- **JSDoc comments** for public APIs
- **Consistent naming** - camelCase for functions, PascalCase for classes

### Architecture

- **Use managers** for shared logic
- **Use state pattern** for client states
- **Use command pattern** for commands
- **Keep concerns separated** - don't mix UI and business logic

### Performance

- **Avoid synchronous I/O** in hot paths
- **Cache frequently accessed data**
- **Use timers wisely** - don't create excessive timers
- **Clean up resources** - remove listeners, clear timers

### Security

- **Validate all input** - never trust user input
- **Sanitize output** - prevent injection attacks
- **Use parameterized queries** if adding database
- **Log security events** - track suspicious activity

### Testing

- **Test both connection types** - Telnet and WebSocket
- **Test edge cases** - empty input, invalid data
- **Test as different roles** - user and admin
- **Test multiplayer scenarios** - multiple simultaneous users

## Troubleshooting

### TypeScript Compilation Errors

```bash
# Clean build
rm -rf dist/
rm tsconfig.tsbuildinfo
npm run build
```

### Port Already in Use

```bash
# Find process using port
lsof -i :8023
lsof -i :8080

# Kill process
kill -9 <PID>
```

### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules/
rm package-lock.json
npm install
```

### State Transition Issues

Add debugging:

```typescript
console.log('[STATE] Current:', client.currentState.name);
console.log('[STATE] Transitioning to:', newState);
console.log('[STATE] State data:', client.stateData);
```

### Socket Connection Issues

Check:
- Firewall settings
- Port availability
- Server actually running
- Correct host/port in client

### Data Persistence Issues

```bash
# Check file permissions
ls -la data/
chmod 755 data/
chmod 644 data/**/*.json

# Validate JSON syntax
npm run validate
```

## Additional Resources

- [Architecture Documentation](architecture.md) - System design
- [Commands Reference](commands.md) - All commands
- [Getting Started](getting-started.md) - User guide
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines

---

Happy coding! 🚀

[← Back to Documentation](README.md)
