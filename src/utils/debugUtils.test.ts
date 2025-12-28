import { DebugModeManager, isDebugMode } from './debugUtils';
import { CLIConfig } from '../config/cliConfig';

// Mock the cliConfig module
jest.mock('../config/cliConfig', () => ({
  parseCommandLineArgs: jest.fn(),
}));

import { parseCommandLineArgs } from '../config/cliConfig';

const mockParseCommandLineArgs = parseCommandLineArgs as jest.MockedFunction<
  typeof parseCommandLineArgs
>;

// Helper to create a mock CLIConfig with default values
const createMockConfig = (overrides: Partial<CLIConfig> = {}): CLIConfig => ({
  adminSession: false,
  userSession: false,
  forceSession: null,
  force: false,
  disableRemoteAdmin: false,
  dataDir: '/data',
  roomsFile: 'rooms.json',
  usersFile: 'users.json',
  itemsFile: 'items.json',
  npcsFile: 'npcs.json',
  mudConfigFile: 'mud-config.json',
  rooms: null,
  users: null,
  items: null,
  npcs: null,
  port: 3000,
  wsPort: 8080,
  httpPort: null,
  logLevel: 'info',
  noColor: false,
  silent: false,
  noConsole: false,
  debug: false,
  testMode: false,
  useRedis: false,
  storageBackend: 'auto',
  ...overrides,
});

// Helper to reset singleton for testing
// We access the private static `instance` property via bracket notation
const resetSingleton = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (DebugModeManager as any)['instance'] = undefined;
};

