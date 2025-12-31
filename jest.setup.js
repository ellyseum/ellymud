/**
 * Jest setup file - runs before all tests
 * Sets required environment variables for the test environment
 */

// Set test environment to suppress JWT_SECRET warning
process.env.NODE_ENV = 'test';

// JWT_SECRET is required by src/config.ts - provide consistent value for tests
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
