# Client States - LLM Context

## Overview

The client state machine manages the lifecycle of a player's connection. Each state handles specific input patterns and knows how to transition to other states. This is central to how EllyMUD processes all player input.

## State Flow

```
Connection
    ↓
CONNECTING (show MOTD)
    ↓
LOGIN (username/password)
    ↓ (new user)          ↓ (existing user)
SIGNUP ──→ CONFIRMATION   │
    │                     │
    └─────────────────────↓
                   AUTHENTICATED (main game)
                          ↓
                   [Mini-states]
                   SNAKE_GAME
                   WAITING
                   TRANSFER_REQUEST
```

## File Reference

### `connecting.state.ts`

**Purpose**: Initial state when client connects

```typescript
export class ConnectingState implements ClientState {
  name = ClientStateType.CONNECTING;

  enter(client: ConnectedClient): void {
    // Display MOTD
    // Auto-transition to LOGIN
  }

  handleInput(client: ConnectedClient, input: string): void {
    // No input handling—immediately transitions
  }
}
```

### `login.state.ts`

**Purpose**: Handle username and password authentication

```typescript
export class LoginState implements ClientState {
  name = ClientStateType.LOGIN;

  enter(client: ConnectedClient): void {
    // Prompt for username
  }

  handleInput(client: ConnectedClient, input: string): void {
    // Phase 1: Receive username
    // Phase 2: Receive password
    // Validate credentials
    // Transition to AUTHENTICATED or back to prompt
  }
}
```

**State Data**:

```typescript
client.stateData = {
  loginPhase: 'username' | 'password',
  attemptedUsername?: string
}
```

### `signup.state.ts`

**Purpose**: Create new user account

```typescript
export class SignupState implements ClientState {
  name = ClientStateType.SIGNUP;

  enter(client: ConnectedClient): void {
    // Prompt for new username
  }

  handleInput(client: ConnectedClient, input: string): void {
    // Phase 1: Receive username (validate unique)
    // Phase 2: Receive password
    // Phase 3: Confirm password
    // Create account
    // Transition to LOGIN
  }
}
```

### `confirmation.state.ts`

**Purpose**: Confirm critical actions (like password confirmation)

```typescript
export class ConfirmationState implements ClientState {
  name = ClientStateType.CONFIRMATION;

  handleInput(client: ConnectedClient, input: string): void {
    // Validate confirmation input
    // Execute confirmed action
    // Transition to next state
  }
}
```

### `authenticated.state.ts`

**Purpose**: Main gameplay state—handles all game commands

```typescript
export class AuthenticatedState implements ClientState {
  name = ClientStateType.AUTHENTICATED;

  constructor(
    private clients: Map<string, ConnectedClient>,
    private stateMachine: StateMachine
  ) {}

  enter(client: ConnectedClient): void {
    // Show welcome message
    // Place player in starting room
    // Initialize CommandHandler
  }

  handleInput(client: ConnectedClient, input: string): void {
    // Route all input to CommandHandler
    this.commandHandler.handleCommand(client, input);
  }

  exit(client: ConnectedClient): void {
    // Save user data
    // Clean up resources
  }
}
```

### `transfer-request.state.ts`

**Purpose**: Handle session transfer when user logs in from another connection

```typescript
export class TransferRequestState implements ClientState {
  name = ClientStateType.TRANSFER_REQUEST;

  handleInput(client: ConnectedClient, input: string): void {
    // 'yes' - Transfer session to new connection
    // 'no' - Keep current session, reject new
  }
}
```

### `snake-game.state.ts`

**Purpose**: Mini-game state for Snake

```typescript
export class SnakeGameState implements ClientState {
  name = ClientStateType.SNAKE_GAME;

  handleInput(client: ConnectedClient, input: string): void {
    // WASD movement
    // 'q' to quit game
    // Return to AUTHENTICATED on game over
  }
}
```

### `waiting.state.ts`

**Purpose**: Temporary idle state

```typescript
export class WaitingState implements ClientState {
  name = ClientStateType.WAITING;

  handleInput(client: ConnectedClient, input: string): void {
    // Any input returns to AUTHENTICATED
  }
}
```

## State Interface

All states implement:

```typescript
interface ClientState {
  name: ClientStateType;
  enter(client: ConnectedClient): void;
  handleInput(client: ConnectedClient, input: string): void;
  exit?(client: ConnectedClient): void;
}
```

## Conventions

### Creating a New State

1. Create file: `src/states/{name}.state.ts`
2. Add to `ClientStateType` enum in `types.ts`
3. Register in `stateMachine.ts`

```typescript
// src/states/newstate.state.ts
import { ClientState, ClientStateType, ConnectedClient } from '../types';
import { writeToClient } from '../utils/socketWriter';

export class NewState implements ClientState {
  name = ClientStateType.NEW_STATE;

  enter(client: ConnectedClient): void {
    writeToClient(client, 'Entered new state\r\n');
  }

  handleInput(client: ConnectedClient, input: string): void {
    // Handle input
  }

  exit(client: ConnectedClient): void {
    // Cleanup
  }
}
```

### State Transitions

```typescript
// From within a state
this.stateMachine.transitionTo(client, ClientStateType.AUTHENTICATED);

// From anywhere with stateMachine reference
stateMachine.transitionTo(client, ClientStateType.LOGIN);
```

### Using State Data

```typescript
// Set state-specific data
client.stateData = { phase: 'username', attempts: 0 };

// Read state data
const { phase, attempts } = client.stateData;
```

## Gotchas & Warnings

- ⚠️ **State Data**: Clear `client.stateData` in `exit()` to prevent leaks
- ⚠️ **Input Sanitization**: Always trim input: `input.trim()`
- ⚠️ **Password Security**: Never log passwords—LOGIN state is special-cased
- ⚠️ **Auto-Transitions**: Some states auto-transition in `enter()`
- ⚠️ **Exit Cleanup**: Always implement `exit()` for states that allocate resources

## Related Context

- [`../state/stateMachine.ts`](../state/stateMachine.ts) - State machine controller
- [`../types.ts`](../types.ts) - ClientStateType enum, ClientState interface
- [`../command/commandHandler.ts`](../command/commandHandler.ts) - Used by AuthenticatedState
