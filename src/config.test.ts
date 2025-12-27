/**
 * Unit tests for config module
 * @module config.test
 */

// Mock cliConfig before importing config
jest.mock('./config/cliConfig', () => ({
  parseCommandLineArgs: jest.fn().mockReturnValue({
    port: 8023,
    wsPort: 8080,
    httpPort: null,
    disableRemoteAdmin: false,
    dataDir: '/test/data',
    roomsFile: '/test/data/rooms.json',
    usersFile: '/test/data/users.json',
    itemsFile: '/test/data/items.json',
    npcsFile: '/test/data/npcs.json',
    mudConfigFile: '/test/data/mud-config.json',
    adminSession: false,
    userSession: false,
    forceSession: null,
    force: false,
    testMode: false,
    rooms: null,
    users: null,
    items: null,
    npcs: null,
    noColor: false,
    silent: false,
    noConsole: false,
    logLevel: 'info',
  }),
}));

import {
  applyTestModeOverrides,
  clearTestModeOverrides,
  isSilentMode,
  isNoConsole,
  useColors,
  isRemoteAdminDisabled,
  TELNET_PORT,
  WS_PORT,
  RESTRICTED_USERNAMES,
} from './config';

describe('config', () => {
  beforeEach(() => {
    clearTestModeOverrides();
  });

  describe('exported constants', () => {
    it('should export TELNET_PORT', () => {
      expect(TELNET_PORT).toBe(8023);
    });

    it('should export WS_PORT', () => {
      expect(WS_PORT).toBe(8080);
    });

    it('should export RESTRICTED_USERNAMES', () => {
      expect(RESTRICTED_USERNAMES).toContain('admin');
      expect(RESTRICTED_USERNAMES).toContain('root');
      expect(RESTRICTED_USERNAMES).toContain('system');
    });
  });

  describe('applyTestModeOverrides', () => {
    it('should apply silent mode override', () => {
      applyTestModeOverrides({ silent: true });
      expect(isSilentMode()).toBe(true);
    });

    it('should apply noConsole override', () => {
      applyTestModeOverrides({ noConsole: true });
      expect(isNoConsole()).toBe(true);
    });

    it('should apply noColor override', () => {
      applyTestModeOverrides({ noColor: true });
      expect(useColors()).toBe(false);
    });

    it('should apply disableRemoteAdmin override', () => {
      applyTestModeOverrides({ disableRemoteAdmin: true });
      expect(isRemoteAdminDisabled()).toBe(true);
    });

    it('should apply multiple overrides at once', () => {
      applyTestModeOverrides({
        silent: true,
        noConsole: true,
        noColor: true,
        disableRemoteAdmin: true,
      });

      expect(isSilentMode()).toBe(true);
      expect(isNoConsole()).toBe(true);
      expect(useColors()).toBe(false);
      expect(isRemoteAdminDisabled()).toBe(true);
    });
  });

  describe('clearTestModeOverrides', () => {
    it('should clear all overrides', () => {
      applyTestModeOverrides({
        silent: true,
        noConsole: true,
        noColor: true,
        disableRemoteAdmin: true,
      });

      clearTestModeOverrides();

      // Should return to default values (from mocked CLI config)
      expect(isSilentMode()).toBe(false);
      expect(isNoConsole()).toBe(false);
      expect(useColors()).toBe(true);
      expect(isRemoteAdminDisabled()).toBe(false);
    });
  });

  describe('isSilentMode', () => {
    it('should return false by default', () => {
      expect(isSilentMode()).toBe(false);
    });

    it('should return true when override is set', () => {
      applyTestModeOverrides({ silent: true });
      expect(isSilentMode()).toBe(true);
    });
  });

  describe('isNoConsole', () => {
    it('should return false by default', () => {
      expect(isNoConsole()).toBe(false);
    });

    it('should return true when override is set', () => {
      applyTestModeOverrides({ noConsole: true });
      expect(isNoConsole()).toBe(true);
    });
  });

  describe('useColors', () => {
    it('should return true by default', () => {
      expect(useColors()).toBe(true);
    });

    it('should return false when noColor override is true', () => {
      applyTestModeOverrides({ noColor: true });
      expect(useColors()).toBe(false);
    });

    it('should return true when noColor override is false', () => {
      applyTestModeOverrides({ noColor: false });
      expect(useColors()).toBe(true);
    });
  });

  describe('isRemoteAdminDisabled', () => {
    it('should return false by default', () => {
      expect(isRemoteAdminDisabled()).toBe(false);
    });

    it('should return true when override is set', () => {
      applyTestModeOverrides({ disableRemoteAdmin: true });
      expect(isRemoteAdminDisabled()).toBe(true);
    });
  });
});
