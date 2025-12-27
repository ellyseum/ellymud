/**
 * Unit tests for SpawnCommand
 * @module command/commands/spawn.command.test
 */

import { SpawnCommand } from './spawn.command';
import { createMockClient, createMockUser, createMockRoom } from '../../test/helpers/mockFactories';
import { NPCData } from '../../combat/npc';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

const mockNPCData = new Map<string, NPCData>();
mockNPCData.set('goblin', {
  id: 'goblin',
  name: 'Goblin',
  health: 50,
  maxHealth: 50,
  damage: [5, 10] as [number, number],
  isHostile: true,
  isPassive: false,
  experienceValue: 25,
  description: 'A small, green creature with sharp teeth.',
  attackTexts: ['The goblin attacks!'],
  deathMessages: ['The goblin falls dead.'],
  inventory: [],
});

mockNPCData.set('merchant', {
  id: 'merchant',
  name: 'Merchant',
  health: 100,
  maxHealth: 100,
  damage: [1, 5] as [number, number],
  isHostile: false,
  isPassive: true,
  experienceValue: 0,
  description: 'A friendly merchant selling wares.',
  attackTexts: [],
  deathMessages: [],
  inventory: [],
});

jest.mock('../../combat/npc', () => {
  const original = jest.requireActual('../../combat/npc');
  return {
    ...original,
    NPC: class MockNPC {
      name: string;
      instanceId: string;
      templateId: string;
      constructor(
        name: string,
        _health: number,
        _maxHealth: number,
        _damage: [number, number],
        _isHostile: boolean,
        _isPassive: boolean,
        _experienceValue: number,
        _description: string,
        _attackTexts: string[],
        _deathMessages: string[],
        templateId: string,
        instanceId: string
      ) {
        this.name = name;
        this.templateId = templateId;
        this.instanceId = instanceId;
      }
      static loadNPCData(): Map<string, NPCData> {
        return mockNPCData;
      }
    },
  };
});

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('SpawnCommand', () => {
  let spawnCommand: SpawnCommand;
  let mockRoomManager: {
    getRoom: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRoomManager = {
      getRoom: jest.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    spawnCommand = new SpawnCommand(mockRoomManager as any);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(spawnCommand.name).toBe('spawn');
    });

    it('should have a description', () => {
      expect(spawnCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      spawnCommand.execute(client, 'goblin');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should show error when not in a valid room', () => {
      mockRoomManager.getRoom.mockReturnValue(null);

      const client = createMockClient({
        user: createMockUser({
          currentRoomId: 'invalid-room',
        }),
      });

      spawnCommand.execute(client, 'goblin');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('not in a valid room')
      );
    });

    it('should show available NPCs when no arguments provided', () => {
      const room = createMockRoom('test-room', 'Test Room');
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser(),
      });

      spawnCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Available NPCs')
      );
    });

    it('should show error for unknown NPC type', () => {
      const room = createMockRoom('test-room', 'Test Room');
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser(),
      });

      spawnCommand.execute(client, 'dragon');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Unknown NPC type')
      );
    });

    it('should spawn a single NPC', () => {
      const room = createMockRoom('test-room', 'Test Room');
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser(),
      });

      spawnCommand.execute(client, 'goblin');

      expect(room.addNPC).toHaveBeenCalledTimes(1);
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('spawned a goblin')
      );
    });

    it('should spawn multiple NPCs', () => {
      const room = createMockRoom('test-room', 'Test Room');
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser(),
      });

      spawnCommand.execute(client, 'goblin 3');

      expect(room.addNPC).toHaveBeenCalledTimes(3);
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('spawned 3 goblins')
      );
    });

    it('should show error for invalid count (negative)', () => {
      const room = createMockRoom('test-room', 'Test Room');
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser(),
      });

      spawnCommand.execute(client, 'goblin -1');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Invalid count')
      );
    });

    it('should show error for count above 10', () => {
      const room = createMockRoom('test-room', 'Test Room');
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser(),
      });

      spawnCommand.execute(client, 'goblin 11');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Invalid count')
      );
    });

    it('should show warning when spawning hostile NPC', () => {
      const room = createMockRoom('test-room', 'Test Room');
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser(),
      });

      spawnCommand.execute(client, 'goblin');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Warning'));
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('hostile'));
    });

    it('should not show warning for non-hostile NPC', () => {
      const room = createMockRoom('test-room', 'Test Room');
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser(),
      });

      spawnCommand.execute(client, 'merchant');

      // Check that warning is NOT shown
      const warningCalls = mockWriteToClient.mock.calls.filter(
        (call) => typeof call[1] === 'string' && call[1].includes('Warning')
      );
      expect(warningCalls.length).toBe(0);
    });

    it('should handle NPC type case-insensitively', () => {
      const room = createMockRoom('test-room', 'Test Room');
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser(),
      });

      spawnCommand.execute(client, 'GOBLIN');

      expect(room.addNPC).toHaveBeenCalledTimes(1);
    });

    it('should handle non-numeric count gracefully', () => {
      const room = createMockRoom('test-room', 'Test Room');
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser(),
      });

      spawnCommand.execute(client, 'goblin abc');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Invalid count')
      );
    });

    it('should handle zero count', () => {
      const room = createMockRoom('test-room', 'Test Room');
      mockRoomManager.getRoom.mockReturnValue(room);

      const client = createMockClient({
        user: createMockUser(),
      });

      spawnCommand.execute(client, 'goblin 0');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Invalid count')
      );
    });
  });
});
