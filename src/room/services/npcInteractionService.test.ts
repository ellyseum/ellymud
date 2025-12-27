/**
 * Unit tests for NPCInteractionService
 * @module room/services/npcInteractionService.test
 */

import { NPCInteractionService } from './npcInteractionService';
import { NPCData } from '../../combat/npc';
import { MerchantData } from '../../combat/merchant';
import { createMockRoom } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  createContextLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('../../combat/merchantStateManager', () => ({
  MerchantStateManager: {
    getInstance: jest.fn().mockReturnValue({
      hasSavedState: jest.fn().mockReturnValue(false),
      getMerchantState: jest.fn().mockReturnValue(null),
      updateMerchantState: jest.fn(),
      saveState: jest.fn(),
    }),
  },
}));

jest.mock('../../combat/npc', () => {
  const originalModule = jest.requireActual('../../combat/npc');
  return {
    ...originalModule,
    NPC: {
      ...originalModule.NPC,
      fromNPCData: jest.fn().mockImplementation((data: NPCData) => ({
        name: data.name,
        health: data.health,
        maxHealth: data.maxHealth,
        templateId: data.id,
        instanceId: `instance-${data.id}-${Date.now()}`,
        isMerchant: () => false,
      })),
    },
  };
});

jest.mock('../../combat/merchant', () => ({
  Merchant: {
    fromMerchantData: jest.fn().mockImplementation((data: MerchantData) => ({
      name: data.name,
      health: data.health,
      maxHealth: data.maxHealth,
      templateId: data.id,
      instanceId: `merchant-${data.id}-${Date.now()}`,
      isMerchant: () => true,
      initializeInventory: jest.fn(),
      restoreInventory: jest.fn(),
      getInventoryState: jest.fn().mockReturnValue({
        npcInstanceId: `merchant-${data.id}`,
        npcTemplateId: data.id,
        actualInventory: [],
        stockConfig: [],
      }),
    })),
  },
}));

import { NPC as MockedNPC } from '../../combat/npc';
import { Merchant as MockedMerchant } from '../../combat/merchant';
import { MerchantStateManager } from '../../combat/merchantStateManager';
import { systemLogger } from '../../utils/logger';

// Helper to create NPC data
const createNpcData = (overrides: Partial<NPCData> = {}): NPCData => ({
  id: 'goblin-001',
  name: 'Goblin',
  description: 'A green goblin.',
  health: 50,
  maxHealth: 50,
  damage: [3, 7] as [number, number],
  isHostile: true,
  isPassive: false,
  experienceValue: 25,
  attackTexts: ['attacks $TARGET$'],
  deathMessages: ['dies'],
  ...overrides,
});

// Helper to create merchant data
const createMerchantData = (overrides: Partial<MerchantData> = {}): MerchantData => ({
  id: 'shopkeeper-001',
  name: 'Shop Keeper',
  description: 'A friendly shop keeper.',
  health: 100,
  maxHealth: 100,
  damage: [1, 3] as [number, number],
  isHostile: false,
  isPassive: true,
  experienceValue: 0,
  attackTexts: [],
  deathMessages: ['collapses'],
  merchant: true,
  ...overrides,
});

