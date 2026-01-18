import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { parseCommandLineArgs } from './config/cliConfig';

// Parse command line arguments
const cliConfig = parseCommandLineArgs();

// Server ports
export const TELNET_PORT = cliConfig.port;

// Port synchronization logic:
// 1. If httpPort is explicitly provided, use it for HTTP_PORT
// 2. If httpPort is not provided but wsPort is, use wsPort for HTTP_PORT
// 3. If neither is provided, use the default wsPort
export const HTTP_PORT = cliConfig.httpPort || cliConfig.wsPort;
export const WS_PORT = cliConfig.wsPort;

// Authentication
// In production, JWT_SECRET must be explicitly set for security.
// In development, auto-generate a random secret for convenience (sessions won't persist across restarts).
function getJwtSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET environment variable is required in production. ' +
        'Set it to a secure random string (e.g., openssl rand -base64 32)'
    );
  }
  // Auto-generate for development - warn user that sessions won't persist
  const generated = crypto.randomBytes(32).toString('base64');
  // Only warn if not in test mode (avoid noise in test output)
  if (!cliConfig.testMode && process.env.NODE_ENV !== 'test') {
    console.warn(
      '\x1b[33m⚠ JWT_SECRET not set - using auto-generated secret. Admin sessions will not persist across restarts.\x1b[0m'
    );
  }
  return generated;
}
export const JWT_SECRET = getJwtSecret();
export const MIN_PASSWORD_LENGTH = 6;
export const maxPasswordAttempts = 3; // Max failed password attempts before disconnection
export const adminUsername = 'admin'; // Default admin username

// Security settings
export const DISABLE_REMOTE_ADMIN = cliConfig.disableRemoteAdmin;
export const RESTRICTED_USERNAMES = [
  'admin',
  'administrator',
  'mod',
  'moderator',
  'root',
  'system',
  'console',
  'server',
];

// File paths
export const DATA_DIR = cliConfig.dataDir;
export const PUBLIC_DIR = path.join(__dirname, '..', 'dist', 'public');
export const ADMIN_DIR = path.join(DATA_DIR, 'admin');

// File locations
export const ROOMS_FILE = cliConfig.roomsFile;
export const USERS_FILE = cliConfig.usersFile;
export const ITEMS_FILE = cliConfig.itemsFile;
export const NPCS_FILE = cliConfig.npcsFile;
export const MUD_CONFIG_FILE = cliConfig.mudConfigFile;

// Session flags
export const AUTO_ADMIN_SESSION = cliConfig.adminSession;
export const AUTO_USER_SESSION = cliConfig.userSession;
export const FORCE_SESSION_USERNAME = cliConfig.forceSession;
export const FORCE = cliConfig.force; // Add force flag
export const TEST_MODE = cliConfig.testMode;

// Storage backend configuration
// Options: 'json' (flat files only), 'sqlite' (local db), 'postgres' (remote db), 'auto' (db with json fallback)
export const STORAGE_BACKEND = cliConfig.storageBackend;
export const DATABASE_URL = cliConfig.databaseUrl;

/**
 * Check if the current storage backend uses a database (SQLite or PostgreSQL)
 * Use this instead of checking for specific backends to be database-agnostic
 */
export function isUsingDatabase(): boolean {
  return (
    STORAGE_BACKEND === 'sqlite' || STORAGE_BACKEND === 'postgres' || STORAGE_BACKEND === 'auto'
  );
}

/**
 * Check if database is the only storage (no JSON fallback)
 */
export function isDatabaseOnly(): boolean {
  return STORAGE_BACKEND === 'sqlite' || STORAGE_BACKEND === 'postgres';
}

// Redis configuration
// Precedence: CLI flag (cliConfig.useRedis) takes priority over USE_REDIS env var.
export const USE_REDIS = cliConfig.useRedis || process.env.USE_REDIS === 'true';

// Direct data
export const DIRECT_ROOMS_DATA = cliConfig.rooms;
export const DIRECT_USERS_DATA = cliConfig.users;
export const DIRECT_ITEMS_DATA = cliConfig.items;
export const DIRECT_NPCS_DATA = cliConfig.npcs;

// Message formatting
export const MAX_MESSAGE_LINE_LENGTH = 50;

