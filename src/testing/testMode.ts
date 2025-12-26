/**
 * Test Mode Configuration
 * @module testing/testMode
 */

/**
 * Options for booting the server in test mode
 */
export interface TestModeOptions {
  /**
   * Whether to start the game timer immediately on boot.
   * Defaults to false in test mode.
   */
  enableTimer?: boolean;
}
