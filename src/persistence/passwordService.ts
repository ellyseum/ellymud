/**
 * Password service implementations
 * Abstracts password hashing operations for testability
 * @module persistence/passwordService
 */

import crypto from 'crypto';
import { IPasswordService } from './interfaces';

/**
 * Production implementation of password service using PBKDF2
 */
export class Pbkdf2PasswordService implements IPasswordService {
  private readonly iterations: number;
  private readonly keyLength: number;
  private readonly digest: string;

  constructor(iterations = 100000, keyLength = 64, digest = 'sha512') {
    this.iterations = iterations;
    this.keyLength = keyLength;
    this.digest = digest;
  }

  hash(password: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .pbkdf2Sync(password, salt, this.iterations, this.keyLength, this.digest)
      .toString('hex');
    return { hash, salt };
  }

  verify(password: string, salt: string, storedHash: string): boolean {
    const hash = crypto
      .pbkdf2Sync(password, salt, this.iterations, this.keyLength, this.digest)
      .toString('hex');
    return hash === storedHash;
  }
}

/**
 * Mock password service for testing
 * Uses simple, predictable hashing for easy verification in tests
 */
export class MockPasswordService implements IPasswordService {
  hash(password: string): { hash: string; salt: string } {
    // Simple, predictable hash for testing
    return {
      hash: `hashed_${password}`,
      salt: 'test_salt',
    };
  }

  verify(password: string, salt: string, storedHash: string): boolean {
    // Simple verification for testing
    return storedHash === `hashed_${password}` && salt === 'test_salt';
  }
}

/**
 * Default password service instance for production use
 */
let defaultPasswordService: IPasswordService | null = null;

/**
 * Get the default password service instance
 */
export function getPasswordService(): IPasswordService {
  if (!defaultPasswordService) {
    defaultPasswordService = new Pbkdf2PasswordService();
  }
  return defaultPasswordService;
}

/**
 * Set a custom password service (useful for testing)
 */
export function setPasswordService(service: IPasswordService): void {
  defaultPasswordService = service;
}

/**
 * Reset the password service to default (useful for test cleanup)
 */
export function resetPasswordService(): void {
  defaultPasswordService = null;
}
