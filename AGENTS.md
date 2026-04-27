# EllyMUD

Node.js/TypeScript Multi-User Dungeon. Telnet (8023), WebSocket (8080), MCP (3100), Admin API (3000).

- **Entry**: `src/server.ts` → `src/app.ts` (`GameServer` class)
- **State machine**: `src/state/stateMachine.ts` (Connecting → Login → Authenticated)
- **Storage**: configurable JSON / SQLite / PostgreSQL via `STORAGE_BACKEND` env

## Architecture

```
GameServer (src/app.ts)
├── Servers: Telnet, WebSocket, API, MCP
├── Managers: Client, User, Room, GameTimer (singletons)
├── StateMachine: Connecting → Login → Authenticated
├── CommandHandler → CommandRegistry
└── CombatSystem (event-driven)
```

## Storage

| Backend | Use | Config |
|---|---|---|
| `json` | Dev (default) | none |
| `sqlite` | Single-server prod | `STORAGE_BACKEND=sqlite` |
| `postgres` | Cluster/HA | `STORAGE_BACKEND=postgres` + `DATABASE_URL` |

All managers go through the **Repository Factory** — never branch on `STORAGE_BACKEND` in manager code.

```typescript
class UserManager {
  private repository: IAsyncUserRepository = getUserRepository();
  async loadUsers() { this.users = await this.repository.findAll(); }
}
```

Async init via `initPromise` + `ensureInitialized()`. Key files:
- `src/persistence/interfaces.ts` — `IAsync*Repository` contracts
- `src/persistence/RepositoryFactory.ts` — backend selection
- `src/persistence/AsyncFile*Repository.ts` — JSON impls
- `src/persistence/Kysely*Repository.ts` — DB impls
- `src/data/db.ts` — Kysely connection

## Quick start

```bash
./scripts/bootstrap.sh    # full setup
make help                 # all commands
make dev                  # dev server with hot reload
make build                # tsc + vite build
make test                 # full test suite
```

`npm start` builds everything (TS + admin frontend). Don't manually run `npm run build:frontend` — it's part of `npm start`.

## Command delegation

`make → npm scripts → actual commands`. Single source of truth is `package.json`. Use `make <target>` interactively, `npm run <script>` in CI/Docker.

## Conventions

### Socket writing — CRITICAL

Always use `src/utils/socketWriter.ts` helpers. Direct `client.connection.write()` bypasses prompt management and the message becomes invisible.

```typescript
import { writeMessageToClient } from '../utils/socketWriter';
writeMessageToClient(client, 'Hello!\r\n');
```

Build multi-line output as one string with `\r\n` between lines, then call `writeMessageToClient` **once** — each call triggers a prompt redraw.

### Line endings

Always `\r\n` for Telnet compat. A message without trailing `\r\n` gets overwritten by the prompt redraw and the user sees nothing.

### Singletons

```typescript
const userManager = UserManager.getInstance();   // ✅
const userManager = new UserManager();            // ❌ private constructor
```

### Logging

```typescript
import { systemLogger, getPlayerLogger } from '../utils/logger';
systemLogger.info('...');
// console.log is forbidden
```

### TypeScript

- No `any`, no `Function` — use `unknown` and narrow
- Prefix unused params with `_`
- ESLint enforces `--max-warnings 0` (pre-commit hook)
- For unavoidable `any` (e.g. singleton reset), explicit `// eslint-disable-next-line`

### Colors

`src/utils/colors.ts`. Always reset to prevent bleed.

### State data

Prefer state methods (`state.setPhase(client, ...)`) over direct `client.stateData.x = ...`.

### Async / errors

`async/await` everywhere with `try/catch` for I/O. Log via `systemLogger.error('msg', { error })`.

### Git

- Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, ...)
- No AI-attribution trailers

## Critical safety rules

### Never kill all node processes

VS Code runs on Node. `pkill -f node` / `killall node` will crash the editor. Always identify the specific PID:

