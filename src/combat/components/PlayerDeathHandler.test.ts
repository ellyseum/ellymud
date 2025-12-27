/**
 * Unit tests for PlayerDeathHandler class
 * @module combat/components/PlayerDeathHandler.test
 */

import { PlayerDeathHandler } from './PlayerDeathHandler';
import { CombatNotifier } from './CombatNotifier';
import { RoomManager } from '../../room/roomManager';
import { UserManager } from '../../user/userManager';
import { Room } from '../../room/room';
import {
  createMockUser,
  createMockClient,
  createMockRoom,
  createMockUserManager,
  createMockRoomManager,
} from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  getPlayerLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('../../utils/formatters', () => ({
  formatUsername: jest.fn(
    (username: string) => username.charAt(0).toUpperCase() + username.slice(1)
  ),
}));

// Wrapper helpers that adapt shared factories to test-specific needs
const createTestRoom = (id: string, players: string[] = []): Room =>
  createMockRoom(id, `Room ${id}`, {
    players,
    currency: { gold: 0, silver: 0, copper: 0 },
    addPlayer: jest.fn(),
    removePlayer: jest.fn(),
    addItem: jest.fn(),
    getDescriptionExcludingPlayer: jest.fn(() => 'Room description'),
  } as Partial<Room>) as Room;

const createTestUserManager = (): UserManager => {
  return createMockUserManager();
};

const createTestRoomManager = (
  rooms: Map<string, Room> = new Map(),
  startingRoomId: string = 'start'
): RoomManager => {
  const manager = createMockRoomManager();
  (manager.getRoom as jest.Mock).mockImplementation((roomId: string) => rooms.get(roomId));
  (manager as unknown as { getStartingRoomId: jest.Mock }).getStartingRoomId = jest.fn(
    () => startingRoomId
  );
  (manager as unknown as { updateRoom: jest.Mock }).updateRoom = jest.fn();
  return manager;
};

const createMockCombatNotifier = (): CombatNotifier =>
  ({
    notifyPlayerDeath: jest.fn(),
    notifyPlayerUnconscious: jest.fn(),
    notifyPlayerTeleported: jest.fn(),
    broadcastRoomMessage: jest.fn(),
  }) as unknown as CombatNotifier;

