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
  IAsyncAdminRepository,
  IAsyncBugReportRepository,
  IAsyncMerchantStateRepository,
  IAsyncAbilityRepository,
  IAsyncSnakeScoreRepository,
  IAsyncMUDConfigRepository,
  IAsyncGameTimerConfigRepository,
  IAsyncRaceRepository,
  IAsyncClassRepository,
  IAsyncQuestProgressRepository,
  RepositoryConfig,
} from './interfaces';
import { KyselyUserRepository } from './KyselyUserRepository';
import { KyselyRoomRepository } from './KyselyRoomRepository';
import { KyselyRoomStateRepository } from './KyselyRoomStateRepository';
import { KyselyItemRepository } from './KyselyItemRepository';
import { KyselyNpcRepository } from './KyselyNpcRepository';
import { KyselyAreaRepository } from './KyselyAreaRepository';
import { KyselyAdminRepository } from './KyselyAdminRepository';
import { KyselyBugReportRepository } from './KyselyBugReportRepository';
import { KyselyMerchantStateRepository } from './KyselyMerchantStateRepository';
import { KyselyAbilityRepository } from './KyselyAbilityRepository';
import { KyselySnakeScoreRepository } from './KyselySnakeScoreRepository';
import { KyselyMUDConfigRepository } from './KyselyMUDConfigRepository';
import { KyselyGameTimerConfigRepository } from './KyselyGameTimerConfigRepository';
import { AsyncFileUserRepository } from './AsyncFileUserRepository';
import { AsyncFileRoomRepository } from './AsyncFileRoomRepository';
import { AsyncFileRoomStateRepository } from './AsyncFileRoomStateRepository';
import { AsyncFileItemRepository } from './AsyncFileItemRepository';
import { AsyncFileNpcRepository } from './AsyncFileNpcRepository';
import { AsyncFileAreaRepository } from './AsyncFileAreaRepository';
import { AsyncFileAdminRepository } from './AsyncFileAdminRepository';
import { AsyncFileBugReportRepository } from './AsyncFileBugReportRepository';
import { AsyncFileMerchantStateRepository } from './AsyncFileMerchantStateRepository';
import { AsyncFileAbilityRepository } from './AsyncFileAbilityRepository';
import { AsyncFileSnakeScoreRepository } from './AsyncFileSnakeScoreRepository';
import { AsyncFileMUDConfigRepository } from './AsyncFileMUDConfigRepository';
import { AsyncFileGameTimerConfigRepository } from './AsyncFileGameTimerConfigRepository';
import { AsyncFileRaceRepository } from './AsyncFileRaceRepository';
import { AsyncFileClassRepository } from './AsyncFileClassRepository';
import { AsyncFileQuestProgressRepository } from './AsyncFileQuestProgressRepository';

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
 * Database backends store state in dedicated room_states table
 * File backend uses separate room_state.json file
 */
export function getRoomStateRepository(config?: RepositoryConfig): IAsyncRoomStateRepository {
  if (isDatabaseBackend()) {
    return new KyselyRoomStateRepository();
  }
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
    return new KyselyAreaRepository();
  }
  return new AsyncFileAreaRepository(config);
}

/**
 * Get the appropriate AdminRepository based on STORAGE_BACKEND
 */
export function getAdminRepository(config?: RepositoryConfig): IAsyncAdminRepository {
  if (isDatabaseBackend()) {
    return new KyselyAdminRepository();
  }
  return new AsyncFileAdminRepository(config);
}

/**
 * Get the appropriate BugReportRepository based on STORAGE_BACKEND
 */
export function getBugReportRepository(config?: RepositoryConfig): IAsyncBugReportRepository {
  if (isDatabaseBackend()) {
    return new KyselyBugReportRepository();
  }
  return new AsyncFileBugReportRepository(config);
}

/**
 * Get the appropriate MerchantStateRepository based on STORAGE_BACKEND
 */
export function getMerchantStateRepository(
  config?: RepositoryConfig
): IAsyncMerchantStateRepository {
  if (isDatabaseBackend()) {
    return new KyselyMerchantStateRepository();
  }
  return new AsyncFileMerchantStateRepository(config);
}

/**
 * Get the appropriate AbilityRepository based on STORAGE_BACKEND
 */
export function getAbilityRepository(config?: RepositoryConfig): IAsyncAbilityRepository {
  if (isDatabaseBackend()) {
    return new KyselyAbilityRepository();
  }
  return new AsyncFileAbilityRepository(config);
}

/**
 * Get the appropriate SnakeScoreRepository based on STORAGE_BACKEND
 */
export function getSnakeScoreRepository(config?: RepositoryConfig): IAsyncSnakeScoreRepository {
  if (isDatabaseBackend()) {
    return new KyselySnakeScoreRepository();
  }
  return new AsyncFileSnakeScoreRepository(config);
}

/**
 * Get the appropriate MUDConfigRepository based on STORAGE_BACKEND
 */
export function getMUDConfigRepository(config?: RepositoryConfig): IAsyncMUDConfigRepository {
  if (isDatabaseBackend()) {
    return new KyselyMUDConfigRepository();
  }
  return new AsyncFileMUDConfigRepository(config);
}

/**
 * Get the appropriate GameTimerConfigRepository based on STORAGE_BACKEND
 */
export function getGameTimerConfigRepository(
  config?: RepositoryConfig
): IAsyncGameTimerConfigRepository {
  if (isDatabaseBackend()) {
    return new KyselyGameTimerConfigRepository();
  }
  return new AsyncFileGameTimerConfigRepository(config);
}

/**
 * Get the appropriate RaceRepository based on STORAGE_BACKEND
 * Note: Database backend not yet implemented - falls back to file
 */
export function getRaceRepository(config?: RepositoryConfig): IAsyncRaceRepository {
  // TODO: Add KyselyRaceRepository when database support is needed
  return new AsyncFileRaceRepository(config);
}

/**
 * Get the appropriate ClassRepository based on STORAGE_BACKEND
 * Note: Database backend not yet implemented - falls back to file
 */
export function getClassRepository(config?: RepositoryConfig): IAsyncClassRepository {
  // TODO: Add KyselyClassRepository when database support is needed
  return new AsyncFileClassRepository(config);
}

/**
 * Get the appropriate QuestProgressRepository based on STORAGE_BACKEND
 * Note: Database backend not yet implemented - falls back to file
 */
export function getQuestProgressRepository(
  config?: RepositoryConfig
): IAsyncQuestProgressRepository {
  // TODO: Add KyselyQuestProgressRepository when database support is needed
  return new AsyncFileQuestProgressRepository(config);
}
