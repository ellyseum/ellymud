# State Machine

The state machine controller that manages client state transitions and lifecycle.

## Contents

| File              | Description                                  |
| ----------------- | -------------------------------------------- |
| `stateMachine.ts` | State machine singleton and transition logic |

## Purpose

The `StateMachine` class provides centralized state management:

- **Registration**: All available states register on startup
- **Transitions**: Handles moving clients between states
- **Lifecycle**: Calls enter/exit hooks on state changes
- **Validation**: Ensures only valid transitions occur

## State Lifecycle

When transitioning between states:

1. Current state's `onExit(client)` is called
2. State reference is updated
3. New state's `onEnter(client)` is called
4. New state begins handling input

## Usage

```typescript
const stateMachine = StateMachine.getInstance();

// Transition a client to a new state
stateMachine.transitionTo(client, ClientStateType.AUTHENTICATED);

// Get current state handler
const currentState = stateMachine.getState(client.state);
```

## Available States

States are defined in `ClientStateType` enum:

- CONNECTING, LOGIN, SIGNUP, CONFIRMATION
- AUTHENTICATED, TRANSFER_REQUEST
- SNAKE_GAME, WAITING

## Related

- [src/states/](../states/) - Individual state implementations
- [src/types.ts](../types.ts) - ClientStateType enum
- [src/app.ts](../app.ts) - Initializes state machine
