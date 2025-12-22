# Client Management

Active client connection tracking.

## Contents

| File | Description |
|------|-------------|
| `clientManager.ts` | Track and manage connected clients |

## Overview

The `ClientManager` maintains a map of all connected clients. Used for broadcasting, finding clients by username, and session management.

## Related

- [`../app.ts`](../app.ts) - Creates client map
- [`../server/`](../server/) - Servers add clients here
