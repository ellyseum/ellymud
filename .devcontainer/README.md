# Dev Container Configuration

VS Code Dev Container setup for a consistent development environment across machines and contributors.

## Contents

| Path                | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `devcontainer.json` | Container configuration with extensions and settings |

## Overview

The dev container automatically installs dependencies and configures the development environment. When opened in VS Code with the Dev Containers extension, it provides a pre-configured environment with all necessary tools, extensions, and settings.

## Features

- Automatic `npm install` and build on container creation
- Pre-installed VS Code extensions (Prettier, ESLint, Docker)
- Consistent editor settings across all contributors
- zsh terminal with proper configuration

## Related

- [`.vscode/`](../.vscode/) - Additional VS Code workspace settings
- [`package.json`](../package.json) - Project dependencies installed by postCreateCommand
