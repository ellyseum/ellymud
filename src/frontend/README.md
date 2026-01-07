# Frontend

Unified frontend for EllyMUD containing the game client and admin panel, built as a Vite Multi-Page Application.

## Contents

| Path           | Description                                |
| -------------- | ------------------------------------------ |
| `game/`        | Browser-based terminal emulator (xterm.js) |
| `admin/`       | React admin dashboard                      |
| `shared/`      | Shared TypeScript types and utilities      |
| `tsconfig.json`| Frontend-specific TypeScript configuration |

## Overview

This directory contains both frontend applications served by the EllyMUD server:

- **Game Client** (`/`) - A lightweight terminal emulator using xterm.js and Socket.IO for real-time MUD gameplay in the browser
- **Admin Panel** (`/admin/`) - A React SPA for server administration, player management, and configuration

Both applications are built together using Vite's Multi-Page Application mode, outputting to `dist/public/`.

## Development

Start the frontend dev server with `npm run dev:frontend` from the project root. This provides hot module replacement for both applications.

Build for production with `npm run build:frontend`. The output goes to `dist/public/` with the game client at root and admin panel under `/admin/`.

## Related

- [`../server/`](../server/) - Backend server serving static files
- [`../admin/`](../admin/) - Admin API endpoints (backend)
- [`../../vite.config.ts`](../../vite.config.ts) - Vite build configuration