// Timeouts and intervals
export const SERVER_STATS_UPDATE_INTERVAL = 5000;
export const IDLE_CHECK_INTERVAL = 60000;
export const COMMAND_DELAY_MS = 50; // Delay for processing commands

// System defaults
export const DEFAULT_SHUTDOWN_MINUTES = 5;
export const USERNAME_MAX_LENGTH = 12;
export const USERNAME_MIN_LENGTH = 3;

// Environment detection
export const IS_WINDOWS = os.platform() === 'win32';
export const DEV_MODE = process.env.NODE_ENV !== 'production';

// Check for console mode - should be true if we're in a TTY, not running with auto-session,
// and not running with noConsole flag
export const CONSOLE_MODE =
  process.stdout.isTTY && !cliConfig.adminSession && !cliConfig.userSession && !cliConfig.noConsole;

// Use previous IS_TTY value for backward compatibility
export const IS_TTY = CONSOLE_MODE;

// Disable colors if requested
export const USE_COLORS = !cliConfig.noColor;

// Set log level from CLI
export const LOG_LEVEL = cliConfig.logLevel;

// Silence console output if requested
export const SILENT_MODE = cliConfig.silent;

// Disable console commands if requested
export const NO_CONSOLE = cliConfig.noConsole;

/**
 * Runtime overrides for test mode.
 * These values take precedence over CLI-parsed values when set.
 */
export interface TestModeOverrides {
  silent?: boolean;
  noColor?: boolean;
  noConsole?: boolean;
  disableRemoteAdmin?: boolean;
}

// Internal store for test mode overrides
let testModeOverrides: TestModeOverrides = {};

/**
 * Apply test mode overrides to configuration.
 * Call this before any code that checks these config values.
 */
export function applyTestModeOverrides(overrides: TestModeOverrides): void {
  testModeOverrides = { ...overrides };
}

/**
 * Clear test mode overrides (for cleanup between tests)
 */
export function clearTestModeOverrides(): void {
  testModeOverrides = {};
}

/**
 * Get effective value for SILENT_MODE (respects test overrides)
 */
export function isSilentMode(): boolean {
  return testModeOverrides.silent ?? SILENT_MODE;
}

/**
 * Get effective value for NO_CONSOLE (respects test overrides)
 */
export function isNoConsole(): boolean {
  return testModeOverrides.noConsole ?? NO_CONSOLE;
}

/**
 * Get effective value for USE_COLORS (respects test overrides)
 */
export function useColors(): boolean {
  if (testModeOverrides.noColor !== undefined) {
    return !testModeOverrides.noColor;
  }
  return USE_COLORS;
}

/**
 * Get effective value for DISABLE_REMOTE_ADMIN (respects test overrides)
 */
export function isRemoteAdminDisabled(): boolean {
  return testModeOverrides.disableRemoteAdmin ?? DISABLE_REMOTE_ADMIN;
}

// Export all configuration as a single object for convenience
export default {
  TELNET_PORT,
  WS_PORT,
  HTTP_PORT,
  JWT_SECRET,
  MIN_PASSWORD_LENGTH,
  maxPasswordAttempts,
  adminUsername,
  DATA_DIR,
  PUBLIC_DIR,
  ADMIN_DIR,
  ROOMS_FILE,
  USERS_FILE,
  ITEMS_FILE,
  NPCS_FILE,
  MUD_CONFIG_FILE,
  AUTO_ADMIN_SESSION,
  AUTO_USER_SESSION,
  FORCE_SESSION_USERNAME,
  FORCE,
  DIRECT_ROOMS_DATA,
  DIRECT_USERS_DATA,
  DIRECT_ITEMS_DATA,
  DIRECT_NPCS_DATA,
  MAX_MESSAGE_LINE_LENGTH,
  SERVER_STATS_UPDATE_INTERVAL,
  IDLE_CHECK_INTERVAL,
  COMMAND_DELAY_MS,
  DEFAULT_SHUTDOWN_MINUTES,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  IS_WINDOWS,
  IS_TTY,
  CONSOLE_MODE,
  USE_COLORS,
  LOG_LEVEL,
  SILENT_MODE,
  NO_CONSOLE,
  DISABLE_REMOTE_ADMIN,
  USE_REDIS,
  DEV_MODE,
  HOST_NAME: os.hostname(),
};
