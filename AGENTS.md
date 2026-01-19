# EllyMUD - LLM Context & Core Conventions

> **This is the single source of truth** for core conventions and navigation to detailed context.

## ⚠️ CRITICAL: Always Check AGENTS.md First

**STOP! Before searching or reading source files, check the relevant AGENTS.md.**

```
❌ WRONG: grep_search or semantic_search immediately
❌ WRONG: Reading source files without checking directory docs
❌ WRONG: Scanning entire codebase when a navigation index exists

✅ CORRECT: Check AGENTS.md in the relevant directory FIRST
✅ CORRECT: Use the "Common Tasks" table to find the right AGENTS.md
✅ CORRECT: Only read source files when AGENTS.md lacks detail
```

**Workflow:**

1. User asks about a feature → Check "Common Tasks" table below
2. Find the relevant `AGENTS.md` → Read it for context
3. Only then read source files if more detail needed

**Why this matters:**

- AGENTS.md files are curated navigation indexes
- They prevent wasted tool calls searching blindly
- They document patterns, gotchas, and anti-patterns
- Skipping them = slower responses and missed context

### Common Mistakes to Avoid

- ❌ Jumping straight to `grep_search` or `semantic_search` without checking AGENTS.md
- ❌ Reading source files before consulting the directory's AGENTS.md
- ❌ Answering questions about a module without mentioning which AGENTS.md was consulted
- ❌ Assuming AGENTS.md only has file lists (they contain patterns, gotchas, and anti-patterns)
- ✅ State which AGENTS.md you consulted when answering
- ✅ Note what the AGENTS.md provided vs what required source file reading
- ✅ Use AGENTS.md as the starting point, then dive deeper only if needed

---

## ⚠️ CRITICAL: NEVER Kill All Node Processes

**STOP! VS Code runs on Node.js. Killing all node processes will CRASH THE EDITOR!**

```bash
# ❌ NEVER DO THIS - WILL CRASH VS CODE
pkill -f node
killall node
kill $(pgrep node)

# ✅ CORRECT: Find specific PIDs first, then kill only those
lsof -i :8023 -t | xargs kill     # Kill process on specific port
kill <specific-pid>                # Kill only the PID you identified
```

### Safe Process Termination Workflow

1. **Identify the specific process** using `lsof -i :<port>` or `ps aux | grep <pattern>`
2. **Note the specific PID(s)** from the output
3. **Kill only those PIDs**: `kill <pid>` or `kill -9 <pid>` if needed
4. **NEVER use broad kill commands** like `pkill -f node`

| Port | Service          | Safe Kill Command                |
| ---- | ---------------- | -------------------------------- |
| 8023 | Telnet Server    | `lsof -i :8023 -t \| xargs kill` |
| 8080 | WebSocket Server | `lsof -i :8080 -t \| xargs kill` |
| 3100 | MCP Server       | `lsof -i :3100 -t \| xargs kill` |
| 3000 | Admin API        | `lsof -i :3000 -t \| xargs kill` |

---

## ⚠️ CRITICAL: Ignore `todos/` Folder

**The `todos/` folder is for HUMAN developers only.** Do NOT use it as a source of truth.

```
❌ NEVER: Read todos/ to understand current state or requirements
❌ NEVER: Base implementation decisions on todos/ content
❌ NEVER: Assume todos/ files are up-to-date or accurate
✅ ONLY: Read todos/ when the user EXPLICITLY asks you to
```

**Why this matters:**

- The `todos/` folder contains human planning notes, brainstorms, and outdated analysis
- Content may be **weeks or months out of date**
- Implementation details may have changed significantly since those files were written
- Using stale information leads to incorrect implementations

**Source of truth hierarchy:**

1. **Actual source code** (`src/`, `data/`, config files)
2. **AGENTS.md files** in each directory
3. **User's explicit instructions** in the current conversation
4. ~~todos/ folder~~ ← **IGNORE unless explicitly requested**

---

## ⚠️ IMPORTANT: Ephemeral Data - Do NOT Commit

**Generated/ephemeral data MUST NOT be committed to the repository.**

The `.gitignore` excludes these automatically, but be aware:

