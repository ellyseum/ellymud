# EllyMUD Copilot Instructions

## Architecture & Core Concepts

EllyMUD is a Node.js-based Multi-User Dungeon (MUD) supporting both Telnet and WebSocket connections. The server is structured around a state machine pattern, with core game logic encapsulated in singleton manager classes.
User, Room, and Item data are persisted in JSON files located in the `data/` directory.
Connections are handled via Telnet (port 8023) and WebSocket (port 8080) protocols.
Interactions are command-driven, with commands parsed and executed based on the client's current state.
Game events (e.g., combat, timers) are managed through an event-driven architecture.
Combat mechanics include player vs. NPC interactions, damage calculations, and status effects.
Players can navigate rooms, interact with objects, and engage in combat using text-based commands.
Player stats (health, mana, experience, etc.) are tracked and updated based on in-game actions.

### Game purpose

EllyMUD is designed to provide a classic text-based MUD experience, allowing players to explore a fantasy world, interact with other players and NPCs, complete quests, and engage in combat. The game emphasizes role-playing elements, character progression, and community interaction.
Players can connect via Telnet or a web-based client, making it accessible across different platforms. The game world is persistent, with player actions having lasting effects on their characters and the environment.
Administrators have access to a web-based admin interface for managing users, rooms, and game settings.
Running the server produces an interactive CLI console for monitoring and managing the game in real-time.

### Core Components
- **Entry Point**: `src/server.ts` initializes the `GameServer` class in `src/app.ts`.
- **State Machine**: Client interactions are driven by a state machine pattern.
  - **States**: Located in `src/states/` (e.g., `LoginState`, `AuthenticatedState`, `CombatState`).
  - **Manager**: `src/state/stateMachine.ts` handles transitions between states.
  - **Flow**: Clients start in `ConnectingState` -> `LoginState` -> `AuthenticatedState`.
- **Managers (Singletons)**: Core logic is encapsulated in singleton managers.
  - `UserManager` (`src/user/userManager.ts`): Handles user persistence and stats.
  - `RoomManager` (`src/room/roomManager.ts`): Manages room data and movement.
  - `ClientManager` (`src/client/clientManager.ts`): Manages active connections.
  - `GameTimerManager` (`src/timer/gameTimerManager.ts`): Handles game ticks and periodic events.
- **Combat System**: Located in `src/combat/`. Event-driven system handling attacks, damage, and NPC AI.
- **Command System**: Located in `src/command/`.
  - Commands implement the `Command` interface.
  - Registered in `CommandRegistry`.
  - Parsed and executed by `CommandHandler`.

## Developer Workflows

### Running the Server
- **Standard Start**: `npm start` (Starts Telnet on 8023, HTTP/WS on 8080).
- **Admin Auto-Login**: `npm start -- -a` (Bypasses login, starts as admin).
- **Specific User Login**: `npm start -- --forceSession={username}` (Logs in as specific user).
- **Development Mode**: `npm run dev` (Uses `ts-node-dev` for hot reloading).

### Debugging & Logging
**Last session info**: 
A helpful file to analyze user sessions which has the following format
  """
  User Name: {username}
  Date Time: {ISO 8601 date time}
  Raw Log: /logs/raw-sessions/{sessionId}-{date}.log
  User Log: /logs/players/{username}-{date}.log
  """
- Use the provided session info to locate relevant logs for debugging.
- Raw logs capture exact input/output sequences.
- User logs provide a higher-level view of player actions and events.
- When in doubt, fallback to #terminal_last_command to see exactly what the user is seeing.
- Prompt the user for additional context if logs are insufficient.

**Log Structure**:
Logs are stored in `/logs` with the following structure:
- `/logs/players/{username}-{date}.log`: Player-specific logs.
- `/logs/raw-sessions/{sessionId}-{date}.log`: Raw input/output for a session.
- `/logs/error/error-{date}.log`: General server errors.
- `/logs/exceptions/exceptions-{date}.log`: Server runtime exceptions.
- `/logs/rejections/rejections-{date}.log`: Server unhandled promise rejections.
- `/logs/system/system-{date}.log`: General server events.
- `/logs/mcp/mcp-{date}.log`: MCP server logs.
- `/logs/audit/*.json`: Winston log rotation audit files.

**Log Analysis Protocol**:
1.  **Identify Date/Time**: Use the current date/time to locate the relevant log file.
2.  **Find Session ID**: Check `system/system-{date}.log` or `players/` logs to find the `sessionId` (e.g., `telnet-1763705616258-809`).
3.  **Analyze Raw Session**: Open the corresponding `raw-sessions` log to see the exact input/output sequence.
4.  **Terminal Output**: Use `#terminal_last_command` to view the exact game output the user is seeing.

## Coding Conventions

