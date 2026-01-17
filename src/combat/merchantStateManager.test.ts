/**
 * Unit tests for MerchantStateManager
 * @module combat/merchantStateManager.test
 */

import { MerchantInventoryState } from './merchant';

// Create mock repository functions that we can control per test
const mockFindAll = jest.fn();
const mockFindByNpcTemplateId = jest.fn();
const mockFindByNpcInstanceId = jest.fn();
const mockSave = jest.fn();
const mockSaveAll = jest.fn();
const mockDelete = jest.fn();
const mockDeleteAll = jest.fn();

// Mock RepositoryFactory FIRST to avoid config import issues
jest.mock('../persistence/RepositoryFactory', () => ({
  getMerchantStateRepository: jest.fn().mockReturnValue({
    findAll: mockFindAll,
    findByNpcTemplateId: mockFindByNpcTemplateId,
    findByNpcInstanceId: mockFindByNpcInstanceId,
    save: mockSave,
    saveAll: mockSaveAll,
    delete: mockDelete,
    deleteAll: mockDeleteAll,
  }),
}));

// Mock systemLogger to avoid log noise
jest.mock('../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { MerchantStateManager } from './merchantStateManager';
import { systemLogger } from '../utils/logger';

describe('MerchantStateManager', () => {
  // Helper to create mock MerchantInventoryState
  const createMockState = (
    templateId: string,
    instanceId: string = 'inst-1'
  ): MerchantInventoryState => ({
    npcInstanceId: instanceId,
    npcTemplateId: templateId,
    actualInventory: ['item-1', 'item-2'],
    stockConfig: [],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    MerchantStateManager.resetInstance();
    // Default: empty states
    mockFindAll.mockResolvedValue([]);
  });

  afterEach(() => {
    MerchantStateManager.resetInstance();
  });

  describe('getInstance (singleton pattern)', () => {
    it('should return the same instance on multiple calls', async () => {
      mockFindAll.mockResolvedValue([]);

      const instance1 = MerchantStateManager.getInstance();
      const instance2 = MerchantStateManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create a new instance if none exists', async () => {
      mockFindAll.mockResolvedValue([]);

      const instance = MerchantStateManager.getInstance();

      expect(instance).toBeInstanceOf(MerchantStateManager);
    });

    it('should call repository findAll on first instantiation', async () => {
      mockFindAll.mockResolvedValue([]);

      const instance = MerchantStateManager.getInstance();
      await instance.ensureInitialized();

      expect(mockFindAll).toHaveBeenCalled();
    });
  });

  describe('loadState', () => {
    describe('when states exist in repository', () => {
      const mockStates: MerchantInventoryState[] = [
        createMockState('merchant-1', 'old-instance-1'),
        createMockState('merchant-2', 'old-instance-2'),
      ];

      beforeEach(() => {
        mockFindAll.mockResolvedValue(mockStates);
      });

      it('should load states from repository', async () => {
        const manager = MerchantStateManager.getInstance();
        await manager.ensureInitialized();

        expect(mockFindAll).toHaveBeenCalled();
        expect(manager.hasSavedState('merchant-1')).toBe(true);
        expect(manager.hasSavedState('merchant-2')).toBe(true);
      });

      it('should key states by npcTemplateId', async () => {
        const manager = MerchantStateManager.getInstance();
        await manager.ensureInitialized();

        const state1 = manager.getMerchantState('merchant-1');
        const state2 = manager.getMerchantState('merchant-2');

        expect(state1?.npcTemplateId).toBe('merchant-1');
        expect(state2?.npcTemplateId).toBe('merchant-2');
      });

      it('should log the number of loaded states', async () => {
        const manager = MerchantStateManager.getInstance();
        await manager.ensureInitialized();

        expect(systemLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Loaded 2 merchant states')
        );
      });

      it('should correctly parse states into Map', async () => {
        const manager = MerchantStateManager.getInstance();
        await manager.ensureInitialized();

        const state = manager.getMerchantState('merchant-1');
        expect(state).toEqual(mockStates[0]);
      });
    });

    describe('when no states exist', () => {
      beforeEach(() => {
        mockFindAll.mockResolvedValue([]);
      });

      it('should have empty state map', async () => {
        const manager = MerchantStateManager.getInstance();
        await manager.ensureInitialized();

        expect(manager.hasSavedState('any-merchant')).toBe(false);
      });

      it('should log loaded 0 states', async () => {
        const manager = MerchantStateManager.getInstance();
        await manager.ensureInitialized();

        expect(systemLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Loaded 0 merchant states')
        );
      });
    });

    describe('error handling', () => {
      it('should handle repository errors gracefully', async () => {
        mockFindAll.mockRejectedValue(new Error('Repository error'));

        const manager = MerchantStateManager.getInstance();
        await manager.ensureInitialized();

        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Error loading merchant state'),
          expect.any(Error)
        );
        expect(manager.hasSavedState('any')).toBe(false);
      });
    });
  });

  describe('saveState', () => {
    it('should save all states to repository', async () => {
      mockFindAll.mockResolvedValue([]);
      mockSaveAll.mockResolvedValue(undefined);

      const manager = MerchantStateManager.getInstance();
      await manager.ensureInitialized();

      const state1 = createMockState('merchant-1');
      const state2 = createMockState('merchant-2');

      manager.updateMerchantState(state1);
      manager.updateMerchantState(state2);
      await manager.saveState();

      expect(mockSaveAll).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ npcTemplateId: 'merchant-1' }),
          expect.objectContaining({ npcTemplateId: 'merchant-2' }),
        ])
      );
    });

    it('should log the number of saved states', async () => {
      mockFindAll.mockResolvedValue([]);
      mockSaveAll.mockResolvedValue(undefined);

      const manager = MerchantStateManager.getInstance();
      await manager.ensureInitialized();

      manager.updateMerchantState(createMockState('merchant-1'));
      await manager.saveState();

      expect(systemLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Saved 1 merchant states')
      );
    });

    it('should save empty array when no states exist', async () => {
      mockFindAll.mockResolvedValue([]);
      mockSaveAll.mockResolvedValue(undefined);

      const manager = MerchantStateManager.getInstance();
      await manager.ensureInitialized();
      await manager.saveState();

      expect(mockSaveAll).toHaveBeenCalledWith([]);
    });

    it('should handle save errors gracefully', async () => {
      mockFindAll.mockResolvedValue([]);
      mockSaveAll.mockRejectedValue(new Error('Save failed'));

      const manager = MerchantStateManager.getInstance();
      await manager.ensureInitialized();

      manager.updateMerchantState(createMockState('merchant-1'));

      // Should not throw
      await expect(manager.saveState()).resolves.not.toThrow();

      expect(systemLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error saving merchant state'),
        expect.any(Error)
      );
    });
  });

  describe('updateMerchantState', () => {
    it('should add new state to the map', async () => {
      mockFindAll.mockResolvedValue([]);

      const manager = MerchantStateManager.getInstance();
      await manager.ensureInitialized();

      const state = createMockState('new-merchant');
      manager.updateMerchantState(state);

      expect(manager.hasSavedState('new-merchant')).toBe(true);
      expect(manager.getMerchantState('new-merchant')).toEqual(state);
    });

    it('should update existing state in the map', async () => {
      const initialState = createMockState('merchant-1', 'instance-1');
      mockFindAll.mockResolvedValue([initialState]);

      const manager = MerchantStateManager.getInstance();
      await manager.ensureInitialized();

      const updatedState = createMockState('merchant-1', 'new-instance');
      manager.updateMerchantState(updatedState);

      const result = manager.getMerchantState('merchant-1');
      expect(result?.npcInstanceId).toBe('new-instance');
    });

    it('should use npcTemplateId as key', async () => {
      mockFindAll.mockResolvedValue([]);

      const manager = MerchantStateManager.getInstance();
      await manager.ensureInitialized();

      const state1 = createMockState('template-a', 'instance-1');
      const state2 = createMockState('template-b', 'instance-2');

      manager.updateMerchantState(state1);
      manager.updateMerchantState(state2);

      expect(manager.getMerchantState('template-a')?.npcInstanceId).toBe('instance-1');
      expect(manager.getMerchantState('template-b')?.npcInstanceId).toBe('instance-2');
    });
  });

  describe('getMerchantState', () => {
    it('should return state for existing templateId', async () => {
      const mockState = createMockState('merchant-1');
      mockFindAll.mockResolvedValue([mockState]);

      const manager = MerchantStateManager.getInstance();
      await manager.ensureInitialized();

      const result = manager.getMerchantState('merchant-1');
      expect(result).toEqual(mockState);
    });

    it('should return undefined for non-existent templateId', async () => {
      mockFindAll.mockResolvedValue([]);

      const manager = MerchantStateManager.getInstance();
      await manager.ensureInitialized();

      const result = manager.getMerchantState('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('hasSavedState', () => {
    it('should return true for existing state', async () => {
      mockFindAll.mockResolvedValue([createMockState('merchant-1')]);

      const manager = MerchantStateManager.getInstance();
      await manager.ensureInitialized();

      expect(manager.hasSavedState('merchant-1')).toBe(true);
    });

    it('should return false for non-existent state', async () => {
      mockFindAll.mockResolvedValue([]);

      const manager = MerchantStateManager.getInstance();
      await manager.ensureInitialized();

      expect(manager.hasSavedState('non-existent')).toBe(false);
    });
  });

  describe('clearMerchantState', () => {
    it('should remove state from the map', async () => {
      mockFindAll.mockResolvedValue([createMockState('merchant-1')]);

      const manager = MerchantStateManager.getInstance();
      await manager.ensureInitialized();

      expect(manager.hasSavedState('merchant-1')).toBe(true);

      manager.clearMerchantState('merchant-1');

      expect(manager.hasSavedState('merchant-1')).toBe(false);
    });

    it('should not throw for non-existent state', async () => {
      mockFindAll.mockResolvedValue([]);

      const manager = MerchantStateManager.getInstance();
      await manager.ensureInitialized();

      expect(() => manager.clearMerchantState('non-existent')).not.toThrow();
    });
  });

  describe('resetInstance', () => {
    it('should allow creating a new instance after reset', async () => {
      mockFindAll.mockResolvedValue([createMockState('merchant-1')]);

      const instance1 = MerchantStateManager.getInstance();
      await instance1.ensureInitialized();
      expect(instance1.hasSavedState('merchant-1')).toBe(true);

      MerchantStateManager.resetInstance();
      mockFindAll.mockResolvedValue([]); // Reset with empty data

      const instance2 = MerchantStateManager.getInstance();
      await instance2.ensureInitialized();

      expect(instance1).not.toBe(instance2);
      expect(instance2.hasSavedState('merchant-1')).toBe(false);
    });
  });
});