describe('debugUtils', () => {
  // Reset singleton instance between tests
  beforeEach(() => {
    // Reset the singleton instance
    resetSingleton();
    jest.clearAllMocks();
    // Default mock: debug flag is false
    mockParseCommandLineArgs.mockReturnValue(createMockConfig({ debug: false }));
  });

  afterEach(() => {
    // Cleanup singleton
    resetSingleton();
  });

  describe('DebugModeManager', () => {
    describe('getInstance', () => {
      it('should return a DebugModeManager instance', () => {
        const instance = DebugModeManager.getInstance();
        expect(instance).toBeInstanceOf(DebugModeManager);
      });

      it('should return the same instance on multiple calls (singleton pattern)', () => {
        const instance1 = DebugModeManager.getInstance();
        const instance2 = DebugModeManager.getInstance();
        const instance3 = DebugModeManager.getInstance();

        expect(instance1).toBe(instance2);
        expect(instance2).toBe(instance3);
      });

      it('should create a new instance after reset', () => {
        const instance1 = DebugModeManager.getInstance();
        resetSingleton();
        const instance2 = DebugModeManager.getInstance();

        expect(instance1).not.toBe(instance2);
      });
    });

    describe('setLocalSessionActive', () => {
      it('should set local session to active', () => {
        const manager = DebugModeManager.getInstance();
        manager.setLocalSessionActive(true);

        // Verify by checking isDebugMode (with CLI debug false)
        expect(manager.isDebugMode()).toBe(true);
      });

      it('should set local session to inactive', () => {
        const manager = DebugModeManager.getInstance();
        manager.setLocalSessionActive(true);
        manager.setLocalSessionActive(false);

        // With CLI debug also false, should be false
        expect(manager.isDebugMode()).toBe(false);
      });

      it('should toggle local session state', () => {
        const manager = DebugModeManager.getInstance();

        // Initially false (default)
        expect(manager.isDebugMode()).toBe(false);

        // Set to true
        manager.setLocalSessionActive(true);
        expect(manager.isDebugMode()).toBe(true);

        // Set back to false
        manager.setLocalSessionActive(false);
        expect(manager.isDebugMode()).toBe(false);

        // Set to true again
        manager.setLocalSessionActive(true);
        expect(manager.isDebugMode()).toBe(true);
      });

      it('should persist state across getInstance calls', () => {
        const manager1 = DebugModeManager.getInstance();
        manager1.setLocalSessionActive(true);

        const manager2 = DebugModeManager.getInstance();
        expect(manager2.isDebugMode()).toBe(true);
      });
    });

    describe('isDebugMode', () => {
      describe('CLI debug flag', () => {
        it('should return true when CLI debug flag is enabled', () => {
          mockParseCommandLineArgs.mockReturnValue(createMockConfig({ debug: true }));

          const manager = DebugModeManager.getInstance();
          expect(manager.isDebugMode()).toBe(true);
        });

        it('should return false when CLI debug flag is disabled and no local session', () => {
          mockParseCommandLineArgs.mockReturnValue(createMockConfig({ debug: false }));

          const manager = DebugModeManager.getInstance();
          expect(manager.isDebugMode()).toBe(false);
        });
      });

      describe('local session', () => {
        it('should return true when local session is active', () => {
          const manager = DebugModeManager.getInstance();
          manager.setLocalSessionActive(true);

          expect(manager.isDebugMode()).toBe(true);
        });

        it('should return false when local session is inactive and no CLI flag', () => {
          const manager = DebugModeManager.getInstance();
          manager.setLocalSessionActive(false);

          expect(manager.isDebugMode()).toBe(false);
        });
      });

      describe('combined conditions', () => {
        it('should return true when both CLI flag and local session are enabled', () => {
          mockParseCommandLineArgs.mockReturnValue(createMockConfig({ debug: true }));

          const manager = DebugModeManager.getInstance();
          manager.setLocalSessionActive(true);

          expect(manager.isDebugMode()).toBe(true);
        });

        it('should return true when only CLI flag is enabled', () => {
          mockParseCommandLineArgs.mockReturnValue(createMockConfig({ debug: true }));

          const manager = DebugModeManager.getInstance();
          manager.setLocalSessionActive(false);

          expect(manager.isDebugMode()).toBe(true);
        });

        it('should return true when only local session is active', () => {
          mockParseCommandLineArgs.mockReturnValue(createMockConfig({ debug: false }));

          const manager = DebugModeManager.getInstance();
          manager.setLocalSessionActive(true);

          expect(manager.isDebugMode()).toBe(true);
        });

        it('should return false when neither CLI flag nor local session is active', () => {
          mockParseCommandLineArgs.mockReturnValue(createMockConfig({ debug: false }));

          const manager = DebugModeManager.getInstance();
          manager.setLocalSessionActive(false);

          expect(manager.isDebugMode()).toBe(false);
        });
      });

      describe('parseCommandLineArgs calls', () => {
        it('should call parseCommandLineArgs when checking debug mode', () => {
          const manager = DebugModeManager.getInstance();
          manager.isDebugMode();

          expect(mockParseCommandLineArgs).toHaveBeenCalled();
        });

        it('should call parseCommandLineArgs on each isDebugMode call', () => {
          const manager = DebugModeManager.getInstance();
          manager.isDebugMode();
          manager.isDebugMode();
          manager.isDebugMode();

          expect(mockParseCommandLineArgs).toHaveBeenCalledTimes(3);
        });

        it('should reflect changes in CLI config dynamically', () => {
          const manager = DebugModeManager.getInstance();

          // Initially debug is false
          mockParseCommandLineArgs.mockReturnValue(createMockConfig({ debug: false }));
          expect(manager.isDebugMode()).toBe(false);

          // Now debug becomes true (simulating config change)
          mockParseCommandLineArgs.mockReturnValue(createMockConfig({ debug: true }));
          expect(manager.isDebugMode()).toBe(true);
        });
      });
    });
  });

  describe('isDebugMode (module-level function)', () => {
    it('should return the same result as DebugModeManager.getInstance().isDebugMode()', () => {
      const manager = DebugModeManager.getInstance();

      expect(isDebugMode()).toBe(manager.isDebugMode());
    });

    it('should return false when debug mode is disabled', () => {
      mockParseCommandLineArgs.mockReturnValue(createMockConfig({ debug: false }));

      expect(isDebugMode()).toBe(false);
    });

    it('should return true when CLI debug flag is enabled', () => {
      mockParseCommandLineArgs.mockReturnValue(createMockConfig({ debug: true }));

      expect(isDebugMode()).toBe(true);
    });

    it('should return true when local session is active', () => {
      const manager = DebugModeManager.getInstance();
      manager.setLocalSessionActive(true);

      expect(isDebugMode()).toBe(true);
    });

    it('should use the singleton instance', () => {
      const manager = DebugModeManager.getInstance();
      manager.setLocalSessionActive(true);

      // The module-level function should see the same state
      expect(isDebugMode()).toBe(true);

      manager.setLocalSessionActive(false);
      expect(isDebugMode()).toBe(false);
    });

    it('should work correctly with both conditions', () => {
      mockParseCommandLineArgs.mockReturnValue(createMockConfig({ debug: true }));
      const manager = DebugModeManager.getInstance();
      manager.setLocalSessionActive(true);

      expect(isDebugMode()).toBe(true);
    });
  });

  describe('state persistence', () => {
    it('should maintain local session state across multiple isDebugMode calls', () => {
      const manager = DebugModeManager.getInstance();
      manager.setLocalSessionActive(true);

      expect(manager.isDebugMode()).toBe(true);
      expect(manager.isDebugMode()).toBe(true);
      expect(manager.isDebugMode()).toBe(true);
    });

    it('should maintain state when accessed via different references', () => {
      DebugModeManager.getInstance().setLocalSessionActive(true);

      expect(DebugModeManager.getInstance().isDebugMode()).toBe(true);
      expect(isDebugMode()).toBe(true);
    });

    it('should not persist state after singleton reset', () => {
      const manager1 = DebugModeManager.getInstance();
      manager1.setLocalSessionActive(true);
      expect(manager1.isDebugMode()).toBe(true);

      // Reset singleton
      resetSingleton();

      const manager2 = DebugModeManager.getInstance();
      // New instance should have default state (false)
      expect(manager2.isDebugMode()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid state changes', () => {
      const manager = DebugModeManager.getInstance();

      for (let i = 0; i < 100; i++) {
        manager.setLocalSessionActive(i % 2 === 0);
        expect(manager.isDebugMode()).toBe(i % 2 === 0);
      }
    });

    it('should handle setting same state multiple times', () => {
      const manager = DebugModeManager.getInstance();

      manager.setLocalSessionActive(true);
      manager.setLocalSessionActive(true);
      manager.setLocalSessionActive(true);

      expect(manager.isDebugMode()).toBe(true);

      manager.setLocalSessionActive(false);
      manager.setLocalSessionActive(false);
      manager.setLocalSessionActive(false);

      expect(manager.isDebugMode()).toBe(false);
    });

    it('should default to debug mode off when instance is first created', () => {
      const manager = DebugModeManager.getInstance();
      expect(manager.isDebugMode()).toBe(false);
    });
  });
});
