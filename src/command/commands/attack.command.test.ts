/**
 * Unit tests for AttackCommand
 * @module command/commands/attack.command.test
 */

import { AttackCommand } from './attack.command';
import { CombatSystem } from '../../combat/combatSystem';
import { RoomManager } from '../../room/roomManager';
import { AbilityManager } from '../../abilities/abilityManager';
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
  systemLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  getPlayerLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../../utils/stateInterruption', () => ({
  clearRestingMeditating: jest.fn(),
}));

import { writeFormattedMessageToClient } from '../../utils/socketWriter';
import { clearRestingMeditating } from '../../utils/stateInterruption';

const mockWriteFormattedMessageToClient = writeFormattedMessageToClient as jest.MockedFunction<
  typeof writeFormattedMessageToClient
>;

// Create mock implementations
const createMockCombatSystem = () => ({
  engageCombat: jest.fn().mockReturnValue(true),
});

const createMockRoomManager = () => ({
  getRoom: jest.fn().mockReturnValue(null),
  getStartingRoomId: jest.fn().mockReturnValue('town-square'),
});

const createMockAbilityManager = () => ({
  hasActiveCombatAbility: jest.fn().mockReturnValue(false),
  deactivateCombatAbility: jest.fn(),
});

describe('AttackCommand', () => {
  let attackCommand: AttackCommand;
  let mockCombatSystem: ReturnType<typeof createMockCombatSystem>;
  let mockRoomManager: ReturnType<typeof createMockRoomManager>;
  let mockAbilityManager: ReturnType<typeof createMockAbilityManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCombatSystem = createMockCombatSystem();
    mockRoomManager = createMockRoomManager();
    mockAbilityManager = createMockAbilityManager();
    attackCommand = new AttackCommand(
      mockCombatSystem as unknown as CombatSystem,
      mockRoomManager as unknown as RoomManager,
      mockAbilityManager as unknown as AbilityManager
    );
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(attackCommand.name).toBe('attack');
    });

    it('should have a description', () => {
      expect(attackCommand.description).toBeDefined();
      expect(attackCommand.description).toContain('Attack');
    });
  });

  describe('execute', () => {
    it('should return error if client has no user', () => {
      const client = createMockClient({ user: null });

      attackCommand.execute(client, 'goblin');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('must be logged in')
      );
    });

    it('should return error if user is unconscious', () => {
      const client = createMockClient({
        user: createMockUser({ isUnconscious: true }),
      });

      // Set up room to avoid other errors
      const mockRoom = createMockRoom('test-room', 'Test Room');
      (mockRoom as unknown as { flags: string[] }).flags = [];
      mockRoomManager.getRoom.mockReturnValue(mockRoom);

      attackCommand.execute(client, 'goblin');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('unconscious')
      );
    });

    it('should return error if in safe zone', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'safe-room' }),
      });

      const mockRoom = createMockRoom('safe-room', 'Safe Room');
      (mockRoom as unknown as { flags: string[] }).flags = ['safe'];
      mockRoomManager.getRoom.mockReturnValue(mockRoom);

      attackCommand.execute(client, 'goblin');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('safe zone')
      );
    });

    it('should return error if no target specified', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room' }),
      });

      const mockRoom = createMockRoom('test-room', 'Test Room');
      (mockRoom as unknown as { flags: string[] }).flags = [];
      mockRoomManager.getRoom.mockReturnValue(mockRoom);

      attackCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Attack what?')
      );
    });

    it('should return error if room is invalid', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'invalid-room' }),
      });

      // First call returns a room without 'safe' flag for the initial check
      // Second call returns null for the target search
      const mockSafeRoom = createMockRoom('invalid-room', 'Invalid Room');
      (mockSafeRoom as unknown as { flags: string[] }).flags = [];

      let callCount = 0;
      mockRoomManager.getRoom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockSafeRoom;
        return null;
      });

      attackCommand.execute(client, 'goblin');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('not in a valid location')
      );
    });

    it('should return error if target not found', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room' }),
      });

      const mockRoom = createMockRoom('test-room', 'Test Room');
      (mockRoom as unknown as { flags: string[] }).flags = [];
      (mockRoom as unknown as { npcs: Map<string, unknown> }).npcs = new Map();
      mockRoomManager.getRoom.mockReturnValue(mockRoom);

      attackCommand.execute(client, 'goblin');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't see")
      );
    });

    it('should engage combat with target found by instance ID', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room' }),
      });

      const mockNpc = createMockNPC({
        instanceId: 'goblin-123',
        templateId: 'goblin',
        name: 'Goblin',
      });

      const mockRoom = createMockRoom('test-room', 'Test Room');
      (mockRoom as unknown as { flags: string[] }).flags = [];
      const npcsMap = new Map();
      npcsMap.set('goblin-123', mockNpc);
      (mockRoom as unknown as { npcs: Map<string, unknown> }).npcs = npcsMap;
      mockRoomManager.getRoom.mockReturnValue(mockRoom);

      attackCommand.execute(client, 'goblin-123');

      expect(mockCombatSystem.engageCombat).toHaveBeenCalledWith(client, mockNpc);
    });

    it('should engage combat with target found by name', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room' }),
      });

      const mockNpc = createMockNPC({
        instanceId: 'npc-123',
        templateId: 'goblin-template',
        name: 'Goblin Warrior',
      });

      const mockRoom = createMockRoom('test-room', 'Test Room');
      (mockRoom as unknown as { flags: string[] }).flags = [];
      const npcsMap = new Map();
      npcsMap.set('npc-123', mockNpc);
      (mockRoom as unknown as { npcs: Map<string, unknown> }).npcs = npcsMap;
      mockRoomManager.getRoom.mockReturnValue(mockRoom);

      attackCommand.execute(client, 'goblin');

      expect(mockCombatSystem.engageCombat).toHaveBeenCalledWith(client, mockNpc);
    });

    it('should clear resting/meditating state when attacking', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room' }),
      });

      const mockRoom = createMockRoom('test-room', 'Test Room');
      (mockRoom as unknown as { flags: string[] }).flags = [];
      (mockRoom as unknown as { npcs: Map<string, unknown> }).npcs = new Map();
      mockRoomManager.getRoom.mockReturnValue(mockRoom);

      attackCommand.execute(client, 'something');

      expect(clearRestingMeditating).toHaveBeenCalledWith(client, 'aggression');
    });

    it('should deactivate combat ability when attacking with weapon', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'testuser', currentRoomId: 'test-room' }),
      });

      const mockNpc = createMockNPC({
        instanceId: 'goblin-123',
        templateId: 'goblin',
        name: 'Goblin',
      });

      const mockRoom = createMockRoom('test-room', 'Test Room');
      (mockRoom as unknown as { flags: string[] }).flags = [];
      const npcsMap = new Map();
      npcsMap.set('goblin-123', mockNpc);
      (mockRoom as unknown as { npcs: Map<string, unknown> }).npcs = npcsMap;
      mockRoomManager.getRoom.mockReturnValue(mockRoom);

      mockAbilityManager.hasActiveCombatAbility.mockReturnValue(true);

      attackCommand.execute(client, 'goblin');

      expect(mockAbilityManager.deactivateCombatAbility).toHaveBeenCalledWith('testuser');
      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('switch back to your weapon')
      );
    });

    it('should show error message when combat engagement fails', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room' }),
      });

      const mockNpc = createMockNPC({
        instanceId: 'goblin-123',
        templateId: 'goblin',
        name: 'Goblin',
      });

      const mockRoom = createMockRoom('test-room', 'Test Room');
      (mockRoom as unknown as { flags: string[] }).flags = [];
      const npcsMap = new Map();
      npcsMap.set('goblin-123', mockNpc);
      (mockRoom as unknown as { npcs: Map<string, unknown> }).npcs = npcsMap;
      mockRoomManager.getRoom.mockReturnValue(mockRoom);

      mockCombatSystem.engageCombat.mockReturnValue(false);

      attackCommand.execute(client, 'goblin');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Unable to engage combat')
      );
    });

    it('should add target to existing combat if already in combat', () => {
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'test-room', inCombat: true }),
      });

      const mockNpc = createMockNPC({
        instanceId: 'goblin-123',
        templateId: 'goblin',
        name: 'Goblin',
      });

      const mockRoom = createMockRoom('test-room', 'Test Room');
      (mockRoom as unknown as { flags: string[] }).flags = [];
      const npcsMap = new Map();
      npcsMap.set('goblin-123', mockNpc);
      (mockRoom as unknown as { npcs: Map<string, unknown> }).npcs = npcsMap;
      mockRoomManager.getRoom.mockReturnValue(mockRoom);

      attackCommand.execute(client, 'goblin');

      expect(mockCombatSystem.engageCombat).toHaveBeenCalledWith(client, mockNpc);
    });
  });
});
