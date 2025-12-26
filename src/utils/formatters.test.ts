import { formatUsername, standardizeUsername, validateUsername } from './formatters';

describe('formatters', () => {
  describe('formatUsername', () => {
    it('should capitalize the first letter', () => {
      expect(formatUsername('bob')).toBe('Bob');
    });
    it('should handle empty string', () => {
      expect(formatUsername('')).toBe('');
    });
  });

  describe('standardizeUsername', () => {
    it('should lowercase the username', () => {
      expect(standardizeUsername('Bob')).toBe('bob');
    });
  });

  describe('validateUsername', () => {
    it('should validate correct username', () => {
      expect(validateUsername('Bob').isValid).toBe(true);
    });
    it('should reject empty username', () => {
      expect(validateUsername('').isValid).toBe(false);
    });
    it('should reject long username', () => {
      expect(validateUsername('verylongusername').isValid).toBe(false);
    });
    it('should reject special characters', () => {
      expect(validateUsername('bob123').isValid).toBe(false);
    });
  });
});
