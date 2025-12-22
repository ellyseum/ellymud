# State Machine

The state machine controller that manages client state transitions.

## Contents

| File | Description |
|------|-------------|
| `stateMachine.ts` | State machine singleton and transition logic |

## Overview

The StateMachine class registers all available states and handles transitions between them. It ensures proper cleanup when exiting states and initialization when entering new states.

## Related

- [`../states/`](../states/) - Individual state implementations
- [`../types.ts`](../types.ts) - ClientStateType enum