- **Output**: ALWAYS use helper functions in `src/utils/socketWriter.ts` (e.g., `writeToClient`, `writeMessageToClient`) instead of raw socket writes.
- **State Management**: Do not modify `client.stateData` directly if a method exists in the current State class.
- **Singletons**: Access managers via `ClassName.getInstance()`.
- **Validation**: Data structures (Users, Rooms, Items) are validated using JSON schemas in `src/schemas/`. Ensure new data types have corresponding schemas.
- **Async/Await**: Use async/await for all I/O operations (file access, database).
- **Error Handling**: Use try/catch blocks around async operations and log errors using the logging utilities in `src/utils/logger.ts`.
- **TypeScript**: Follow TypeScript best practices. Use interfaces and types defined in `src/types/`.
- **Code Style**: Follow existing code style (indentation, naming conventions). Use ESLint and Prettier configurations provided.
- **Testing**: Write unit tests for new features in `tests/` using Jest. Run tests with `npm test`.
- **Documentation**: Document new classes and methods using JSDoc comments. Update this instruction file as needed.
- **Performance**: Optimize code for performance, especially in frequently executed paths (e.g., command handling, state transitions).
- **Security**: Follow best security practices. Sanitize user inputs and handle sensitive data carefully.
- **Learning Resources**: Refer to official documentation for Node.js, TypeScript, and any libraries used in the project.
- **Game Design**: Understand the game mechanics and design principles. Ensure new features align with the overall game experience.
- **RPG Conventions**: Follow traditional MUD/RPG conventions for commands, combat, and user interactions.
- **Telnet/WS Protocols**: Understand the differences between Telnet and WebSocket protocols. Ensure compatibility across both connection types.
- **Timers & Events**: Use `GameTimerManager` for periodic events. Avoid blocking operations in timer callbacks.
- **Admin Interface**: Familiarize yourself with the admin interface in `src/admin/`. Use it for managing users, rooms, and game settings.
- **Public Client**: Understand the web client in `public/`. Ensure compatibility with server-side changes.

## Documentation Maintenance

**CRITICAL**: EllyMUD is now public and documentation must be kept up to date with all changes.

### When to Update Documentation

- **ALWAYS** update relevant documentation when making code changes
- Documentation is not optional - it's part of the development process
- Outdated documentation is worse than no documentation

### Documentation Files to Maintain

1. **README.md** (Project root)
   - Update if: Installation steps change, new major features added, dependencies change
   - Keep: Getting started instructions, feature list, basic usage accurate

2. **CONTRIBUTING.md** (Project root)
   - Update if: Contribution workflow changes, new style guidelines, commit conventions change
   - Keep: Development setup, PR process, coding standards current

3. **docs/getting-started.md**
   - Update if: Setup process changes, new commands for starting server, port numbers change
   - Keep: Installation steps, first-time user experience accurate

4. **docs/architecture.md**
   - Update if: New major components added, architectural patterns change, data flow changes
   - Keep: Component diagrams, design patterns, system overview current
   - Add: New managers, new states, new subsystems

5. **docs/development.md**
   - Update if: Development workflow changes, new tools required, testing approach changes
   - Keep: Developer setup, debugging tips, common tasks up to date

6. **docs/commands.md**
   - Update if: New commands added, command behavior changes, aliases added/removed
   - Keep: Complete and accurate list of all commands with examples

7. **This file** (.github/copilot-instructions.md)
   - Update if: New folders added (see "Key Directories" section), workflows change, conventions change
   - Keep: Accurate reflection of current codebase structure and practices

### Documentation Update Checklist

When making changes, ask yourself:

- [ ] Does this change affect user-facing behavior? → Update getting-started.md or commands.md
- [ ] Does this add/modify/remove a command? → Update docs/commands.md
- [ ] Does this change the architecture? → Update docs/architecture.md
- [ ] Does this add a new directory? → Update "Key Directories" section in this file
- [ ] Does this change how developers set up or work? → Update CONTRIBUTING.md or docs/development.md
- [ ] Does this change security practices? → Update SECURITY.md
- [ ] Does this add new dependencies? → Update package.json and relevant docs

### Best Practices

- **Update docs in the same PR** as code changes - don't defer documentation
- **Keep docs concise but complete** - users need clarity, not verbosity
- **Use examples** - show don't just tell, especially for commands and APIs
- **Test documentation** - verify setup instructions actually work
- **Cross-reference** - link related documentation files together
- **Version compatibility** - note if features require specific versions
- **Mark deprecations** - clearly indicate deprecated features with migration paths

### Common Documentation Mistakes to Avoid

- ❌ Adding features without documenting them
- ❌ Changing command behavior without updating command docs
- ❌ Adding new directories without updating the directory list
- ❌ Modifying setup process without testing and updating installation docs
- ❌ Creating new conventions without documenting them
- ❌ Removing features without updating docs that reference them
- ❌ Changing configuration options without documenting the changes

### Documentation Quality Standards

Good documentation should be:
- **Accurate**: Reflects current code behavior
- **Complete**: Covers all aspects of the feature
- **Clear**: Easy to understand for the target audience
- **Tested**: Setup instructions have been verified
- **Maintained**: Updated promptly when code changes
- **Discoverable**: Easy to find and well-organized
- **Examples**: Includes practical usage examples

