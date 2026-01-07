# Services - LLM Context

## API Client (api.ts)

Centralized HTTP client for all backend API calls.

### Structure

```typescript
const API_BASE = '/api';

export const api = {
  async get<T>(endpoint: string): Promise<T>,
  async post<T>(endpoint: string, data?: unknown): Promise<T>,
  async put<T>(endpoint: string, data?: unknown): Promise<T>,
  async delete<T>(endpoint: string): Promise<T>,
};
```

### Authentication

The client reads the JWT token from localStorage and includes it in all requests:

```typescript
const token = localStorage.getItem('adminToken');
const headers = {
  'Content-Type': 'application/json',
  ...(token && { 'Authorization': `Bearer ${token}` }),
};
```

### Error Handling

API errors throw with the error message from the response:

```typescript
if (!response.ok) {
  const error = await response.json();
  throw new Error(error.message || 'API request failed');
}
```

### Usage Examples

```typescript
// GET request
const stats = await api.get<ServerStats>('/stats');

// POST request
await api.post('/users/kick', { username: 'player1' });

// PUT request
await api.put('/config', { setting: 'value' });

// DELETE request
await api.delete('/users/player1');
```

### API Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | Admin authentication |
| `/stats` | GET | Server statistics |
| `/users` | GET | List online users |
| `/config` | GET/PUT | MUD configuration |
| `/game-timer` | GET/PUT | Game timer settings |
| `/users/:id` | DELETE | Delete user |
| `/users/kick` | POST | Kick player |
