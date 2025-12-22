# Game Timer

Game tick system for periodic events.

## Contents

| File | Description |
|------|-------------|
| `gameTimerManager.ts` | Singleton managing game ticks |

## Overview

The `GameTimerManager` runs game ticks at regular intervals. Each tick processes combat, effects, NPC AI, and other periodic events.

## Related

- [`../combat/`](../combat/) - Combat processed on ticks
- [`../effects/`](../effects/) - Effects processed on ticks