## Key Directories & files
- `src/`: Main source code directory.
- `src/app.ts`: Main application logic and server initialization.
- `src/config.ts`: Configuration settings.
- `src/server.ts`: Server entry point.
- `src/types.ts`: TypeScript type definitions.
- `src/admin/`: Admin interface logic.
- `src/client/`: Client connection handling (Telnet, WebSocket).
- `src/command/`: Command parsing and handling.
- `src/combat/`: Combat logic and NPC AI.
- `src/command/commands/`: Implementation of individual game commands.
- `src/config/`: Configuration files and settings.
- `src/connection/`: Connection management and protocols.
- `src/timer/`: Game timer and periodic event handling.
- `src/console/`: Server console commands and interface.
- `src/effects/`: Game effects and status management.
- `src/room/`: Room management and navigation.
- `src/room/services/`: Room-related services (e.g., room generation).
- `src/schemas/`: JSON schemas for data validation.
- `src/server/`: Server initialization and setup.
- `src/setup/`: Initial setup and seeding scripts.
- `src/state/`: State machine and individual state implementations.
- `src/states/`: Client state logic (Login, Game, etc.).
- `src/types/`: TypeScript type definitions and interfaces.
- `src/user/`: User management and persistence.
- `src/utils/`: Utility functions and helpers.
- `data/`: JSON persistence files (Users, Rooms, Items).
- `logs/`: Log files for debugging and analysis
- `public/`: Static files for the web client (HTML, CSS, JS)
- `public/index.html`: Main web client HTML file
- `public/style.css`: Web client CSS styles
- `public/client.js`: Web client JavaScript logic
- `public/admin/`: Admin interface files
- `docs/`: Comprehensive documentation for users and developers
- `docs/getting-started.md`: Onboarding guide for new users
- `docs/architecture.md`: System architecture and design patterns
- `docs/development.md`: Developer guide and best practices
- `docs/commands.md`: Complete command reference

** Whenever adding new folders, keep this list updated **

## Game stats explanation
- **Health**: Represents the player's current vitality. If it reaches zero, the player dies.
- **Mana**: Represents the player's magical energy used for casting spells and abilities.
- **Experience**: Points gained from defeating enemies and completing quests. Accumulating experience leads to leveling up.
- **Level**: Indicates the player's overall progress and strength. Higher levels unlock new abilities and areas.
- **Strength**: Affects physical damage dealt and carrying capacity.
- **Dexterity**: Influences accuracy, evasion, and speed in combat.
- **Intelligence**: Impacts magical damage, mana regeneration, and spell effectiveness.
- **Constitution**: Determines health points and resistance to physical damage.
- **Wisdom**: Affects mana points, magical defense, and spell resistance.
- **Charisma**: Influences interactions with NPCs, trading prices, and certain abilities.
- **Gold**: The in-game currency used for trading, purchasing items, and services.
- **Inventory**: The collection of items the player is carrying, including weapons, armor, potions, and quest items.
- **Equipment**: Items currently equipped by the player, affecting stats and combat effectiveness.
- **Status Effects**: Temporary conditions affecting the player, such as buffs (positive effects) or debuffs (negative effects).
- **Effects stacking**: Some effects can stack, increasing their potency or duration when applied multiple times.
- **Stacking behavior**: Understand how different effects interact when applied together:
  - REPLACE,        // New effect completely replaces old of same type
  - REFRESH,        // New effect replaces old, resetting duration (with new payload)
  - STACK_DURATION, // Add duration of new effect to old
  - STACK_INTENSITY,// Both effects run independently
  - STRONGEST_WINS, // Only the effect with the 'strongest' payload applies
  - IGNORE,         // New effect is ignored if one of same type exists
- **Cooldowns**: Time intervals that must pass before certain abilities or items can be used again.

## Combat Mechanics
- **Turn-Based System**: Combat operates on a turn-based system that processes actions in discrete intervals.
- **Attack Types**: Players can perform various attack types, including melee, and spell based attacks.
- **Damage Calculation**: Damage is calculated based on player stats, weapon attributes, and randomness.
- **NPC AI**: Non-player characters (NPCs) have basic AI routines for combat behavior, including targeting and ability usage. NPCs may have unique behaviors based on their type, such as merchants or quest givers.
- **Combat States**: Players enter a `CombatState` when engaged in combat, signifying that combat has begun.
- **Initiative**: Determines the order of actions in combat based on player and NPC stats.
- **Critical Hits & Misses**: Random chance for attacks to deal extra damage (critical hits) or fail entirely (misses), influenced by stats, equipment, and randomness.
- **Status Effects in Combat**: Effects can influence combat outcomes, such as stunning an opponent or applying damage over time.
- **Death & Respawn**: When a player's health reaches zero, they die and may respawn at a designated location with penalties.
- **Loot System**: Defeated NPCs may drop items or gold, which players can collect.
- **Fleeing Combat**: Players can attempt to flee from combat, with success basedthe situation. Some npc's may prevent fleeing, such as bosses, but most npc's will allow fleeing by moving to an adjacent room.
- **Aggression Mechanics**: Some NPCs may automatically attack players based on certain conditions, such as proximity or player actions. Previously attacked enemiese will remember the player and may continue to attack on sight until the player is dead. If the player logs out, the npc will resume it's aggression on next login until the player is dead, or the npc is killed or despawned.
- **Combat between Players**: Player vs. Player (PvP) combat may be enabled in certain areas or under specific conditions, allowing players to engage each other in combat.

