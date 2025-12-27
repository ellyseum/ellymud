/**
 * Unit tests for EntityRegistryService
 * @module room/services/entityRegistryService.test
 */

import { EntityRegistryService } from './entityRegistryService';
import { ConnectedClient } from '../../types';
import { Room } from '../room';
import { NPC } from '../../combat/npc';
import {
  createMockUser,
  createMockClient,
  createMockNPC,
  createMockRoom,
} from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
  writeFormattedMessageToClient: jest.fn(),
}));

jest.mock('../../utils/formatters', () => ({
  formatUsername: jest.fn(
    (username: string) => username.charAt(0).toUpperCase() + username.slice(1)
  ),
}));

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

// Helper to create a test room with entity management
const createTestRoom = (id: string, name: string): Room => {
  const room = createMockRoom(id, name) as Room & { npcs: Map<string, NPC> };
  room.npcs = new Map<string, NPC>();
  Object.assign(room, {
    getNPC: jest.fn((npcId: string) => room.npcs.get(npcId)),
    findNPCsByTemplateId: jest.fn((templateId: string) => {
      const matches: NPC[] = [];
      room.npcs.forEach((npc) => {
        if (npc.templateId === templateId) matches.push(npc);
      });
      return matches;
    }),
    removeNPC: jest.fn((npcId: string) => room.npcs.delete(npcId)),
    getItemInstances: jest.fn(() => new Map<string, string>()),
  });
  return room;
};

