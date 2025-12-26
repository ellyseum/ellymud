import fs from 'fs';
import { MerchantStateManager } from './merchantStateManager';
import { MerchantInventoryState } from './merchant';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
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

import { systemLogger } from '../utils/logger';

describe('MerchantStateManager', () => {
  // Helper to reset singleton between tests
  const resetSingleton = (): void => {
    // Access private static instance and reset it
    (MerchantStateManager as unknown as { instance: MerchantStateManager | null }).instance = null;
  };

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
    resetSingleton();
    // Default: file doesn't exist
    (fs.existsSync as jest.Mock).mockReturnValue(false);
  });

  afterEach(() => {
    resetSingleton();
  });

  describe('getInstance (singleton pattern)', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = MerchantStateManager.getInstance();
      const instance2 = MerchantStateManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create a new instance if none exists', () => {
      const instance = MerchantStateManager.getInstance();

      expect(instance).toBeInstanceOf(MerchantStateManager);
    });

    it('should call loadState on first instantiation', () => {
      // existsSync is called during loadState
      MerchantStateManager.getInstance();

      expect(fs.existsSync).toHaveBeenCalled();
    });
  });

  describe('loadState', () => {
    describe('when state file exists', () => {
      const mockStates: MerchantInventoryState[] = [
        createMockState('merchant-1', 'old-instance-1'),
        createMockState('merchant-2', 'old-instance-2'),
      ];

      beforeEach(() => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockStates));
      });

      it('should load states from file', () => {
        const manager = MerchantStateManager.getInstance();

        expect(fs.readFileSync).toHaveBeenCalledWith(
          expect.stringContaining('merchant-state.json'),
          'utf-8'
        );
        expect(manager.hasSavedState('merchant-1')).toBe(true);
        expect(manager.hasSavedState('merchant-2')).toBe(true);
      });

      it('should key states by npcTemplateId', () => {
        const manager = MerchantStateManager.getInstance();

        const state1 = manager.getMerchantState('merchant-1');
        const state2 = manager.getMerchantState('merchant-2');

        expect(state1?.npcTemplateId).toBe('merchant-1');
        expect(state2?.npcTemplateId).toBe('merchant-2');
      });

      it('should log the number of loaded states', () => {
        MerchantStateManager.getInstance();

        expect(systemLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Loaded 2 merchant states')
        );
      });

      it('should correctly parse array of states into Map', () => {
        const manager = MerchantStateManager.getInstance();

        const state = manager.getMerchantState('merchant-1');
        expect(state).toEqual(mockStates[0]);
      });
    });

    describe('when state file does not exist', () => {
      beforeEach(() => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);
      });

      it('should not attempt to read file', () => {
        MerchantStateManager.getInstance();

        expect(fs.readFileSync).not.toHaveBeenCalled();
      });

      it('should log starting fresh message', () => {
        MerchantStateManager.getInstance();

        expect(systemLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('No saved merchant state found')
        );
      });

      it('should have empty state map', () => {
        const manager = MerchantStateManager.getInstance();

        expect(manager.hasSavedState('any-merchant')).toBe(false);
      });
    });

    describe('error handling', () => {
      it('should handle file read errors gracefully', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockImplementation(() => {
          throw new Error('File read error');
        });

        // Should not throw
        const manager = MerchantStateManager.getInstance();

        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Error loading merchant state'),
          expect.any(Error)
        );
        expect(manager.hasSavedState('any')).toBe(false);
      });

      it('should handle JSON parse errors gracefully', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue('invalid json {{{');

        // Should not throw
        const manager = MerchantStateManager.getInstance();

        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Error loading merchant state'),
          expect.any(SyntaxError)
        );
        expect(manager.hasSavedState('any')).toBe(false);
      });

      it('should handle empty file gracefully', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue('');

        const manager = MerchantStateManager.getInstance();

        expect(systemLogger.error).toHaveBeenCalled();
        expect(manager.hasSavedState('any')).toBe(false);
      });
    });
  });

  describe('saveState', () => {
    it('should write all states to file as JSON array', () => {
      const manager = MerchantStateManager.getInstance();
      const state1 = createMockState('merchant-1');
      const state2 = createMockState('merchant-2');

      manager.updateMerchantState(state1);
      manager.updateMerchantState(state2);
      manager.saveState();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('merchant-state.json'),
        expect.any(String)
      );

      // Verify JSON structure
      const writtenData = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(writtenData);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
    });

    it('should log the number of saved states', () => {
      const manager = MerchantStateManager.getInstance();
      manager.updateMerchantState(createMockState('merchant-1'));
      manager.saveState();

      expect(systemLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Saved 1 merchant states')
      );
    });

    it('should save empty array when no states exist', () => {
      const manager = MerchantStateManager.getInstance();
      manager.saveState();

      const writtenData = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(writtenData);
      expect(parsed).toEqual([]);
    });

    it('should format JSON with 2-space indentation', () => {
      const manager = MerchantStateManager.getInstance();
      manager.updateMerchantState(createMockState('merchant-1'));
      manager.saveState();

      const writtenData = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      // Check for indentation (2 spaces)
      expect(writtenData).toContain('  "npcInstanceId"');
    });

    describe('error handling', () => {
      it('should handle file write errors gracefully', () => {
        (fs.writeFileSync as jest.Mock).mockImplementation(() => {
          throw new Error('Write error');
        });

        const manager = MerchantStateManager.getInstance();
        manager.updateMerchantState(createMockState('merchant-1'));

        // Should not throw
        expect(() => manager.saveState()).not.toThrow();

        expect(systemLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Error saving merchant state'),
          expect.any(Error)
        );
      });
    });
  });

  describe('updateMerchantState', () => {
    it('should add new state to the map', () => {
      const manager = MerchantStateManager.getInstance();
      const state = createMockState('new-merchant');

      manager.updateMerchantState(state);

      expect(manager.hasSavedState('new-merchant')).toBe(true);
      expect(manager.getMerchantState('new-merchant')).toEqual(state);
    });

    it('should update existing state', () => {
      const manager = MerchantStateManager.getInstance();
      const initialState = createMockState('merchant-1');
      const updatedState: MerchantInventoryState = {
        ...initialState,
        actualInventory: ['new-item-1', 'new-item-2', 'new-item-3'],
      };

      manager.updateMerchantState(initialState);
      manager.updateMerchantState(updatedState);

      const retrieved = manager.getMerchantState('merchant-1');
      expect(retrieved?.actualInventory).toEqual(['new-item-1', 'new-item-2', 'new-item-3']);
    });

    it('should use npcTemplateId as key', () => {
      const manager = MerchantStateManager.getInstance();
      const state = createMockState('template-123', 'instance-456');

      manager.updateMerchantState(state);

      // Should be keyed by template, not instance
      expect(manager.getMerchantState('template-123')).toBeDefined();
      expect(manager.getMerchantState('instance-456')).toBeUndefined();
    });
  });

  describe('getMerchantState', () => {
    it('should return state for existing templateId', () => {
      const manager = MerchantStateManager.getInstance();
      const state = createMockState('merchant-1');
      manager.updateMerchantState(state);

      const result = manager.getMerchantState('merchant-1');

      expect(result).toEqual(state);
    });

    it('should return undefined for non-existent templateId', () => {
      const manager = MerchantStateManager.getInstance();

      const result = manager.getMerchantState('non-existent');

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string templateId', () => {
      const manager = MerchantStateManager.getInstance();

      const result = manager.getMerchantState('');

      expect(result).toBeUndefined();
    });
  });

  describe('hasSavedState', () => {
    it('should return true when state exists', () => {
      const manager = MerchantStateManager.getInstance();
      manager.updateMerchantState(createMockState('merchant-1'));

      expect(manager.hasSavedState('merchant-1')).toBe(true);
    });

    it('should return false when state does not exist', () => {
      const manager = MerchantStateManager.getInstance();

      expect(manager.hasSavedState('non-existent')).toBe(false);
    });

    it('should return false for empty string', () => {
      const manager = MerchantStateManager.getInstance();

      expect(manager.hasSavedState('')).toBe(false);
    });
  });

  describe('clearMerchantState', () => {
    it('should remove existing state', () => {
      const manager = MerchantStateManager.getInstance();
      manager.updateMerchantState(createMockState('merchant-1'));

      expect(manager.hasSavedState('merchant-1')).toBe(true);

      manager.clearMerchantState('merchant-1');

      expect(manager.hasSavedState('merchant-1')).toBe(false);
      expect(manager.getMerchantState('merchant-1')).toBeUndefined();
    });

    it('should not throw when clearing non-existent state', () => {
      const manager = MerchantStateManager.getInstance();

      expect(() => manager.clearMerchantState('non-existent')).not.toThrow();
    });

    it('should only clear specified state, not others', () => {
      const manager = MerchantStateManager.getInstance();
      manager.updateMerchantState(createMockState('merchant-1'));
      manager.updateMerchantState(createMockState('merchant-2'));

      manager.clearMerchantState('merchant-1');

      expect(manager.hasSavedState('merchant-1')).toBe(false);
      expect(manager.hasSavedState('merchant-2')).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should persist state across save/load cycle simulation', () => {
      // First "session" - create and save state
      const manager1 = MerchantStateManager.getInstance();
      const originalState = createMockState('merchant-1', 'old-instance');
      manager1.updateMerchantState(originalState);
      manager1.saveState();

      // Capture what was written
      const writtenData = (fs.writeFileSync as jest.Mock).mock.calls[0][1];

      // Reset singleton and mocks for "new session"
      resetSingleton();
      jest.clearAllMocks();

      // Setup mocks for "new session" - file now exists with saved data
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(writtenData);

      // Second "session" - load and verify
      const manager2 = MerchantStateManager.getInstance();
      const loadedState = manager2.getMerchantState('merchant-1');

      expect(loadedState).toBeDefined();
      expect(loadedState?.npcTemplateId).toBe('merchant-1');
      expect(loadedState?.actualInventory).toEqual(['item-1', 'item-2']);
    });

    it('should handle multiple merchants correctly', () => {
      const manager = MerchantStateManager.getInstance();

      // Add multiple merchants
      for (let i = 1; i <= 5; i++) {
        manager.updateMerchantState(createMockState(`merchant-${i}`, `instance-${i}`));
      }

      // Verify all exist
      for (let i = 1; i <= 5; i++) {
        expect(manager.hasSavedState(`merchant-${i}`)).toBe(true);
      }

      // Clear some
      manager.clearMerchantState('merchant-2');
      manager.clearMerchantState('merchant-4');

      // Verify correct ones remain
      expect(manager.hasSavedState('merchant-1')).toBe(true);
      expect(manager.hasSavedState('merchant-2')).toBe(false);
      expect(manager.hasSavedState('merchant-3')).toBe(true);
      expect(manager.hasSavedState('merchant-4')).toBe(false);
      expect(manager.hasSavedState('merchant-5')).toBe(true);
    });

    it('should overwrite same template with different instance IDs', () => {
      const manager = MerchantStateManager.getInstance();

      // Same template, different instances (simulating server restart)
      manager.updateMerchantState(createMockState('blacksmith', 'session1-instance'));
      manager.updateMerchantState(createMockState('blacksmith', 'session2-instance'));

      // Should only have one entry for the template
      const state = manager.getMerchantState('blacksmith');
      expect(state?.npcInstanceId).toBe('session2-instance');
    });
  });
});
