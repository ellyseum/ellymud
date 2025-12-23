# Dev Container - LLM Context

> **For LLMs**: Comprehensive context for working with dev container configuration.
> **For humans**: See [README.md](README.md) for a brief overview.

## Overview

The `.devcontainer/` directory contains VS Code Dev Container configuration that provides a consistent, reproducible development environment. This is particularly useful for onboarding new contributors and ensuring everyone has identical tooling.

## File Reference

### `devcontainer.json`

**Purpose**: Defines the development container environment, including post-create commands, VS Code extensions, and editor settings.

**Key Sections**:

```jsonc
{
  // Runs after container is created - installs deps and builds
  "postCreateCommand": "npm install && npm run build",

  "customizations": {
    "vscode": {
      "extensions": [
        "esbenp.prettier-vscode", // Code formatting
        "dbaeumer.vscode-eslint", // Linting
        "ms-azuretools.vscode-docker", // Docker support
        "ms-vscode-remote.remote-containers", // Dev containers
      ],
      "settings": {
        // Auto-formatting and linting on save
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
          "source.fixAll.eslint": "always",
          "source.organizeImports": "always",
        },
        // Prettier configuration
        "prettier.singleQuote": true,
        "prettier.trailingComma": "all",
        // Terminal configuration
        "terminal.integrated.defaultProfile.linux": "zsh",
      },
    },
  },
}
```

## Conventions

### Modifying Dev Container Settings

When changing the dev container configuration:

```jsonc
// ✅ Add extensions to the extensions array
"extensions": [
  "existing.extension",
  "new.extension-id"  // Add new extensions here
]

// ✅ Add settings under customizations.vscode.settings
"settings": {
  "existing.setting": "value",
  "new.setting": "value"  // Add new settings here
}

// ❌ Don't modify postCreateCommand without testing
// It affects everyone's initial setup
```

### Testing Changes

After modifying `devcontainer.json`:

1. Rebuild the dev container in VS Code (Command Palette → "Dev Containers: Rebuild Container")
2. Verify `postCreateCommand` runs successfully
3. Check that extensions are installed
4. Test that settings are applied

## Common Tasks

### Adding a New Extension

1. Find the extension ID from VS Code marketplace
2. Add to `customizations.vscode.extensions` array

```jsonc
"extensions": [
  "esbenp.prettier-vscode",
  "new-publisher.new-extension"  // Add here
]
```

### Adding Editor Settings

Add settings under `customizations.vscode.settings`:

```jsonc
"settings": {
  "existingSetting": "value",
  "[newLanguage]": {
    "editor.defaultFormatter": "formatter.extension"
  }
}
```

## Gotchas & Warnings

- ⚠️ **postCreateCommand**: Changing this affects initial setup time. Keep it minimal.
- ⚠️ **Extension IDs**: Must match exactly (case-sensitive). Find IDs in VS Code marketplace.
- ⚠️ **Settings Priority**: Dev container settings override user settings when inside the container.
- ⚠️ **Rebuild Required**: Changes to `devcontainer.json` require container rebuild to take effect.

## Related Context

- [`.vscode/`](../.vscode/) - Additional VS Code settings applied alongside dev container settings
- [`package.json`](../package.json) - Dependencies installed by `postCreateCommand`
- [`tsconfig.json`](../tsconfig.json) - TypeScript configuration used during build
