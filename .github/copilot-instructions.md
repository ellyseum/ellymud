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
**Log Structure**:
Logs are stored in `/logs` with the following structure:
- `/logs/players/{username}-{date}.log`: Player-specific logs.
- `/logs/raw-sessions/{sessionId}-{date}.log`: Raw input/output for a session.
- `/logs/error-{date}.log`: General server errors.
- `/logs/exceptions-{date}.log`: Server runtime exceptions.
- `/logs/rejections-{date}.log`: Server unhandled promise rejections.
- `/logs/system-{date}.log`: General server events.

**Log Analysis Protocol**:
1.  **Identify Date/Time**: Use the current date/time to locate the relevant log file.
2.  **Find Session ID**: Check `system-{date}.log` or `players/` logs to find the `sessionId` (e.g., `telnet-1763705616258-809`).
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
- `public/`': Static files for the web client (HTML, CSS, JS)
- `public/index.html`: Main web client HTML file
- `public/style.css`: Web client CSS styles
- `public/client.js`: Web client JavaScript logic
- `public/admin/`: Admin interface files

Keep this file up to date as the project evolves, add new sections as necessary, and ensure all team members are familiar with its contents.