describe('PlayerDeathHandler', () => {
  let playerDeathHandler: PlayerDeathHandler;
  let mockUserManager: UserManager;
  let mockRoomManager: RoomManager;
  let mockCombatNotifier: CombatNotifier;
  let rooms: Map<string, Room>;

  beforeEach(() => {
    jest.clearAllMocks();
    rooms = new Map();
    mockUserManager = createTestUserManager();
    mockRoomManager = createTestRoomManager(rooms, 'start');
    mockCombatNotifier = createMockCombatNotifier();
    playerDeathHandler = new PlayerDeathHandler(
      mockUserManager,
      mockRoomManager,
      mockCombatNotifier
    );
  });

  describe('handlePlayerHealth', () => {
    it('should not handle if player has no user', () => {
      const player = createMockClient({ user: null });

      playerDeathHandler.handlePlayerHealth(player, 'room-1');

      expect(mockCombatNotifier.notifyPlayerDeath).not.toHaveBeenCalled();
      expect(mockCombatNotifier.notifyPlayerUnconscious).not.toHaveBeenCalled();
    });

    it('should not handle if player has positive health', () => {
      const player = createMockClient({
        user: createMockUser({ health: 50 }),
      });

      playerDeathHandler.handlePlayerHealth(player, 'room-1');

      expect(mockCombatNotifier.notifyPlayerDeath).not.toHaveBeenCalled();
      expect(mockCombatNotifier.notifyPlayerUnconscious).not.toHaveBeenCalled();
    });

    it('should call handlePlayerDeath when health <= -10', () => {
      const currentRoom = createTestRoom('current-room', ['testuser']);
      const startRoom = createTestRoom('start', []);
      rooms.set('current-room', currentRoom);
      rooms.set('start', startRoom);

      const player = createMockClient({
        user: createMockUser({
          health: -10,
          currentRoomId: 'current-room',
        }),
      });

      playerDeathHandler.handlePlayerHealth(player, 'current-room');

      expect(mockCombatNotifier.notifyPlayerDeath).toHaveBeenCalled();
    });

    it('should call handlePlayerUnconscious when 0 > health > -10', () => {
      const player = createMockClient({
        user: createMockUser({ health: -5 }),
      });

      playerDeathHandler.handlePlayerHealth(player, 'room-1');

      expect(mockCombatNotifier.notifyPlayerUnconscious).toHaveBeenCalled();
    });
  });

  describe('player death', () => {
    it('should drop inventory items on death', () => {
      const currentRoom = createTestRoom('current-room', ['testuser']);
      const startRoom = createTestRoom('start', []);
      rooms.set('current-room', currentRoom);
      rooms.set('start', startRoom);

      const player = createMockClient({
        user: createMockUser({
          health: -10,
          currentRoomId: 'current-room',
          inventory: {
            items: ['sword', 'shield'],
            currency: { gold: 10, silver: 5, copper: 3 },
          },
        }),
      });

      playerDeathHandler.handlePlayerHealth(player, 'current-room');

      // Items should be added to the room
      expect(currentRoom.addItem).toHaveBeenCalledWith('sword');
      expect(currentRoom.addItem).toHaveBeenCalledWith('shield');

      // Currency should be transferred to room
      expect(currentRoom.currency.gold).toBe(10);
      expect(currentRoom.currency.silver).toBe(5);
      expect(currentRoom.currency.copper).toBe(3);
    });

    it('should teleport player to starting room', () => {
      const currentRoom = createTestRoom('current-room', ['testuser']);
      const startRoom = createTestRoom('start', []);
      rooms.set('current-room', currentRoom);
      rooms.set('start', startRoom);

      const player = createMockClient({
        user: createMockUser({
          health: -10,
          maxHealth: 100,
          currentRoomId: 'current-room',
        }),
      });

      playerDeathHandler.handlePlayerHealth(player, 'current-room');

      // Should be removed from current room
      expect(currentRoom.removePlayer).toHaveBeenCalledWith('testuser');

      // Should be added to starting room
      expect(startRoom.addPlayer).toHaveBeenCalledWith('testuser');

      // Should have full health after respawn
      expect(player.user!.health).toBe(100);
      expect(player.user!.currentRoomId).toBe('start');
    });

    it('should notify player about teleportation', () => {
      const currentRoom = createTestRoom('current-room', ['testuser']);
      const startRoom = createTestRoom('start', []);
      rooms.set('current-room', currentRoom);
      rooms.set('start', startRoom);

      const player = createMockClient({
        user: createMockUser({
          health: -10,
          currentRoomId: 'current-room',
        }),
      });

      playerDeathHandler.handlePlayerHealth(player, 'current-room');

      expect(mockCombatNotifier.notifyPlayerTeleported).toHaveBeenCalledWith(player, startRoom);
    });
  });

  describe('player unconscious', () => {
    it('should mark player as unconscious', () => {
      const player = createMockClient({
        user: createMockUser({ health: -5, isUnconscious: false }),
      });

      playerDeathHandler.handlePlayerHealth(player, 'room-1');

      expect(player.user!.isUnconscious).toBe(true);
      expect(mockUserManager.updateUserStats).toHaveBeenCalledWith('testuser', {
        isUnconscious: true,
      });
    });

    it('should notify player about unconsciousness', () => {
      const player = createMockClient({
        user: createMockUser({ health: -5 }),
      });

      playerDeathHandler.handlePlayerHealth(player, 'room-1');

      expect(mockCombatNotifier.notifyPlayerUnconscious).toHaveBeenCalledWith(player, 'room-1');
    });
  });

  describe('edge cases', () => {
    it('should handle player with no inventory', () => {
      const currentRoom = createTestRoom('current-room', ['testuser']);
      const startRoom = createTestRoom('start', []);
      rooms.set('current-room', currentRoom);
      rooms.set('start', startRoom);

      const user = createMockUser({
        health: -10,
        currentRoomId: 'current-room',
      });
      // @ts-expect-error - Testing edge case
      delete user.inventory;

      const player = createMockClient({ user });

      // Should not throw
      expect(() => {
        playerDeathHandler.handlePlayerHealth(player, 'current-room');
      }).not.toThrow();
    });

    it('should handle non-existent current room', () => {
      const startRoom = createTestRoom('start', []);
      rooms.set('start', startRoom);

      const player = createMockClient({
        user: createMockUser({
          health: -10,
          currentRoomId: 'nonexistent-room',
        }),
      });

      // Should not throw
      expect(() => {
        playerDeathHandler.handlePlayerHealth(player, 'nonexistent-room');
      }).not.toThrow();
    });

    it('should handle zero currency on death', () => {
      const currentRoom = createTestRoom('current-room', ['testuser']);
      const startRoom = createTestRoom('start', []);
      rooms.set('current-room', currentRoom);
      rooms.set('start', startRoom);

      const player = createMockClient({
        user: createMockUser({
          health: -10,
          currentRoomId: 'current-room',
          inventory: {
            items: [],
            currency: { gold: 0, silver: 0, copper: 0 },
          },
        }),
      });

      playerDeathHandler.handlePlayerHealth(player, 'current-room');

      // Room currency should remain 0
      expect(currentRoom.currency.gold).toBe(0);
      // Currency drop message should not be broadcast
    });
  });
});
