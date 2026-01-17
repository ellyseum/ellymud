# User Management - LLM Context

## Overview

The `UserManager` singleton handles all user-related operations including authentication, data persistence, session management, and character stats. This is one of the core singletons alongside `RoomManager` and `CombatSystem`.

## File Reference

### `userManager.ts`

**Purpose**: Singleton managing all user data and operations

**Key Exports**:

```typescript
export class UserManager {
  static getInstance(): UserManager;

  // Authentication
  validateCredentials(username: string, password: string): User | null;
  createUser(username: string, password: string): User;

  // Session management
  getActiveSession(username: string): ConnectedClient | undefined;
  setActiveSession(username: string, client: ConnectedClient): void;
  removeActiveSession(username: string): void;

  // User data
  getUser(username: string): User | undefined;
  getAllUsers(): User[];
  saveUsers(): void;

  // Stats management
  updateUserStats(username: string, stats: Partial<UserStats>): void;
  getUserStats(username: string): UserStats | undefined;

  // Inventory
  addItemToInventory(username: string, item: Item): void;
  removeItemFromInventory(username: string, itemId: string): void;

  // Transfer handling
  initiateTranfer(username: string, newClient: ConnectedClient): void;
  completeTransfer(username: string): void;
  cancelTransfer(username: string): void;

  // Snake Scores (async - uses repository)
  async loadSnakeScores(): Promise<void>;
  async saveSnakeScore(entry: SnakeScoreEntry): Promise<void>;
  getSnakeScores(): SnakeScoreEntry[];
  getTopSnakeScores(limit: number): SnakeScoreEntry[];
}
```

**Singleton Pattern**:

```typescript
// ✅ Correct
const userManager = UserManager.getInstance();

// ❌ Incorrect
const userManager = new UserManager();
```

## User Data Structure

```typescript
interface User {
  username: string;
  passwordHash: string;
  salt: string;
  isAdmin: boolean;
  flags: string[];

  // Location
  currentRoomId: string;

  // Character stats
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  experience: number;
  level: number;

  // Attributes
  strength: number;
  dexterity: number;
  intelligence: number;
  constitution: number;
  wisdom: number;
  charisma: number;

  // Economy
  gold: number;
  silver: number;
  copper: number;
  bank: Currency; // Bank account balance

  // Items
  inventory: Item[];
  equipment: Equipment;

  // State
  inCombat: boolean;
  isUnconscious: boolean;

  // Tracking
  createdAt: Date;
  lastLogin: Date;
  playTime: number; // seconds
}
```

## Password Security

Passwords are hashed with salt using PBKDF2:

```typescript
// Creating a user
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');

// Verifying a password
const testHash = crypto.pbkdf2Sync(input, user.salt, 10000, 64, 'sha512').toString('hex');
return testHash === user.passwordHash;
```

## Session Management

```typescript
// Track active sessions
private activeUserSessions: Map<string, ConnectedClient> = new Map();

// One user = one session
// New login triggers transfer request to existing session
```

## Conventions

### Modifying User Stats

```typescript
// ✅ Use updateUserStats for changes
userManager.updateUserStats(username, { health: 50 });

// ✅ Use dedicated methods for common operations
userManager.addItemToInventory(username, item);

// ❌ Don't modify user object directly without saving
const user = userManager.getUser(username);
user.health = 50; // Changes lost without save!
```

### Saving Data

```typescript
// Manual save (usually automatic)
userManager.saveUsers();

// Auto-save happens:
// - On user logout
// - On stat changes via updateUserStats
// - Periodically via timer
```

### Session Lifecycle

```typescript
// 1. Login creates session
userManager.setActiveSession(username, client);

// 2. During play, session is tracked
const session = userManager.getActiveSession(username);

// 3. Logout removes session
userManager.removeActiveSession(username);
```

### Snake Score Management

Snake scores use the repository pattern with async methods:

```typescript
// Snake score repository (async)
private snakeScoreRepository = getSnakeScoreRepository();
private snakeScores: SnakeScoreEntry[] = [];

// Loading scores (called during init)
await userManager.loadSnakeScores();

// Saving a new score (async)
await userManager.saveSnakeScore({ username, score, date: new Date() });

// Getting scores (sync - uses cached data)
const topScores = userManager.getTopSnakeScores(10);
```

## Common Tasks

### Getting a User

```typescript
const user = userManager.getUser(username);
if (!user) {
  // Handle user not found
}
```

### Updating Stats

```typescript
// Update multiple stats
userManager.updateUserStats(username, {
  health: Math.max(0, user.health - damage),
  experience: user.experience + xpGained,
});
```

### Adding Items

```typescript
userManager.addItemToInventory(username, newItem);
```

## Gotchas & Warnings

- ⚠️ **Singleton**: Always use `getInstance()`
- ⚠️ **Save on Change**: Use `updateUserStats()` to auto-save
- ⚠️ **Session Conflicts**: Same user can't have two sessions
- ⚠️ **Case Sensitivity**: Usernames are normalized to lowercase
- ⚠️ **Password Migration**: Old plaintext passwords auto-migrate on first login
- ⚠️ **Snake Score Async**: `saveSnakeScore()` is async—must be awaited
- ⚠️ **Snake Score Init**: Call `loadSnakeScores()` before accessing scores

## Related Context

- [`../states/login.state.ts`](../states/login.state.ts) - Authentication
- [`../states/signup.state.ts`](../states/signup.state.ts) - Account creation
- [`../combat/combatSystem.ts`](../combat/combatSystem.ts) - Combat stat updates
- [`../../data/users.json`](../../data/users.json) - Persistence file