```bash
lsof -i :8023 -t | xargs kill   # Telnet
lsof -i :8080 -t | xargs kill   # WebSocket
lsof -i :3100 -t | xargs kill   # MCP
lsof -i :3000 -t | xargs kill   # Admin API
```

## Testing

| Type | Path | Command |
|---|---|---|
| Unit | `tests/unit/` | `npm test -- --testPathPatterns=unit` |
| Integration | `tests/integration/` | `npm test -- --testPathPatterns=integration` (requires Docker) |
| E2E | `tests/e2e/` | `npm test -- --testPathPatterns=e2e` |

`--testPathPattern` (singular) is deprecated — use plural.

## Logs

- `logs/system/system-{date}.log` — server events
- `logs/players/{username}-{date}.log` — player actions
- `logs/raw-sessions/{sessionId}-{date}.log` — exact I/O
- `logs/error/error-{date}.log`
- `logs/mcp/mcp-{date}.log`

## NPM script reference

### Build / dev
| Script | Purpose |
|---|---|
| `build` | tsc + vite build |
| `build:server` / `build:frontend` | Individual builds |
| `build-watch` | tsc watch |
| `dev` / `dev-admin` / `dev-user` | Dev with hot reload (variants for auto-login) |
| `dev:frontend` | Vite dev server only |
| `clean` / `clean-all` | rm dist (and node_modules) |

### Server
| Script | Purpose |
|---|---|
| `start` | Production (auto-builds) |
| `prod` | Build + start |
| `start-admin` / `start-user` | Variants |

### Test
| Script | Purpose |
|---|---|
| `test` | Full (typecheck + validate + jest) |
| `test:unit` / `test:e2e` / `test:integration` | Subsets |
| `test:e2e:remote` | Against remote MCP |
| `test:coverage` / `test:watch` | |
| `test:all` / `test:full` | Combined runs |

### Code quality
| Script | Purpose |
|---|---|
| `lint` / `lint-fix` | ESLint (max-warnings 0) |
| `typecheck` | tsc no-emit |
| `format` / `format-check` | Prettier |
| `validate` | JSON data file schemas |
| `ci` | lint + typecheck + validate + build |

### Docker
| Script | Purpose |
|---|---|
| `docker:up` / `docker:down` | Dev containers |
| `docker:logs` / `docker:ps` / `docker:restart` / `docker:shell` | Manage |
| `docker:clean` / `docker:rebuild` | Reset |
| `docker:dev` / `docker:staging` / `docker:prod` | Environments |

### Data
| Script | Purpose |
|---|---|
| `data:status` | Backend + counts |
| `data:export` / `data:import` | DB ↔ JSON |
| `data:backup` | Timestamped snapshot |
| `data:switch` | Interactive backend switch |

### Versioning
`version-patch` / `version-minor` / `version-major` / `release`.

## Common tasks

| Task | Where |
|---|---|
| Add a command | `src/command/commands/` |
| Combat tweak | `src/combat/` |
| Login flow | `src/states/` |
| Room/exits | `src/room/` |
| User stats | `src/user/` |
| MCP endpoint | `src/mcp/` |
| Items / mobs | `src/item/`, `src/mob/`, `data/items/`, `data/mobs/` |
| Persistence | `src/persistence/` |
| Utilities | `src/utils/` (socketWriter is critical) |
| Frontend | `src/frontend/{admin,game,shared}/` |

## Key files

| File | Purpose |
|---|---|
| `src/app.ts` | Main `GameServer` |
| `src/types.ts` | Core types |
| `src/config.ts` | Server config |
| `src/utils/socketWriter.ts` | Mandatory output helpers |
| `src/utils/colors.ts` | ANSI |
| `vite.config.ts` | Frontend MPA build |

## MCP server

Port 3100. API key via `MCP_API_KEY`. See `src/mcp/`.

## License

AGPL-3.0-or-later. Commercial licensing via https://github.com/ellyseum.
