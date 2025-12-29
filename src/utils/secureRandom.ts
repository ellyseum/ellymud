/**
 * Secure Random Utilities
 *
 * Provides cryptographically secure random number generation to satisfy
 * security analysis tools (CodeQL) and ensure unpredictable randomness
 * for game mechanics.
 *
 * Uses Node.js crypto module instead of Math.random() to prevent
 * potential manipulation and satisfy security requirements.
 */

import { randomInt } from 'crypto';

/**
 * Generate a secure random floating-point number between 0 (inclusive) and 1 (exclusive).
 * This is a drop-in replacement for Math.random().
 */
export function secureRandom(): number {
  // Generate a random 32-bit integer and convert to [0, 1) range
  return randomInt(0, 2147483647) / 2147483647;
}

/**
 * Generate a secure random integer in the range [min, max] (inclusive).
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 */
export function secureRandomInt(min: number, max: number): number {
  return randomInt(min, max + 1);
}

/**
 * Select a random element from an array using secure randomness.
 * @param array - The array to select from
 * @returns A random element, or undefined if array is empty
 */
export function secureRandomElement<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  return array[randomInt(0, array.length)];
}

/**
 * Generate a secure random index for an array.
 * @param length - The length of the array
 * @returns A random index in range [0, length)
 */
export function secureRandomIndex(length: number): number {
  if (length <= 0) return 0;
  return randomInt(0, length);
}
