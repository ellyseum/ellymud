/**
 * Unit tests for password service implementations
 * @module persistence/passwordService.test
 */

import {
  Pbkdf2PasswordService,
  MockPasswordService,
  getPasswordService,
  setPasswordService,
  resetPasswordService,
} from './passwordService';

describe('Pbkdf2PasswordService', () => {
  let service: Pbkdf2PasswordService;

  beforeEach(() => {
    service = new Pbkdf2PasswordService();
  });

  describe('hash', () => {
    it('should return hash and salt', () => {
      const result = service.hash('testpassword');
      expect(result.hash).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.hash.length).toBeGreaterThan(0);
      expect(result.salt.length).toBeGreaterThan(0);
    });

    it('should generate different salts for same password', () => {
      const result1 = service.hash('testpassword');
      const result2 = service.hash('testpassword');
      expect(result1.salt).not.toBe(result2.salt);
      expect(result1.hash).not.toBe(result2.hash);
    });
  });

  describe('verify', () => {
    it('should return true for correct password', () => {
      const { hash, salt } = service.hash('testpassword');
      expect(service.verify('testpassword', salt, hash)).toBe(true);
    });

    it('should return false for incorrect password', () => {
      const { hash, salt } = service.hash('testpassword');
      expect(service.verify('wrongpassword', salt, hash)).toBe(false);
    });

    it('should return false for incorrect salt', () => {
      const { hash } = service.hash('testpassword');
      expect(service.verify('testpassword', 'wrongsalt', hash)).toBe(false);
    });
  });

  describe('custom parameters', () => {
    it('should work with custom iterations', () => {
      const customService = new Pbkdf2PasswordService(1000);
      const { hash, salt } = customService.hash('testpassword');
      expect(customService.verify('testpassword', salt, hash)).toBe(true);
    });
  });
});

describe('MockPasswordService', () => {
  let service: MockPasswordService;

  beforeEach(() => {
    service = new MockPasswordService();
  });

  describe('hash', () => {
    it('should return predictable hash', () => {
      const result = service.hash('testpassword');
      expect(result.hash).toBe('hashed_testpassword');
      expect(result.salt).toBe('test_salt');
    });

    it('should return same hash for same password', () => {
      const result1 = service.hash('testpassword');
      const result2 = service.hash('testpassword');
      expect(result1.hash).toBe(result2.hash);
      expect(result1.salt).toBe(result2.salt);
    });
  });

  describe('verify', () => {
    it('should return true for correct password and salt', () => {
      const { hash, salt } = service.hash('testpassword');
      expect(service.verify('testpassword', salt, hash)).toBe(true);
    });

    it('should return false for incorrect password', () => {
      const { hash, salt } = service.hash('testpassword');
      expect(service.verify('wrongpassword', salt, hash)).toBe(false);
    });

    it('should return false for incorrect salt', () => {
      const { hash } = service.hash('testpassword');
      expect(service.verify('testpassword', 'wrong_salt', hash)).toBe(false);
    });
  });
});

describe('Password service factory functions', () => {
  afterEach(() => {
    resetPasswordService();
  });

  describe('getPasswordService', () => {
    it('should return default Pbkdf2PasswordService', () => {
      const service = getPasswordService();
      expect(service).toBeInstanceOf(Pbkdf2PasswordService);
    });

    it('should return same instance on multiple calls', () => {
      const service1 = getPasswordService();
      const service2 = getPasswordService();
      expect(service1).toBe(service2);
    });
  });

  describe('setPasswordService', () => {
    it('should allow setting custom service', () => {
      const mockService = new MockPasswordService();
      setPasswordService(mockService);
      expect(getPasswordService()).toBe(mockService);
    });
  });

  describe('resetPasswordService', () => {
    it('should reset to create new instance', () => {
      const service1 = getPasswordService();
      resetPasswordService();
      const service2 = getPasswordService();
      expect(service1).not.toBe(service2);
    });
  });
});
