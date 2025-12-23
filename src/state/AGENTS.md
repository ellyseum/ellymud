# State Machine - LLM Context

## Overview

The `StateMachine` class is the central controller for client state management. It holds references to all state implementations and handles transitions, ensuring proper lifecycle methods are called.

## File Reference

### `stateMachine.ts`

**Purpose**: Register states and manage transitions

**Key Exports**:

```typescript
export class StateMachine {
  constructor(userManager: UserManager, clients: Map<string, ConnectedClient>);

  // Register a new state type
  registerState(state: ClientState): void;

  // Transition client to new state
  transitionTo(client: ConnectedClient, stateName: ClientStateType): void;

  // Process input for client's current state
  handleInput(client: ConnectedClient, input: string): void;
}
```

**State Registration**:

```typescript
// In constructor
this.connectingState = new ConnectingState();
this.loginState = new LoginState(userManager);
this.signupState = new SignupState(userManager);
this.confirmationState = new ConfirmationState(userManager);
this.authenticatedState = new AuthenticatedState(clients, this);
this.transferRequestState = new TransferRequestState(userManager);
this.snakeGameState = new SnakeGameState();
this.waitingState = new WaitingState();

// Register all
this.registerState(this.connectingState);
this.registerState(this.loginState);
// ...etc
```

**Transition Flow**:

```typescript
transitionTo(client: ConnectedClient, stateName: ClientStateType): void {
  // 1. Call exit() on old state if implemented
  const oldState = this.states.get(client.state);
  if (oldState?.exit) {
    oldState.exit(client);
  }

  // 2. Update client state
  client.state = stateName;

  // 3. Call enter() on new state
  const newState = this.states.get(stateName);
  if (newState) {
    newState.enter(client);
  }

  // 4. Special case: CONNECTING auto-transitions to LOGIN
  if (stateName === ClientStateType.CONNECTING) {
    this.transitionTo(client, ClientStateType.LOGIN);
  }
}
```

## State Lifecycle

```
┌─────────────────────────────────────────────┐
│              State Transition               │
├─────────────────────────────────────────────┤
│                                             │
│  Old State                 New State        │
│  ┌─────────┐              ┌─────────┐       │
│  │ exit()  │ ──────────→  │ enter() │       │
│  └─────────┘              └─────────┘       │
│                                             │
│  client.state = NEW_STATE                   │
│                                             │
└─────────────────────────────────────────────┘
```

## Input Handling

```typescript
handleInput(client: ConnectedClient, input: string): void {
  const trimmedInput = input.trim();

  // Security: Don't log LOGIN state input (passwords)
  if (client.state !== ClientStateType.LOGIN) {
    stateLogger.debug(`Handling input in state ${client.state}: "${trimmedInput}"`);
  }

  // Delegate to current state
  const state = this.states.get(client.state);
  if (state) {
    state.handleInput(client, trimmedInput);
  }
}
```

## Conventions

### Adding a New State

1. Create state class in `src/states/`
2. Add to `ClientStateType` enum in `types.ts`
3. Register in `StateMachine` constructor

```typescript
// In stateMachine.ts constructor
this.myNewState = new MyNewState();
this.registerState(this.myNewState);
```

### Triggering Transitions

```typescript
// From within a state (has stateMachine reference)
this.stateMachine.transitionTo(client, ClientStateType.AUTHENTICATED);

// From command (via services)
services.stateMachine?.transitionTo(client, ClientStateType.WAITING);
```

## Gotchas & Warnings

- ⚠️ **Password Logging**: LOGIN state input is NEVER logged
- ⚠️ **Auto-Transition**: CONNECTING immediately transitions to LOGIN
- ⚠️ **State Data**: Not automatically cleared—states must clean up in `exit()`
- ⚠️ **Circular Transitions**: Be careful not to create transition loops

## Related Context

- [`../states/`](../states/) - All state implementations
- [`../types.ts`](../types.ts) - ClientStateType enum, ClientState interface
- [`../app.ts`](../app.ts) - StateMachine instantiation
