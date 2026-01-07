# Frontend - LLM Context

## Overview

Unified frontend directory containing both the game client (terminal emulator) and admin panel (React SPA), built as a Vite Multi-Page Application.

## Directory Structure

```
src/frontend/
├── game/           # Game terminal client
│   ├── index.html  # Entry point for /
│   ├── main.ts     # Terminal logic (xterm.js + Socket.IO)
│   └── style.css   # Terminal styles
├── admin/          # Admin React SPA
│   ├── index.html  # Entry point for /admin/
│   └── src/        # React components
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       ├── context/
│       ├── hooks/
│       ├── services/
│       ├── types/
│       └── utils/
├── shared/         # Shared utilities
│   └── types.ts    # Common type definitions
└── tsconfig.json   # Frontend TypeScript config
```

## Build System

- **Config**: `vite.config.ts` (root)
- **Build Command**: `npm run build:frontend`
- **Dev Command**: `npm run dev:frontend`
- **Output**: `dist/public/` (game at root, admin at `/admin/`)

## Key Files

| File | Purpose |
|------|---------|
| `game/main.ts` | Terminal emulator using @xterm/xterm |
| `admin/src/App.tsx` | Main React component with routing |
| `admin/src/services/api.ts` | API client for admin endpoints |

## Conventions

- Game client: Vanilla TypeScript (no React)
- Admin panel: React 18 with TypeScript
- Imports: Use `@/` alias for admin src, `@shared/` for shared
- Socket.IO: Loaded via script tag (auto-served by server)

## Related

- [src/server/apiServer.ts](../server/apiServer.ts) - Static file serving
- [src/admin/](../admin/) - Admin API endpoints
- [vite.config.ts](../../vite.config.ts) - Vite MPA configuration