## NPC Mechanics
- **NPC Types**: Various NPC types exist, including hostile enemies, neutral characters, and friendly NPCs.
- **Spawning**: NPCs spawn in designated rooms based on configuration files in `data/npcs/` and `src/room/services/npcSpawner.ts`.
- **Behavior**: NPCs have predefined behaviors, such as patrolling, attacking players, or interacting with the environment.
- **Dialogue**: Some NPCs can engage in dialogue with players, providing quests or information.
- **Quests**: NPCs may offer quests to players, which can involve tasks like defeating enemies, collecting items, or exploring areas.
- **Respawning**: Hostile NPCs respawn after being defeated, based on timers defined in their configuration.
- **NPC Inventory**: Some NPCs carry items that players can loot upon defeat.
- **Aggression**: Certain NPCs may automatically attack players based on proximity or player actions.
- **NPC Abilities**: Some NPCs possess special abilities or spells that they can use in combat.
- **NPC Levels**: NPCs have levels that determine their strength, health, and the rewards they provide upon defeat.
- **NPC AI**: Basic AI routines govern NPC behavior, including movement, combat tactics, and interactions with players.
- **Factions**: NPCs may belong to factions that influence their behavior towards players (e.g., hostile, friendly, neutral).
- **Trading**: Some friendly NPCs may act as merchants, allowing players to buy and sell items.
- **Event Participation**: NPCs can be involved in special in-game events or scenarios, enhancing the game world dynamics.
- **Dynamic Interactions**: NPCs can react to player actions, such as becoming hostile if attacked or offering assistance if helped.
- **NPC Death Consequences**: Defeating certain NPCs may have lasting consequences in the game world, such as altering faction relationships or triggering events.
- **NPC Customization**: Admins can customize NPC attributes, behaviors, and spawn locations via the admin interface.
- **Admin NPCs**: Admins can create special NPCs with unique properties for events or testing purposes and take control of them where users can interact with them as normal players would, including combat.

## Room Mechanics
- **Room Structure**: Each room has a unique ID, description, exits, and may contain items or NPCs.
- **Navigation**: Players can move between rooms using directional commands (e.g., north, south).
- **Room Types**: Different room types exist, such as safe zones, combat zones, and special event areas.
- **Room Persistence**: Room data is persisted in JSON files located in the `data/rooms/` directory.
- **Dynamic Events**: Rooms can host dynamic events, such as NPC spawns or environmental changes.
- **Room Descriptions**: Rooms have detailed descriptions that provide context and atmosphere for players.
- **Exits**: Rooms have defined exits that connect to other rooms, allowing player movement.
- **Room Items**: Rooms can contain items that players can interact with, pick up, or use.
- **Room Services**: Specialized services manage room functionalities, such as NPC spawning and event handling.
- **Room Events**: Rooms can trigger events based on player actions or timers, enhancing gameplay dynamics.
- **Room Accessibility**: Some rooms may have access restrictions based on player level, quests, or admin settings.
- **Room Customization**: Admins can modify room attributes, descriptions, and contents via the admin interface.
- **Room Connections**: Rooms are interconnected, allowing players to explore the game world seamlessly.
- **Special Rooms**: Certain rooms may have unique properties, such as healing zones or PvP areas.

## Commands
- **Command Structure**: Commands implement the `Command` interface and are registered in the `CommandRegistry`.
- **Command Parsing**: The `CommandHandler` parses player input and executes the corresponding command.
- **Common Commands**: Examples include `look`, `move`, `attack`, `inventory`, and `say`.
- **Admin Commands**: Special commands are available for admin users to manage the game (e.g., `kick`, `ban`, `spawnNpc`).
- **Custom Commands**: New commands can be added by creating a class that implements the `Command` interface and registering it in the `CommandRegistry`.
- **Command Aliases**: Some commands may have aliases for convenience (e.g., `n` for `north`).
- **Command Cooldowns**: Certain commands may have cooldown periods to prevent spamming.
- **Command Permissions**: Some commands may require specific permissions or admin status to execute.
- **Command Feedback**: Commands provide feedback to players, indicating success, failure, or additional information.
- **Command Help**: A help command is available to list all commands and their usage.

## List of commands currently implemented
- `addflag`: Adds a flag to a specified user (Admin only). Usage: addflag <username> <flag>
- `adminmanage`: Grant or revoke admin privileges to players, or manage game items (Admin only)
  - aliases: `admin`, `admins`
- `attack`: Attack an enemy to engage in combat
  - aliases: `a`
- `break`: Attempt to break away from combat
  - aliases: `br`
- `bugreport`: Report a bug or issue to the admins. Use "bugreport <your message>" to submit a report.
  - aliases: `bug`, `brp`, `bugs`, `report`
- `changepassword`: Change your password. Usage: changepassword <oldPassword> <newPassword>
  - aliases: `changepass`
- `damage`: Take damage (for testing)
- `debug`: Inspect game elements and data (admin only)
  - aliases: `dbg`, `inspect`, `dnpc`, `droom`, `dplayer`, `dsystem`
- `destroy`: Permanently destroy an item in your inventory
  - aliases: `trash`, `delete`
- `drop`: Drop an item or currency from your inventory. Supports partial currency names (e.g., "g", "go", "cop").
- `effect`: Apply or remove temporary effects
  - aliases: `eff`, `effs`
