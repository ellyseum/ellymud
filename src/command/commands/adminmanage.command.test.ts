/**
 * Unit tests for AdminManageCommand
 * @module command/commands/adminmanage.command.test
 */

import {
  createMockClient,
  createMockUser,
  createMockUserManager,
  createMockRoom,
  createMockRoomManager,
  createMockItemManager,
} from '../../test/helpers/mockFactories';
import { ItemInstance, GameItem } from '../../types';

/**
 * Helper to create a mock ItemInstance with required properties
 */
const createMockItemInstance = (overrides: Partial<ItemInstance> = {}): ItemInstance => ({
  instanceId: 'test-item-instance',
  templateId: 'test-template',
  created: new Date(),
  createdBy: 'system',
  properties: {},
  ...overrides,
});

/**
 * Helper to create a mock GameItem with required properties
 */
const createMockGameItem = (overrides: Partial<GameItem> = {}): GameItem => ({
  id: 'test-item',
  name: 'Test Item',
  description: 'A test item',
  type: 'misc',
  value: 100,
  ...overrides,
});

// Mock fs and path before importing the command
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue(
    JSON.stringify({
      admins: [
        { username: 'admin', level: 'super', addedBy: 'system', addedOn: '2023-01-01' },
        { username: 'superadmin', level: 'super', addedBy: 'admin', addedOn: '2023-01-01' },
        { username: 'testadmin', level: 'admin', addedBy: 'admin', addedOn: '2023-01-01' },
        { username: 'testmod', level: 'mod', addedBy: 'admin', addedOn: '2023-01-01' },
      ],
    })
  ),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn().mockReturnValue('/mock/path/admin.json'),
}));

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  createContextLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock ItemManager singleton
jest.mock('../../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn(),
  },
}));

// Mock RoomManager singleton
jest.mock('../../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn(),
  },
}));

// Mock RepositoryFactory to avoid config import issues
// CRITICAL: Use mockImplementation instead of mockResolvedValue to return a fresh array each time
// mockResolvedValue returns the SAME array instance, and the code mutates it!
jest.mock('../../persistence/RepositoryFactory', () => ({
  getAdminRepository: jest.fn().mockReturnValue({
    storageExists: jest.fn().mockResolvedValue(true),
    findAll: jest.fn().mockImplementation(() =>
      Promise.resolve([
        { username: 'admin', level: 'super', addedBy: 'system', addedOn: '2023-01-01' },
        { username: 'superadmin', level: 'super', addedBy: 'admin', addedOn: '2023-01-01' },
        { username: 'testadmin', level: 'admin', addedBy: 'admin', addedOn: '2023-01-01' },
        { username: 'testmod', level: 'mod', addedBy: 'admin', addedOn: '2023-01-01' },
      ])
    ),
    save: jest.fn().mockResolvedValue(undefined),
    saveAll: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  }),
}));

import { AdminManageCommand, AdminLevel } from './adminmanage.command';
import { SudoCommand } from './sudo.command';
import { writeToClient } from '../../utils/socketWriter';
import { ItemManager } from '../../utils/itemManager';
import { RoomManager } from '../../room/roomManager';
import { UserManager } from '../../user/userManager';
import fs from 'fs';
import { getAdminRepository } from '../../persistence/RepositoryFactory';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;
const mockFs = fs as jest.Mocked<typeof fs>;
const mockGetAdminRepository = getAdminRepository as jest.MockedFunction<typeof getAdminRepository>;

// Helper to wait for async operations inside execute() to complete
// AdminManageCommand.execute() fires async methods without awaiting them
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 10));

