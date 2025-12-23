# Client States

State machine implementations managing the client interaction flow. Each state handles a specific phase of the user experience.

## Contents

| File | State | Description |
|------|-------|-------------|
| `connecting.state.ts` | CONNECTING | Initial connection, displays MOTD |
| `login.state.ts` | LOGIN | Username/password authentication |
| `signup.state.ts` | SIGNUP | New account creation flow |
| `confirmation.state.ts` | CONFIRMATION | Password confirmation step |
| `authenticated.state.ts` | AUTHENTICATED | Main gameplay state |
| `transfer-request.state.ts` | TRANSFER_REQUEST | Session handoff between connections |
| `snake-game.state.ts` | SNAKE_GAME | Snake mini-game state |
| `waiting.state.ts` | WAITING | Temporary idle state |

## State Flow

```
CONNECTING (shows MOTD)
    ↓
LOGIN (existing user) ────┐
    ↓                        │
    ├── SIGNUP (new user) ──┤
    │       ↓              │
    │   CONFIRMATION ─────┤
    ↓                        │
AUTHENTICATED ←───────────┘
    │
    ├── SNAKE_GAME (mini-game)
    │       ↓
    └── (back to AUTHENTICATED)
```

## State Pattern

Each state:
- Handles its own input processing
- Knows valid transitions to other states
- Manages state-specific data in `client.stateData`
- Sends appropriate prompts and messages

## AuthenticatedState

The main gameplay state where most action happens:
- Processes all game commands through `CommandHandler`
- Manages the player prompt display
- Handles combat state transitions
- Tracks player location and activity

## Related

- [src/state/stateMachine.ts](../state/stateMachine.ts) - State machine controller
- [src/types.ts](../types.ts) - ClientStateType enum
- [src/command/](../command/) - Command processing in AUTHENTICATED state
