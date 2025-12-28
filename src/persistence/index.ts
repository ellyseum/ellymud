/**
 * Persistence layer exports
 * Provides repository interfaces and implementations for data access abstraction
 * @module persistence
 */

// Interfaces
export {
  IItemRepository,
  IUserRepository,
  IRoomRepository,
  IPasswordService,
  RepositoryConfig,
} from './interfaces';

// File-based implementations (production)
export { FileItemRepository, FileUserRepository, FileRoomRepository } from './fileRepository';

// In-memory implementations (testing)
export {
  InMemoryItemRepository,
  InMemoryUserRepository,
  InMemoryRoomRepository,
} from './inMemoryRepository';

// Password service
export {
  Pbkdf2PasswordService,
  MockPasswordService,
  getPasswordService,
  setPasswordService,
  resetPasswordService,
} from './passwordService';
