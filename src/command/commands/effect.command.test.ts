/**
 * Unit tests for EffectCommand
 * @module command/commands/effect.command.test
 */

import { EffectCommand } from './effect.command';
import { createMockClient, createMockUser, createMockNPC } from '../../test/helpers/mockFactories';
import { EffectType } from '../../types/effects';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  getPlayerLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
  createContextLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
  createMechanicsLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
  systemLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../utils/socketWriter', () => ({
  writeFormattedMessageToClient: jest.fn(),
  writeToClient: jest.fn(),
  drawCommandPrompt: jest.fn(),
}));

jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

// Create mock functions at module scope
const mockAddEffect = jest.fn();
const mockRemoveEffect = jest.fn();
const mockGetEffectsForTarget = jest.fn().mockReturnValue([]);

jest.mock('../../effects/effectManager', () => ({
  EffectManager: {
    getInstance: jest.fn(() => ({
      addEffect: mockAddEffect,
      removeEffect: mockRemoveEffect,
      getEffectsForTarget: mockGetEffectsForTarget,
    })),
  },
}));

const mockGetUser = jest.fn();

const mockGetActiveUserSession = jest.fn();

jest.mock('../../user/userManager', () => ({
  UserManager: {
    getInstance: jest.fn(() => ({
      getUser: mockGetUser,
      getActiveUserSession: mockGetActiveUserSession,
    })),
  },
}));

const mockGetAllRooms = jest.fn().mockReturnValue([]);
const mockGetRoom = jest.fn();

jest.mock('../../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn(() => ({
      getAllRooms: mockGetAllRooms,
      getRoom: mockGetRoom,
    })),
  },
}));

import { writeFormattedMessageToClient } from '../../utils/socketWriter';
import { UserManager } from '../../user/userManager';
import { RoomManager } from '../../room/roomManager';

const mockWriteFormattedMessageToClient = writeFormattedMessageToClient as jest.MockedFunction<
  typeof writeFormattedMessageToClient
>;