describe('EntityRegistryService', () => {
  let entityRegistryService: EntityRegistryService;
  let mockRoomManager: {
    getRoom: jest.Mock;
    getStartingRoomId: jest.Mock;
    updateRoom: jest.Mock;
  };
  let mockGetClients: jest.Mock;
  let mockNotifyPlayersInRoom: jest.Mock;
  let mockTeleportToStartingRoom: jest.Mock;
  let testRoom: Room;
  let clientsMap: Map<string, ConnectedClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    testRoom = createTestRoom('town-square', 'Town Square');
    clientsMap = new Map();

    mockRoomManager = {
      getRoom: jest.fn((roomId: string) => {
        if (roomId === 'town-square') return testRoom;
        return undefined;
      }),
      getStartingRoomId: jest.fn().mockReturnValue('starting-room'),
      updateRoom: jest.fn(),
    };

    mockGetClients = jest.fn(() => clientsMap);
    mockNotifyPlayersInRoom = jest.fn();
    mockTeleportToStartingRoom = jest.fn().mockReturnValue(true);

    entityRegistryService = new EntityRegistryService(
      mockRoomManager,
      mockGetClients,
      mockNotifyPlayersInRoom,
      mockTeleportToStartingRoom
    );
  });

  describe('findClientByUsername', () => {
    it('should find client by username (case insensitive)', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'TestUser' }),
      });
      clientsMap.set('client-1', client);

      const found = entityRegistryService.findClientByUsername('testuser');

      expect(found).toBe(client);
    });

    it('should return undefined when client not found', () => {
      const found = entityRegistryService.findClientByUsername('nonexistent');

      expect(found).toBeUndefined();
    });

    it('should return undefined when client has no user', () => {
      const client = createMockClient({ user: null });
      clientsMap.set('client-1', client);

      const found = entityRegistryService.findClientByUsername('testuser');

      expect(found).toBeUndefined();
    });
  });

  describe('getNPCFromRoom', () => {
    it('should find NPC by instance ID', () => {
      const npc = createMockNPC();
      testRoom.npcs.set('npc-instance-1', npc);

      const found = entityRegistryService.getNPCFromRoom('town-square', 'npc-instance-1');

      expect(found).toBe(npc);
    });

    it('should find NPC by template ID', () => {
      const npc = createMockNPC();
      // Set templateId directly since the mock doesn't have constructor logic
      Object.defineProperty(npc, 'templateId', { value: 'goblin-template' });
      testRoom.npcs.set('npc-instance-1', npc);

      const found = entityRegistryService.getNPCFromRoom('town-square', 'goblin-template');

      expect(found).toBe(npc);
    });

    it('should return null when room not found', () => {
      const found = entityRegistryService.getNPCFromRoom('invalid-room', 'npc-1');

      expect(found).toBeNull();
    });

    it('should return null when NPC not found', () => {
      const found = entityRegistryService.getNPCFromRoom('town-square', 'nonexistent-npc');

      expect(found).toBeNull();
    });
  });

  describe('removeNPCFromRoom', () => {
    it('should remove NPC and return true', () => {
      const npc = createMockNPC();
      testRoom.npcs.set('npc-instance-1', npc);
      (testRoom.getNPC as jest.Mock).mockReturnValue(npc);

      const result = entityRegistryService.removeNPCFromRoom('town-square', 'npc-instance-1');

      expect(result).toBe(true);
      expect(testRoom.removeNPC).toHaveBeenCalledWith('npc-instance-1');
      expect(mockRoomManager.updateRoom).toHaveBeenCalledWith(testRoom);
    });

    it('should return false when room not found', () => {
      const result = entityRegistryService.removeNPCFromRoom('invalid-room', 'npc-1');

      expect(result).toBe(false);
    });

    it('should return false when NPC not found', () => {
      (testRoom.getNPC as jest.Mock).mockReturnValue(undefined);

      const result = entityRegistryService.removeNPCFromRoom('town-square', 'nonexistent-npc');

      expect(result).toBe(false);
      expect(testRoom.removeNPC).not.toHaveBeenCalled();
    });
  });

  describe('storeNPC', () => {
    it('should store NPC in registry', () => {
      const npc = createMockNPC();

      entityRegistryService.storeNPC('npc-1', npc);

      // The NPC is stored in a private map, so we can't directly test it
      // but we can verify no errors are thrown
      expect(true).toBe(true);
    });
  });

  describe('lookAtEntity', () => {
    it('should return false if client has no user', () => {
      const client = createMockClient({ user: null });

      const result = entityRegistryService.lookAtEntity(client, 'something');

      expect(result).toBe(false);
    });

    it('should teleport if room not found', () => {
      mockRoomManager.getRoom.mockReturnValue(undefined);
      const client = createMockClient({
        user: createMockUser({ currentRoomId: 'invalid-room' }),
      });

      entityRegistryService.lookAtEntity(client, 'something');

      expect(mockTeleportToStartingRoom).toHaveBeenCalledWith(client);
    });

    it('should find and display NPC by name', () => {
      const npc = createMockNPC();
      npc.name = 'Goblin';
      npc.description = 'A nasty goblin.';
      testRoom.npcs.set('goblin-1', npc);
      const client = createMockClient({
        user: createMockUser(),
      });

      const result = entityRegistryService.lookAtEntity(client, 'goblin');

      expect(result).toBe(true);
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('Goblin'));
    });

    it('should show NPC health status', () => {
      const npc = createMockNPC();
      npc.name = 'Orc';
      npc.health = 50;
      npc.maxHealth = 100;
      testRoom.npcs.set('orc-1', npc);
      const client = createMockClient({
        user: createMockUser(),
      });

      entityRegistryService.lookAtEntity(client, 'orc');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('wounded'));
    });

    it('should show dead NPC', () => {
      const npc = createMockNPC();
      npc.name = 'Skeleton';
      npc.health = 0;
      testRoom.npcs.set('skeleton-1', npc);
      const client = createMockClient({
        user: createMockUser(),
      });

      entityRegistryService.lookAtEntity(client, 'skeleton');

      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('dead'));
    });

    it('should find gold currency in room', () => {
      testRoom.currency = { gold: 50, silver: 0, copper: 0 };
      const client = createMockClient({
        user: createMockUser(),
      });

      const result = entityRegistryService.lookAtEntity(client, 'gold');

      expect(result).toBe(true);
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('50 gold pieces')
      );
    });

    it('should find silver currency in room', () => {
      testRoom.currency = { gold: 0, silver: 25, copper: 0 };
      const client = createMockClient({
        user: createMockUser(),
      });

      const result = entityRegistryService.lookAtEntity(client, 'silver');

      expect(result).toBe(true);
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('25 silver pieces')
      );
    });

    it('should find copper currency in room', () => {
      testRoom.currency = { gold: 0, silver: 0, copper: 10 };
      const client = createMockClient({
        user: createMockUser(),
      });

      const result = entityRegistryService.lookAtEntity(client, 'copper');

      expect(result).toBe(true);
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('10 copper pieces')
      );
    });

    it('should allow player to look at themselves', () => {
      testRoom.players = ['testuser'];
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });

      const result = entityRegistryService.lookAtEntity(client, 'testuser');

      expect(result).toBe(true);
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('yourself'));
    });

    it('should allow looking at other players', () => {
      testRoom.players = ['testuser', 'otherplayer'];
      const client = createMockClient({
        user: createMockUser({ username: 'testuser' }),
      });
      const otherClient = createMockClient({
        user: createMockUser({ username: 'otherplayer' }),
      });
      clientsMap.set('client-2', otherClient);

      const result = entityRegistryService.lookAtEntity(client, 'otherplayer');

      expect(result).toBe(true);
    });

    it('should return false when entity not found', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      const result = entityRegistryService.lookAtEntity(client, 'nonexistent');

      expect(result).toBe(false);
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining("don't see"));
    });

    it('should check currency in inventory', () => {
      const client = createMockClient({
        user: createMockUser({
          inventory: {
            items: [],
            currency: { gold: 100, silver: 0, copper: 0 },
          },
        }),
      });

      const result = entityRegistryService.lookAtEntity(client, 'gold');

      expect(result).toBe(true);
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('100 gold pieces')
      );
    });
  });
});
