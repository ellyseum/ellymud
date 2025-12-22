# Client States

State machine implementations for client interaction flow. Each state handles specific phases of the user experience.

## Contents

| File | State | Description |
|------|-------|-------------|
| `connecting.state.ts` | CONNECTING | Initial connection, shows MOTD |
| `login.state.ts` | LOGIN | Username/password authentication |
| `signup.state.ts` | SIGNUP | New account creation |
| `confirmation.state.ts` | CONFIRMATION | Password confirmation |
| `authenticated.state.ts` | AUTHENTICATED | Main gameplay state |
| `transfer-request.state.ts` | TRANSFER_REQUEST | Session handoff between connections |
| `snake-game.state.ts` | SNAKE_GAME | Mini-game state |
| `waiting.state.ts` | WAITING | Temporary idle state |

## Overview

The state machine pattern manages client interaction flow. Each state handles its own input processing and knows how to transition to other states. The `AuthenticatedState` is where most gameplay happens.

## Related

- [`../state/stateMachine.ts`](../state/stateMachine.ts) - State machine controller
- [`../types.ts`](../types.ts) - ClientStateType enum
