/**
 * Unit tests for AdminAuth
 * @module admin/adminAuth.test
 */

import { AdminAuth } from './adminAuth';

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../user/userManager', () => ({
  UserManager: {
    getInstance: jest.fn().mockReturnValue({
      authenticateUser: jest.fn(),
      changeUserPassword: jest.fn(),
    }),
  },
}));

import fs from 'fs';
import { systemLogger } from '../utils/logger';
import { UserManager } from '../user/userManager';

const mockFs = fs as jest.Mocked<typeof fs>;

describe('AdminAuth', () => {
  let mockUserManager: jest.Mocked<{
    authenticateUser: jest.Mock;
    changeUserPassword: jest.Mock;
  }>;

  beforeEach(() => {
    jest.clearAllMocks();
    AdminAuth.resetWarningFlag();

    mockUserManager = (UserManager.getInstance as jest.Mock)();
  });

  describe('constructor', () => {
    it('should load admins from file', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          admins: [
            { username: 'admin1', level: 'admin', addedBy: 'system', addedOn: '2025-01-01' },
          ],
        })
      );

      const auth = new AdminAuth();

      expect(mockFs.readFileSync).toHaveBeenCalled();
      expect(auth).toBeDefined();
    });

    it('should handle missing admin file', () => {
      mockFs.existsSync.mockReturnValue(false);

      const auth = new AdminAuth();

      expect(systemLogger.warn).toHaveBeenCalledWith(expect.stringContaining('not found'));
      expect(auth).toBeDefined();
    });

    it('should only log warning once within cooldown period', () => {
      mockFs.existsSync.mockReturnValue(false);

      new AdminAuth();
      new AdminAuth();
      new AdminAuth();

      // Should only log warning once
      expect(systemLogger.warn).toHaveBeenCalledTimes(1);
    });

    it('should handle JSON parse errors', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{ invalid json');

      const auth = new AdminAuth();

      expect(systemLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error loading'));
      expect(auth).toBeDefined();
    });
  });

  describe('authenticate', () => {
    it('should return false for non-admin users', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ admins: [] }));

      const auth = new AdminAuth();
      const result = auth.authenticate('normaluser', 'password');

      expect(result).toBe(false);
      expect(mockUserManager.authenticateUser).not.toHaveBeenCalled();
    });

    it('should return false for mod-level users', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          admins: [{ username: 'mod1', level: 'mod', addedBy: 'system', addedOn: '2025-01-01' }],
        })
      );

      const auth = new AdminAuth();
      const result = auth.authenticate('mod1', 'password');

      expect(result).toBe(false);
    });

    it('should authenticate admin users with correct password', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          admins: [
            { username: 'admin1', level: 'admin', addedBy: 'system', addedOn: '2025-01-01' },
          ],
        })
      );
      mockUserManager.authenticateUser.mockReturnValue(true);

      const auth = new AdminAuth();
      const result = auth.authenticate('admin1', 'correctpassword');

      expect(result).toBe(true);
      expect(mockUserManager.authenticateUser).toHaveBeenCalledWith('admin1', 'correctpassword');
    });

    it('should authenticate super admin users', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          admins: [
            { username: 'superadmin', level: 'super', addedBy: 'system', addedOn: '2025-01-01' },
          ],
        })
      );
      mockUserManager.authenticateUser.mockReturnValue(true);

      const auth = new AdminAuth();
      const result = auth.authenticate('superadmin', 'password');

      expect(result).toBe(true);
    });

    it('should return false for admin users with incorrect password', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          admins: [
            { username: 'admin1', level: 'admin', addedBy: 'system', addedOn: '2025-01-01' },
          ],
        })
      );
      mockUserManager.authenticateUser.mockReturnValue(false);

      const auth = new AdminAuth();
      const result = auth.authenticate('admin1', 'wrongpassword');

      expect(result).toBe(false);
    });

    it('should be case-insensitive for username matching', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          admins: [
            { username: 'Admin1', level: 'admin', addedBy: 'system', addedOn: '2025-01-01' },
          ],
        })
      );
      mockUserManager.authenticateUser.mockReturnValue(true);

      const auth = new AdminAuth();
      const result = auth.authenticate('admin1', 'password');

      expect(result).toBe(true);
    });
  });

  describe('changePassword', () => {
    it('should delegate to UserManager', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ admins: [] }));
      mockUserManager.changeUserPassword.mockReturnValue(true);

      const auth = new AdminAuth();
      const result = auth.changePassword('admin1', 'newpassword');

      expect(result).toBe(true);
      expect(mockUserManager.changeUserPassword).toHaveBeenCalledWith('admin1', 'newpassword');
    });
  });

  describe('static methods', () => {
    it('resetWarningFlag should clear the warning state', () => {
      mockFs.existsSync.mockReturnValue(false);

      new AdminAuth();
      expect(systemLogger.warn).toHaveBeenCalledTimes(1);

      // Reset and try again
      AdminAuth.resetWarningFlag();
      jest.clearAllMocks();

      new AdminAuth();
      expect(systemLogger.warn).toHaveBeenCalledTimes(1);
    });

    it('setWarningCooldown should only accept positive values', () => {
      // Should not throw with positive value
      expect(() => AdminAuth.setWarningCooldown(1000)).not.toThrow();

      // Should not set with negative value (silently ignored)
      expect(() => AdminAuth.setWarningCooldown(-100)).not.toThrow();
    });
  });
});
