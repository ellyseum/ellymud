/**
 * Unit tests for MagicMissileCommand
 * @module command/commands/mmis.command.test
 */

import { MagicMissileCommand } from './mmis.command';
import { AbilityManager } from '../../abilities/abilityManager';
import { CombatSystem } from '../../combat/combatSystem';
import { RoomManager } from '../../room/roomManager';
import {
  createMockClient,
  createMockUser,
  createMockRoom,
  createMockNPC,
} from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeFormattedMessageToClient: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  getPlayerLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { writeFormattedMessageToClient } from '../../utils/socketWriter';

const mockWriteFormattedMessageToClient = writeFormattedMessageToClient as jest.MockedFunction<
  typeof writeFormattedMessageToClient
>;

// Create mock implementations
const createMockAbilityManager = () => ({
  getAbility: jest.fn().mockReturnValue({
    id: 'magic-missile',
    name: 'Magic Missile',
    mpCost: 10,
    mpCostPerRound: 3,
    combatDuration: 10,
  }),
  hasActiveCombatAbility: jest.fn().mockReturnValue(false),
  getActiveCombatAbility: jest.fn().mockReturnValue(null),
  hasMana: jest.fn().mockReturnValue(true),
  canUseAbility: jest.fn().mockReturnValue({ ok: true }),
  activateCombatAbility: jest.fn(),
});

const createMockCombatSystem = () => ({
  engageCombat: jest.fn(),
});

const createMockRoomManager = () => ({
  getRoom: jest.fn().mockReturnValue(null),
});

describe('MagicMissileCommand', () => {
  let mmisCommand: MagicMissileCommand;
  let mockAbilityManager: ReturnType<typeof createMockAbilityManager>;
  let mockCombatSystem: ReturnType<typeof createMockCombatSystem>;
  let mockRoomManager: ReturnType<typeof createMockRoomManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAbilityManager = createMockAbilityManager();
    mockCombatSystem = createMockCombatSystem();
    mockRoomManager = createMockRoomManager();
    mmisCommand = new MagicMissileCommand(
      mockAbilityManager as unknown as AbilityManager,
      mockCombatSystem as unknown as CombatSystem,
      mockRoomManager as unknown as RoomManager
    );
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(mmisCommand.name).toBe('mmis');
    });

    it('should have a description', () => {
      expect(mmisCommand.description).toBeDefined();
      expect(mmisCommand.description).toContain('magic missile');
    });
  });

  describe('execute', () => {
    it('should return error if client has no user', () => {
      const client = createMockClient({ user: null });

      mmisCommand.execute(client, 'goblin');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('must be logged in')
      );
    });

    it('should return error if ability not found', () => {
      mockAbilityManager.getAbility.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser(),
      });

      mmisCommand.execute(client, 'goblin');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('ability not found')
      );
    });

    it('should return error if already channeling combat ability', () => {
      mockAbilityManager.hasActiveCombatAbility.mockReturnValue(true);
      mockAbilityManager.getActiveCombatAbility.mockReturnValue({ name: 'Fireball' });

      const client = createMockClient({
        user: createMockUser(),
      });

      mmisCommand.execute(client, 'goblin');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('already channeling')
      );
    });

    it('should return error if not enough mana', () => {
      mockAbilityManager.hasMana.mockReturnValue(false);

      const client = createMockClient({
        user: createMockUser(),
      });

      mmisCommand.execute(client, 'goblin');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Not enough mana')
      );
    });

    it('should return error if ability on cooldown', () => {
      mockAbilityManager.canUseAbility.mockReturnValue({ ok: false, reason: 'On cooldown' });

      const client = createMockClient({
        user: createMockUser(),
      });

      mmisCommand.execute(client, 'goblin');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Cannot use Magic Missile')
      );
    });

    it('should show usage if no target and not in combat', () => {
      const client = createMockClient({
        user: createMockUser({ inCombat: false }),
      });

      mmisCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Usage: mmis')
      );
    });

    it('should activate combat ability and show message if already in combat', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser', inCombat: true }),
      });

      mmisCommand.execute(client, '');

      expect(mockAbilityManager.activateCombatAbility).toHaveBeenCalledWith(
        'testuser',
        'magic-missile',
        10
      );
      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Magic Missiles')
      );
    });

    it('should return error if room not found when targeting', () => {
      mockRoomManager.getRoom.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'invalid-room', inCombat: false }),
      });

      mmisCommand.execute(client, 'goblin');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('not in a valid room')
      );
    });

    it('should return error if target not found', () => {
      const mockRoom = createMockRoom('test-room', 'Test Room');
      (mockRoom as unknown as { npcs: Map<string, unknown> }).npcs = new Map();
      mockRoomManager.getRoom.mockReturnValue(mockRoom);

      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room', inCombat: false }),
      });

      mmisCommand.execute(client, 'goblin');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('not found')
      );
    });

    it('should engage combat with target and activate ability', () => {
      const mockNpc = createMockNPC({
        instanceId: 'goblin-123',
        templateId: 'goblin',
        name: 'Goblin',
      });

      const mockRoom = createMockRoom('test-room', 'Test Room');
      const npcsMap = new Map();
      npcsMap.set('goblin-123', mockNpc);
      (mockRoom as unknown as { npcs: Map<string, unknown> }).npcs = npcsMap;
      mockRoomManager.getRoom.mockReturnValue(mockRoom);

      const client = createMockClient({
        user: createMockUser({ username: 'testuser', currentRoomId: 'test-room', inCombat: false }),
      });

      mmisCommand.execute(client, 'goblin');

      expect(mockAbilityManager.activateCombatAbility).toHaveBeenCalledWith(
        'testuser',
        'magic-missile',
        10
      );
      expect(mockCombatSystem.engageCombat).toHaveBeenCalledWith(client, mockNpc);
    });

    it('should find target by template ID', () => {
      const mockNpc = createMockNPC({
        instanceId: 'npc-123',
        templateId: 'goblin-warrior',
        name: 'Goblin Warrior',
      });

      const mockRoom = createMockRoom('test-room', 'Test Room');
      const npcsMap = new Map();
      npcsMap.set('npc-123', mockNpc);
      (mockRoom as unknown as { npcs: Map<string, unknown> }).npcs = npcsMap;
      mockRoomManager.getRoom.mockReturnValue(mockRoom);

      const client = createMockClient({
        user: createMockUser({ username: 'testuser', currentRoomId: 'test-room', inCombat: false }),
      });

      mmisCommand.execute(client, 'goblin-warrior');

      expect(mockCombatSystem.engageCombat).toHaveBeenCalledWith(client, mockNpc);
    });

    it('should find target by instance ID', () => {
      const mockNpc = createMockNPC({
        instanceId: 'goblin-12345',
        templateId: 'goblin',
        name: 'Goblin',
      });

      const mockRoom = createMockRoom('test-room', 'Test Room');
      const npcsMap = new Map();
      npcsMap.set('goblin-12345', mockNpc);
      (mockRoom as unknown as { npcs: Map<string, unknown> }).npcs = npcsMap;
      mockRoomManager.getRoom.mockReturnValue(mockRoom);

      const client = createMockClient({
        user: createMockUser({ username: 'testuser', currentRoomId: 'test-room', inCombat: false }),
      });

      mmisCommand.execute(client, 'goblin-12345');

      expect(mockCombatSystem.engageCombat).toHaveBeenCalledWith(client, mockNpc);
    });
  });
});