- `equip`: Equip an item from your inventory
  - aliases: `eq`
- `equipment`: View your equipped items by slot
  - aliases: `gear`, `worn`, `equips`
- `get`: Pick up an item or currency from the room (alias for pickup). Supports partial currency names like "get g", "get go", "get gol" for gold.
- `giveitem`: Give an item to a player (Admin only)
  - aliases: `gi`
- `heal`: Heal yourself by the specified amount
- `help`: Show this help message
- `history`: Show your command history
  - aliases: `hist`
- `inventory`: Show your inventory contents
  - aliases: `i`, `inv`
- `list`: Show online users
- `listflags`: Lists flags for yourself or a specified user (Admin only for others). Usage: listflags [username]
- `look`: Look at your surroundings, in a direction, or at a specific object
  - aliases: `l`
- `move`: Move in a direction (north, south, east, west, etc.)
  - aliases: `n`, `s`, `e`, `w`, `u`, `d`, `ne`, `nw`, `se`, `sw`
- `pickup`: Pick up an item or currency from the current room. Supports partial currency names (e.g., "g", "go", "gol" for gold).
  - aliases: `take`
- `played`: Show the total play time of the current user
- `quit`: Disconnect from the server
- `removeflag`: Removes a flag from a specified user (Admin only). Usage: removeflag <username> <flag>
- `rename`: Give a custom name to an item
  - aliases: `name`, `label`
- `repair`: Repair a damaged item
  - aliases: `fix`, `mend`
- `resetname`: Remove a custom name from an item and restore its original name
  - aliases: `originalname`, `defaultname`, `unnickname`
- `restrict`: Restrict or unrestrict a player's movement
- `root`: Root a target to the ground, preventing them from moving
- `say`: Send a message to all users
- `scores`: Display the Snake game high scores
  - aliases: `highscores`, `leaderboard`
- `snake`: Play a game of Snake
- `spawn`: Spawn an NPC in the current room
  - aliases: `sp`
- `stats`: Show your character stats
  - aliases: `st`, `stat`
- `sudo`: Toggle admin access for authorized users
- `time`: Show the current server time
- `unequip`: Unequip an item and return it to your inventory
  - aliases: `uneq`, `remove`, `rem`
- `wait`: Enter a waiting state temporarily
  - aliases: `wa`
- `yell`: Yell a message that can be heard in adjacent rooms

## Understanding Multiplayer Interactions
- **Concurrent Users**: The server supports multiple concurrent users, each with their own session and state.
- **Shared Environment**: Players interact within a shared game world, affecting each other's experiences.
- **Chat System**: Players can communicate with each other using in-game chat commands.
- **Player Interactions**: Players can engage in various interactions, such as trading, forming parties, or engaging in PvP combat.
- **Real-Time Updates**: Changes made by one player (e.g., moving rooms, attacking NPCs) are reflected in real-time for other players.
- **Session Management**: Each player session is managed independently, ensuring isolation of user data and state.
- **Conflict Resolution**: The server handles potential conflicts arising from simultaneous actions by multiple players.
- **Event Broadcasting**: Important events (e.g., NPC spawns, global announcements) are broadcasted to all relevant players.
- **Player Visibility**: Players can see other players in the same room and interact with them.
- **Multiplayer Quests**: Some quests may require cooperation between multiple players to complete.
- **Admin Oversight**: Admins can monitor and manage multiplayer interactions to ensure a fair and enjoyable experience.
- **Data Consistency**: The server ensures data consistency across all player sessions, preventing discrepancies in game state.
- **Latency Handling**: The server is designed to handle network latency, ensuring smooth gameplay for all players.
- **User Presence**: Players can see who else is online and in the same room, fostering a sense of community.
- **Collaboration**: Players can form groups or parties to tackle challenges together.
- **Competition**: Players can compete against each other in PvP combat or leaderboards.
- **Social Features**: The game may include social features such as friend lists, guilds, or clans to enhance player interaction.
- **Event Participation**: Multiplayer events can be organized, allowing players to participate in large-scale activities together.
- **Conflict Management**: Admins can intervene in multiplayer conflicts, such as disputes between players or rule violations.
- **Data Synchronization**: The server ensures that all players have a consistent view of the game world, even during high activity periods.
- **Scalability**: The architecture is designed to scale with an increasing number of players, maintaining performance and responsiveness.
- **Multiplayer Dynamics**: Understand how player actions can influence the game world and other players, fostering a dynamic and engaging multiplayer experience.
- **Player Economy**: Players can trade items and gold with each other, creating a player-driven economy.