| Directory/File                              | Content                 | Why Excluded             |
| ------------------------------------------- | ----------------------- | ------------------------ |
| `.github/agents/research/*.md`              | Research documents      | Session-specific outputs |
| `.github/agents/planning/*.md`              | Implementation plans    | Session-specific outputs |
| `.github/agents/implementation/*.md`        | Impl reports            | Session-specific outputs |
| `.github/agents/validation/*.md`            | Validation reports      | Session-specific outputs |
| `.github/agents/suggestions/*.md`           | Post-mortem suggestions | Session-specific outputs |
| `.github/agents/metrics/executions/*.json`  | Pipeline metrics        | Execution telemetry      |
| `.github/agents/metrics/pipeline-report.md` | Generated report        | Derived from metrics     |
| `todos/*.md`                                | Human planning notes    | Personal brainstorms     |

**What IS committed:**

- `README.md` and `AGENTS.md` in each directory (documentation)
- `pipeline-metrics-schema.json` (schema definition)
- Agent prompt files (`*.agent.md`)

**If you create new ephemeral output directories**, add them to `.gitignore`.

---

## ⚠️ CRITICAL: Paired Documentation Rule

**STOP! Before editing ANY `README.md` or `AGENTS.md` file:**

README.md and AGENTS.md in the same directory **MUST be updated together**.

```
✅ CORRECT: Edit both make/README.md AND make/AGENTS.md
❌ WRONG:   Edit only make/AGENTS.md (forgetting README.md)
```

| When you edit... | You MUST also edit... |
| ---------------- | --------------------- |
| `foo/README.md`  | `foo/AGENTS.md`       |
| `foo/AGENTS.md`  | `foo/README.md`       |

This rule exists because:

- README.md = for humans (brief, no code)
- AGENTS.md = for LLMs (detailed, with code)
- Both must stay synchronized

**A pre-commit hook will warn you, but YOU must remember this rule.**

---

## ⚠️ CRITICAL: AGENTS.md Location Index Sync

**When creating a new directory with an AGENTS.md file**, you MUST add it to the "AGENTS.md Locations" list in `.github/copilot-instructions.md`.

```bash
# Verify all AGENTS.md files are indexed:
find . -name "AGENTS.md" -type f | grep -v node_modules | sort
```

| When you create... | You MUST also update... |
| ------------------ | ----------------------- |
| `foo/AGENTS.md`    | `.github/copilot-instructions.md` (locations list) |

---

## ⚠️ CRITICAL: NEVER Create README.md in `.github/` Directory

**STOP! GitHub treats `.github/README.md` specially - it will OVERRIDE the root README.md when viewing the repository!**

```
❌ NEVER: Create .github/README.md
❌ NEVER: Create any README.md directly in the .github/ folder
✅ OK:    Create README.md in subfolders like .github/agents/README.md
✅ OK:    Create README.md in .github/agents/metrics/README.md
```

**Why this matters:**

- GitHub displays `.github/README.md` as the repository's main README
- This will hide your actual project documentation from visitors
- The root `/README.md` becomes invisible on the repository homepage

**Safe locations for README.md:**
- `/README.md` (root - main project docs)
- `.github/agents/README.md` (subfolder - OK)
- `.github/agents/*/README.md` (nested subfolders - OK)
- `.github/workflows/README.md` (subfolder - OK)

**Forbidden location:**
- `.github/README.md` ← **NEVER CREATE THIS FILE**

---

## ⚠️ CRITICAL: Terminal Command Best Practices

**STOP re-running commands blindly!** Always check output before retrying.

### After Running a Terminal Command

1. **Check the output first** using `execute/getTerminalOutput` or if that doesn't work, use `execute/terminalLastCommand` (`terminal_last_command`) tool
2. **Read the exit code** - 0 means success, non-zero means error
3. **Only re-run if** there was an actual error that needs retry

```
✅ CORRECT workflow:
   1. execute/runInTerminal (run_in_terminal) → command executes
   2. execute/terminalLastCommand (terminal_last_command) → read the output
   3. Analyze results → decide next action

❌ WRONG workflow:
   1. execute/runInTerminal (run_in_terminal) → command executes
   2. execute/runInTerminal (run_in_terminal) → same command again
   3. execute/runInTerminal (run_in_terminal) → same command again (spamming!)
```

### Available Tools for Terminal Output

| Tool Alias                    | Actual Tool             | When to Use                                          |
| ----------------------------- | ----------------------- | ---------------------------------------------------- |
| `execute/terminalLastCommand` | `terminal_last_command` | Get output, exit code, and directory of last command |
| `execute/getTerminalOutput`   | `get_terminal_output`   | Get output from a specific terminal by ID            |

### Common Mistakes to Avoid

- ❌ Re-running commands without checking if they succeeded
- ❌ Assuming a command failed because output wasn't immediately visible
- ❌ Running multiple terminal commands in rapid succession without reading results
- ✅ Slow down, check output, then decide next action

