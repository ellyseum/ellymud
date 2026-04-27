# EllyMUD — context for Claude Code

This is the canonical project context for Claude Code sessions. README is for humans browsing GitHub; this file is for you.

## What this is

Node.js / TypeScript Multi-User Dungeon. Players connect over Telnet (8023) or WebSocket (8080). React admin panel + REST API on 3000. MCP server on 3100 for AI integration and headless test mode.

Entry: `src/server.ts` → `src/app.ts` (`GameServer` class).

## Branch model

- `main` — production. Deploys directly.
- `dev` — working branch. Default for everyday changes.
- `archive/1.1-old` + tag `v1.1-old` — frozen pre-refactor snapshot.

## How a player request flows

1. Connection arrives (Telnet / WebSocket / Virtual)
2. `Client` is created and attached to `StateMachine`
3. State (Connecting → Login → Authenticated/Game) handles input
4. In Game, input parses to a Command via `CommandRegistry`
5. Command handler runs, mutates managers (`UserManager`, `RoomManager`, …)
6. Response goes back via `socketWriter` (CRITICAL — see below)
7. `CombatSystem`, `EffectsSystem`, `GameTimer` emit events that loop back through `socketWriter`

## Conventions

### Socket writing — CRITICAL

Always use `src/utils/socketWriter.ts`:

```typescript
import { writeMessageToClient } from '../utils/socketWriter';
writeMessageToClient(client, 'Hello!\r\n');
```

Direct `client.connection.write()` bypasses prompt management — the message becomes invisible to the user. Build multi-line output as one string with `\r\n` between lines and call `writeMessageToClient` **once**; each call triggers a prompt redraw.

### Line endings

Always `\r\n`. Without trailing `\r\n` the message gets overwritten by the prompt redraw and the user sees nothing.

### Singletons

```typescript
const userManager = UserManager.getInstance();   // ✅
const userManager = new UserManager();            // ❌ private constructor
```

### Logging

```typescript
import { systemLogger, getPlayerLogger } from '../utils/logger';
```

`console.log` is forbidden. Use `systemLogger.error('msg', { error })` for caught exceptions.

### TypeScript

- No `any`, no `Function` — use `unknown` and narrow
- Prefix unused params with `_`
- ESLint enforces `--max-warnings 0` (pre-commit hook)

### Storage / repository factory

All managers go through `RepositoryFactory`. **Never branch on `STORAGE_BACKEND` in manager code.**

```typescript
class UserManager {
  private repository: IAsyncUserRepository = getUserRepository();
  async loadUsers() { this.users = await this.repository.findAll(); }
}
```

Async init via `initPromise` + `ensureInitialized()`. Single source of truth for backend selection: `src/persistence/RepositoryFactory.ts`.

### Git

- Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, …)
- No AI-attribution trailers
- Pre-commit: lint-staged (ESLint + prettier)
- Pre-push: prettier + ESLint, plus the full test suite when pushing to `main`/`master`

## Critical safety

### Don't kill all node processes

VS Code runs on Node. `pkill -f node` / `killall node` will crash the editor. Identify the specific PID:

```bash
lsof -i :8023 -t | xargs kill   # Telnet
lsof -i :8080 -t | xargs kill   # WebSocket
lsof -i :3100 -t | xargs kill   # MCP
lsof -i :3000 -t | xargs kill   # Admin API
```

## Where things actually live

| Thing | Path |
|---|---|
| Server entry | `src/server.ts` → `src/app.ts` |
| State machine | `src/state/stateMachine.ts` |
| Client states | `src/states/` (login, signup, game, snake-game, …) |
| Commands | `src/command/commands/` (~40+ commands) |
| Combat | `src/combat/` (event-driven, `src/combat/components/` for parts) |
| Effects | `src/effects/` (poison, stuns, buffs) |
| Items (logic) | `src/utils/itemManager.ts` — there is **no** `src/item/` dir |
| NPCs | spread across `src/spawn/`, `src/mobility/`, `src/combat/` — **no** `src/mob/` dir |
| Rooms | `src/room/`, `src/room/services/` |
| Persistence | `src/persistence/` (interfaces + AsyncFile/Kysely impls + `RepositoryFactory.ts`) |
| Connection layer | `src/connection/` (Telnet, WebSocket, Virtual + `interfaces/`) |
| MCP server | `src/mcp/` |
| Admin API | `src/admin/` |
| Frontend | `src/frontend/{admin,game,shared}/` |
| Utils (CRITICAL: socketWriter) | `src/utils/` |
| Game data | `data/` — `quests/`, `test-snapshots/`, `admin/`, plus root JSONs (items, npcs, rooms, areas, races, classes, …) |
| Types | both `src/types.ts` (file) and `src/types/` (dir, e.g. `effects.ts`) |

