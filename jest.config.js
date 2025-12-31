/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['\\.integration\\.test\\.ts$', '\\.e2e\\.test\\.ts$'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/index.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  verbose: true,
  forceExit: true,
  // Set required environment variables for tests
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Mock the database module to avoid native module issues in Jest
  moduleNameMapper: {
    '^../data/db$': '<rootDir>/src/data/__mocks__/db.ts',
    '^../../data/db$': '<rootDir>/src/data/__mocks__/db.ts',
    '^./db$': '<rootDir>/src/data/__mocks__/db.ts',
  },
};