---

## ⚠️ CRITICAL: Prefer Built-in Tools Over Terminal Commands

**STOP! Before using `run_in_terminal`, check if a built-in tool exists for your task.**

### Built-in Tools to Use FIRST

| Task                   | Use This Tool    | NOT Terminal Command      |
| ---------------------- | ---------------- | ------------------------- |
| Run tests              | `runTests`       | `npm test`                |
| Check git status       | `get_changed_files` | `git status`           |
| Search code            | `grep_search` or `semantic_search` | `grep -r` |
| Read files             | `read_file`      | `cat`, `head`, `tail`     |
| Create/edit files      | `create_file`, `replace_string_in_file` | `echo >`, `sed` |
| List directories       | `list_dir`       | `ls`                      |
| Search files by name   | `file_search`    | `find`                    |

**Why this matters:**
- Built-in tools are **synchronous** - they wait for completion automatically
- Terminal commands can return before finishing, causing race conditions
- Built-in tools provide structured output that's easier to parse

---

## ⚠️ CRITICAL: WAIT For Terminal Commands to Complete

**STOP! Running a new terminal command INTERRUPTS the previous command!**

When `run_in_terminal` returns just `❯` with no output, the command is **still executing**.

### Correct Workflow

```
1. run_in_terminal → execute command
2. terminal_last_command → check status
3. IF "currently executing" → STOP AND WAIT
4. Do NOT run another command until you see an exit code
5. Only proceed when command has finished
```

### What Happens When You Go Too Fast

```
❌ WRONG:
   run_in_terminal("npm test")      → returns "❯" (still running)
   run_in_terminal("cat file.txt")  → INTERRUPTS npm test!
   terminal_last_command            → shows "cat" output, tests killed

✅ CORRECT:
   run_in_terminal("npm test")      → returns "❯" (still running)
   terminal_last_command            → "currently executing..."
   terminal_last_command            → "currently executing..." (wait more)
   terminal_last_command            → exit code: 0, output: test results
   THEN proceed to next task
```

### Signs You're Going Too Fast

- `terminal_last_command` shows a different command than you just ran
- Output seems truncated or incomplete
- You get confusing or mixed results
- Tests show as "passed" but with wrong output

**When in doubt, call `terminal_last_command` multiple times until you see an exit code.**

---

## Project Overview

EllyMUD is a Node.js/TypeScript Multi-User Dungeon (MUD) supporting Telnet (port 8023) and WebSocket (port 8080) connections. An MCP server runs on port 3100 for AI integration.

- **Entry Point**: `src/server.ts` → `src/app.ts` (GameServer class)
- **State Machine**: `src/state/stateMachine.ts` manages client states
- **Flow**: ConnectingState → LoginState → AuthenticatedState

## Architecture at a Glance

```
GameServer (src/app.ts)
├── Servers: Telnet, WebSocket, API, MCP
├── Managers: Client, User, Room, GameTimer (singletons)
├── StateMachine: Connecting → Login → Authenticated
├── CommandHandler → CommandRegistry
└── CombatSystem (event-driven)
```

## Storage Architecture (Multi-Backend)

EllyMUD supports three storage backends configured via `STORAGE_BACKEND` environment variable:

| Backend | Use Case | Config |
|---------|----------|--------|
| `json` | Development, fast iteration | Default (no setup) |
| `sqlite` | Single-server production | `STORAGE_BACKEND=sqlite` |
| `postgres` | Cluster/HA deployments | `STORAGE_BACKEND=postgres` + `DATABASE_URL` |

### Repository Factory Pattern (Completed)

All managers now use the Repository Factory pattern. The `RepositoryFactory` is the single place that checks `STORAGE_BACKEND` and returns the appropriate repository implementation:

```typescript
// CURRENT PATTERN - all managers use this
class UserManager {
  private repository: IAsyncUserRepository = getUserRepository();
  
  async loadUsers() {
    this.users = await this.repository.findAll();
  }
}
```

Managers that have been migrated:
- **UserManager** - Uses `getUserRepository()` from RepositoryFactory
- **RoomManager** - Uses `getRoomRepository()` from RepositoryFactory
- **ItemManager** - Uses `getItemRepository()` from RepositoryFactory
- **NPC** (static methods) - Uses `getNpcRepository()` from RepositoryFactory
- **GameTimerManager** - Uses `getGameTimerConfigRepository()` from RepositoryFactory

Configuration files also use the Repository Factory pattern:
- **MUDConfig** - Uses `getMUDConfigRepository()` (singleton pattern)
- **GameTimerConfig** - Uses `getGameTimerConfigRepository()` (singleton pattern)