## Storage backends

| `STORAGE_BACKEND` | Use | Setup |
|---|---|---|
| `json` (default) | Dev | None |
| `sqlite` | Single-server prod | `STORAGE_BACKEND=sqlite` |
| `postgres` | Cluster / HA | `STORAGE_BACKEND=postgres` + `DATABASE_URL` |

Migrate with `npm run data:export` / `data:import`. Switch interactively with `npm run data:switch`.

## Testing

| Type | Path | Command | Needs |
|---|---|---|---|
| Unit | `test/unit/` | `npm run test:unit` | nothing |
| E2E | `test/e2e/` | `npm run test:e2e` | nothing (uses virtual sessions) |
| E2E remote | — | `npm run test:e2e:remote` | running MCP at `localhost:3100` |
| Integration | `test/integration/` | `npm run test:integration` | Docker |

Test directory is `test/` (singular), **not** `tests/`. Use `--testPathPatterns` (plural); singular `--testPathPattern` is deprecated.

After major changes, `npm test` runs typecheck + validate + jest. `npm run test:full` adds E2E + integration.

Current baseline: 151 suites, 3,502 tests, ~35s.

## MCP server / test mode

Port 3100, API key from `ELLYMUD_MCP_API_KEY` env var. The committed `.claude/mcp.json` uses `${ELLYMUD_MCP_API_KEY}` substitution — never hard-code the key. The actual value lives in `.env` (gitignored).

To rotate the key:

```bash
npm run mcp:regen-key       # writes new key to .env, prints it
set -a; source .env; set +a # reload env in current shell
# restart MCP server + Claude Code so both pick up the new value
```

Used by:

- AI agents to query game state and drive virtual sessions
- E2E tests via virtual sessions
- **Test mode**: deterministic ticks instead of real-time. With test mode set, the `GameTimer` pauses and ticks advance explicitly via MCP — useful for reproducible E2E.

Code: `src/mcp/`, virtual sessions in `src/connection/` + `src/testing/`.

## Build & run

```bash
npm run dev      # hot-reload via ts-node-dev
npm start        # production: builds (via prestart hook) then runs
npm run build    # tsc + vite (admin frontend)
npm test         # full local test suite
```

`npm start` builds everything (TS + admin frontend) automatically. Don't manually run `build:frontend` — it's part of `build`. Don't `rm -rf public/admin/assets/*` — vite handles cleanup.

## Logs

- `logs/system/system-{date}.log` — server events
- `logs/players/{username}-{date}.log` — per-player actions
- `logs/raw-sessions/{sessionId}-{date}.log` — exact telnet/WS I/O
- `logs/error/error-{date}.log`
- `logs/mcp/mcp-{date}.log`

Debug workflow: identify time → find session ID in system log → analyze raw session log for exact I/O sequence.

## Scripts

`npm run` (no args) lists all scripts. Common ones:

- `dev`, `dev-admin`, `dev-user` — hot-reload server (variants for auto-login)
- `start`, `prod`, `start-admin`, `start-user` — production runs
- `test`, `test:unit`, `test:e2e`, `test:integration`, `test:full`
- `lint`, `lint-fix`, `format`, `typecheck`, `validate`, `ci`
- `docker:dev` / `docker:staging` / `docker:prod` (each with `:down`, `:rebuild`, `:clean`)
- `data:status`, `data:export`, `data:import`, `data:backup`, `data:switch`
- `version-patch` / `version-minor` / `version-major`, `release`

## License

AGPL-3.0-or-later. Commercial licensing via <https://github.com/ellyseum>.
