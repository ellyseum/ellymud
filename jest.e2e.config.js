/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  ...require('./jest.config'),
  // Override testMatch to only run E2E tests
  testMatch: ['**/test/e2e/**/*.e2e.test.ts'],
  // Only ignore integration tests (not e2e tests which this config runs)
  testPathIgnorePatterns: ['\\.integration\\.test\\.ts$'],
  // E2E tests may take longer
  testTimeout: 30000,
  // Run sequentially to avoid port conflicts
  maxWorkers: 1,
  // Override roots to include test directory
  roots: ['<rootDir>/test'],
  // Disable coverage for E2E tests (focus on unit tests for coverage)
  collectCoverage: false,
  // Setup file to enable silent mode before any tests import modules
  setupFilesAfterEnv: ['<rootDir>/test/e2e/setup.ts'],
  // Force exit after all tests complete to avoid hanging on any unclosed handles,
  detectOpenHandles: true,
};