### Async Initialization Pattern

Managers use an async initialization pattern with `initPromise` and `ensureInitialized()`:

```typescript
class Manager {
  private initPromise: Promise<void> | null = null;
  
  constructor() {
    this.initPromise = this.initialize();
  }
  
  async ensureInitialized(): Promise<void> {
    if (this.initPromise) await this.initPromise;
  }
  
  private async initialize(): Promise<void> {
    const data = await this.repository.findAll();
    // ... populate in-memory structures
    this.initPromise = null;
  }
}
```

### Rules for New Code

```
❌ Do NOT add `if STORAGE_BACKEND` checks to managers
❌ Do NOT add inline Kysely queries to managers
✅ Use existing repository factory functions (getUserRepository, getRoomRepository, etc.)
✅ For new entity types, create async repository interface and implementations
✅ Add new factory function to RepositoryFactory.ts
```

### Key Files

| File | Purpose |
|------|---------|
| `src/persistence/interfaces.ts` | Async repository interfaces (`IAsync*Repository`) |
| `src/persistence/RepositoryFactory.ts` | Backend selection - single source of truth |
| `src/persistence/AsyncFile*Repository.ts` | JSON file implementations |
| `src/persistence/Kysely*Repository.ts` | Database implementations |
| `src/data/db.ts` | Kysely connection (SQLite/PostgreSQL) |
| `src/config.ts` | `STORAGE_BACKEND`, `DATABASE_URL` |

---

## Quick Start

### Fresh System Bootstrap

```bash
./scripts/bootstrap.sh     # Full setup from scratch
make help                  # Show all available commands
```

### Daily Development

```bash
make dev                   # Start dev server with hot reload
make build                 # Compile TypeScript
make test                  # Run tests
make agent-test            # Run agent tests
```

### ⚠️ CRITICAL: Build Process

**`npm start` automatically builds everything** - TypeScript AND admin UI.

```
npm start → prestart → npm run build → tsc + build:frontend → public/
```

**DO NOT manually run:**
- `npm run build:frontend` (redundant - already part of `npm start`)
- `rm -rf public/admin/assets/*` (unnecessary manual cleaning)

---

## ⚠️ CRITICAL: Command Delegation Pattern

**All commands follow a strict delegation pattern:**

```
make targets → npm scripts → actual commands
```

**Example flow:**
```
make docker-up → npm run docker:up → docker compose up -d
make test      → npm run test      → jest
make build     → npm run build     → tsc + vite build
```

### Why This Pattern Matters

1. **Single source of truth**: npm scripts in `package.json` define all commands
2. **Maintainability**: Change command once in package.json, all entry points updated
3. **Cross-platform**: npm scripts work identically on Linux, macOS, Windows
4. **CI/CD compatible**: GitHub Actions and Docker can use npm scripts directly

### When to Use What

| Situation | Use |
|-----------|-----|
| Interactive development | `make <target>` (shorter, colored output) |
| CI/CD pipelines | `npm run <script>` (explicit, no make dependency) |
| Custom scripts | `npm run <script>` (composable) |
| Docker containers | `npm run <script>` (no make installed) |

---

## NPM Scripts & Make Aliases Reference

All commands are defined in `package.json` scripts and have corresponding `make` aliases.

### Build & Development

| npm Script | make Alias | Description |
|------------|------------|-------------|
| `npm run build` | `make build` | Full build (TypeScript + frontend) |
| `npm run build:server` | - | Build TypeScript server only |
| `npm run build:frontend` | - | Build Vite frontend only |
| `npm run build-watch` | `make build-watch` | Watch mode TypeScript compilation |
| `npm run dev` | `make dev` | Start dev server with hot reload |
| `npm run dev-admin` | `make dev-admin` | Dev server with admin auto-login |
| `npm run dev-user` | `make dev-user` | Dev server with user selection |
| `npm run dev:frontend` | - | Vite dev server for frontend only |
| `npm run clean` | `make clean-dist` | Remove dist directory |
| `npm run clean-all` | `make clean-all` | Remove dist + node_modules |

### Server Management

| npm Script | make Alias | Description |
|------------|------------|-------------|
| `npm start` | `make start` | Start production server (auto-builds) |
| `npm run prod` | `make prod-start` | Build + start in production mode |
| `npm run start-admin` | `make start-admin` | Start with admin auto-login |
| `npm run start-user` | `make start-user` | Start with user selection |

### Testing

