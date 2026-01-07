# Utilities - LLM Context

## Formatters (formatters.ts)

Utility functions for formatting data for display.

### formatUptime

Converts seconds to human-readable duration.

```typescript
function formatUptime(seconds: number): string

// Examples:
formatUptime(3661);  // "1h 1m 1s"
formatUptime(86400); // "1d 0h 0m"
formatUptime(45);    // "45s"
```

### formatNumber

Formats numbers with locale-appropriate separators.

```typescript
function formatNumber(num: number): string

// Examples:
formatNumber(1234567); // "1,234,567"
formatNumber(42);      // "42"
```

### formatDate

Formats dates for display using locale settings.

```typescript
function formatDate(dateString: string): string

// Examples:
formatDate("2026-01-02T12:00:00Z"); // "1/2/2026, 12:00:00 PM"
```

### formatBytes

Formats byte sizes to human-readable format.

```typescript
function formatBytes(bytes: number): string

// Examples:
formatBytes(1024);      // "1 KB"
formatBytes(1048576);   // "1 MB"
formatBytes(500);       // "500 B"
```

## Usage

```typescript
import { formatUptime, formatNumber, formatDate } from '../utils/formatters';

// In component
<span>{formatUptime(stats.uptime)}</span>
<span>{formatNumber(stats.totalUsers)}</span>
<span>{formatDate(user.lastLogin)}</span>
```