## Understanding writing to socket
- Game play uses a prompt-based interface over Telnet and WebSocket connections. Proper handling of redrawing this prompt using ANSI escape codes is essential for a smooth user experience.
- Some players may be typing commands while messages are sent to them (e.g., combat updates, chat messages). To avoid disrupting their input, the prompt must be cleared, the message written, and then the prompt redrawn, providing a seamless experience.
- Directly writing to client sockets is discouraged to maintain consistency and proper formatting, unless absolutely necessary for low-level operations. Some legacy code might be found that does this; refactor it to use the utility functions when possible.
- Proper handling of the prompt redrawing is crucial when sending messages to clients. This involves clearing the current line, writing the message, and then redrawing the prompt along with the users input. Helper methods in `src/utils/socketWriter.ts` handle this automatically. Use them whenever possible.
- Always use the utility functions in `src/utils/socketWriter.ts` for writing to client sockets, do not reinvent the wheel.
- Functions include:
  - `writeToClient(client: Client, message: string)`: Writes a raw message to the client. Does not automatically redraw the prompt. This is useful for low-level operations where prompt management is handled manually.
  - `writeMessageToClient(client: Client, message: string)`: Writes a formatted message to the client, redrawing the prompt. 
  - `writeFormattedMessageToClient(client: Client, message: string, formatOptions: FormatOptions)`: Clears the prompt, writes a formatted message with specified options (e.g., color, bold), and redraws the prompt, along with any user input that might be in the buffer.

## Admin mechanics
- Different levels of admin users exist, each with varying permissions:
  - **Super Admin**: Full access to all admin features and settings.
  - **Admin**: Access to most admin features, excluding critical system settings.
  - **Moderator**: Limited access, primarily for user management and monitoring.
- Admins can manage users, rooms, items, and game settings through the web-based admin interface.
- Admin actions are logged for accountability and auditing purposes.
- Admins can monitor active users and sessions in real-time. At any point they can disconnect a user if needed, or prevent their input and issue commands on their behalf. They can also elevate a normal user to admin status temporarily or permanently.
- Admin status is necessary to access certain commands and features within the game.
- All admin commands should be logged with timestamps and admin user details for auditing purposes.
- Admins can issue server commands via the interactive CLI console. Such as restarting the server, broadcasting messages, or managing user sessions.

## Maintenance & Updates
- Server can be restarted gracefully using the CLI console or admin interface.

## Todos / Unimplemented Features
- Refer to `todos/unimplemented_features.md` for a detailed list of planned features and their statuses. Occasionally review and update that file as features are implemented or new ones are identified. Preferably after each sprint or development cycle. Rank and order features based on impact and complexity to guide development priorities. Keep the recommendation section updated to reflect the current development focus. Prefer implementing features that enhance core gameplay mechanics first, then multiplayer interactions between players next.

## MCP Server

The MCP (Model Context Protocol) server is integrated into the main EllyMUD server and starts automatically on port 3100 when you run `npm start`. It provides HTTP-based access to live game data and static game configuration.

**Key Points:**
- HTTP server on port 3100 (not stdio-based)
- All logs go to `/logs/mcp-{YYYY-MM-{DD}.log` (daily rotation)
- Uses `systemLogger` for startup messages (not console.log)
- Provides RESTful API endpoints for game data access
- CORS enabled for web access
- Read-only access to game state
- **API Key Authentication**: Protected by `MCP_API_KEY` environment variable

**Security Setup:**
1. Generate API key: `openssl rand -hex 32`
2. Create `.env` file (if not exists): `cp .env.example .env`
3. Add to `.env`: `MCP_API_KEY=your_generated_key`
4. Restart server to apply changes

**Integration with Copilot:**
- In GitHub Copilot: "Enter Server URL" → `http://localhost:3100`
- API key automatically loaded from `MCP_API_KEY` environment variable
- Game server must be running

**VS Code Configuration:**
The `.vscode/mcp.json` file is already configured to use your `MCP_API_KEY` environment variable:
```json
{
  "servers": {
    "ellymud-mcp-server": {
      "url": "http://localhost:3100",
      "type": "http",
      "headers": {
        "X-API-Key": "${env:MCP_API_KEY}"
      }
    }
  }
}
```
VS Code automatically reads the API key from your `.env` file - no hardcoding required!

**For detailed usage, API endpoints, and integration examples, see `src/mcp/README.md`**

## Testing the MUD

EllyMUD supports multiple testing approaches to verify functionality, from manual playtesting to automated testing. This section covers the various methods and best practices for testing the MUD.

### Manual Testing Approaches

#### 1. Testing via Web Client
The easiest way to test the MUD is through the web-based client:

```bash
npm start
```

- Open browser to `http://localhost:8080`
- Create a new account or log in with existing credentials
- The web client provides a user-friendly interface with:
  - Command input with history (use arrow keys)
  - Formatted output with colors
  - Automatic reconnection
  - Full support for all game commands

#### 2. Testing via Telnet
For a more traditional MUD experience and testing raw protocol handling:

```bash
npm start
# In another terminal:
telnet localhost 8023
```

- Tests raw connection handling without JavaScript
- Useful for testing ANSI escape sequences
- Tests prompt management and input buffering
- Good for testing concurrent connections (open multiple telnet sessions)

#### 3. Testing via Admin CLI
For rapid testing of admin features and debugging:

```bash
npm start -- -a
# Or for a specific user:
npm start -- --forceSession=username
```

- **`-a` flag**: Bypasses login, starts as admin user
- **`--forceSession=username`**: Logs in as specific user
- Admin CLI provides server console commands:
  - Press keys to send broadcasts, monitor users, etc.
  - Full access to admin commands
  - Real-time monitoring of server state

