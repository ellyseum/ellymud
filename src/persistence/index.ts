/**
 * Persistence layer exports
 * Provides repository interfaces, implementations, and factory for data access abstraction
 * @module persistence
 */

// Interfaces - Async (preferred for new code)
export { IAsyncUserRepository, IAsyncRoomRepository, IAsyncItemRepository } from './interfaces';

// Interfaces - Legacy sync (deprecated, for backwards compatibility)
export {
  IItemRepository,
  IUserRepository,
  IRoomRepository,
  IPasswordService,
  RepositoryConfig,
} from './interfaces';

// Repository Factory - the primary way to get repositories
export {
  getUserRepository,
  getRoomRepository,
  getItemRepository,
  isDatabaseBackend,
} from './RepositoryFactory';

// Kysely implementations (database: SQLite/PostgreSQL)
export { KyselyUserRepository } from './KyselyUserRepository';
export { KyselyRoomRepository } from './KyselyRoomRepository';
export { KyselyItemRepository } from './KyselyItemRepository';

// Async file implementations (JSON files)
export { AsyncFileUserRepository } from './AsyncFileUserRepository';
export { AsyncFileRoomRepository } from './AsyncFileRoomRepository';
export { AsyncFileItemRepository } from './AsyncFileItemRepository';

// Legacy sync file implementations (for backwards compatibility)
export { FileItemRepository, FileUserRepository, FileRoomRepository } from './fileRepository';

// In-memory implementations (testing)
export {
  InMemoryItemRepository,
  InMemoryUserRepository,
  InMemoryRoomRepository,
} from './inMemoryRepository';

// Field mappers
export * from './mappers';

// Password service
export {
  Pbkdf2PasswordService,
  MockPasswordService,
  getPasswordService,
  setPasswordService,
  resetPasswordService,
} from './passwordService';