| npm Script | make Alias | Description |
|------------|------------|-------------|
| `npm test` | `make test` | Run all tests (typecheck + validate + jest) |
| `npm run test:unit` | `make test-unit` | Run unit tests only |
| `npm run test:e2e` | - | Run E2E tests (local embedded mode) |
| `npm run test:e2e:remote` | - | Run E2E tests against remote MCP server |
| `npm run test:integration` | `make test-integration` | Run integration tests (requires Docker) |
| `npm run test:coverage` | `make test-cov` | Run tests with coverage report |
| `npm run test:watch` | `make test-watch` | Run tests in watch mode |
| `npm run test:all` | `make test-all` | Run unit + E2E tests |
| `npm run test:full` | `make test-full` | Run all tests including integration |

### Code Quality

| npm Script | make Alias | Description |
|------------|------------|-------------|
| `npm run lint` | `make lint` | Run ESLint (max-warnings 0) |
| `npm run lint-fix` | `make lint-fix` | ESLint with auto-fix |
| `npm run typecheck` | `make typecheck` | TypeScript type checking only |
| `npm run format` | `make format` | Format with Prettier |
| `npm run format-check` | `make format-check` | Check formatting only |
| `npm run validate` | `make validate` | Validate JSON data files |
| `npm run ci` | `make ci` | Full CI pipeline (lint + typecheck + validate + build) |

### Docker Container Management

| npm Script | make Alias | Description |
|------------|------------|-------------|
| `npm run docker:build` | `make docker-build` | Build Docker image |
| `npm run docker:up` | `make docker-up` | Start dev containers (alias for docker:dev) |
| `npm run docker:down` | `make docker-down` | Stop dev containers |
| `npm run docker:logs` | `make docker-logs` | Show container logs (follow mode) |
| `npm run docker:ps` | `make docker-ps` | Show container status |
| `npm run docker:restart` | `make docker-restart` | Restart containers |
| `npm run docker:shell` | `make docker-shell` | Open shell in app container |
| `npm run docker:clean` | `make docker-clean` | Stop containers and remove volumes |
| `npm run docker:rebuild` | `make docker-rebuild` | Full rebuild (down + build + up) |
| `npm run docker:dev` | `make docker-dev` | Start dev environment (json + in-memory) |
| `npm run docker:staging` | `make docker-staging` | Start staging environment (sqlite + redis) |
| `npm run docker:prod` | `make docker-prod` | Start prod environment (postgres + redis) |

### Data Management

| npm Script | make Alias | Description |
|------------|------------|-------------|
| `npm run data:status` | `make data-status` | Show storage backend and data counts |
| `npm run data:export` | `make data-export` | Export database to JSON files |
| `npm run data:import` | `make data-import` | Import JSON files into database |
| `npm run data:backup` | `make data-backup` | Create timestamped backup |
| `npm run data:switch` | - | Switch storage backend (interactive) |

### Pipeline Artifacts (Hub Sync)

| npm Script | make Alias | Description |
|------------|------------|-------------|
| `npm run artifact:list` | `make artifact-list` | List all pipeline artifacts |
| `npm run artifact:push` | `make artifact-push` | Sync artifacts TO hub codespace |
| `npm run artifact:pull` | `make artifact-pull` | Sync artifacts FROM hub codespace |
| `npm run artifact:push-dry` | `make artifact-push-dry` | Preview push (dry run) |
| `npm run artifact:pull-dry` | `make artifact-pull-dry` | Preview pull (dry run) |

### Agent Testing

| npm Script | make Alias | Description |
|------------|------------|-------------|
| `npm run test-agents` | `make agent-test` | Run all agent tests |
| `npm run test-agents-dry` | `make agent-test-dry` | Dry-run agent tests (preview only) |
| `npm run test-agents-list` | `make agent-test-list` | List all agent test IDs |
| `npm run test-agents-validate` | `make agent-test-validate` | Validate agent test naming |

### Documentation & Maintenance

| npm Script | make Alias | Description |
|------------|------------|-------------|
| `npm run check-paired-docs` | `make docs-paired` | Check README/AGENTS.md pairs |
| `npm run check-paired-docs-staged` | `make docs-paired-staged` | Check staged files only |
| `npm run deps-check` | `make deps-check` | Check for unused dependencies |
| `npm run outdated` | `make outdated` | Check for outdated dependencies |

### Version Management

| npm Script | Description |
|------------|-------------|
| `npm run version-patch` | Bump patch version (x.x.X) |
| `npm run version-minor` | Bump minor version (x.X.0) |
| `npm run version-major` | Bump major version (X.0.0) |
| `npm run release` | CI + version patch + push tags |

