import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import path from 'path';
import { parseAndValidateJson } from '../utils/jsonUtils';

/**
 * Bootstrap test data directory with fresh snapshot data.
 * Copies essential data files from the fresh snapshot into the isolated test directory.
 * Only copies files that don't already exist to allow tests to pre-populate data.
 */
function bootstrapTestData(testDataDir: string, baseDataDir: string): void {
  const freshSnapshotDir = path.join(baseDataDir, 'test-snapshots', 'fresh');

  // Files to copy from fresh snapshot
  const snapshotFiles = ['users.json', 'rooms.json', 'items.json', 'npcs.json'];

  // Also copy essential non-snapshot files from base data dir
  const baseDataFiles = ['mud-config.json'];

  // Copy fresh snapshot files
  for (const file of snapshotFiles) {
    const srcPath = path.join(freshSnapshotDir, file);
    const destPath = path.join(testDataDir, file);

    // Only copy if source exists and destination doesn't
    if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }

  // Copy base data files (config, etc.)
  for (const file of baseDataFiles) {
    const srcPath = path.join(baseDataDir, file);
    const destPath = path.join(testDataDir, file);

    // Only copy if source exists and destination doesn't
    if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Define the configuration interface
export interface CLIConfig {
  // Session flags
  adminSession: boolean;
  userSession: boolean;
  forceSession: string | null; // Add forced user session option
  force: boolean; // Add force flag

  // Security flags
  disableRemoteAdmin: boolean;

  // Data directory flags
  dataDir: string;
  roomsFile: string;
  usersFile: string;
  itemsFile: string;
  npcsFile: string;
  mudConfigFile: string;

  // Direct data input
  rooms: string | null;
  users: string | null;
  items: string | null;
  npcs: string | null;

  // Additional server options
  port: number;
  wsPort: number;
  httpPort: number | null; // New option for HTTP server port
  logLevel: string;
  noColor: boolean;
  silent: boolean;
  noConsole: boolean;
  debug: boolean; // Debug mode flag
  testMode: boolean; // Start server in test mode
  useRedis: boolean; // Use Redis for session storage
  storageBackend: 'json' | 'sqlite' | 'postgres' | 'auto'; // Storage backend for persistence
  databaseUrl: string | null; // Database connection URL (required for postgres)
}

// Parse command line arguments
export function parseCommandLineArgs(): CLIConfig {
  const defaultDataDir = path.join(__dirname, '..', '..', 'data');

  const argv = yargs(hideBin(process.argv))
    // Session flags
    .option('adminSession', {
      type: 'boolean',
      description: 'Start and immediately connect to an admin session',
      default: false,
      alias: 'a',
    })
    .option('userSession', {
      type: 'boolean',
      description: 'Start and immediately connect to a user session',
      default: false,
      alias: 'u',
    })
    .option('forceSession', {
      type: 'string',
      description: 'Start and immediately connect as a specific user (e.g. --forceSession=asdf)',
      default: null,
    })
    .option('force', {
      type: 'boolean',
      description: 'Force create admin user with default password',
      default: false,
      alias: 'f',
    })

    // Security flags
    .option('disableRemoteAdmin', {
      type: 'boolean',
      description: 'Disable remote admin access',
      default: false,
      alias: 'r',
    })

    // Data directory flags
    .option('dataDir', {
      type: 'string',
      description: 'Base directory for data files',
      default: defaultDataDir,
      alias: 'd',
    })
    .option('roomsFile', {
      type: 'string',
      description: 'Path to rooms file',
    })
    .option('usersFile', {
      type: 'string',
      description: 'Path to users file',
    })
    .option('itemsFile', {
      type: 'string',
      description: 'Path to items file',
    })
    .option('npcsFile', {
      type: 'string',
      description: 'Path to npcs file',
    })
    .option('mudConfigFile', {
      type: 'string',
      description: 'Path to MUD configuration file',
    })

    // Direct data input
    .option('rooms', {
      type: 'string',
      description: 'JSON string with room data',
    })
    .option('users', {
      type: 'string',
      description: 'JSON string with user data',
    })
    .option('items', {
      type: 'string',
      description: 'JSON string with item data',
    })
    .option('npcs', {
      type: 'string',
      description: 'JSON string with NPC data',
    })

    // Additional server options
    .option('port', {
      type: 'number',
      description: 'Telnet server port',
      default: 8023,
      alias: 'p',
    })
    .option('wsPort', {
      type: 'number',
      description: 'WebSocket server port',
      default: 8080,
      alias: 'w',
    })
    .option('httpPort', {
      type: 'number',
      description: 'HTTP server port',
    })
    .option('logLevel', {
      type: 'string',
      description: 'Log level (debug, info, warn, error)',
      default: 'info',
      alias: 'l',
    })
    .option('noColor', {
      type: 'boolean',
      description: 'Disable colored output',
      default: false,
      alias: 'n',
    })
    .option('silent', {
      type: 'boolean',
      description: 'Suppress all console logging',
      default: false,
      alias: 's',
    })
    .option('noConsole', {
      type: 'boolean',
      description: 'Disable interactive console commands and help messages',
      default: false,
      alias: 'c',
    })
    .option('debug', {
      type: 'boolean',
      description: 'Enable debug mode with additional logging and diagnostics',
      default: false,
    })
    .option('testMode', {
      type: 'boolean',
      description: 'Start server in test mode (timer paused)',
      default: false,
    })
    .option('redis', {
      type: 'boolean',
      description: 'Use Redis for session storage',
      default: false,
    })
    .option('storageBackend', {
      type: 'string',
      description:
        'Storage backend: json (flat files), sqlite (local db), postgres (remote db), or auto (db with json fallback)',
      default: process.env.STORAGE_BACKEND || 'auto',
      choices: ['json', 'sqlite', 'postgres', 'auto'],
      alias: 'storage',
    })
    .option('databaseUrl', {
      type: 'string',
      description:
        'Database connection URL (required for postgres, e.g., postgres://user:pass@host:5432/db)',
      default: process.env.DATABASE_URL || null,
      alias: 'db-url',
    })
    .help()
    .alias('help', 'h')
    .parseSync();

  // Determine if we're in test mode
  const isTestMode = argv.testMode || process.env.NODE_ENV === 'test';

  // In test mode, use isolated data directory unless explicitly overridden
  // Each test run gets a unique directory based on process ID to allow parallel tests
  const effectiveDataDir =
    isTestMode && argv.dataDir === defaultDataDir
      ? path.join(defaultDataDir, `.test-runtime-${process.pid}`)
      : argv.dataDir;

  // Set default file paths if not provided
  const config: CLIConfig = {
    adminSession: argv.adminSession,
    userSession: argv.userSession,
    forceSession: argv.forceSession || null, // Add forced user session option
    disableRemoteAdmin: argv.disableRemoteAdmin,
    dataDir: effectiveDataDir,
    roomsFile: argv.roomsFile || path.join(effectiveDataDir, 'rooms.json'),
    usersFile: argv.usersFile || path.join(effectiveDataDir, 'users.json'),
    itemsFile: argv.itemsFile || path.join(effectiveDataDir, 'items.json'),
    npcsFile: argv.npcsFile || path.join(effectiveDataDir, 'npcs.json'),
    mudConfigFile: argv.mudConfigFile || path.join(effectiveDataDir, 'mud-config.json'),
    rooms: argv.rooms || null,
    users: argv.users || null,
    items: argv.items || null,
    npcs: argv.npcs || null,
    port: argv.port,
    wsPort: argv.wsPort,
    httpPort: argv.httpPort || null,
    logLevel: argv.logLevel,
    noColor: argv.noColor || isTestMode, // Auto-disable colors in test mode
    // Auto-enable silent and noConsole if an auto-session is requested OR in test mode
    silent:
      argv.silent ||
      argv.adminSession ||
      argv.userSession ||
      Boolean(argv.forceSession) ||
      isTestMode,
    noConsole:
      argv.noConsole ||
      argv.adminSession ||
      argv.userSession ||
      Boolean(argv.forceSession) ||
      isTestMode,
    debug: argv.debug, // Updated to use the debug flag from command line arguments
    testMode: isTestMode, // Test mode flag (--testMode or NODE_ENV=test)
    force: argv.force || isTestMode, // Auto-force in test mode (skip admin prompts)
    useRedis: argv.redis, // Use Redis for session storage
    storageBackend: argv.storageBackend as 'json' | 'sqlite' | 'postgres' | 'auto', // Storage backend
    databaseUrl: argv.databaseUrl || null, // Database connection URL
  };

  // Ensure data directory exists
  if (!fs.existsSync(config.dataDir)) {
    fs.mkdirSync(config.dataDir, { recursive: true });
  }

  // In test mode, bootstrap the isolated data directory with fresh snapshot data
  if (isTestMode && config.dataDir !== defaultDataDir) {
    bootstrapTestData(config.dataDir, defaultDataDir);
  }

  return config;
}

// Add helper methods to the module to fetch parsed and validated JSON
export function getParsedRooms<T>(): T | undefined {
  const cliConfig = parseCommandLineArgs();
  try {
    return parseAndValidateJson<T>(cliConfig.rooms, 'rooms');
  } catch {
    return undefined;
  }
}

export function getParsedUsers<T>(): T | undefined {
  const cliConfig = parseCommandLineArgs();
  try {
    return parseAndValidateJson<T>(cliConfig.users, 'users');
  } catch {
    return undefined;
  }
}

export function getParsedItems<T>(): T | undefined {
  const cliConfig = parseCommandLineArgs();
  try {
    return parseAndValidateJson<T>(cliConfig.items, 'items');
  } catch {
    return undefined;
  }
}

export function getParsedNpcs<T>(): T | undefined {
  const cliConfig = parseCommandLineArgs();
  try {
    return parseAndValidateJson<T>(cliConfig.npcs, 'npcs');
  } catch {
    return undefined;
  }
}
