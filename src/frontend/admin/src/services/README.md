# Services

API client and service modules for the admin dashboard.

## Available Services

- **api.ts** - HTTP client for backend API communication

## Usage

Import the API client and use its methods:

```tsx
import { api } from '../services/api';

const data = await api.get('/api/endpoint');
await api.post('/api/endpoint', { data });
```

## Authentication

The API client automatically includes JWT tokens from localStorage in all requests.
