/**
 * Unit tests for AdminAuth
 * @module admin/adminAuth.test
 */

// Create mock repository that we can control per test
const mockStorageExists = jest.fn();
const mockFindAll = jest.fn();
const mockSave = jest.fn();
const mockSaveAll = jest.fn();
const mockDelete = jest.fn();

// Mock RepositoryFactory FIRST to avoid config import issues
jest.mock('../persistence/RepositoryFactory', () => ({
  getAdminRepository: jest.fn().mockReturnValue({
    storageExists: mockStorageExists,
    findAll: mockFindAll,
    save: mockSave,
    saveAll: mockSaveAll,
    delete: mockDelete,
  }),
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

import { AdminAuth } from './adminAuth';
import { systemLogger } from '../utils/logger';
import { UserManager } from '../user/userManager';

describe('AdminAuth', () => {
  let mockUserManager: jest.Mocked<{
    authenticateUser: jest.Mock;
    changeUserPassword: jest.Mock;
  }>;

  beforeEach(() => {
    jest.clearAllMocks();
    AdminAuth.resetWarningFlag();

    mockUserManager = (UserManager.getInstance as jest.Mock)();

    // Default mocks - storage exists with empty admins
    mockStorageExists.mockResolvedValue(true);
    mockFindAll.mockResolvedValue([]);
  });

  describe('constructor and initialization', () => {
    it('should load admins from repository', async () => {
      mockStorageExists.mockResolvedValue(true);
      mockFindAll.mockResolvedValue([
        { username: 'admin1', level: 'admin', addedBy: 'system', addedOn: '2025-01-01' },
      ]);

      const auth = new AdminAuth();
      await auth.ensureInitialized();

      expect(mockStorageExists).toHaveBeenCalled();
      expect(mockFindAll).toHaveBeenCalled();
      expect(auth).toBeDefined();
    });

    it('should handle missing admin storage', async () => {
      mockStorageExists.mockResolvedValue(false);

      const auth = new AdminAuth();
      await auth.ensureInitialized();

      expect(systemLogger.warn).toHaveBeenCalledWith(expect.stringContaining('not found'));
      expect(auth).toBeDefined();
    });

    it('should only log warning once within cooldown period', async () => {
      mockStorageExists.mockResolvedValue(false);

      const auth1 = new AdminAuth();
      await auth1.ensureInitialized();

      const auth2 = new AdminAuth();
      await auth2.ensureInitialized();

      const auth3 = new AdminAuth();
      await auth3.ensureInitialized();

      // Should only log warning once due to cooldown
      expect(systemLogger.warn).toHaveBeenCalledTimes(1);
    });

    it('should handle repository errors', async () => {
      mockStorageExists.mockRejectedValue(new Error('Repository error'));

      const auth = new AdminAuth();
      await auth.ensureInitialized();

      expect(systemLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error loading'));
      expect(auth).toBeDefined();
    });
  });

  describe('authenticate', () => {
    it('should return false for non-admin users', async () => {
      mockStorageExists.mockResolvedValue(true);
      mockFindAll.mockResolvedValue([]);

      const auth = new AdminAuth();
      await auth.ensureInitialized();
      const result = auth.authenticate('normaluser', 'password');

      expect(result).toBe(false);
      expect(mockUserManager.authenticateUser).not.toHaveBeenCalled();
    });

    it('should return false for mod-level users', async () => {
      mockStorageExists.mockResolvedValue(true);
      mockFindAll.mockResolvedValue([
        { username: 'mod1', level: 'mod', addedBy: 'system', addedOn: '2025-01-01' },
      ]);

      const auth = new AdminAuth();
      await auth.ensureInitialized();
      const result = auth.authenticate('mod1', 'password');

      expect(result).toBe(false);
    });

    it('should authenticate admin users with correct password', async () => {
      mockStorageExists.mockResolvedValue(true);
      mockFindAll.mockResolvedValue([
        { username: 'admin1', level: 'admin', addedBy: 'system', addedOn: '2025-01-01' },
      ]);
      mockUserManager.authenticateUser.mockReturnValue(true);

      const auth = new AdminAuth();
      await auth.ensureInitialized();
      const result = auth.authenticate('admin1', 'correctpassword');

      expect(result).toBe(true);
      expect(mockUserManager.authenticateUser).toHaveBeenCalledWith('admin1', 'correctpassword');
    });

    it('should authenticate super admin users', async () => {
      mockStorageExists.mockResolvedValue(true);
      mockFindAll.mockResolvedValue([
        { username: 'superadmin', level: 'super', addedBy: 'system', addedOn: '2025-01-01' },
      ]);
      mockUserManager.authenticateUser.mockReturnValue(true);

      const auth = new AdminAuth();
      await auth.ensureInitialized();
      const result = auth.authenticate('superadmin', 'password');

      expect(result).toBe(true);
    });

    it('should return false for admin users with incorrect password', async () => {
      mockStorageExists.mockResolvedValue(true);
      mockFindAll.mockResolvedValue([
        { username: 'admin1', level: 'admin', addedBy: 'system', addedOn: '2025-01-01' },
      ]);
      mockUserManager.authenticateUser.mockReturnValue(false);

      const auth = new AdminAuth();
      await auth.ensureInitialized();
      const result = auth.authenticate('admin1', 'wrongpassword');

      expect(result).toBe(false);
    });

    it('should be case-insensitive for username matching', async () => {
      mockStorageExists.mockResolvedValue(true);
      mockFindAll.mockResolvedValue([
        { username: 'Admin1', level: 'admin', addedBy: 'system', addedOn: '2025-01-01' },
      ]);
      mockUserManager.authenticateUser.mockReturnValue(true);

      const auth = new AdminAuth();
      await auth.ensureInitialized();
      const result = auth.authenticate('admin1', 'password');

      expect(result).toBe(true);
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin users', async () => {
      mockStorageExists.mockResolvedValue(true);
      mockFindAll.mockResolvedValue([
        { username: 'admin1', level: 'admin', addedBy: 'system', addedOn: '2025-01-01' },
      ]);

      const auth = new AdminAuth();
      await auth.ensureInitialized();

      expect(auth.isAdmin('admin1')).toBe(true);
    });

    it('should return true for super admin users', async () => {
      mockStorageExists.mockResolvedValue(true);
      mockFindAll.mockResolvedValue([
        { username: 'superadmin', level: 'super', addedBy: 'system', addedOn: '2025-01-01' },
      ]);

      const auth = new AdminAuth();
      await auth.ensureInitialized();

      expect(auth.isAdmin('superadmin')).toBe(true);
    });

    it('should return false for mod users', async () => {
      mockStorageExists.mockResolvedValue(true);
      mockFindAll.mockResolvedValue([
        { username: 'mod1', level: 'mod', addedBy: 'system', addedOn: '2025-01-01' },
      ]);

      const auth = new AdminAuth();
      await auth.ensureInitialized();

      expect(auth.isAdmin('mod1')).toBe(false);
    });

    it('should return false for non-existent users', async () => {
      mockStorageExists.mockResolvedValue(true);
      mockFindAll.mockResolvedValue([]);

      const auth = new AdminAuth();
      await auth.ensureInitialized();

      expect(auth.isAdmin('nonexistent')).toBe(false);
    });
  });

  describe('changePassword', () => {
    it('should delegate to UserManager', async () => {
      mockStorageExists.mockResolvedValue(true);
      mockFindAll.mockResolvedValue([]);
      mockUserManager.changeUserPassword.mockReturnValue(true);

      const auth = new AdminAuth();
      await auth.ensureInitialized();
      const result = auth.changePassword('admin1', 'newpassword');

      expect(result).toBe(true);
      expect(mockUserManager.changeUserPassword).toHaveBeenCalledWith('admin1', 'newpassword');
    });
  });

  describe('reloadAdmins', () => {
    it('should reload admins from repository', async () => {
      mockStorageExists.mockResolvedValue(true);
      mockFindAll.mockResolvedValue([]);

      const auth = new AdminAuth();
      await auth.ensureInitialized();

      // Now update the mock to return different data
      mockFindAll.mockResolvedValue([
        { username: 'newadmin', level: 'admin', addedBy: 'system', addedOn: '2025-01-01' },
      ]);

      await auth.reloadAdmins();

      // The new admin should now be recognized
      expect(auth.isAdmin('newadmin')).toBe(true);
    });
  });

  describe('static methods', () => {
    it('resetWarningFlag should clear the warning state', async () => {
      mockStorageExists.mockResolvedValue(false);

      const auth1 = new AdminAuth();
      await auth1.ensureInitialized();
      expect(systemLogger.warn).toHaveBeenCalledTimes(1);

      // Reset and try again
      AdminAuth.resetWarningFlag();
      jest.clearAllMocks();
      mockStorageExists.mockResolvedValue(false);

      const auth2 = new AdminAuth();
      await auth2.ensureInitialized();
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