#### 4. Development Mode with Hot Reload
For active development and iterative testing:

```bash
npm run dev
# Or with admin auto-login:
npm run watch:admin
```

- Uses `ts-node-dev` for automatic recompilation
- Server restarts on file changes
- Faster iteration cycle for bug fixes

### Testing Different Game Features

#### Basic Movement and Navigation
```
look                    # View current room
look north              # Look in a direction
move north              # Move to adjacent room (or just 'n')
stats                   # Check your character stats
inventory               # Check what you're carrying
equipment               # Check what you're wearing
```

#### Combat System Testing
```
attack <npc_name>       # Initiate combat
break                   # Attempt to flee from combat
heal <amount>           # Heal yourself (testing)
damage <amount>         # Take damage (testing)
effect add <effect>     # Apply status effects (testing)
```

**Testing Combat Mechanics:**
1. Spawn an NPC: `spawn <npc_type>`
2. Check room: `look`
3. Attack NPC: `attack <npc_name>`
4. Observe combat loop and damage calculations
5. Test fleeing: `break` or move to adjacent room
6. Verify NPC aggression persistence across sessions

#### Item and Inventory Testing
```
pickup <item>           # Pick up item from room
drop <item>             # Drop item in room
get <item>              # Alias for pickup
equip <item>            # Equip an item
unequip <slot>          # Unequip from slot
destroy <item>          # Permanently destroy item
rename <item> <name>    # Give item custom name
resetname <item>        # Restore original name
repair <item>           # Repair damaged item
```

**Testing Gold/Currency:**
```
pickup gold             # Pick up all gold
pickup 50 gold          # Pick up specific amount
drop 100 gold           # Drop specific amount
get g                   # Partial name matching works
```

#### Communication Testing
```
say <message>           # Talk in current room
yell <message>          # Yell to adjacent rooms
bugreport <message>     # Submit bug report
```

#### Admin Command Testing
```
sudo                    # Toggle admin access (if authorized)
adminmanage             # Manage admin privileges
giveitem <item> <user>  # Give item to player
spawn <npc>             # Spawn NPC in room
debug <target>          # Inspect game elements
addflag <user> <flag>   # Add flag to user
removeflag <user> <flag># Remove flag from user
listflags [user]        # List flags for user
restrict <user>         # Restrict player movement
root <target>           # Root target (prevent movement)
```

### Testing Multiplayer Interactions

#### Testing Concurrent Users
1. Start server: `npm start`
2. Connect multiple clients:
   - Web client: Open multiple browser tabs to `http://localhost:8080`
   - Telnet: Open multiple telnet sessions: `telnet localhost 8023`
   - Mix of both for cross-protocol testing

3. Test interactions:
   - Users in same room see each other with `look`
   - Use `list` to see online users
   - Test `say` command - all users in room receive message
   - Test `yell` command - users in adjacent rooms receive message
   - One user moves rooms, verify others see departure/arrival messages
   - Test combat with other players watching
   - Test item drops - other players can pick up items

#### Testing Real-Time Updates
1. Player A attacks NPC
2. Player B in same room should see combat messages
3. Player C in adjacent room should not see combat
4. Test NPC respawning - all players should see spawn message
5. Test room events triggering for all occupants

#### Testing Session Management
1. Log in on one client
2. Attempt to log in with same user on another client
3. Verify transfer request system:
   - Original session receives transfer request
   - Can accept/decline transfer
   - Proper session handoff
4. Test disconnect/reconnect behavior
5. Test logout preserves user state

### Testing State Transitions

The MUD uses a state machine for client interactions. Test transitions:

```
ConnectingState → LoginState → AuthenticatedState
                ↓ (new user)
             SignupState → LoginState
```

**Test Each State:**
1. **ConnectingState**: Initial connection, MOTD display
2. **LoginState**: Username/password entry, validation
3. **SignupState**: New user creation, password requirements
4. **AuthenticatedState**: Main gameplay state
5. **SnakeGameState**: Mini-game state (type `snake`)
6. **WaitingState**: Temporary waiting (type `wait`)
7. **TransferRequestState**: Account transfer between sessions

**State Transition Testing:**
- Start in one state, verify proper transition to next
- Test invalid inputs in each state
- Verify `client.stateData` is properly managed
- Test state-specific commands are only available in correct states

### Log Analysis for Debugging

EllyMUD maintains comprehensive logs for debugging and analysis.

#### Log File Structure
Logs are located in `/logs` directory with daily rotation:

```
/logs/
├── players/{username}-{date}.log       # Player-specific actions
├── raw-sessions/{sessionId}-{date}.log # Raw input/output
├── error/error-{date}.log              # Server errors
├── exceptions/exceptions-{date}.log    # Runtime exceptions
├── rejections/rejections-{date}.log    # Unhandled promises
├── system/system-{date}.log            # Server events
├── mcp/mcp-{date}.log                  # MCP server logs
└── audit/*.json                        # Log rotation audit files
```

#### Finding Session Logs
After testing, use the "Last session info" to find relevant logs:

```
User Name: {username}
Date Time: {ISO 8601 date time}
Raw Log: /logs/raw-sessions/{sessionId}-{date}.log
User Log: /logs/players/{username}-{date}.log
```

