/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  ...require('./jest.config'),
  // Override roots to include test directory
  roots: ['<rootDir>/test'],
  // Only run integration tests from test/integration folder
  testMatch: ['**/test/integration/**/*.integration.test.ts'],
  // Clear the ignore patterns from base config
  testPathIgnorePatterns: [],
  // Integration tests may need more time for external services
  testTimeout: 30000,
  // Run sequentially to avoid race conditions with shared resources
  maxWorkers: 1,
  // Disable coverage for integration tests
  collectCoverage: false,
  // Force exit after tests complete
  forceExit: true,
  detectOpenHandles: true,
  // Don't use moduleNameMapper mocks - we want real database connections
  moduleNameMapper: {},
};
