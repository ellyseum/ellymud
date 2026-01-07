# Hooks

Custom React hooks for the admin dashboard.

## Available Hooks

- **useApi** - Fetch data from API with loading/error states
- **usePolling** - Auto-refresh data at regular intervals
- **index.ts** - Re-exports all hooks for convenient importing

## Usage

Import hooks from the hooks directory:

```tsx
import { useApi, usePolling } from '../hooks';
```