---

## Core Conventions

### 1. Socket Writing (CRITICAL)

**ALWAYS** use helper functions in `src/utils/socketWriter.ts`:

```typescript
// ✅ Correct
import { writeMessageToClient } from '../utils/socketWriter';
writeMessageToClient(client, 'Hello!\r\n');

// ❌ NEVER do this - bypasses prompt management
client.connection.write('Hello!');
```

Functions:

- `writeToClient()` - Raw message, no prompt redraw
- `writeMessageToClient()` - Message with prompt redraw
- `writeFormattedMessageToClient()` - Formatted with color options

### 2. Line Endings (CRITICAL)

Always use `\r\n` for Telnet compatibility:

```typescript
// ✅ Correct
writeMessageToClient(client, 'Message\r\n');

// ❌ Incorrect - message will be OVERWRITTEN by prompt redraw
writeMessageToClient(client, 'Message\n');
writeMessageToClient(client, 'Message'); // WORST - completely invisible!
```

**⚠️ BUG WARNING**: Messages without `\r\n` at the end will be **overwritten** when the prompt redraws, making them invisible to the user. The command will execute successfully but the user sees nothing!

**Multi-line output**: Build all output as a single string with `\r\n` between lines, then call `writeMessageToClient` ONCE:

```typescript
// ✅ Correct - single call with all lines
const lines = ['Header:', '  Item 1', '  Item 2'];
writeMessageToClient(client, lines.join('\r\n') + '\r\n');

// ❌ Wrong - each call triggers prompt redraw, lines get clipped
writeMessageToClient(client, 'Header:');
writeMessageToClient(client, '  Item 1');
writeMessageToClient(client, '  Item 2');
```

### 3. Singleton Managers

Access managers via `getInstance()`:

```typescript
// ✅ Correct
const userManager = UserManager.getInstance();
const roomManager = RoomManager.getInstance(clients);

// ❌ Incorrect - constructors are private
const userManager = new UserManager();
```

### 4. Colors

Use `src/utils/colors.ts`. Always reset to prevent color bleeding:

```typescript
import { colorize } from '../utils/colors';
const msg = colorize('red', 'Error!') + ' Something went wrong\r\n';
```

### 5. State Data

Use state methods when available, avoid direct modification:

```typescript
// ✅ Use state methods
state.setPhase(client, 'password');

// ❌ Avoid direct modification
client.stateData.phase = 'password';
```

### 6. Async/Await

Use async/await for all I/O with try/catch:

```typescript
try {
  await userManager.saveUsers();
} catch (error) {
  systemLogger.error('Save failed', { error });
}
```

### 7. Logging

Use logger utilities, never `console.log`:

```typescript
import { systemLogger, getPlayerLogger } from '../utils/logger';
systemLogger.info('Server started');
getPlayerLogger(username).info('Player action');
```

### 8. TypeScript Types (CRITICAL)

**NEVER use `any` or `Function` types.** ESLint will block commits.

```typescript
// ❌ WRONG - will fail ESLint
function process(data: any) { ... }
function validate(req: Request, res: Response, next: Function) { ... }

// ✅ CORRECT - use specific types
function process(data: UserData) { ... }
function validate(req: Request, res: Response, next: () => void) { ... }

// ✅ If type is truly unknown, use `unknown` and narrow it
function handle(input: unknown) {
  if (typeof input === 'string') {
    // Now TypeScript knows it's a string
  }
}
```

**Rules enforced by ESLint:**

- `@typescript-eslint/no-explicit-any` - No `any` type
- `@typescript-eslint/ban-types` - No `Function`, `Object`, `{}` types
- `@typescript-eslint/no-unused-vars` - Prefix unused params with `_`

### 9. Unit Test ESLint Compliance (CRITICAL)

**Pre-commit hooks enforce `--max-warnings 0`.** Unit tests must also pass ESLint.

**Common test-specific violations to avoid:**

```typescript
// ❌ WRONG - unused variable from function call
it('should call function', () => {
  const result = myFunction();  // 'result' unused
  expect(myMock).toHaveBeenCalled();
});

// ✅ CORRECT - no assignment if checking side effects only
it('should call function', () => {
  myFunction();
  expect(myMock).toHaveBeenCalled();
});

// ❌ WRONG - regex with ANSI control characters
expect(output).toMatch(/^\r\x1B\[K/);  // no-control-regex error

// ✅ CORRECT - use string methods
expect(output.startsWith('\r\x1B[K')).toBe(true);

// ❌ WRONG - require() in TypeScript
const { func } = require('./module');

// ✅ CORRECT - ES module import at top of file
import { func } from './module';

// ❌ WRONG - partial mock object missing required fields
const user = { username: 'test' };  // Missing User properties

// ✅ CORRECT - use helper that provides all fields
const user = createMockUser({ username: 'test' });
```

