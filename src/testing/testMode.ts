/**
 * Test Mode Configuration
 * @module testing/testMode
 */

import * as path from 'path';

/** Default isolated data directory for tests */
export const TEST_DATA_DIR = path.join(__dirname, '..', '..', 'data', '.test-runtime');

/**
 * Generate a random port in the high range (49152-65535)
 * This range is designated for dynamic/private ports
 */
export function getRandomHighPort(): number {
  return Math.floor(Math.random() * (65535 - 49152 + 1)) + 49152;
}

/**
 * Options for booting the server in test mode
 */
export interface TestModeOptions {
  /**
   * Whether to start the game timer immediately on boot.
   * Defaults to false in test mode.
   */
  enableTimer?: boolean;

  /**
   * Whether to skip the admin user setup check.
   * Defaults to true in test mode (skip admin setup).
   */
  skipAdminSetup?: boolean;

  /**
   * Telnet server port. Defaults to random high port in test mode.
   */
  telnetPort?: number;

  /**
   * HTTP/API server port. Defaults to random high port in test mode.
   */
  httpPort?: number;

  /**
   * WebSocket server port (shares HTTP port). Defaults to httpPort.
   */
  wsPort?: number;

  /**
   * MCP server port. Defaults to random high port in test mode.
   */
  mcpPort?: number;

  /**
   * Whether to disable remote admin access. Defaults to true in test mode.
   */
  disableRemoteAdmin?: boolean;

  /**
   * Whether to suppress console output. Defaults to true in test mode.
   */
  silent?: boolean;

  /**
   * Whether to disable colored output. Defaults to true in test mode.
   */
  noColor?: boolean;

  /**
   * Whether to disable interactive console. Defaults to true in test mode.
   */
  noConsole?: boolean;

  /**
   * Data directory for test mode. Defaults to data/.test-runtime/
   * This isolates test data from production data.
   */
  dataDir?: string;
}

/**
 * Get default test mode options with random high ports
 */
export function getDefaultTestModeOptions(): Required<TestModeOptions> {
  const httpPort = getRandomHighPort();
  return {
    enableTimer: false,
    skipAdminSetup: true,
    telnetPort: getRandomHighPort(),
    httpPort: httpPort,
    wsPort: httpPort, // WebSocket shares HTTP port
    mcpPort: getRandomHighPort(),
    disableRemoteAdmin: true,
    silent: true,
    noColor: true,
    noConsole: true,
    dataDir: TEST_DATA_DIR,
  };
}
