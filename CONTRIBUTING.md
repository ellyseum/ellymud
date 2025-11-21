# Contributing to EllyMUD

First off, thank you for considering contributing to EllyMUD! It's people like you that make EllyMUD such a great project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
  - [Pull Requests](#pull-requests)
- [Style Guidelines](#style-guidelines)
  - [Git Commit Messages](#git-commit-messages)
  - [TypeScript Style Guide](#typescript-style-guide)
  - [Documentation Style Guide](#documentation-style-guide)
- [Development Setup](#development-setup)

## Code of Conduct

This project and everyone participating in it is governed by the [EllyMUD Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior by opening an issue.

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report for EllyMUD. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

**Before Submitting A Bug Report:**

- Check the [documentation](docs/) to see if the issue is already addressed
- Check the [issues](https://github.com/ellyseum/ellymud/issues) to see if the problem has already been reported
- Perform a cursory search to see if the problem has already been reported

**How Do I Submit A Good Bug Report?**

Bugs are tracked as GitHub issues. Create an issue and provide the following information:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem** in as many details as possible
- **Provide specific examples** to demonstrate the steps
- **Describe the behavior you observed** after following the steps
- **Explain which behavior you expected to see instead** and why
- **Include screenshots or animated GIFs** if applicable
- **Include your environment details**: OS, Node.js version, npm version

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for EllyMUD.

**Before Submitting An Enhancement Suggestion:**

- Check if there's already a feature that provides that enhancement
- Check the [issues](https://github.com/ellyseum/ellymud/issues) to see if the enhancement has already been suggested

**How Do I Submit A Good Enhancement Suggestion?**

Enhancement suggestions are tracked as GitHub issues. Create an issue and provide:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Provide specific examples** to demonstrate how it would work
- **Describe the current behavior** and **explain the behavior you'd like to see**
- **Explain why this enhancement would be useful** to most EllyMUD users

### Your First Code Contribution

Unsure where to begin contributing? You can start by looking through these issues:

- Issues labeled `good first issue` - should only require a few lines of code
- Issues labeled `help wanted` - more involved than beginner issues

### Pull Requests

The process described here has several goals:

- Maintain EllyMUD's quality
- Fix problems that are important to users
- Engage the community in working toward the best possible EllyMUD
- Enable a sustainable system for EllyMUD's maintainers to review contributions

Please follow these steps:

1. **Fork the repository** and create your branch from `main`
2. **Follow the [Development Setup](#development-setup)** instructions
3. **Make your changes** following the [Style Guidelines](#style-guidelines)
4. **Test your changes** thoroughly:
   - Run `npm run build` to ensure TypeScript compiles
   - Start the server with `npm start` and manually test your changes
   - Test both Telnet and WebSocket connections if applicable
5. **Update documentation** if you've changed functionality
6. **Commit your changes** using descriptive commit messages
7. **Push to your fork** and submit a pull request

**Pull Request Guidelines:**

- **Title**: Use a clear and descriptive title
- **Description**: Provide a detailed description of what the PR does
- **Link Issues**: Reference any related issues (e.g., "Fixes #123")
- **Breaking Changes**: Clearly indicate if there are any breaking changes
- **Testing**: Describe how you tested your changes
- **Screenshots**: Include screenshots for UI changes

## Style Guidelines

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line
- Consider starting the commit message with an applicable emoji:
  - 🎨 `:art:` - Improving structure/format of the code
  - ⚡ `:zap:` - Improving performance
  - 🔥 `:fire:` - Removing code or files
  - 🐛 `:bug:` - Fixing a bug
  - 🚑 `:ambulance:` - Critical hotfix
  - ✨ `:sparkles:` - Introducing new features
  - 📝 `:memo:` - Writing docs
  - 🚀 `:rocket:` - Deploying stuff
  - 💄 `:lipstick:` - Updating UI and style files
  - ✅ `:white_check_mark:` - Adding tests
  - 🔒 `:lock:` - Fixing security issues
  - ⬆️ `:arrow_up:` - Upgrading dependencies
  - ⬇️ `:arrow_down:` - Downgrading dependencies
  - 🔧 `:wrench:` - Changing configuration files

**Examples:**

```
✨ Add inventory sorting command
🐛 Fix combat damage calculation
📝 Update installation documentation
🔒 Sanitize user input in chat commands
```

### TypeScript Style Guide

- **Use TypeScript**: All code must be written in TypeScript
- **Type Everything**: Avoid using `any` - use proper types and interfaces
- **Interfaces**: Define interfaces in `src/types/` for shared data structures
- **Async/Await**: Use async/await for asynchronous operations
- **Error Handling**: Always use try/catch blocks around async operations
- **Singletons**: Access manager classes via `ClassName.getInstance()`
- **Output Functions**: Use helpers from `src/utils/socketWriter.ts` for client output
- **Comments**: Add JSDoc comments for public methods and complex logic
- **Naming Conventions**:
  - Classes: `PascalCase`
  - Functions/Methods: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Files: `camelCase.ts`
  - Interfaces: `PascalCase` (prefix with `I` if it helps clarity)

**Example:**

```typescript
/**
 * Handles player movement between rooms
 * @param client - The client attempting to move
 * @param direction - The direction to move (north, south, east, west, etc.)
 * @returns true if movement was successful
 */
export async function movePlayer(client: Client, direction: string): Promise<boolean> {
  try {
    const currentRoom = RoomManager.getInstance().getRoom(client.user.roomId);
    const exit = currentRoom.exits[direction];
    
    if (!exit) {
      writeToClient(client, "You can't go that way.");
      return false;
    }
    
    // Perform movement logic
    // ...
    
    return true;
  } catch (error) {
    systemLogger.error('Movement error:', error);
    return false;
  }
}
```

### Documentation Style Guide

- Use Markdown for all documentation
- Use clear, concise language
- Include code examples where appropriate
- Use proper headings hierarchy (H1 for title, H2 for sections, etc.)
- Add links to related documentation
- Keep line length reasonable (80-120 characters)
- Use lists for steps or multiple items
- Use code blocks with language specification for syntax highlighting

## Development Setup

### Prerequisites

- Node.js 18.x or higher
- npm 8.x or higher
- Git

### Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ellyseum/ellymud.git
   cd ellymud
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env if needed
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Start the server:**
   ```bash
   npm start
   ```

### Development Workflow

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and test frequently:
   ```bash
   # Use watch mode for automatic recompilation
   npm run watch
   
   # Or use dev mode
   npm run dev
   ```

3. **Test your changes:**
   - Connect via Telnet: `telnet localhost 8023`
   - Connect via Web: Open `http://localhost:8080` in a browser
   - Test as admin: `npm run start:admin`
   - Test as specific user: `npm start -- --forceSession=username`

4. **Build to check for errors:**
   ```bash
   npm run build
   ```

5. **Commit your changes:**
   ```bash
   git add .
   git commit -m "✨ Add your feature"
   ```

6. **Push and create a pull request:**
   ```bash
   git push origin feature/your-feature-name
   ```

### Project Structure

Key directories to understand:

- `src/` - Main source code
  - `app.ts` - Main application and server initialization
  - `server.ts` - Entry point
  - `command/` - Command system
  - `states/` - State machine for client interactions
  - `user/` - User management
  - `room/` - Room management
  - `combat/` - Combat system
  - `utils/` - Utility functions
- `data/` - JSON data files (users, rooms, items)
- `public/` - Web client files
- `docs/` - Documentation
- `logs/` - Server logs

### Logging and Debugging

Logs are stored in `/logs`:
- `players/{username}-{date}.log` - Player-specific logs
- `raw-sessions/{sessionId}-{date}.log` - Raw session I/O
- `system/system-{date}.log` - General server events
- `error/error-{date}.log` - Error logs

Use these logs to debug issues and understand player interactions.

### Testing

While comprehensive automated tests are still being developed, please manually test:

1. **Core Functionality:**
   - Login/logout
   - Character creation
   - Movement between rooms
   - Combat with NPCs
   - Inventory management
   - Commands (use `help` to see all commands)

2. **Both Connection Types:**
   - Telnet client
   - Web browser client

3. **Edge Cases:**
   - Invalid commands
   - Network disconnections
   - Multiple simultaneous users
   - Admin commands (if applicable)

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

## Attribution

This contributing guide is adapted from the [Atom contributing guide](https://github.com/atom/atom/blob/master/CONTRIBUTING.md).

---

Thank you for contributing to EllyMUD! 🎮