describe('EffectCommand', () => {
  let effectCommand: EffectCommand;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockUserManager: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockRoomManager: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserManager = UserManager.getInstance();
    mockRoomManager = RoomManager.getInstance(new Map());

    effectCommand = new EffectCommand(mockUserManager, mockRoomManager);
  });

  describe('constructor', () => {
    it('should create effect command with correct properties', () => {
      expect(effectCommand.name).toBe('effect');
      expect(effectCommand.requiresAuthentication).toBe(true);
      expect(effectCommand.requiresAdmin).toBe(true);
    });
  });

  describe('execute', () => {
    it('should show error if client has no user', () => {
      const client = createMockClient({ user: null });

      effectCommand.execute(client, 'apply testuser REGEN 10');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('must be logged in')
      );
    });

    it('should show help when no arguments provided', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      effectCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalled();
    });

    it('should show help for unknown subcommand', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      effectCommand.execute(client, 'unknowncommand');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalled();
    });

    it('should handle apply subcommand', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockGetUser.mockReturnValue(createMockUser({ username: 'targetuser' }));

      effectCommand.execute(client, 'apply targetuser REGEN 10 1 5');

      expect(mockAddEffect).toHaveBeenCalled();
    });

    it('should handle list subcommand', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockGetUser.mockReturnValue(createMockUser({ username: 'targetuser' }));

      effectCommand.execute(client, 'list targetuser');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalled();
    });

    it('should handle remove subcommand', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockGetUser.mockReturnValue(createMockUser({ username: 'targetuser' }));

      effectCommand.execute(client, 'remove targetuser REGEN');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalled();
    });
  });

  describe('applyEffect', () => {
    it('should show usage when insufficient args', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      effectCommand.execute(client, 'apply');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Usage')
      );
    });

    it('should show error for invalid effect type', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockGetUser.mockReturnValue(createMockUser({ username: 'target' }));

      effectCommand.execute(client, 'apply target INVALIDTYPE 10');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Invalid effect type')
      );
    });

    it('should apply effect to player', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockGetUser.mockReturnValue(createMockUser({ username: 'targetplayer' }));

      effectCommand.execute(client, 'apply targetplayer REGEN 10 1 5');

      expect(mockAddEffect).toHaveBeenCalledWith(
        'targetplayer',
        true,
        expect.objectContaining({
          type: EffectType.REGEN,
        })
      );
    });

    it('should show error when target not found', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin', currentRoomId: 'test-room' }),
      });

      mockGetUser.mockReturnValue(null);
      mockGetAllRooms.mockReturnValue([
        {
          id: 'test-room',
          players: ['admin'],
          npcs: new Map(),
        },
      ]);

      effectCommand.execute(client, 'apply unknowntarget REGEN 10');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Target not found')
      );
    });

    it('should show error when admin not in a room', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin', currentRoomId: '' }),
      });

      mockGetUser.mockReturnValue(null);
      mockGetAllRooms.mockReturnValue([]);

      effectCommand.execute(client, 'apply unknowntarget REGEN 10');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('not in a room')
      );
    });

    it('should apply effect to NPC', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin', currentRoomId: 'test-room' }),
      });

      const mockNpc = createMockNPC({
        name: 'Goblin',
        instanceId: 'goblin-123',
      });

      mockGetUser.mockReturnValue(null);
      mockGetAllRooms.mockReturnValue([
        {
          id: 'test-room',
          players: ['admin'],
          npcs: new Map([['goblin-123', mockNpc]]),
        },
      ]);

      effectCommand.execute(client, 'apply Goblin REGEN 10 1 5');

      expect(mockAddEffect).toHaveBeenCalledWith(
        'goblin-123',
        false,
        expect.objectContaining({
          type: EffectType.REGEN,
        })
      );
    });

    it('should handle STUN effect with movement/combat block', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockGetUser.mockReturnValue(createMockUser({ username: 'target' }));

      effectCommand.execute(client, 'apply target STUN 5');

      expect(mockAddEffect).toHaveBeenCalledWith(
        'target',
        true,
        expect.objectContaining({
          type: EffectType.STUN,
          payload: expect.objectContaining({
            blockMovement: true,
            blockCombat: true,
          }),
        })
      );
    });

    it('should handle MOVEMENT_BLOCK effect', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockGetUser.mockReturnValue(createMockUser({ username: 'target' }));

      effectCommand.execute(client, 'apply target MOVEMENT_BLOCK 5');

      expect(mockAddEffect).toHaveBeenCalledWith(
        'target',
        true,
        expect.objectContaining({
          type: EffectType.MOVEMENT_BLOCK,
          payload: expect.objectContaining({
            blockMovement: true,
          }),
        })
      );
    });
  });

  describe('listEffects', () => {
    it('should show effects for player', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockGetActiveUserSession.mockReturnValue(
        createMockClient({
          user: createMockUser({ username: 'targetplayer' }),
        })
      );
      mockGetEffectsForTarget.mockReturnValue([
        {
          type: EffectType.REGEN,
          name: 'Regeneration',
          remainingTicks: 5,
          payload: { healPerTick: 5 },
        },
      ]);

      effectCommand.execute(client, 'list targetplayer');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalled();
    });

    it('should show no effects message when target has no effects', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockGetActiveUserSession.mockReturnValue(
        createMockClient({
          user: createMockUser({ username: 'targetplayer' }),
        })
      );
      mockGetEffectsForTarget.mockReturnValue([]);

      effectCommand.execute(client, 'list targetplayer');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('no active effects')
      );
    });

    it('should default to self when no target specified', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockGetEffectsForTarget.mockReturnValue([]);

      effectCommand.execute(client, 'list');

      // When no target, defaults to the caller - shows no effects message
      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('no active effects')
      );
    });
  });

  describe('removeEffect', () => {
    it('should show usage when insufficient args', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      effectCommand.execute(client, 'remove');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Usage')
      );
    });

    it('should remove effect from player by id', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      // Mock getActiveUserSession to return a client
      mockGetActiveUserSession.mockReturnValue(
        createMockClient({
          user: createMockUser({ username: 'targetplayer' }),
        })
      );
      mockGetEffectsForTarget.mockReturnValue([
        { id: 'effect-123', type: EffectType.REGEN, name: 'Regeneration' },
      ]);

      effectCommand.execute(client, 'remove targetplayer effect-123');

      expect(mockRemoveEffect).toHaveBeenCalledWith('effect-123');
    });

    it('should remove all effects when no id specified', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'admin' }),
      });

      mockGetActiveUserSession.mockReturnValue(
        createMockClient({
          user: createMockUser({ username: 'targetplayer' }),
        })
      );
      mockGetEffectsForTarget.mockReturnValue([
        { id: 'effect-1', type: EffectType.REGEN, name: 'Regen' },
        { id: 'effect-2', type: EffectType.POISON, name: 'Poison' },
      ]);

      // No second arg means remove all
      effectCommand.execute(client, 'remove targetplayer');

      // Should call remove for each effect
      expect(mockRemoveEffect).toHaveBeenCalledTimes(2);
    });
  });
});
