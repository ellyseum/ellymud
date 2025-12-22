# Room Services

Modular services for room operations. Each service handles one aspect of room functionality.

## Contents

| File | Purpose |
|------|-------------|
| `directionHelper.ts` | Normalize direction strings |
| `entityRegistryService.ts` | Track entities per room |
| `npcInteractionService.ts` | NPC targeting and interaction |
| `playerMovementService.ts` | Player navigation |
| `roomUINotificationService.ts` | Room-scoped messages |
| `teleportationService.ts` | Teleportation logic |

## Overview

Room functionality is decomposed into single-responsibility services. This makes the RoomManager easier to maintain and test.

## Related

- [`../roomManager.ts`](../roomManager.ts) - Orchestrates these services