describe('AdminManageCommand', () => {
  let adminManageCommand: AdminManageCommand;
  let mockUserManager: jest.Mocked<UserManager>;
  let mockItemManager: jest.Mocked<ItemManager>;
  let mockRoomManager: jest.Mocked<RoomManager>;
  let mockSudoCommand: jest.Mocked<SudoCommand>;
  let mockRepository: ReturnType<typeof mockGetAdminRepository>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Get reference to the mock repository
    mockRepository = mockGetAdminRepository();

    // Create mock managers
    mockUserManager = createMockUserManager();
    mockItemManager = createMockItemManager();
    mockRoomManager = createMockRoomManager();

    // Setup ItemManager singleton mock
    (ItemManager.getInstance as jest.Mock).mockReturnValue(mockItemManager);

    // Setup RoomManager singleton mock
    (RoomManager.getInstance as jest.Mock).mockReturnValue(mockRoomManager);

    // Create mock SudoCommand
    mockSudoCommand = {
      name: 'sudo',
      description: 'Toggle admin access',
      execute: jest.fn(),
      isAuthorized: jest.fn().mockReturnValue(false),
      isSuperAdmin: jest.fn().mockReturnValue(false),
      updateAdminList: jest.fn(),
    } as unknown as jest.Mocked<SudoCommand>;

    // Create the command with mock user manager
    adminManageCommand = new AdminManageCommand(mockUserManager);
    await adminManageCommand.ensureInitialized();
    adminManageCommand.setSudoCommand(mockSudoCommand);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(adminManageCommand.name).toBe('adminmanage');
    });

    it('should have a description', () => {
      expect(adminManageCommand.description).toBeDefined();
      expect(adminManageCommand.description).toContain('admin');
    });
  });

  describe('AdminLevel enum', () => {
    it('should have SUPER level', () => {
      expect(AdminLevel.SUPER).toBe('super');
    });

    it('should have ADMIN level', () => {
      expect(AdminLevel.ADMIN).toBe('admin');
    });

    it('should have MOD level', () => {
      expect(AdminLevel.MOD).toBe('mod');
    });
  });

  describe('constructor', () => {
    it('should load admins from repository on construction', async () => {
      // Repository findAll should have been called during beforeEach initialization
      expect(mockRepository.findAll).toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      // Make repository.findAll throw an error
      (mockRepository.findAll as jest.Mock).mockRejectedValueOnce(new Error('Repository error'));

      const newCommand = new AdminManageCommand(mockUserManager);
      await newCommand.ensureInitialized();

      // Command should still be created (with default admin)
      expect(newCommand).toBeDefined();
    });

    it('should handle JSON parse errors gracefully', () => {
      (mockFs.readFileSync as jest.Mock).mockReturnValueOnce('invalid json');

      expect(() => new AdminManageCommand(mockUserManager)).not.toThrow();
    });
  });

  describe('setSudoCommand', () => {
    it('should update sudo command with current admin list', () => {
      adminManageCommand.setSudoCommand(mockSudoCommand);

      expect(mockSudoCommand.updateAdminList).toHaveBeenCalled();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      adminManageCommand.execute(client, 'list');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should show error if user is not an admin and not authorized', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'regularuser' }),
      });

      adminManageCommand.execute(client, 'list');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('do not have permission')
      );
    });

    it('should allow admin user to execute commands', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      adminManageCommand.execute(client, 'list');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Admin Users')
      );
    });

    it('should allow authorized sudo user to execute commands', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testadmin' }),
      });
      mockSudoCommand.isAuthorized.mockReturnValue(true);

      adminManageCommand.execute(client, 'list');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Admin Users')
      );
    });

    it('should try to get sudo command from stateData if not set', () => {
      const newCommand = new AdminManageCommand(mockUserManager);
      // Don't set sudo command

      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
        stateData: {
          commands: new Map([['sudo', mockSudoCommand]]),
        },
      });

      newCommand.execute(client, 'list');

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should show error if sudo command is not available', () => {
      const newCommand = new AdminManageCommand(mockUserManager);
      // Don't set sudo command

      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
        stateData: {},
      });

      newCommand.execute(client, 'list');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Sudo command not available')
      );
    });

    it('should show help for unknown actions', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      adminManageCommand.execute(client, 'unknownaction');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Admin Management')
      );
    });

    it('should show help when no action provided', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      adminManageCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Admin Management')
      );
    });
  });

  describe('list action', () => {
    it('should list all admins sorted by level', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      adminManageCommand.execute(client, 'list');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Admin Users')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('admin'));
    });

    it('should show message when no admins found', () => {
      // Create fresh mock with empty admins
      (mockFs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify({ admins: [] }));

      const newCommand = new AdminManageCommand(mockUserManager);
      newCommand.setSudoCommand(mockSudoCommand);

      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      mockSudoCommand.isAuthorized.mockReturnValue(true);

      newCommand.execute(client, 'list');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('No admins found')
      );
    });
  });

  describe('add action', () => {
    it('should require super admin privileges', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testadmin' }),
      });
      mockSudoCommand.isAuthorized.mockReturnValue(true);
      mockSudoCommand.isSuperAdmin.mockReturnValue(false);

      adminManageCommand.execute(client, 'add newuser');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Only super admins')
      );
    });

    it('should show error when username is missing', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);

      adminManageCommand.execute(client, 'add');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Missing username')
      );
    });

    it('should show error when user does not exist', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);
      mockUserManager.getUser.mockReturnValue(undefined);

      adminManageCommand.execute(client, 'add nonexistentuser');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('does not exist')
      );
    });

    it('should show error when user is already an admin', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);
      mockUserManager.getUser.mockReturnValue(createMockUser({ username: 'testadmin' }));

      adminManageCommand.execute(client, 'add testadmin');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('already an admin')
      );
    });

    it('should show error for invalid admin level', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);
      mockUserManager.getUser.mockReturnValue(createMockUser({ username: 'newuser' }));

      adminManageCommand.execute(client, 'add newuser invalidlevel');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Invalid admin level')
      );
    });

    it('should add new admin with default mod level', async () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);
      mockUserManager.getUser.mockReturnValue(createMockUser({ username: 'newuser' }));
      mockUserManager.getActiveUserSession.mockReturnValue(undefined);

      adminManageCommand.execute(client, 'add newuser');
      await flushPromises();

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('has been granted')
      );
      expect(mockRepository.saveAll).toHaveBeenCalled();
    });

    it('should add new admin with specified level', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);
      mockUserManager.getUser.mockReturnValue(createMockUser({ username: 'newuser' }));
      mockUserManager.getActiveUserSession.mockReturnValue(undefined);

      adminManageCommand.execute(client, 'add newuser admin');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('admin privileges')
      );
    });

    it('should notify target user if they are online', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      const targetClient = createMockClient({
        user: createMockUser({ username: 'newuser' }),
      });
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);
      mockUserManager.getUser.mockReturnValue(createMockUser({ username: 'newuser' }));
      mockUserManager.getActiveUserSession.mockReturnValue(targetClient);

      adminManageCommand.execute(client, 'add newuser admin');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        targetClient,
        expect.stringContaining('has granted you')
      );
    });

    it('should prevent non-super admin from adding super admins', async () => {
      // Make repository return admin list where 'regularadmin' is only an 'admin' level user
      (mockRepository.findAll as jest.Mock).mockResolvedValueOnce([
        { username: 'admin', level: 'super', addedBy: 'system', addedOn: '2023-01-01' },
        { username: 'regularadmin', level: 'admin', addedBy: 'admin', addedOn: '2023-01-01' },
      ]);

      const newCommand = new AdminManageCommand(mockUserManager);
      await newCommand.ensureInitialized();
      newCommand.setSudoCommand(mockSudoCommand);

      const client = createMockClient({
        user: createMockUser({ username: 'regularadmin' }),
      });
      // regularadmin is an admin, so isAuthorized passes, but isSuperAdmin returns true for the test
      // However, the command's own isUserSuperAdmin check should fail because regularadmin is level 'admin' not 'super'
      mockSudoCommand.isAuthorized.mockReturnValue(true);
      mockSudoCommand.isSuperAdmin.mockReturnValue(true); // Passes initial check
      mockUserManager.getUser.mockReturnValue(createMockUser({ username: 'newuser' }));

      newCommand.execute(client, 'add newuser super');
      await flushPromises();

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Only super admins can add other super admins')
      );
    });
  });

  describe('remove action', () => {
    it('should require super admin privileges', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testadmin' }),
      });
      mockSudoCommand.isAuthorized.mockReturnValue(true);
      mockSudoCommand.isSuperAdmin.mockReturnValue(false);

      adminManageCommand.execute(client, 'remove testmod');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Only super admins')
      );
    });

    it('should show error when username is missing', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);

      adminManageCommand.execute(client, 'remove');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Missing username')
      );
    });

    it('should prevent removing the main admin account', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'superadmin' }),
      });
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);

      adminManageCommand.execute(client, 'remove admin');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Cannot remove the main admin')
      );
    });

    it('should show error when target is not an admin', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);

      adminManageCommand.execute(client, 'remove regularuser');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('is not an admin')
      );
    });

    it('should remove admin successfully', async () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);
      mockUserManager.getActiveUserSession.mockReturnValue(undefined);

      adminManageCommand.execute(client, 'remove testmod');
      await flushPromises();

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('privileges have been revoked')
      );
      expect(mockRepository.saveAll).toHaveBeenCalled();
    });

    it('should notify target user if they are online', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      const targetClient = createMockClient({
        user: createMockUser({ username: 'testmod' }),
      });
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);
      mockUserManager.getActiveUserSession.mockReturnValue(targetClient);

      adminManageCommand.execute(client, 'remove testmod');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        targetClient,
        expect.stringContaining('has revoked your admin privileges')
      );
    });

    it('should prevent non-super admin from removing super admins', () => {
      // Setup: regularadmin (admin level) tries to remove superadmin (super level)
      (mockFs.readFileSync as jest.Mock).mockReturnValueOnce(
        JSON.stringify({
          admins: [
            { username: 'admin', level: 'super', addedBy: 'system', addedOn: '2023-01-01' },
            { username: 'superadmin', level: 'super', addedBy: 'admin', addedOn: '2023-01-01' },
            { username: 'regularadmin', level: 'admin', addedBy: 'admin', addedOn: '2023-01-01' },
          ],
        })
      );

      const newCommand = new AdminManageCommand(mockUserManager);
      newCommand.setSudoCommand(mockSudoCommand);

      const client = createMockClient({
        user: createMockUser({ username: 'regularadmin' }),
      });
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);

      newCommand.execute(client, 'remove superadmin');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('do not have permission')
      );
    });
  });

  describe('modify action', () => {
    it('should require super admin privileges', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testadmin' }),
      });
      mockSudoCommand.isAuthorized.mockReturnValue(true);
      mockSudoCommand.isSuperAdmin.mockReturnValue(false);

      adminManageCommand.execute(client, 'modify testmod admin');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Only super admins')
      );
    });

    it('should show error when username or level is missing', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);

      adminManageCommand.execute(client, 'modify testmod');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Missing username or level')
      );
    });

    it('should prevent modifying the main admin account', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'superadmin' }),
      });
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);

      adminManageCommand.execute(client, 'modify admin mod');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Cannot modify the main admin')
      );
    });

    it('should show error when target is not an admin', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);

      adminManageCommand.execute(client, 'modify regularuser admin');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('is not an admin')
      );
    });

    it('should show error for invalid admin level', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);

      adminManageCommand.execute(client, 'modify testmod invalidlevel');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Invalid admin level')
      );
    });

    it('should modify admin level successfully', async () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);
      mockUserManager.getActiveUserSession.mockReturnValue(undefined);

      adminManageCommand.execute(client, 'modify testmod admin');
      await flushPromises();

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('admin level has been changed')
      );
      expect(mockRepository.saveAll).toHaveBeenCalled();
    });

    it('should notify target user if they are online', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      const targetClient = createMockClient({
        user: createMockUser({ username: 'testmod' }),
      });
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);
      mockUserManager.getActiveUserSession.mockReturnValue(targetClient);

      adminManageCommand.execute(client, 'modify testmod admin');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        targetClient,
        expect.stringContaining('has changed your admin level')
      );
    });

    it('should require super admin level to modify other admins', async () => {
      // Setup: regularadmin (admin level) tries to modify testmod
      (mockRepository.findAll as jest.Mock).mockResolvedValueOnce([
        { username: 'admin', level: 'super', addedBy: 'system', addedOn: '2023-01-01' },
        { username: 'regularadmin', level: 'admin', addedBy: 'admin', addedOn: '2023-01-01' },
        { username: 'testmod', level: 'mod', addedBy: 'admin', addedOn: '2023-01-01' },
      ]);

      const newCommand = new AdminManageCommand(mockUserManager);
      await newCommand.ensureInitialized();
      newCommand.setSudoCommand(mockSudoCommand);

      const client = createMockClient({
        user: createMockUser({ username: 'regularadmin' }),
      });
      mockSudoCommand.isAuthorized.mockReturnValue(true);
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);

      newCommand.execute(client, 'modify testmod super');
      await flushPromises();

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Only super admins')
      );
    });
  });

  describe('destroy action', () => {
    it('should show error when item instance ID is missing', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      adminManageCommand.execute(client, 'destroy');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Missing item instance ID')
      );
    });

    it('should show error when item is not found', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      mockItemManager.getItemInstance.mockReturnValue(undefined);

      adminManageCommand.execute(client, 'destroy nonexistent-item-id');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('not found'));
    });

    it('should destroy item and remove from user inventory', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      const mockInstance = createMockItemInstance({
        instanceId: 'test-item-instance',
        templateId: 'sword-template',
      });

      mockItemManager.getItemInstance.mockReturnValue(mockInstance);
      mockItemManager.getItemDisplayName = jest.fn().mockReturnValue('Test Sword');
      mockItemManager.addItemHistory = jest.fn();
      mockItemManager.deleteItemInstance.mockReturnValue(true);

      const userWithItem = createMockUser({
        username: 'targetuser',
        inventory: {
          items: ['test-item-instance'],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      });
      mockUserManager.getAllUsers.mockReturnValue([userWithItem]);
      mockUserManager.getActiveUserSession.mockReturnValue(undefined);
      mockRoomManager.getAllRooms.mockReturnValue([]);

      adminManageCommand.execute(client, 'destroy test-item-instance');

      expect(mockUserManager.updateUserInventory).toHaveBeenCalled();
      expect(mockItemManager.deleteItemInstance).toHaveBeenCalledWith('test-item-instance');
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('permanently destroyed')
      );
    });

    it('should notify user when item is destroyed from their inventory', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      const targetClient = createMockClient({
        user: createMockUser({ username: 'targetuser' }),
      });

      const mockInstance = createMockItemInstance({
        instanceId: 'test-item-instance',
        templateId: 'sword-template',
      });

      mockItemManager.getItemInstance.mockReturnValue(mockInstance);
      mockItemManager.getItemDisplayName = jest.fn().mockReturnValue('Test Sword');
      mockItemManager.addItemHistory = jest.fn();
      mockItemManager.deleteItemInstance.mockReturnValue(true);

      const userWithItem = createMockUser({
        username: 'targetuser',
        inventory: {
          items: ['test-item-instance'],
          currency: { gold: 0, silver: 0, copper: 0 },
        },
      });
      mockUserManager.getAllUsers.mockReturnValue([userWithItem]);
      mockUserManager.getActiveUserSession.mockReturnValue(targetClient);
      mockRoomManager.getAllRooms.mockReturnValue([]);

      adminManageCommand.execute(client, 'destroy test-item-instance');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        targetClient,
        expect.stringContaining('has destroyed')
      );
    });

    it('should remove item from user equipment', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      const mockInstance = createMockItemInstance({
        instanceId: 'test-item-instance',
        templateId: 'sword-template',
      });

      mockItemManager.getItemInstance.mockReturnValue(mockInstance);
      mockItemManager.getItemDisplayName = jest.fn().mockReturnValue('Test Sword');
      mockItemManager.addItemHistory = jest.fn();
      mockItemManager.deleteItemInstance.mockReturnValue(true);

      const userWithEquipment = createMockUser({
        username: 'targetuser',
        equipment: {
          weapon: 'test-item-instance',
        },
        inventory: { items: [], currency: { gold: 0, silver: 0, copper: 0 } },
      });
      mockUserManager.getAllUsers.mockReturnValue([userWithEquipment]);
      mockUserManager.getActiveUserSession.mockReturnValue(undefined);
      mockRoomManager.getAllRooms.mockReturnValue([]);

      adminManageCommand.execute(client, 'destroy test-item-instance');

      expect(mockUserManager.updateUserInventory).toHaveBeenCalled();
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('removed from')
      );
    });

    it('should remove item from room', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      const mockInstance = createMockItemInstance({
        instanceId: 'test-item-instance',
        templateId: 'sword-template',
      });

      mockItemManager.getItemInstance.mockReturnValue(mockInstance);
      mockItemManager.getItemDisplayName = jest.fn().mockReturnValue('Test Sword');
      mockItemManager.addItemHistory = jest.fn();
      mockItemManager.deleteItemInstance.mockReturnValue(true);

      const mockRoom = createMockRoom('test-room', 'Test Room');
      mockRoom.hasItemInstance = jest.fn().mockReturnValue(true);
      mockRoom.removeItemInstance = jest.fn();

      mockUserManager.getAllUsers.mockReturnValue([]);
      mockRoomManager.getAllRooms.mockReturnValue([mockRoom]);
      mockRoomManager.updateRoom = jest.fn();

      adminManageCommand.execute(client, 'destroy test-item-instance');

      expect(mockRoom.removeItemInstance).toHaveBeenCalledWith('test-item-instance');
      expect(mockRoomManager.updateRoom).toHaveBeenCalledWith(mockRoom);
    });

    it('should handle partial item ID matching', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      const mockInstance = createMockItemInstance({
        instanceId: 'abcdefgh-1234-5678-9abc-def012345678',
        templateId: 'sword-template',
      });

      // First call returns null (no exact match), partial match finds it
      mockItemManager.getItemInstance.mockReturnValueOnce(null);
      mockItemManager.findInstanceByPartialId = jest.fn().mockReturnValue(mockInstance);
      mockItemManager.getItemDisplayName = jest.fn().mockReturnValue('Test Sword');
      mockItemManager.addItemHistory = jest.fn();
      mockItemManager.deleteItemInstance.mockReturnValue(true);

      mockUserManager.getAllUsers.mockReturnValue([]);
      mockRoomManager.getAllRooms.mockReturnValue([]);

      adminManageCommand.execute(client, 'destroy abcdefgh');

      expect(mockItemManager.findInstanceByPartialId).toHaveBeenCalledWith('abcdefgh');
      expect(mockItemManager.deleteItemInstance).toHaveBeenCalledWith(
        'abcdefgh-1234-5678-9abc-def012345678'
      );
    });

    it('should show error for ambiguous partial ID match', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockItemManager.getItemInstance.mockReturnValue(undefined);
      // undefined means multiple matches (ambiguous)
      mockItemManager.findInstanceByPartialId = jest.fn().mockReturnValue(undefined);

      const mockInstances = [
        createMockItemInstance({ instanceId: 'abcdefgh-1111', templateId: 'sword' }),
        createMockItemInstance({ instanceId: 'abcdefgh-2222', templateId: 'axe' }),
      ];
      mockItemManager.getAllItemInstances.mockReturnValue(mockInstances);
      mockItemManager.getItem.mockReturnValue(
        createMockGameItem({ id: 'sword', name: 'Sword', type: 'weapon' })
      );

      adminManageCommand.execute(client, 'destroy abcdefgh');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Multiple items match')
      );
    });

    it('should handle deletion failure', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      const mockInstance = createMockItemInstance({
        instanceId: 'test-item-instance',
        templateId: 'sword-template',
      });

      mockItemManager.getItemInstance.mockReturnValue(mockInstance);
      mockItemManager.getItemDisplayName = jest.fn().mockReturnValue('Test Sword');
      mockItemManager.addItemHistory = jest.fn();
      mockItemManager.deleteItemInstance.mockReturnValue(false);

      mockUserManager.getAllUsers.mockReturnValue([]);
      mockRoomManager.getAllRooms.mockReturnValue([]);

      adminManageCommand.execute(client, 'destroy test-item-instance');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Failed to remove')
      );
    });
  });

  describe('summon action', () => {
    it('should show error when entity ID is missing', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      adminManageCommand.execute(client, 'summon');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Missing ID'));
    });

    it('should show error when admin is not in a valid room', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin', currentRoomId: '' }),
      });

      adminManageCommand.execute(client, 'summon player1');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('not in a valid room')
      );
    });

    it('should show error when room is not found', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin', currentRoomId: 'invalid-room' }),
      });
      mockRoomManager.getRoom.mockReturnValue(undefined);

      adminManageCommand.execute(client, 'summon player1');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Room'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('not found'));
    });

    describe('summoning players', () => {
      it('should summon a player to the admin room', () => {
        const adminRoom = createMockRoom('admin-room', 'Admin Room');
        mockRoomManager.getRoom.mockReturnValue(adminRoom);

        const client = createMockClient({
          user: createMockUser({ username: 'admin', currentRoomId: 'admin-room' }),
        });

        const targetUser = createMockUser({
          username: 'player1',
          currentRoomId: 'old-room',
        });
        mockUserManager.getUser.mockReturnValue(targetUser);
        mockUserManager.getActiveUserSession.mockReturnValue(undefined);
        mockUserManager.getAllUsers.mockReturnValue([]);

        adminManageCommand.execute(client, 'summon player1');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('has been summoned')
        );
      });

      it('should notify summoned player if they are online', () => {
        const adminRoom = createMockRoom('admin-room', 'Admin Room');
        mockRoomManager.getRoom.mockReturnValue(adminRoom);

        const client = createMockClient({
          user: createMockUser({ username: 'admin', currentRoomId: 'admin-room' }),
        });

        const targetUser = createMockUser({
          username: 'player1',
          currentRoomId: 'old-room',
        });

        const targetClient = createMockClient({
          user: targetUser,
          stateData: {
            commandHandler: { handleCommand: jest.fn() },
          },
        });

        mockUserManager.getUser.mockReturnValue(targetUser);
        mockUserManager.getActiveUserSession.mockReturnValue(targetClient);
        mockUserManager.getAllUsers.mockReturnValue([]);

        adminManageCommand.execute(client, 'summon player1');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          targetClient,
          expect.stringContaining('summons you')
        );
      });

      it('should show message when player is already in the room', () => {
        const adminRoom = createMockRoom('admin-room', 'Admin Room');
        mockRoomManager.getRoom.mockReturnValue(adminRoom);

        const client = createMockClient({
          user: createMockUser({ username: 'admin', currentRoomId: 'admin-room' }),
        });

        const targetUser = createMockUser({
          username: 'player1',
          currentRoomId: 'admin-room', // Same room as admin
        });
        mockUserManager.getUser.mockReturnValue(targetUser);

        adminManageCommand.execute(client, 'summon player1');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('already in this room')
        );
      });
    });

    describe('summoning items', () => {
      it('should summon an item to the admin room', () => {
        const adminRoom = createMockRoom('admin-room', 'Admin Room');
        adminRoom.hasItemInstance = jest.fn().mockReturnValue(false);
        adminRoom.addItemInstance = jest.fn();
        mockRoomManager.getRoom.mockReturnValue(adminRoom);
        mockRoomManager.updateRoom = jest.fn();
        mockRoomManager.getAllRooms.mockReturnValue([]);

        const client = createMockClient({
          user: createMockUser({ username: 'admin', currentRoomId: 'admin-room' }),
        });

        const mockInstance = createMockItemInstance({
          instanceId: 'test-item-instance',
          templateId: 'sword-template',
        });

        mockUserManager.getUser.mockReturnValue(undefined); // Not a player
        mockItemManager.getItemInstance.mockReturnValue(mockInstance);
        mockItemManager.getItemDisplayName = jest.fn().mockReturnValue('Test Sword');
        mockItemManager.addItemHistory = jest.fn();
        mockUserManager.getAllUsers.mockReturnValue([]);

        adminManageCommand.execute(client, 'summon test-item-instance');

        expect(adminRoom.addItemInstance).toHaveBeenCalledWith(
          'test-item-instance',
          'sword-template'
        );
        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('has been summoned')
        );
      });

      it('should show message when item is already in room', () => {
        const adminRoom = createMockRoom('admin-room', 'Admin Room');
        adminRoom.hasItemInstance = jest.fn().mockReturnValue(true);
        mockRoomManager.getRoom.mockReturnValue(adminRoom);

        const client = createMockClient({
          user: createMockUser({ username: 'admin', currentRoomId: 'admin-room' }),
        });

        const mockInstance = createMockItemInstance({
          instanceId: 'test-item-instance',
          templateId: 'sword-template',
        });

        mockUserManager.getUser.mockReturnValue(undefined);
        mockItemManager.getItemInstance.mockReturnValue(mockInstance);

        adminManageCommand.execute(client, 'summon test-item-instance');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('already in this room')
        );
      });

      it('should remove item from another room when summoning', () => {
        const adminRoom = createMockRoom('admin-room', 'Admin Room');
        adminRoom.hasItemInstance = jest.fn().mockReturnValue(false);
        adminRoom.addItemInstance = jest.fn();

        const otherRoom = createMockRoom('other-room', 'Other Room');
        otherRoom.hasItemInstance = jest.fn().mockReturnValue(true);
        otherRoom.removeItemInstance = jest.fn();

        mockRoomManager.getRoom.mockReturnValue(adminRoom);
        mockRoomManager.getAllRooms.mockReturnValue([otherRoom]);
        mockRoomManager.updateRoom = jest.fn();

        const client = createMockClient({
          user: createMockUser({ username: 'admin', currentRoomId: 'admin-room' }),
        });

        const mockInstance = createMockItemInstance({
          instanceId: 'test-item-instance',
          templateId: 'sword-template',
        });

        mockUserManager.getUser.mockReturnValue(undefined);
        mockItemManager.getItemInstance.mockReturnValue(mockInstance);
        mockItemManager.getItemDisplayName = jest.fn().mockReturnValue('Test Sword');
        mockItemManager.addItemHistory = jest.fn();
        mockUserManager.getAllUsers.mockReturnValue([]);

        adminManageCommand.execute(client, 'summon test-item-instance');

        expect(otherRoom.removeItemInstance).toHaveBeenCalledWith('test-item-instance');
        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('was removed from')
        );
      });

      it('should remove item from user inventory when summoning', () => {
        const adminRoom = createMockRoom('admin-room', 'Admin Room');
        adminRoom.hasItemInstance = jest.fn().mockReturnValue(false);
        adminRoom.addItemInstance = jest.fn();

        mockRoomManager.getRoom.mockReturnValue(adminRoom);
        mockRoomManager.getAllRooms.mockReturnValue([]);
        mockRoomManager.updateRoom = jest.fn();

        const client = createMockClient({
          user: createMockUser({ username: 'admin', currentRoomId: 'admin-room' }),
        });

        const mockInstance = createMockItemInstance({
          instanceId: 'test-item-instance',
          templateId: 'sword-template',
        });

        const userWithItem = createMockUser({
          username: 'player1',
          inventory: {
            items: ['test-item-instance'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        });

        mockUserManager.getUser.mockReturnValue(undefined);
        mockItemManager.getItemInstance.mockReturnValue(mockInstance);
        mockItemManager.getItemDisplayName = jest.fn().mockReturnValue('Test Sword');
        mockItemManager.addItemHistory = jest.fn();
        mockUserManager.getAllUsers.mockReturnValue([userWithItem]);
        mockUserManager.getActiveUserSession.mockReturnValue(undefined);

        adminManageCommand.execute(client, 'summon test-item-instance');

        expect(mockUserManager.updateUserInventory).toHaveBeenCalled();
      });

      it('should notify user when item is removed from their inventory', () => {
        const adminRoom = createMockRoom('admin-room', 'Admin Room');
        adminRoom.hasItemInstance = jest.fn().mockReturnValue(false);
        adminRoom.addItemInstance = jest.fn();

        mockRoomManager.getRoom.mockReturnValue(adminRoom);
        mockRoomManager.getAllRooms.mockReturnValue([]);
        mockRoomManager.updateRoom = jest.fn();

        const client = createMockClient({
          user: createMockUser({ username: 'admin', currentRoomId: 'admin-room' }),
        });

        const targetClient = createMockClient({
          user: createMockUser({ username: 'player1' }),
        });

        const mockInstance = createMockItemInstance({
          instanceId: 'test-item-instance',
          templateId: 'sword-template',
        });

        const userWithItem = createMockUser({
          username: 'player1',
          inventory: {
            items: ['test-item-instance'],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        });

        mockUserManager.getUser.mockReturnValue(undefined);
        mockItemManager.getItemInstance.mockReturnValue(mockInstance);
        mockItemManager.getItemDisplayName = jest.fn().mockReturnValue('Test Sword');
        mockItemManager.addItemHistory = jest.fn();
        mockUserManager.getAllUsers.mockReturnValue([userWithItem]);
        mockUserManager.getActiveUserSession.mockReturnValue(targetClient);

        adminManageCommand.execute(client, 'summon test-item-instance');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          targetClient,
          expect.stringContaining('vanishes')
        );
      });

      it('should handle partial item ID matching for summon', () => {
        const adminRoom = createMockRoom('admin-room', 'Admin Room');
        adminRoom.hasItemInstance = jest.fn().mockReturnValue(false);
        adminRoom.addItemInstance = jest.fn();
        mockRoomManager.getRoom.mockReturnValue(adminRoom);
        mockRoomManager.getAllRooms.mockReturnValue([]);
        mockRoomManager.updateRoom = jest.fn();

        const client = createMockClient({
          user: createMockUser({ username: 'admin', currentRoomId: 'admin-room' }),
        });

        const mockInstance = createMockItemInstance({
          instanceId: 'abcdefgh-full-uuid',
          templateId: 'sword-template',
        });

        mockUserManager.getUser.mockReturnValue(undefined);
        mockItemManager.getItemInstance.mockReturnValueOnce(null); // No exact match
        mockItemManager.findInstanceByPartialId = jest.fn().mockReturnValue(mockInstance);
        mockItemManager.getItemDisplayName = jest.fn().mockReturnValue('Test Sword');
        mockItemManager.addItemHistory = jest.fn();
        mockUserManager.getAllUsers.mockReturnValue([]);

        adminManageCommand.execute(client, 'summon abcdefgh');

        expect(mockItemManager.findInstanceByPartialId).toHaveBeenCalledWith('abcdefgh');
        expect(adminRoom.addItemInstance).toHaveBeenCalledWith(
          'abcdefgh-full-uuid',
          'sword-template'
        );
      });
    });

    it('should show error when entity is not found', () => {
      const adminRoom = createMockRoom('admin-room', 'Admin Room');
      mockRoomManager.getRoom.mockReturnValue(adminRoom);

      const client = createMockClient({
        user: createMockUser({ username: 'admin', currentRoomId: 'admin-room' }),
      });

      mockUserManager.getUser.mockReturnValue(undefined);
      mockItemManager.getItemInstance.mockReturnValue(undefined);

      adminManageCommand.execute(client, 'summon nonexistent');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('not found'));
    });
  });

  describe('help action', () => {
    it('should show help text', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      adminManageCommand.execute(client, 'help');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Admin Management')
      );
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('list'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('add'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('remove'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('modify'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('destroy'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('summon'));
    });

    it('should show admin levels in help', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      adminManageCommand.execute(client, 'help');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('super'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('admin'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('mod'));
    });
  });

  describe('edge cases', () => {
    it('should handle case-insensitive username matching for isAdmin', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'TESTADMIN' }),
      });
      mockSudoCommand.isAuthorized.mockReturnValue(true);

      adminManageCommand.execute(client, 'list');

      // Should recognize TESTADMIN as admin (case-insensitive)
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Admin Users')
      );
    });

    it('should handle error saving admins gracefully', () => {
      (mockFs.writeFileSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Write error');
      });

      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });
      mockSudoCommand.isSuperAdmin.mockReturnValue(true);
      mockUserManager.getUser.mockReturnValue(createMockUser({ username: 'newuser' }));
      mockUserManager.getActiveUserSession.mockReturnValue(undefined);

      // Should not throw even if save fails
      expect(() => {
        adminManageCommand.execute(client, 'add newuser');
      }).not.toThrow();
    });

    it('should return early from actions if client.user is null', () => {
      const client = createMockClient({ user: null });

      // Directly test private methods would require different approach
      // This tests the execute path
      adminManageCommand.execute(client, 'add testuser');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should handle rooms with legacy items array', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      const mockInstance = createMockItemInstance({
        instanceId: 'test-item-instance',
        templateId: 'sword-template',
      });

      mockItemManager.getItemInstance.mockReturnValue(mockInstance);
      mockItemManager.getItemDisplayName = jest.fn().mockReturnValue('Test Sword');
      mockItemManager.addItemHistory = jest.fn();
      mockItemManager.deleteItemInstance.mockReturnValue(true);

      // Room with legacy items array - items are string IDs
      const mockRoom = createMockRoom('test-room', 'Test Room');
      mockRoom.hasItemInstance = jest.fn().mockReturnValue(false);
      (mockRoom.items as unknown[]) = ['test-item-instance'];

      mockUserManager.getAllUsers.mockReturnValue([]);
      mockRoomManager.getAllRooms.mockReturnValue([mockRoom]);
      mockRoomManager.updateRoom = jest.fn();

      adminManageCommand.execute(client, 'destroy test-item-instance');

      expect(mockRoomManager.updateRoom).toHaveBeenCalled();
    });

    it('should handle rooms with string items in legacy array', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      const mockInstance = createMockItemInstance({
        instanceId: 'test-item-instance',
        templateId: 'sword-template',
      });

      mockItemManager.getItemInstance.mockReturnValue(mockInstance);
      mockItemManager.getItemDisplayName = jest.fn().mockReturnValue('Test Sword');
      mockItemManager.addItemHistory = jest.fn();
      mockItemManager.deleteItemInstance.mockReturnValue(true);

      // Room with legacy items array - items are string IDs
      const mockRoom = createMockRoom('test-room', 'Test Room');
      mockRoom.hasItemInstance = jest.fn().mockReturnValue(false);
      (mockRoom.items as unknown[]) = ['test-item-instance'];

      mockUserManager.getAllUsers.mockReturnValue([]);
      mockRoomManager.getAllRooms.mockReturnValue([mockRoom]);
      mockRoomManager.updateRoom = jest.fn();

      adminManageCommand.execute(client, 'destroy test-item-instance');

      expect(mockRoomManager.updateRoom).toHaveBeenCalled();
    });
  });

  describe('getRoomClients helper', () => {
    it('should return clients in the specified room', () => {
      const adminRoom = createMockRoom('admin-room', 'Admin Room');
      mockRoomManager.getRoom.mockReturnValue(adminRoom);

      const client = createMockClient({
        user: createMockUser({ username: 'admin', currentRoomId: 'admin-room' }),
      });

      const playerInRoom = createMockUser({
        username: 'player1',
        currentRoomId: 'admin-room',
      });

      const playerNotInRoom = createMockUser({
        username: 'player2',
        currentRoomId: 'other-room',
      });

      mockUserManager.getAllUsers.mockReturnValue([playerInRoom, playerNotInRoom]);

      const playerClient = createMockClient({
        user: playerInRoom,
      });

      mockUserManager.getActiveUserSession.mockImplementation((username: string) => {
        if (username === 'player1') return playerClient;
        return undefined;
      });

      const targetUser = createMockUser({
        username: 'summonee',
        currentRoomId: 'old-room',
      });
      mockUserManager.getUser.mockReturnValue(targetUser);

      adminManageCommand.execute(client, 'summon summonee');

      // Verify room clients were queried
      expect(mockUserManager.getAllUsers).toHaveBeenCalled();
    });
  });
});
