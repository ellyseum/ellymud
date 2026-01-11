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
  IAsyncRoomStateRepository,
  IAsyncItemRepository,
  IAsyncNpcRepository,
  IAsyncAreaRepository,
  RepositoryConfig,
} from './interfaces';
import { KyselyUserRepository } from './KyselyUserRepository';
import { KyselyRoomRepository } from './KyselyRoomRepository';
import { KyselyItemRepository } from './KyselyItemRepository';
import { KyselyNpcRepository } from './KyselyNpcRepository';
import { AsyncFileUserRepository } from './AsyncFileUserRepository';
import { AsyncFileRoomRepository } from './AsyncFileRoomRepository';
import { AsyncFileRoomStateRepository } from './AsyncFileRoomStateRepository';
import { AsyncFileItemRepository } from './AsyncFileItemRepository';
import { AsyncFileNpcRepository } from './AsyncFileNpcRepository';
import { AsyncFileAreaRepository } from './AsyncFileAreaRepository';

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
 * Get the appropriate RoomStateRepository based on STORAGE_BACKEND
 * Note: Database backend uses the same repository (state is in room table)
 * File backend uses separate file for state
 */
export function getRoomStateRepository(config?: RepositoryConfig): IAsyncRoomStateRepository {
  // For now, only file backend is supported for state
  // Database backends will need a KyselyRoomStateRepository in the future
  return new AsyncFileRoomStateRepository(config);
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

/**
 * Get the appropriate NpcRepository based on STORAGE_BACKEND
 */
export function getNpcRepository(config?: RepositoryConfig): IAsyncNpcRepository {
  if (isDatabaseBackend()) {
    return new KyselyNpcRepository();
  }
  return new AsyncFileNpcRepository(config);
}

/**
 * Get the appropriate AreaRepository based on STORAGE_BACKEND
 */
export function getAreaRepository(config?: RepositoryConfig): IAsyncAreaRepository {
  if (isDatabaseBackend()) {
    // TODO: Implement KyselyAreaRepository when database support is needed
    throw new Error('Database backend not yet implemented for AreaRepository');
  }
  return new AsyncFileAreaRepository(config);
}
