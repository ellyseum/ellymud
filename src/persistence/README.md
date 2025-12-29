# Persistence Layer

Repository pattern abstractions for data storage, enabling swappable backends (file, in-memory, database).

## Contents

| File | Description |
|------|-------------|
| `interfaces.ts` | Repository and service interfaces |
| `fileRepository.ts` | File-based (JSON) repository implementations |
| `inMemoryRepository.ts` | In-memory repository for testing |
| `passwordService.ts` | Password hashing service abstraction |

## Purpose

This layer provides an abstraction over data persistence, allowing:
- Dependency injection for testing
- Swappable storage backends
- Clean separation of concerns

## Related

- [AGENTS.md](AGENTS.md) - Technical details for LLMs
- [../user/userManager.ts](../user/userManager.ts) - Uses IUserRepository
- [../room/roomManager.ts](../room/roomManager.ts) - Uses IRoomRepository
