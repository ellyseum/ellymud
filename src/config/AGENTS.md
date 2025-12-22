# CLI Configuration - LLM Context

## Overview

Command-line argument parsing for server startup options.

## File Reference

### `cliConfig.ts`

**Purpose**: Parse and expose CLI arguments

```typescript
export interface CLIConfig {
  adminMode: boolean;          // -a flag
  forceSession?: string;       // --forceSession=username
  port?: number;               // --port=XXXX
  debug?: boolean;             // --debug
}

export function parseCLIArgs(): CLIConfig
export const cliConfig: CLIConfig
```

## CLI Flags

| Flag | Description |
|------|-------------|
| `-a` | Start with admin auto-login |
| `--forceSession=NAME` | Auto-login as specific user |
| `--port=XXXX` | Override telnet port |
| `--debug` | Enable debug logging |

## Usage

```bash
# Admin mode
npm start -- -a

# Specific user
npm start -- --forceSession=testuser

# Custom port
npm start -- --port=9023
```

```typescript
import { cliConfig } from './config/cliConfig';

if (cliConfig.adminMode) {
  // Create admin session
}

if (cliConfig.forceSession) {
  // Create session for specific user
}
```

## Related Context

- [`../console/autoSessionHandler.ts`](../console/autoSessionHandler.ts) - Handles auto-login
- [`../app.ts`](../app.ts) - Reads CLI config at startup