**When `any` is unavoidable** (e.g., singleton reset), use explicit disable:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Manager as any)['instance'] = undefined;
```

---

## Documentation Requirements

**ALWAYS** update documentation when making changes:

| Change              | Update                                                |
| ------------------- | ----------------------------------------------------- |
| New command         | `docs/commands.md` + `src/command/commands/AGENTS.md` |
| New directory       | Create `README.md` + `AGENTS.md`                      |
| Architecture change | Relevant `AGENTS.md` files                            |
| API change          | `src/mcp/README.md`                                   |

### Documentation Standards

- `README.md`: Human-readable overview, no code blocks, clear and concise
- `AGENTS.md`: Comprehensive with code examples, for LLMs

See **"CRITICAL: Paired Documentation Rule"** at the top of this file.

---

## Debugging & Logging

### Log Files

- `logs/system/system-{date}.log` - Server events
- `logs/players/{username}-{date}.log` - Player actions
- `logs/raw-sessions/{sessionId}-{date}.log` - Exact I/O
- `logs/error/error-{date}.log` - Errors
- `logs/mcp/mcp-{date}.log` - MCP server logs

### Debug Workflow

1. Identify date/time of issue
2. Find session ID in system log
3. Analyze raw session log for exact sequence
4. Use `#terminal_last_command` to see what user sees

---

## Testing Checklist

Before committing:

- [ ] `npm run build` completes (ignore exit code if no errors shown)
- [ ] Server starts: `npm start`
- [ ] Basic commands work: look, move, stats
- [ ] No errors in error logs

### ⚠️ Jest Deprecated Flags

**`--testPathPattern` is DEPRECATED.** Use `--testPathPatterns` (plural) instead:

```bash
# ❌ WRONG - deprecated, will show warning and may not work
npm test -- --testPathPattern="myfile.test.ts"

# ✅ CORRECT - use plural form
npm test -- --testPathPatterns="myfile.test.ts"

# ✅ ALSO CORRECT - just pass filename directly
npm test -- myfile.test.ts
```

---

## Context Index

Find detailed information in these AGENTS.md files:

### Core Systems

| System                      | Location                                                         | What You'll Find                       |
| --------------------------- | ---------------------------------------------------------------- | -------------------------------------- |
| **Commands**                | [src/command/AGENTS.md](src/command/AGENTS.md)                   | Command parsing, registry, handler     |
| **Command Implementations** | [src/command/commands/AGENTS.md](src/command/commands/AGENTS.md) | All 40+ commands, how to add new ones  |
| **Combat**                  | [src/combat/AGENTS.md](src/combat/AGENTS.md)                     | Combat mechanics, damage, NPC AI       |
| **States**                  | [src/states/AGENTS.md](src/states/AGENTS.md)                     | Client states, login flow, game states |
| **Rooms**                   | [src/room/AGENTS.md](src/room/AGENTS.md)                         | Room navigation, exits, contents       |
| **Users**                   | [src/user/AGENTS.md](src/user/AGENTS.md)                         | Authentication, stats, inventory       |

### Frontend (Vite MPA)

| System          | Location                                                | What You'll Find                          |
| --------------- | ------------------------------------------------------- | ----------------------------------------- |
| **Frontend**    | [src/frontend/AGENTS.md](src/frontend/AGENTS.md)        | Unified frontend, Vite MPA config         |
| **Game Client** | [src/frontend/game/AGENTS.md](src/frontend/game/AGENTS.md) | xterm.js terminal, Socket.IO           |
| **Admin Panel** | [src/frontend/admin/AGENTS.md](src/frontend/admin/AGENTS.md) | React 18 SPA, dashboard components     |
| **Shared**      | [src/frontend/shared/AGENTS.md](src/frontend/shared/AGENTS.md) | Shared types and utilities            |

### Infrastructure

| System          | Location                                             | What You'll Find                            |
| --------------- | ---------------------------------------------------- | ------------------------------------------- |
| **Connections** | [src/connection/AGENTS.md](src/connection/AGENTS.md) | Telnet, WebSocket, Virtual connections      |
| **Servers**     | [src/server/AGENTS.md](src/server/AGENTS.md)         | Server components, shutdown                 |
| **Utilities**   | [src/utils/AGENTS.md](src/utils/AGENTS.md)           | **socketWriter (CRITICAL)**, colors, logger |
| **MCP Server**  | [src/mcp/AGENTS.md](src/mcp/AGENTS.md)               | AI integration API                          |

