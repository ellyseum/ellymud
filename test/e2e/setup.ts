/**
 * Jest setup file for E2E tests.
 * This runs BEFORE any test files are imported,
 * ensuring silent mode is enabled before any managers initialize.
 */
import { applyTestModeOverrides } from '../../src/config';
import { enableSilentMode } from '../../src/utils/logger';

// Apply test mode overrides immediately at import time
// This ensures no console output from manager initialization
applyTestModeOverrides({
  silent: true,
  noColor: true,
  noConsole: true,
  disableRemoteAdmin: true,
});

// Remove console transports from logger
enableSilentMode();
