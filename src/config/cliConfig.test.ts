/**
 * Unit tests for CLI configuration parsing
 * @module config/cliConfig.test
 */

import { CLIConfig } from './cliConfig';

// Store original argv and NODE_ENV
const originalArgv = process.argv;
const originalNodeEnv = process.env.NODE_ENV;

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
}));

// Mock parseAndValidateJson
jest.mock('../utils/jsonUtils', () => ({
  parseAndValidateJson: jest.fn().mockReturnValue(undefined),
}));

describe('cliConfig', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports

  beforeEach(() => {
    jest.resetModules();
    process.argv = ['node', 'server.js'];
    // Clear NODE_ENV to test non-test-mode defaults
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('parseCommandLineArgs', () => {
    it('should return default configuration', async () => {
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.port).toBe(8023);
      expect(config.wsPort).toBe(8080);
      expect(config.logLevel).toBe('info');
      expect(config.noColor).toBe(false);
      expect(config.silent).toBe(false);
      expect(config.adminSession).toBe(false);
      expect(config.userSession).toBe(false);
      expect(config.forceSession).toBeNull();
    });

    it('should parse adminSession flag', async () => {
      process.argv = ['node', 'server.js', '--adminSession'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.adminSession).toBe(true);
      expect(config.silent).toBe(true);
      expect(config.noConsole).toBe(true);
    });

    it('should parse -a as alias for adminSession', async () => {
      process.argv = ['node', 'server.js', '-a'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.adminSession).toBe(true);
    });

    it('should parse userSession flag', async () => {
      process.argv = ['node', 'server.js', '--userSession'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.userSession).toBe(true);
      expect(config.silent).toBe(true);
      expect(config.noConsole).toBe(true);
    });

    it('should parse forceSession option', async () => {
      process.argv = ['node', 'server.js', '--forceSession=testuser'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.forceSession).toBe('testuser');
      expect(config.silent).toBe(true);
      expect(config.noConsole).toBe(true);
    });

    it('should parse port option', async () => {
      process.argv = ['node', 'server.js', '--port', '9000'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.port).toBe(9000);
    });

    it('should parse -p as alias for port', async () => {
      process.argv = ['node', 'server.js', '-p', '9001'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.port).toBe(9001);
    });

    it('should parse wsPort option', async () => {
      process.argv = ['node', 'server.js', '--wsPort', '9080'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.wsPort).toBe(9080);
    });

    it('should parse httpPort option', async () => {
      process.argv = ['node', 'server.js', '--httpPort', '3000'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.httpPort).toBe(3000);
    });

    it('should parse logLevel option', async () => {
      process.argv = ['node', 'server.js', '--logLevel', 'debug'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.logLevel).toBe('debug');
    });

    it('should parse noColor flag', async () => {
      process.argv = ['node', 'server.js', '--noColor'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.noColor).toBe(true);
    });

    it('should parse silent flag', async () => {
      process.argv = ['node', 'server.js', '--silent'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.silent).toBe(true);
    });

    it('should parse noConsole flag', async () => {
      process.argv = ['node', 'server.js', '--noConsole'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.noConsole).toBe(true);
    });

    it('should parse debug flag', async () => {
      process.argv = ['node', 'server.js', '--debug'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.debug).toBe(true);
    });

    it('should parse testMode flag', async () => {
      process.argv = ['node', 'server.js', '--testMode'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.testMode).toBe(true);
    });

    it('should parse disableRemoteAdmin flag', async () => {
      process.argv = ['node', 'server.js', '--disableRemoteAdmin'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.disableRemoteAdmin).toBe(true);
    });

    it('should parse force flag', async () => {
      process.argv = ['node', 'server.js', '--force'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.force).toBe(true);
    });

    it('should parse dataDir option', async () => {
      process.argv = ['node', 'server.js', '--dataDir', '/custom/data'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.dataDir).toBe('/custom/data');
    });

    it('should parse roomsFile option', async () => {
      process.argv = ['node', 'server.js', '--roomsFile', '/custom/rooms.json'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.roomsFile).toBe('/custom/rooms.json');
    });

    it('should parse usersFile option', async () => {
      process.argv = ['node', 'server.js', '--usersFile', '/custom/users.json'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.usersFile).toBe('/custom/users.json');
    });

    it('should parse itemsFile option', async () => {
      process.argv = ['node', 'server.js', '--itemsFile', '/custom/items.json'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.itemsFile).toBe('/custom/items.json');
    });

    it('should parse npcsFile option', async () => {
      process.argv = ['node', 'server.js', '--npcsFile', '/custom/npcs.json'];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.npcsFile).toBe('/custom/npcs.json');
    });

    it('should parse direct data options', async () => {
      const roomsData = JSON.stringify([{ id: 'room1' }]);
      process.argv = ['node', 'server.js', '--rooms', roomsData];
      const { parseCommandLineArgs } = await import('./cliConfig');
      const config: CLIConfig = parseCommandLineArgs();

      expect(config.rooms).toBe(roomsData);
    });
  });

  describe('getParsedRooms', () => {
    it('should return undefined when rooms data is not provided', async () => {
      const { getParsedRooms } = await import('./cliConfig');
      const result = getParsedRooms();

      expect(result).toBeUndefined();
    });
  });

  describe('getParsedUsers', () => {
    it('should return undefined when users data is not provided', async () => {
      const { getParsedUsers } = await import('./cliConfig');
      const result = getParsedUsers();

      expect(result).toBeUndefined();
    });
  });

  describe('getParsedItems', () => {
    it('should return undefined when items data is not provided', async () => {
      const { getParsedItems } = await import('./cliConfig');
      const result = getParsedItems();

      expect(result).toBeUndefined();
    });
  });

  describe('getParsedNpcs', () => {
    it('should return undefined when npcs data is not provided', async () => {
      const { getParsedNpcs } = await import('./cliConfig');
      const result = getParsedNpcs();

      expect(result).toBeUndefined();
    });
  });
});