#### Log Analysis Workflow
1. **Identify Date/Time**: Note when the issue occurred
2. **Find Session ID**: Check `system/system-{date}.log` for session start
3. **Analyze Raw Session**: Open `raw-sessions/{sessionId}-{date}.log`
   - Shows exact input/output sequence
   - Includes ANSI escape codes
   - Shows timing of events
4. **Check Player Log**: Open `players/{username}-{date}.log`
   - Higher-level view of player actions
   - Command execution records
   - State transitions
5. **Check Error Logs**: Review `error/`, `exceptions/`, `rejections/`
   - Stack traces for crashes
   - Unhandled errors
   - Promise rejections

#### Debugging Common Issues

**Issue: Command not executing**
- Check `players/{username}-{date}.log` for command parsing
- Verify user is in correct state (AuthenticatedState)
- Check for error messages in raw session log

**Issue: Combat not working**
- Check for NPC spawn in raw session log
- Verify NPC data with `debug npc <name>`
- Check combat state transitions
- Review damage calculations in player log

**Issue: Items not appearing**
- Verify item exists with `debug item <name>`
- Check room contents with `debug room <id>`
- Review pickup/drop logs in player log

**Issue: Connection problems**
- Check `system/system-{date}.log` for connection events
- Review socket errors in `error/error-{date}.log`
- For Telnet: verify port 8023 is accessible
- For WebSocket: verify port 8080 is accessible

### Testing with MCP Server

The MCP (Model Context Protocol) server on port 3100 provides read-only access to game data for testing and debugging.

```bash
# Start server
npm start

# In another terminal, test MCP endpoints:
curl http://localhost:3100/health
curl http://localhost:3100/api/online-users
curl http://localhost:3100/api/rooms
curl http://localhost:3100/api/users/admin
curl http://localhost:3100/api/config

# Search logs
curl -X POST http://localhost:3100/api/logs/search \
  -H "Content-Type: application/json" \
  -d '{"logType": "system", "searchTerm": "error"}'
```

See `src/mcp/README.md` for complete MCP API documentation.

### Performance Testing

#### Load Testing Multiple Users
```bash
# Terminal 1: Start server
npm start

# Terminal 2-10: Connect multiple telnet clients
for i in {1..10}; do
  (sleep $i; telnet localhost 8023) &
done
```

#### Testing Response Times
- Monitor server logs for slow operations
- Check command execution times in player logs
- Verify prompt redrawing doesn't cause lag
- Test with multiple users moving/fighting simultaneously

#### Memory and Resource Testing
- Run server for extended periods
- Monitor memory usage: `ps aux | grep node`
- Check for memory leaks in long sessions
- Verify log rotation is working (daily rotation)
- Test with many items/NPCs in rooms

### Automated Testing (Future)

Currently, EllyMUD doesn't have automated unit tests (the `test/` directory contains only a `.gitkeep` file). When implementing automated tests:

**Recommended Testing Framework:**
- **Jest** or **Vitest** for unit testing
- **Supertest** for HTTP API testing
- **Socket.io-client** for WebSocket testing

**Test Coverage Priorities:**
1. **Unit Tests:**
   - Command parsing and execution
   - State machine transitions
   - Combat damage calculations
   - Inventory management
   - User authentication

2. **Integration Tests:**
   - Client connection and disconnection
   - Full command workflows
   - Multiplayer interactions
   - Data persistence (JSON files)

3. **End-to-End Tests:**
   - Complete user journeys (login → move → combat → logout)
   - Multi-user scenarios
   - Admin operations

**Example Test Structure:**
```typescript
// test/commands/look.test.ts
describe('LookCommand', () => {
  it('should display current room', () => {
    // Test implementation
  });
  
  it('should show exits', () => {
    // Test implementation
  });
});
```

### Testing Checklist

Before committing changes, verify:

- [ ] Server starts without errors: `npm start`
- [ ] Build succeeds: `npm run build`
- [ ] Web client connects successfully
- [ ] Telnet client connects successfully
- [ ] Can create new account
- [ ] Can log in with existing account
- [ ] Basic commands work (look, move, stats, inventory)
- [ ] Combat system functions correctly
- [ ] Items can be picked up and dropped
- [ ] Admin commands work (if admin testing)
- [ ] Multiple users can connect simultaneously
- [ ] Logs are being written correctly
- [ ] No errors in error logs
- [ ] MCP server responds to health check

### Testing Best Practices

1. **Test in isolation**: Restart server between test runs to ensure clean state
2. **Test edge cases**: Empty inventories, invalid commands, non-existent items
3. **Test error conditions**: Invalid input, missing data, network issues
4. **Test concurrency**: Multiple users performing actions simultaneously
5. **Review logs**: Always check logs after testing for unexpected errors
6. **Test both protocols**: Verify features work on both Telnet and WebSocket
7. **Test admin features separately**: Use sudo/admin flags appropriately
8. **Document bugs**: Use in-game `bugreport` command or create issues
9. **Test state persistence**: Logout and login to verify data is saved
10. **Test with realistic data**: Create multiple NPCs, items, and rooms

Keep this file up to date as the project evolves, add new sections as necessary, and ensure all team members are familiar with its contents.


