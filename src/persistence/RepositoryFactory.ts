/**
 * Repository Factory - Single source of truth for storage backend selection
 *
 * This factory is the ONLY place that should check STORAGE_BACKEND.
 * Managers should receive repositories via constructor injection from this factory.
 *
 * @module persistence/RepositoryFactory
 */

import { STORAGE_BACKEND } from '../config';
import {
  IAsyncUserRepository,
  IAsyncRoomRepository,
  IAsyncItemRepository,
  RepositoryConfig,
} from './interfaces';
import { KyselyUserRepository } from './KyselyUserRepository';
import { KyselyRoomRepository } from './KyselyRoomRepository';
import { KyselyItemRepository } from './KyselyItemRepository';
import { AsyncFileUserRepository } from './AsyncFileUserRepository';
import { AsyncFileRoomRepository } from './AsyncFileRoomRepository';
import { AsyncFileItemRepository } from './AsyncFileItemRepository';

/**
 * Check if we should use database (Kysely) storage
 */
export function isDatabaseBackend(): boolean {
  return STORAGE_BACKEND === 'sqlite' || STORAGE_BACKEND === 'postgres';
}

/**
 * Get the appropriate UserRepository based on STORAGE_BACKEND
 */
export function getUserRepository(config?: RepositoryConfig): IAsyncUserRepository {
  if (isDatabaseBackend()) {
    return new KyselyUserRepository();
  }
  return new AsyncFileUserRepository(config);
}

/**
 * Get the appropriate RoomRepository based on STORAGE_BACKEND
 */
export function getRoomRepository(config?: RepositoryConfig): IAsyncRoomRepository {
  if (isDatabaseBackend()) {
    return new KyselyRoomRepository();
  }
  return new AsyncFileRoomRepository(config);
}

/**
 * Get the appropriate ItemRepository based on STORAGE_BACKEND
 */
export function getItemRepository(config?: RepositoryConfig): IAsyncItemRepository {
  if (isDatabaseBackend()) {
    return new KyselyItemRepository();
  }
  return new AsyncFileItemRepository(config);
}