### Data & Config

| System            | Location                         | What You'll Find                      |
| ----------------- | -------------------------------- | ------------------------------------- |
| **Game Data**     | [data/AGENTS.md](data/AGENTS.md) | JSON files, persistence, data formats |
| **Documentation** | [docs/AGENTS.md](docs/AGENTS.md) | Human-readable docs index             |

### Supporting Systems

| System            | Location                                       |
| ----------------- | ---------------------------------------------- |
| Admin API         | [src/admin/AGENTS.md](src/admin/AGENTS.md)     |
| Client Manager    | [src/client/AGENTS.md](src/client/AGENTS.md)   |
| Console Interface | [src/console/AGENTS.md](src/console/AGENTS.md) |
| Effects System    | [src/effects/AGENTS.md](src/effects/AGENTS.md) |
| Game Timer        | [src/timer/AGENTS.md](src/timer/AGENTS.md)     |
| State Machine     | [src/state/AGENTS.md](src/state/AGENTS.md)     |

---

## Key Files Reference

| File                        | Purpose                     |
| --------------------------- | --------------------------- |
| `src/app.ts`                | Main GameServer class       |
| `src/types.ts`              | Core TypeScript types       |
| `src/config.ts`             | Server configuration        |
| `src/utils/socketWriter.ts` | **MUST use for all output** |
| `src/utils/colors.ts`       | ANSI color formatting       |
| `vite.config.ts`            | Frontend Vite MPA config    |

---

## MCP Server

AI integration server on port 3100:

- **Config**: `.vscode/mcp.json`
- **API Key**: `MCP_API_KEY` environment variable
- **Full docs**: `src/mcp/README.md`

---

## Common Tasks

| Task              | Start Here                                                       |
| ----------------- | ---------------------------------------------------------------- |
| Add a command     | [src/command/commands/AGENTS.md](src/command/commands/AGENTS.md) |
| Modify combat     | [src/combat/AGENTS.md](src/combat/AGENTS.md)                     |
| Change login flow | [src/states/AGENTS.md](src/states/AGENTS.md)                     |
| Add room features | [src/room/AGENTS.md](src/room/AGENTS.md)                         |
| Modify user stats | [src/user/AGENTS.md](src/user/AGENTS.md)                         |
| Add MCP endpoint  | [src/mcp/AGENTS.md](src/mcp/AGENTS.md)                           |
| Modify frontend   | [src/frontend/AGENTS.md](src/frontend/AGENTS.md)                 |
| Admin panel       | [src/frontend/admin/AGENTS.md](src/frontend/admin/AGENTS.md)     |
| Game client       | [src/frontend/game/AGENTS.md](src/frontend/game/AGENTS.md)       |
| **Frontend/UI styling** | [src/frontend/admin/STYLE_GUIDE.md](src/frontend/admin/STYLE_GUIDE.md) |

---

## Agent Ecosystem

Specialized agents are available in `.github/agents/`:

| Agent                   | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| **EllyMUD**             | Primary development assistant (recommended)  |
| Problem Solver          | Main orchestrator                            |
| Researcher              | Codebase investigation                       |
| Planner                 | Implementation planning                      |
| Implementer             | Execute plans                                |
| Validator               | Verify implementations                       |
| Output Reviewer         | Document quality assurance                   |
| Post-Mortem Analyst     | Pipeline analysis                            |
| Rollback Manager        | Safety checkpoints                           |
| Documentation Updater   | Maintain README/AGENTS files                 |
| Agent Updater           | Agent self-improvement                       |
| E2E Tester              | Game testing via MCP tools                   |
| Unit Test Orchestrator  | Test coverage orchestration                  |
| Unit Test Creator       | Individual test file creation                |
| Grounding Orchestrator  | Migrate agents to other projects             |
| Grounding Runner        | Rewrite individual agents                    |

**Recommended**: Use the **EllyMUD** agent for all development tasks. It has deep knowledge of the codebase and can delegate to specialists when needed.

See [.github/agents/AGENTS.md](.github/agents/AGENTS.md) for full agent documentation.

---

## License & Commercial Contact

- Open source: AGPL-3.0-or-later (see [LICENSE](LICENSE)).
- Commercial/proprietary licensing: available on request via GitHub at https://github.com/ellyseum.

