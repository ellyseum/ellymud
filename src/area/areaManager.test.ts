/**
 * Unit tests for AreaManager class
 * @module area/areaManager.test
 */

import { AreaManager } from './areaManager';
import { Area, CreateAreaDTO, UpdateAreaDTO, AreaSpawnConfig } from './area';
import { IAsyncAreaRepository } from '../persistence/interfaces';

// Mock dependencies
jest.mock('../persistence/RepositoryFactory', () => ({
  getAreaRepository: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  createContextLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Import mocked modules after jest.mock
import { getAreaRepository } from '../persistence/RepositoryFactory';

/**
 * Creates a mock Area for testing
 */
const createMockArea = (overrides: Partial<Area> = {}): Area => ({
  id: 'test-area',
  name: 'Test Area',
  description: 'A test area',
  levelRange: { min: 1, max: 10 },
  flags: [],
  spawnConfig: [],
  created: '2025-01-01T00:00:00.000Z',
  modified: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

/**
 * Creates a mock IAsyncAreaRepository
 */
const createMockRepository = (): jest.Mocked<IAsyncAreaRepository> => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(undefined),
  save: jest.fn().mockResolvedValue(undefined),
  saveAll: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
});

describe('AreaManager', () => {
  let mockRepository: jest.Mocked<IAsyncAreaRepository>;

  beforeEach(() => {
    // Reset singleton
    AreaManager.resetInstance();

    // Create fresh mock repository
    mockRepository = createMockRepository();
    (getAreaRepository as jest.Mock).mockReturnValue(mockRepository);

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    AreaManager.resetInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = AreaManager.getInstance();
      const instance2 = AreaManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after resetInstance', () => {
      const instance1 = AreaManager.getInstance();
      AreaManager.resetInstance();
      const instance2 = AreaManager.getInstance();

      expect(instance1).not.toBe(instance2);
    });

    it('should call getAreaRepository on instantiation', () => {
      AreaManager.getInstance();

      expect(getAreaRepository).toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('should load areas from repository', async () => {
      const areas = [
        createMockArea({ id: 'area-1', name: 'Area One' }),
        createMockArea({ id: 'area-2', name: 'Area Two' }),
      ];
      mockRepository.findAll.mockResolvedValue(areas);

      const manager = AreaManager.getInstance();
      await manager.initialize();

      expect(mockRepository.findAll).toHaveBeenCalled();
      expect(manager.getAll()).toHaveLength(2);
    });

    it('should clear existing areas before loading', async () => {
      const initialAreas = [createMockArea({ id: 'initial' })];
      const newAreas = [createMockArea({ id: 'new' })];

      mockRepository.findAll.mockResolvedValueOnce(initialAreas).mockResolvedValueOnce(newAreas);

      const manager = AreaManager.getInstance();

      // First init
      await manager.initialize();
      expect(manager.getById('initial')).toBeDefined();

      // Force re-initialization by resetting and creating new instance
      AreaManager.resetInstance();
      mockRepository.findAll.mockResolvedValue(newAreas);
      const newManager = AreaManager.getInstance();
      await newManager.initialize();

      expect(newManager.getById('initial')).toBeUndefined();
      expect(newManager.getById('new')).toBeDefined();
    });

    it('should log warning when already initialized', async () => {
      const manager = AreaManager.getInstance();
      await manager.initialize();

      // Second initialization should warn
      await manager.initialize();

      // findAll should only be called once (first init)
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should handle empty repository', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      const manager = AreaManager.getInstance();
      await manager.initialize();

      expect(manager.getAll()).toHaveLength(0);
    });

    it('should handle repository errors', async () => {
      mockRepository.findAll.mockRejectedValue(new Error('Database error'));

      const manager = AreaManager.getInstance();

      await expect(manager.initialize()).rejects.toThrow('Database error');
    });
  });

  describe('getAll', () => {
    it('should return all areas as array', async () => {
      const areas = [
        createMockArea({ id: 'area-1' }),
        createMockArea({ id: 'area-2' }),
        createMockArea({ id: 'area-3' }),
      ];
      mockRepository.findAll.mockResolvedValue(areas);

      const manager = AreaManager.getInstance();
      await manager.initialize();

      const result = manager.getAll();

      expect(result).toHaveLength(3);
      expect(result.map((a) => a.id)).toEqual(['area-1', 'area-2', 'area-3']);
    });

    it('should return empty array when no areas', () => {
      const manager = AreaManager.getInstance();
      // Not initialized - should still return empty array
      expect(manager.getAll()).toEqual([]);
    });

    it('should return a new array (not internal reference)', async () => {
      const areas = [createMockArea({ id: 'area-1' })];
      mockRepository.findAll.mockResolvedValue(areas);

      const manager = AreaManager.getInstance();
      await manager.initialize();

      const result1 = manager.getAll();
      const result2 = manager.getAll();

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
  });

  describe('getById', () => {
    it('should return area by ID', async () => {
      const area = createMockArea({ id: 'test-id', name: 'Test Name' });
      mockRepository.findAll.mockResolvedValue([area]);

      const manager = AreaManager.getInstance();
      await manager.initialize();

      const result = manager.getById('test-id');

      expect(result).toBeDefined();
      expect(result?.id).toBe('test-id');
      expect(result?.name).toBe('Test Name');
    });

    it('should return undefined for non-existent ID', async () => {
      const area = createMockArea({ id: 'existing' });
      mockRepository.findAll.mockResolvedValue([area]);

      const manager = AreaManager.getInstance();
      await manager.initialize();

      const result = manager.getById('non-existent');

      expect(result).toBeUndefined();
    });

    it('should return undefined when not initialized', () => {
      const manager = AreaManager.getInstance();

      const result = manager.getById('any-id');

      expect(result).toBeUndefined();
    });
  });

  describe('create', () => {
    let manager: AreaManager;

    beforeEach(async () => {
      manager = AreaManager.getInstance();
      await manager.initialize();
    });

    it('should create a new area with minimal DTO', async () => {
      const dto: CreateAreaDTO = {
        id: 'new-area',
        name: 'New Area',
      };

      const result = await manager.create(dto);

      expect(result.id).toBe('new-area');
      expect(result.name).toBe('New Area');
      expect(result.description).toBe('');
      expect(result.levelRange).toEqual({ min: 1, max: 10 });
      expect(result.flags).toEqual([]);
      expect(result.spawnConfig).toEqual([]);
      expect(result.created).toBeDefined();
      expect(result.modified).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalledWith(result);
    });

    it('should create a new area with full DTO', async () => {
      const dto: CreateAreaDTO = {
        id: 'full-area',
        name: 'Full Area',
        description: 'A fully specified area',
        levelRange: { min: 5, max: 15 },
        flags: ['no-recall', 'quest-zone'],
        combatConfig: {
          pvpEnabled: true,
          dangerLevel: 5,
          xpMultiplier: 1.5,
        },
        defaultRoomFlags: ['safe'],
      };

      const result = await manager.create(dto);

      expect(result.id).toBe('full-area');
      expect(result.name).toBe('Full Area');
      expect(result.description).toBe('A fully specified area');
      expect(result.levelRange).toEqual({ min: 5, max: 15 });
      expect(result.flags).toEqual(['no-recall', 'quest-zone']);
      expect(result.combatConfig).toEqual({
        pvpEnabled: true,
        dangerLevel: 5,
        xpMultiplier: 1.5,
      });
      expect(result.defaultRoomFlags).toEqual(['safe']);
    });

    it('should add the new area to internal cache', async () => {
      const dto: CreateAreaDTO = {
        id: 'cached-area',
        name: 'Cached Area',
      };

      await manager.create(dto);

      const retrieved = manager.getById('cached-area');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Cached Area');
    });

    it('should throw error for duplicate ID', async () => {
      const existingArea = createMockArea({ id: 'existing-area' });
      mockRepository.findAll.mockResolvedValue([existingArea]);

      // Re-initialize with existing area
      AreaManager.resetInstance();
      const freshManager = AreaManager.getInstance();
      await freshManager.initialize();

      const dto: CreateAreaDTO = {
        id: 'existing-area',
        name: 'Duplicate',
      };

      await expect(freshManager.create(dto)).rejects.toThrow(
        "Area with ID 'existing-area' already exists"
      );
    });

    it('should save the new area to repository', async () => {
      const dto: CreateAreaDTO = {
        id: 'saved-area',
        name: 'Saved Area',
      };

      await manager.create(dto);

      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'saved-area',
          name: 'Saved Area',
        })
      );
    });

    it('should set created and modified timestamps', async () => {
      const beforeCreate = new Date().toISOString();

      const dto: CreateAreaDTO = {
        id: 'timestamp-area',
        name: 'Timestamp Area',
      };

      const result = await manager.create(dto);

      const afterCreate = new Date().toISOString();

      expect(result.created >= beforeCreate).toBe(true);
      expect(result.created <= afterCreate).toBe(true);
      expect(result.modified).toBe(result.created);
    });
  });

  describe('update', () => {
    let manager: AreaManager;
    const existingArea = createMockArea({
      id: 'update-test',
      name: 'Original Name',
      description: 'Original description',
      levelRange: { min: 1, max: 10 },
      flags: ['original-flag'],
    });

    beforeEach(async () => {
      mockRepository.findAll.mockResolvedValue([existingArea]);
      manager = AreaManager.getInstance();
      await manager.initialize();
    });

    it('should update area name', async () => {
      const dto: UpdateAreaDTO = {
        name: 'Updated Name',
      };

      const result = await manager.update('update-test', dto);

      expect(result.name).toBe('Updated Name');
      expect(result.description).toBe('Original description');
    });

    it('should update area description', async () => {
      const dto: UpdateAreaDTO = {
        description: 'Updated description',
      };

      const result = await manager.update('update-test', dto);

      expect(result.description).toBe('Updated description');
      expect(result.name).toBe('Original Name');
    });

    it('should update level range', async () => {
      const dto: UpdateAreaDTO = {
        levelRange: { min: 10, max: 20 },
      };

      const result = await manager.update('update-test', dto);

      expect(result.levelRange).toEqual({ min: 10, max: 20 });
    });

    it('should update flags', async () => {
      const dto: UpdateAreaDTO = {
        flags: ['new-flag', 'another-flag'],
      };

      const result = await manager.update('update-test', dto);

      expect(result.flags).toEqual(['new-flag', 'another-flag']);
    });

    it('should update combat config', async () => {
      const dto: UpdateAreaDTO = {
        combatConfig: {
          pvpEnabled: true,
          dangerLevel: 8,
          xpMultiplier: 2.0,
        },
      };

      const result = await manager.update('update-test', dto);

      expect(result.combatConfig).toEqual({
        pvpEnabled: true,
        dangerLevel: 8,
        xpMultiplier: 2.0,
      });
    });

    it('should update spawn config', async () => {
      const spawnConfig: AreaSpawnConfig[] = [
        {
          npcTemplateId: 'goblin',
          maxInstances: 5,
          respawnTicks: 60,
        },
      ];
      const dto: UpdateAreaDTO = {
        spawnConfig,
      };

      const result = await manager.update('update-test', dto);

      expect(result.spawnConfig).toEqual(spawnConfig);
    });

    it('should update modified timestamp', async () => {
      const originalModified = existingArea.modified;
      const dto: UpdateAreaDTO = {
        name: 'Timestamp Update',
      };

      const result = await manager.update('update-test', dto);

      expect(result.modified).not.toBe(originalModified);
      expect(result.created).toBe(existingArea.created);
    });

    it('should preserve fields not in DTO', async () => {
      const dto: UpdateAreaDTO = {
        name: 'Only Name Changed',
      };

      const result = await manager.update('update-test', dto);

      expect(result.id).toBe('update-test');
      expect(result.description).toBe('Original description');
      expect(result.levelRange).toEqual({ min: 1, max: 10 });
      expect(result.flags).toEqual(['original-flag']);
      expect(result.created).toBe(existingArea.created);
    });

    it('should throw error for non-existent area', async () => {
      const dto: UpdateAreaDTO = {
        name: 'Updated',
      };

      await expect(manager.update('non-existent', dto)).rejects.toThrow(
        "Area 'non-existent' not found"
      );
    });

    it('should save updated area to repository', async () => {
      const dto: UpdateAreaDTO = {
        name: 'Saved Update',
      };

      await manager.update('update-test', dto);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'update-test',
          name: 'Saved Update',
        })
      );
    });

    it('should update internal cache', async () => {
      const dto: UpdateAreaDTO = {
        name: 'Cached Update',
      };

      await manager.update('update-test', dto);

      const cached = manager.getById('update-test');
      expect(cached?.name).toBe('Cached Update');
    });
  });

  describe('delete', () => {
    let manager: AreaManager;
    const existingArea = createMockArea({ id: 'delete-test' });

    beforeEach(async () => {
      mockRepository.findAll.mockResolvedValue([existingArea]);
      manager = AreaManager.getInstance();
      await manager.initialize();
    });

    it('should delete area from cache', async () => {
      expect(manager.getById('delete-test')).toBeDefined();

      await manager.delete('delete-test');

      expect(manager.getById('delete-test')).toBeUndefined();
    });

    it('should call repository delete', async () => {
      await manager.delete('delete-test');

      expect(mockRepository.delete).toHaveBeenCalledWith('delete-test');
    });

    it('should throw error for non-existent area', async () => {
      await expect(manager.delete('non-existent')).rejects.toThrow("Area 'non-existent' not found");
    });

    it('should not call repository if area does not exist', async () => {
      try {
        await manager.delete('non-existent');
      } catch {
        // Expected
      }

      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should remove area from getAll results', async () => {
      expect(manager.getAll()).toHaveLength(1);

      await manager.delete('delete-test');

      expect(manager.getAll()).toHaveLength(0);
    });
  });

  describe('addSpawnConfig', () => {
    let manager: AreaManager;

    // Use a factory function to create fresh area for each test
    const createFreshArea = () =>
      createMockArea({
        id: 'spawn-test',
        spawnConfig: [],
      });

    beforeEach(async () => {
      const freshArea = createFreshArea();
      mockRepository.findAll.mockResolvedValue([freshArea]);
      manager = AreaManager.getInstance();
      await manager.initialize();
    });

    it('should add spawn config to area', async () => {
      const config: AreaSpawnConfig = {
        npcTemplateId: 'goblin',
        maxInstances: 3,
        respawnTicks: 60,
      };

      const result = await manager.addSpawnConfig('spawn-test', config);

      expect(result.spawnConfig).toHaveLength(1);
      expect(result.spawnConfig[0]).toEqual(config);
    });

    it('should append to existing spawn configs', async () => {
      // Setup area with initial spawn config
      const areaWithConfig = createMockArea({
        id: 'append-spawn-test',
        spawnConfig: [{ npcTemplateId: 'goblin', maxInstances: 3, respawnTicks: 60 }],
      });
      mockRepository.findAll.mockResolvedValue([areaWithConfig]);
      AreaManager.resetInstance();
      const appendManager = AreaManager.getInstance();
      await appendManager.initialize();

      const config2: AreaSpawnConfig = {
        npcTemplateId: 'orc',
        maxInstances: 2,
        respawnTicks: 120,
      };

      const result = await appendManager.addSpawnConfig('append-spawn-test', config2);

      expect(result.spawnConfig).toHaveLength(2);
      expect(result.spawnConfig[0].npcTemplateId).toBe('goblin');
      expect(result.spawnConfig[1].npcTemplateId).toBe('orc');
    });

    it('should update modified timestamp', async () => {
      // Setup area with known fixed timestamp
      const areaWithTimestamp = createMockArea({
        id: 'timestamp-spawn-test',
        modified: '2020-01-01T00:00:00.000Z',
        spawnConfig: [],
      });
      mockRepository.findAll.mockResolvedValue([areaWithTimestamp]);
      AreaManager.resetInstance();
      const timestampManager = AreaManager.getInstance();
      await timestampManager.initialize();

      const config: AreaSpawnConfig = {
        npcTemplateId: 'goblin',
        maxInstances: 3,
        respawnTicks: 60,
      };

      const result = await timestampManager.addSpawnConfig('timestamp-spawn-test', config);

      expect(result.modified).not.toBe('2020-01-01T00:00:00.000Z');
    });

    it('should save area to repository', async () => {
      const config: AreaSpawnConfig = {
        npcTemplateId: 'goblin',
        maxInstances: 3,
        respawnTicks: 60,
      };

      await manager.addSpawnConfig('spawn-test', config);

      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw error for non-existent area', async () => {
      const config: AreaSpawnConfig = {
        npcTemplateId: 'goblin',
        maxInstances: 3,
        respawnTicks: 60,
      };

      await expect(manager.addSpawnConfig('non-existent', config)).rejects.toThrow(
        "Area 'non-existent' not found"
      );
    });

    it('should handle config with spawn rooms', async () => {
      // Create fresh manager for this test
      const freshArea = createMockArea({
        id: 'rooms-spawn-test',
        spawnConfig: [],
      });
      mockRepository.findAll.mockResolvedValue([freshArea]);
      AreaManager.resetInstance();
      const roomsManager = AreaManager.getInstance();
      await roomsManager.initialize();

      const config: AreaSpawnConfig = {
        npcTemplateId: 'goblin',
        maxInstances: 3,
        respawnTicks: 60,
        spawnRooms: ['room-1', 'room-2'],
      };

      const result = await roomsManager.addSpawnConfig('rooms-spawn-test', config);

      expect(result.spawnConfig[0].spawnRooms).toEqual(['room-1', 'room-2']);
    });
  });

  describe('removeSpawnConfig', () => {
    let manager: AreaManager;

    // Use a factory function to create fresh area for each test
    const createAreaWithSpawns = () =>
      createMockArea({
        id: 'remove-spawn-test',
        modified: '2020-01-01T00:00:00.000Z',
        spawnConfig: [
          { npcTemplateId: 'goblin', maxInstances: 3, respawnTicks: 60 },
          { npcTemplateId: 'orc', maxInstances: 2, respawnTicks: 120 },
          { npcTemplateId: 'troll', maxInstances: 1, respawnTicks: 180 },
        ],
      });

    beforeEach(async () => {
      const freshArea = createAreaWithSpawns();
      mockRepository.findAll.mockResolvedValue([freshArea]);
      manager = AreaManager.getInstance();
      await manager.initialize();
    });

    it('should remove spawn config by npcTemplateId', async () => {
      const result = await manager.removeSpawnConfig('remove-spawn-test', 'orc');

      expect(result.spawnConfig).toHaveLength(2);
      expect(result.spawnConfig.find((c) => c.npcTemplateId === 'orc')).toBeUndefined();
      expect(result.spawnConfig.find((c) => c.npcTemplateId === 'goblin')).toBeDefined();
      expect(result.spawnConfig.find((c) => c.npcTemplateId === 'troll')).toBeDefined();
    });

    it('should update modified timestamp', async () => {
      const result = await manager.removeSpawnConfig('remove-spawn-test', 'orc');

      expect(result.modified).not.toBe('2020-01-01T00:00:00.000Z');
    });

    it('should save area to repository', async () => {
      await manager.removeSpawnConfig('remove-spawn-test', 'orc');

      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw error for non-existent area', async () => {
      await expect(manager.removeSpawnConfig('non-existent', 'goblin')).rejects.toThrow(
        "Area 'non-existent' not found"
      );
    });

    it('should handle removing non-existent spawn config gracefully', async () => {
      // Should not throw, but since filter still runs, it still saves/modifies
      const result = await manager.removeSpawnConfig('remove-spawn-test', 'dragon');

      // All original spawns should still be there since 'dragon' doesn't exist
      expect(result.spawnConfig.find((c) => c.npcTemplateId === 'goblin')).toBeDefined();
      expect(result.spawnConfig.find((c) => c.npcTemplateId === 'orc')).toBeDefined();
      expect(result.spawnConfig.find((c) => c.npcTemplateId === 'troll')).toBeDefined();
    });

    it('should remove all configs for same npcTemplateId', async () => {
      // Add duplicate
      const areaWithDuplicates = createMockArea({
        id: 'duplicate-spawn-test',
        spawnConfig: [
          { npcTemplateId: 'goblin', maxInstances: 3, respawnTicks: 60 },
          { npcTemplateId: 'goblin', maxInstances: 5, respawnTicks: 120 },
        ],
      });
      mockRepository.findAll.mockResolvedValue([areaWithDuplicates]);
      AreaManager.resetInstance();
      const newManager = AreaManager.getInstance();
      await newManager.initialize();

      const result = await newManager.removeSpawnConfig('duplicate-spawn-test', 'goblin');

      expect(result.spawnConfig).toHaveLength(0);
    });
  });

  describe('saveAll', () => {
    let manager: AreaManager;
    const areas = [
      createMockArea({ id: 'area-1' }),
      createMockArea({ id: 'area-2' }),
      createMockArea({ id: 'area-3' }),
    ];

    beforeEach(async () => {
      mockRepository.findAll.mockResolvedValue(areas);
      manager = AreaManager.getInstance();
      await manager.initialize();
    });

    it('should call repository saveAll with all areas', async () => {
      await manager.saveAll();

      expect(mockRepository.saveAll).toHaveBeenCalledTimes(1);
      expect(mockRepository.saveAll).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'area-1' }),
          expect.objectContaining({ id: 'area-2' }),
          expect.objectContaining({ id: 'area-3' }),
        ])
      );
    });

    it('should handle empty area list', async () => {
      mockRepository.findAll.mockResolvedValue([]);
      AreaManager.resetInstance();
      const emptyManager = AreaManager.getInstance();
      await emptyManager.initialize();

      await emptyManager.saveAll();

      expect(mockRepository.saveAll).toHaveBeenCalledWith([]);
    });

    it('should handle repository errors', async () => {
      mockRepository.saveAll.mockRejectedValue(new Error('Save failed'));

      await expect(manager.saveAll()).rejects.toThrow('Save failed');
    });
  });

  describe('resetInstance', () => {
    it('should reset the singleton instance', () => {
      const instance1 = AreaManager.getInstance();
      AreaManager.resetInstance();
      const instance2 = AreaManager.getInstance();

      expect(instance1).not.toBe(instance2);
    });

    it('should allow re-initialization after reset', async () => {
      const areas1 = [createMockArea({ id: 'first' })];
      const areas2 = [createMockArea({ id: 'second' })];

      mockRepository.findAll.mockResolvedValue(areas1);
      const manager1 = AreaManager.getInstance();
      await manager1.initialize();
      expect(manager1.getById('first')).toBeDefined();

      AreaManager.resetInstance();

      mockRepository.findAll.mockResolvedValue(areas2);
      const manager2 = AreaManager.getInstance();
      await manager2.initialize();
      expect(manager2.getById('first')).toBeUndefined();
      expect(manager2.getById('second')).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle area with empty strings', async () => {
      const manager = AreaManager.getInstance();
      await manager.initialize();

      const dto: CreateAreaDTO = {
        id: 'empty-strings',
        name: '',
        description: '',
      };

      const result = await manager.create(dto);

      expect(result.name).toBe('');
      expect(result.description).toBe('');
    });

    it('should handle area with special characters in ID', async () => {
      const manager = AreaManager.getInstance();
      await manager.initialize();

      const dto: CreateAreaDTO = {
        id: 'area-with-special_chars.test',
        name: 'Special Area',
      };

      const result = await manager.create(dto);

      expect(result.id).toBe('area-with-special_chars.test');
      expect(manager.getById('area-with-special_chars.test')).toBeDefined();
    });

    it('should handle concurrent operations', async () => {
      mockRepository.findAll.mockResolvedValue([]);
      const manager = AreaManager.getInstance();
      await manager.initialize();

      // Create multiple areas concurrently
      const creates = [
        manager.create({ id: 'concurrent-1', name: 'C1' }),
        manager.create({ id: 'concurrent-2', name: 'C2' }),
        manager.create({ id: 'concurrent-3', name: 'C3' }),
      ];

      await Promise.all(creates);

      expect(manager.getAll()).toHaveLength(3);
    });

    it('should handle large number of areas', async () => {
      const manyAreas = Array.from({ length: 100 }, (_, i) =>
        createMockArea({ id: `area-${i}`, name: `Area ${i}` })
      );
      mockRepository.findAll.mockResolvedValue(manyAreas);

      const manager = AreaManager.getInstance();
      await manager.initialize();

      expect(manager.getAll()).toHaveLength(100);
      expect(manager.getById('area-50')).toBeDefined();
      expect(manager.getById('area-99')).toBeDefined();
    });
  });
});