describe('NPCInteractionService', () => {
  let npcInteractionService: NPCInteractionService;
  let mockRoomManager: { updateRoom: jest.Mock };
  let npcData: Map<string, NPCData | MerchantData>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRoomManager = {
      updateRoom: jest.fn(),
    };

    npcInteractionService = new NPCInteractionService(mockRoomManager);

    npcData = new Map();
  });

  describe('instantiateNpcsFromTemplates', () => {
    it('should do nothing if no template IDs provided', () => {
      const room = createMockRoom('town-square', 'Town Square');

      npcInteractionService.instantiateNpcsFromTemplates(room, [], npcData);

      expect(room.addNPC).not.toHaveBeenCalled();
    });

    it('should create NPC from template and add to room', () => {
      const room = createMockRoom('town-square', 'Town Square');
      const goblinData = createNpcData({ id: 'goblin-001' });
      npcData.set('goblin-001', goblinData);

      npcInteractionService.instantiateNpcsFromTemplates(room, ['goblin-001'], npcData);

      expect(MockedNPC.fromNPCData).toHaveBeenCalledWith(goblinData);
      expect(room.addNPC).toHaveBeenCalled();
    });

    it('should create multiple NPCs from templates', () => {
      const room = createMockRoom('dungeon', 'Dark Dungeon');
      const goblinData = createNpcData({ id: 'goblin-001', name: 'Goblin' });
      const orcData = createNpcData({ id: 'orc-001', name: 'Orc' });
      npcData.set('goblin-001', goblinData);
      npcData.set('orc-001', orcData);

      npcInteractionService.instantiateNpcsFromTemplates(room, ['goblin-001', 'orc-001'], npcData);

      expect(room.addNPC).toHaveBeenCalledTimes(2);
    });

    it('should create Merchant from merchant template', () => {
      const room = createMockRoom('market', 'Market');
      const merchantData = createMerchantData({ id: 'shopkeeper-001' });
      npcData.set('shopkeeper-001', merchantData);

      npcInteractionService.instantiateNpcsFromTemplates(room, ['shopkeeper-001'], npcData);

      expect(MockedMerchant.fromMerchantData).toHaveBeenCalledWith(merchantData);
      expect(room.addNPC).toHaveBeenCalled();
    });

    it('should initialize fresh merchant inventory when no saved state', () => {
      const room = createMockRoom('market', 'Market');
      const merchantData = createMerchantData({ id: 'shopkeeper-001' });
      npcData.set('shopkeeper-001', merchantData);

      npcInteractionService.instantiateNpcsFromTemplates(room, ['shopkeeper-001'], npcData);

      const merchantInstance = MockedMerchant.fromMerchantData(merchantData);
      expect(merchantInstance.initializeInventory).toBeDefined();
    });

    it('should restore merchant inventory when saved state exists', () => {
      const room = createMockRoom('market', 'Market');
      const merchantData = createMerchantData({ id: 'shopkeeper-002' });
      npcData.set('shopkeeper-002', merchantData);

      // Mock saved state exists
      const mockStateManager = MerchantStateManager.getInstance();
      (mockStateManager.hasSavedState as jest.Mock).mockReturnValue(true);
      (mockStateManager.getMerchantState as jest.Mock).mockReturnValue({
        npcInstanceId: 'merchant-shopkeeper-002',
        npcTemplateId: 'shopkeeper-002',
        actualInventory: ['item-1', 'item-2'],
        stockConfig: [],
      });

      npcInteractionService.instantiateNpcsFromTemplates(room, ['shopkeeper-002'], npcData);

      const merchantInstance = MockedMerchant.fromMerchantData(merchantData);
      expect(merchantInstance.restoreInventory).toBeDefined();
    });

    it('should log NPC instantiation', () => {
      const room = createMockRoom('town-square', 'Town Square');
      const goblinData = createNpcData({ id: 'goblin-001' });
      npcData.set('goblin-001', goblinData);

      npcInteractionService.instantiateNpcsFromTemplates(room, ['goblin-001'], npcData);

      expect(systemLogger.info).toHaveBeenCalled();
    });

    it('should handle mixed NPCs and merchants', () => {
      const room = createMockRoom('village', 'Village');
      const goblinData = createNpcData({ id: 'guard-001', name: 'Guard' });
      const merchantData = createMerchantData({ id: 'vendor-001' });
      npcData.set('guard-001', goblinData);
      npcData.set('vendor-001', merchantData);

      npcInteractionService.instantiateNpcsFromTemplates(
        room,
        ['guard-001', 'vendor-001'],
        npcData
      );

      expect(MockedNPC.fromNPCData).toHaveBeenCalled();
      expect(MockedMerchant.fromMerchantData).toHaveBeenCalled();
      expect(room.addNPC).toHaveBeenCalledTimes(2);
    });
  });
});
