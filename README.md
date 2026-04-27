# EllyMUD

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-green.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.19-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)

A modern Multi-User Dungeon written in Node.js and TypeScript. Connect over Telnet, WebSocket, or the bundled web client. Inspired by classic MUDs like MajorMUD, rebuilt on a contemporary stack.

## Quick start

```bash
git clone https://github.com/ellyseum/ellymud.git
cd ellymud
npm run bootstrap
npm start
```

Then connect:
- **Web**: <http://localhost:8080>
- **Telnet**: `telnet localhost 8023`

First boot prompts for an admin password.

## Game

- Real-time, turn-based combat with NPCs and PvP
- Abilities and spellcasting with mana, cooldowns, and resource management
- Room-based world with safe zones, shops, banks, and combat areas
- 12-slot equipment system, inventory, vendor economy, banking
- Character progression: levels, stat training, experience
- Status effects: poisons, stuns, roots, buffs, debuffs, heals
- Rest and meditate to recover
- Multi-user chat (`say`, `yell`, social emotes)
- Snake mini-game (type `snake` and you'll see)

See [`docs/commands.md`](docs/commands.md) for the full command reference.

## Stack

- **Connections**: Telnet (8023), WebSocket (8080), bundled xterm.js web client
- **Admin API**: REST + React dashboard with a drag-and-drop World Builder (port 3000)
- **MCP server**: Model Context Protocol on port 3100 for AI integration and headless testing
- **Storage**: pluggable JSON / SQLite / PostgreSQL via a repository factory — switch with one env var
- **Auth**: bcrypt password hashing, RBAC, JWT for the admin panel, API keys for MCP
- **Logging**: per-user, per-session, daily-rotated, with separate system/error/MCP streams
- **Tests**: Jest unit + integration + E2E (3,500+ tests)

## Storage backends

Set `STORAGE_BACKEND` to switch. Migrate data with `npm run data:export` / `data:import`.

| Backend | Use case | Setup |
|---|---|---|
| `json` | Dev, fast iteration | None — default |
| `sqlite` | Single-server prod | `STORAGE_BACKEND=sqlite` |
| `postgres` | Cluster / HA | `STORAGE_BACKEND=postgres` + `DATABASE_URL` |

Details in [`docs/storage-backends.md`](docs/storage-backends.md).

## MCP server

EllyMUD exposes a Model Context Protocol server on port 3100 with API-key auth, suitable for AI agents to connect, control test mode, drive virtual game sessions, or query game state. See [`docs/api-reference.md`](docs/api-reference.md).

## Documentation

| Topic | Path |
|---|---|
| Getting started | [`docs/getting-started.md`](docs/getting-started.md) |
| Configuration | [`docs/configuration.md`](docs/configuration.md) |
| Docker | [`docs/docker.md`](docs/docker.md) |
| Deployment | [`docs/deployment.md`](docs/deployment.md) |
| Commands | [`docs/commands.md`](docs/commands.md) |
| Admin guide | [`docs/admin-guide.md`](docs/admin-guide.md) |
| API reference | [`docs/api-reference.md`](docs/api-reference.md) |
| Architecture | [`docs/architecture.md`](docs/architecture.md) |
| Storage backends | [`docs/storage-backends.md`](docs/storage-backends.md) |
| Performance | [`docs/performance.md`](docs/performance.md) |
| Development | [`docs/development.md`](docs/development.md) |
| Troubleshooting | [`docs/troubleshooting.md`](docs/troubleshooting.md) |

For contributor conventions, build commands, and architecture in detail, read [`AGENTS.md`](AGENTS.md).

## Development

```bash
npm run dev      # hot-reload server
npm test         # full test suite
npm run build    # tsc + vite build
make help        # everything else
```

## License

AGPL-3.0-or-later — see [`LICENSE`](LICENSE).

Commercial licensing available on request via <https://github.com/ellyseum>.

## Issues & discussion

- [GitHub Issues](https://github.com/ellyseum/ellymud/issues)
- [GitHub Discussions](https://github.com/ellyseum/ellymud/discussions)
