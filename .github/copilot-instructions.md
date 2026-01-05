# Copilot Instructions for EllyMUD

## ⚠️ CRITICAL: Context Discovery Strategy

**ALWAYS check AGENTS.md files first** before scanning source files directly. This is mandatory - do not skip this step.

### Priority Order

1. **Root AGENTS.md** (`/AGENTS.md`) - Core conventions, critical rules, navigation index
2. **Directory AGENTS.md** - Each directory has an AGENTS.md with detailed context for that module
3. **Source files** - Only scan when AGENTS.md doesn't provide sufficient detail

### Important Rule

**When working on files in a directory, always consult the AGENTS.md in that directory first.** However, if the AGENTS.md content is irrelevant to your current task (e.g., you're fixing a typo or making a trivial change unrelated to architecture), you may skip it and proceed directly.

### Why AGENTS.md First?

- Contains curated, up-to-date architectural decisions
- Documents patterns, anti-patterns, and gotchas specific to each module
- Prevents reinventing existing utilities or violating conventions
- Much faster than scanning entire codebases

### AGENTS.md Locations

The project uses a hierarchical documentation system:

```
/AGENTS.md                                    ← START HERE - critical conventions
│
├── .devcontainer/AGENTS.md                   ← Dev container setup
├── .github/AGENTS.md                         ← GitHub config
│   ├── ISSUE_TEMPLATE/AGENTS.md              ← Issue templates
│   ├── agents/AGENTS.md                      ← Agent ecosystem root
│   │   ├── agent-tests/AGENTS.md             ← Agent testing framework
│   │   │   └── test-cases/AGENTS.md          ← Test case definitions
│   │   ├── documentation/AGENTS.md           ← Doc generation
│   │   ├── grounding/AGENTS.md               ← Agent migration system
│   │   ├── implementation/AGENTS.md          ← Implementation outputs
│   │   ├── metrics/AGENTS.md                 ← Pipeline metrics
│   │   │   ├── executions/AGENTS.md          ← Execution logs
│   │   │   └── stats/AGENTS.md               ← Statistics
│   │   ├── planning/AGENTS.md                ← Planning outputs
│   │   ├── research/AGENTS.md                ← Research outputs
│   │   ├── suggestions/AGENTS.md             ← Improvement suggestions
│   │   ├── unit-test-generation/AGENTS.md    ← Unit test generation
│   │   ├── updates/AGENTS.md                 ← Agent updates
│   │   └── validation/AGENTS.md              ← Validation outputs
│   └── workflows/AGENTS.md                   ← GitHub Actions
├── .vscode/AGENTS.md                         ← VS Code settings
│
├── admin-ui/AGENTS.md                        ← Admin UI root
│   └── src/AGENTS.md                         ← Admin UI source
│       ├── hooks/AGENTS.md                   ← React hooks
│       ├── services/AGENTS.md                ← API services
│       ├── types/AGENTS.md                   ← TypeScript types
│       └── utils/AGENTS.md                   ← Utility functions
│
├── data/AGENTS.md                            ← JSON data files
│   └── test-snapshots/AGENTS.md              ← Test snapshots
│       └── fresh/AGENTS.md                   ← Fresh state snapshot
│
├── docs/AGENTS.md                            ← Documentation
├── make/AGENTS.md                            ← Makefile modules
│
├── public/AGENTS.md                          ← Public assets
│   └── admin/AGENTS.md                       ← Admin build output
│       └── assets/AGENTS.md                  ← Built assets
│
├── scripts/AGENTS.md                         ← Build/utility scripts
│
├── src/AGENTS.md                             ← Source root
│   ├── abilities/AGENTS.md                   ← Ability system
│   ├── admin/AGENTS.md                       ← Admin API
│   ├── client/AGENTS.md                      ← Client management
│   ├── combat/AGENTS.md                      ← Combat mechanics
│   │   └── components/AGENTS.md              ← Combat components
│   ├── command/AGENTS.md                     ← Command system
│   │   └── commands/AGENTS.md                ← Individual commands
│   ├── config/AGENTS.md                      ← Configuration
│   ├── connection/AGENTS.md                  ← Connection handling
│   │   └── interfaces/AGENTS.md              ← Connection interfaces
│   ├── console/AGENTS.md                     ← Server console
│   ├── data/AGENTS.md                        ← Data layer
│   │   └── __mocks__/AGENTS.md               ← Data mocks
│   ├── effects/AGENTS.md                     ← Effects system
│   ├── mcp/AGENTS.md                         ← MCP server API
│   ├── persistence/AGENTS.md                 ← Storage backends
│   │   └── mappers/AGENTS.md                 ← Data mappers
│   ├── room/AGENTS.md                        ← Room/navigation
│   │   └── services/AGENTS.md                ← Room services
│   ├── schemas/AGENTS.md                     ← Validation schemas
│   ├── server/AGENTS.md                      ← Server components
│   ├── session/AGENTS.md                     ← Session management
│   ├── setup/AGENTS.md                       ← Server setup
│   ├── state/AGENTS.md                       ← State machine
│   ├── states/AGENTS.md                      ← Client states
│   ├── test/helpers/AGENTS.md                ← Test helpers
│   ├── testing/AGENTS.md                     ← Testing utilities
│   ├── timer/AGENTS.md                       ← Game timer
│   ├── types/AGENTS.md                       ← TypeScript types
│   ├── user/AGENTS.md                        ← User/auth
│   └── utils/AGENTS.md                       ← Utilities (socketWriter CRITICAL)
│
├── test/AGENTS.md                            ← Test root
│   ├── e2e/AGENTS.md                         ← E2E tests
│   └── integration/AGENTS.md                 ← Integration tests
│
└── todos/AGENTS.md                           ← Planning notes (ignore unless asked)
```

> **⚠️ SYNC RULE**: When creating a new directory with an AGENTS.md file, you MUST add it to this list.
> Run `find . -name "AGENTS.md" -type f | grep -v node_modules | sort` to verify completeness.

## Critical Rules (from root AGENTS.md)

### Socket Writing
```typescript
// ✅ ALWAYS use helper functions
import { writeMessageToClient } from '../utils/socketWriter';
writeMessageToClient(client, 'Message\r\n');

// ❌ NEVER write directly
client.connection.write('Message');
```

### Line Endings
Always use `\r\n` for Telnet compatibility. Messages without `\r\n` will be overwritten by prompt redraw.

### TypeScript
- NEVER use `any` or `Function` types
- Prefix unused parameters with `_`
- ESLint enforces `--max-warnings 0`

### Paired Documentation
When editing any `README.md`, also update the paired `AGENTS.md` in the same directory, and vice versa.

### AGENTS.md Location Sync
When creating a new directory with an AGENTS.md file, you MUST add it to the "AGENTS.md Locations" list above.

### Logging
```typescript
// ✅ Use logger utilities
import { systemLogger } from '../utils/logger';
systemLogger.info('Message');

// ❌ Never use console.log
console.log('Message');
```

### Singleton Managers
```typescript
// ✅ Use getInstance()
const userManager = UserManager.getInstance();

// ❌ Don't instantiate directly
const userManager = new UserManager();
```

## What NOT to Do

- ❌ Do NOT read `todos/` folder unless explicitly asked
- ❌ Do NOT kill all node processes (will crash VS Code)
- ❌ Do NOT create `.github/README.md` (overrides repo README)
- ❌ Do NOT commit files in `.github/agents/research/`, `planning/`, etc. (ephemeral)
- ❌ Do NOT create AGENTS.md without adding it to the locations list in this file

## Common Tasks

| Task | Start Here |
|------|------------|
| Add a command | `src/command/commands/AGENTS.md` |
| Modify combat | `src/combat/AGENTS.md` |
| Change login flow | `src/states/AGENTS.md` |
| Add room features | `src/room/AGENTS.md` |
| Modify user stats | `src/user/AGENTS.md` |
| Add MCP endpoint | `src/mcp/AGENTS.md` |
| Add/modify items | `src/item/AGENTS.md` |
| Add/modify mobs | `src/mob/AGENTS.md` |
| Persistence/storage | `src/persistence/AGENTS.md` |
| Utility functions | `src/utils/AGENTS.md` |
| Add item data | `data/items/AGENTS.md` |
| Add mob data | `data/mobs/AGENTS.md` |
| Add room data | `data/rooms/AGENTS.md` |
| Write tests | `tests/AGENTS.md` |

## Testing

- Use `runTests` tool instead of `npm test` in terminal
- Use `--testPathPatterns` (plural), not deprecated `--testPathPattern`
- Pre-commit hooks enforce ESLint with zero warnings

### Test Types

| Type | Location | Command |
|------|----------|---------|
| Unit tests | `tests/unit/` | `npm test -- --testPathPatterns=unit` |
| Integration tests | `tests/integration/` | `npm test -- --testPathPatterns=integration` |
| E2E tests | `tests/e2e/` | `npm test -- --testPathPatterns=e2e` |

### Running Specific Tests

```bash
# Run all tests
npm test

# Run only integration tests
npm test -- --testPathPatterns=integration

# Run only e2e tests
npm test -- --testPathPatterns=e2e

# Run a specific test file
npm test -- --testPathPatterns="tests/e2e/login.test.ts"
```

