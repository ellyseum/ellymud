# Thornwood Vale Snapshot

This snapshot mirrors the actual production game data for Thornwood Vale. Use this for testing with realistic game conditions.

## Contents

- `rooms.json` - Full room layout from production data
- `npcs.json` - NPC templates with correct health/damage values
- `items.json` - Item definitions
- `users.json` - Empty (fresh start, no existing users)

## Usage

```typescript
import { StateLoader } from '../../src/testing/stateLoader';

// Load the thornwood-vale snapshot
await StateLoader.loadSnapshot('thornwood-vale');
```

## Differences from Other Snapshots

| Snapshot | Purpose |
|----------|---------|
| `fresh` | Minimal data for unit tests |
| `full-world` | Generated world data (may have stale NPC instances) |
| `thornwood-vale` | Production-accurate data for realistic E2E testing |

## When to Use

- E2E testing with realistic combat
- Class ability testing (NPCs have proper health for combo building)
- Progression testing through the real game world
