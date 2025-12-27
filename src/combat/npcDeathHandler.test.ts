/**
 * Unit tests for NPC death handler
 * @module combat/npcDeathHandler.test
 */

import { handleNpcDrops } from './npcDeathHandler';
import { NPC } from './npc';
import { RoomManager } from '../room/roomManager';
import { ItemManager } from '../utils/itemManager';
import { Room } from '../room/room';
import {
  createMockNPC,
  createMockRoom,
  createMockRoomManager,
  createMockItemManager,
} from '../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../utils/logger', () => ({
  createMechanicsLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Wrapper helpers that adapt shared factories to test-specific needs
const createTestNPC = (overrides: Partial<NPC> & { generateDrops?: () => string[] } = {}): NPC => {
  const npc = createMockNPC({
    name: 'Test Goblin',
    health: 0,
    maxHealth: 50,
    templateId: 'goblin',
    ...overrides,
  });
  (npc.isAlive as jest.Mock).mockReturnValue(false);
  if (overrides.generateDrops) {
    (npc as unknown as { generateDrops: jest.Mock }).generateDrops = jest
      .fn()
      .mockReturnValue(overrides.generateDrops());
  } else {
    (npc as unknown as { generateDrops: jest.Mock }).generateDrops = jest.fn().mockReturnValue([]);
  }
  return npc;
};

const createTestRoom = (id: string): Room =>
  createMockRoom(id, `Room ${id}`, {
    addItemInstance: jest.fn(),
  } as Partial<Room>) as Room;

const createTestRoomManager = (rooms: Map<string, Room> = new Map()): RoomManager => {
  const manager = createMockRoomManager();
  (manager.getRoom as jest.Mock).mockImplementation((roomId: string) => rooms.get(roomId));
  return manager;
};

const createTestItemManager = (): ItemManager => {
  return createMockItemManager();
};

describe('handleNpcDrops', () => {
  let mockRoomManager: RoomManager;
  let mockItemManager: ItemManager;
  let rooms: Map<string, Room>;

  beforeEach(() => {
    jest.clearAllMocks();
    rooms = new Map();
    mockRoomManager = createTestRoomManager(rooms);
    mockItemManager = createTestItemManager();
  });

  it('should return empty array if NPC has no generateDrops method', () => {
    const npc = createMockNPC({
      name: 'Basic NPC',
    });
    // Remove generateDrops method to simulate an NPC without it
    delete (npc as unknown as { generateDrops?: jest.Mock }).generateDrops;

    const drops = handleNpcDrops(npc, 'room-1', mockRoomManager, mockItemManager);

    expect(drops).toEqual([]);
  });

  it('should return empty array if NPC generates no drops', () => {
    const npc = createTestNPC({
      generateDrops: () => [],
    });

    const drops = handleNpcDrops(npc, 'room-1', mockRoomManager, mockItemManager);

    expect(drops).toEqual([]);
    expect((npc as unknown as { generateDrops: jest.Mock }).generateDrops).toHaveBeenCalled();
  });

  it('should return empty array if room not found', () => {
    const npc = createTestNPC({
      generateDrops: () => ['item-instance-1'],
    });
    // Room not in the map

    const drops = handleNpcDrops(npc, 'nonexistent-room', mockRoomManager, mockItemManager);

    expect(drops).toEqual([]);
  });

  it('should add drops to room', () => {
    const room = createTestRoom('room-1');
    rooms.set('room-1', room);
    const npc = createTestNPC({
      generateDrops: () => ['sword-instance-1'],
    });

    const drops = handleNpcDrops(npc, 'room-1', mockRoomManager, mockItemManager);

    expect(
      (room as unknown as { addItemInstance: jest.Mock }).addItemInstance
    ).toHaveBeenCalledWith('sword-instance-1', 'sword-template-1');
    expect(drops).toHaveLength(1);
    expect(drops[0].instanceId).toBe('sword-instance-1');
  });

  it('should handle multiple drops', () => {
    const room = createTestRoom('room-1');
    rooms.set('room-1', room);
    const npc = createTestNPC({
      generateDrops: () => ['sword-instance-1', 'gold-instance-1'],
    });

    const drops = handleNpcDrops(npc, 'room-1', mockRoomManager, mockItemManager);

    expect(
      (room as unknown as { addItemInstance: jest.Mock }).addItemInstance
    ).toHaveBeenCalledTimes(2);
    expect(drops).toHaveLength(2);
  });

  it('should save item instances after drops', () => {
    const room = createTestRoom('room-1');
    rooms.set('room-1', room);
    const npc = createTestNPC({
      generateDrops: () => ['sword-instance-1'],
    });

    handleNpcDrops(npc, 'room-1', mockRoomManager, mockItemManager);

    expect(mockItemManager.saveItemInstances).toHaveBeenCalled();
  });

  it('should not save item instances if no drops', () => {
    const room = createTestRoom('room-1');
    rooms.set('room-1', room);
    const npc = createTestNPC({
      generateDrops: () => [],
    });

    handleNpcDrops(npc, 'room-1', mockRoomManager, mockItemManager);

    expect(mockItemManager.saveItemInstances).not.toHaveBeenCalled();
  });

  it('should skip items without valid instance', () => {
    const room = createTestRoom('room-1');
    rooms.set('room-1', room);
    const npc = createTestNPC({
      generateDrops: () => ['invalid-instance'],
    });
    (mockItemManager.getItemInstance as jest.Mock).mockReturnValue(null);

    const drops = handleNpcDrops(npc, 'room-1', mockRoomManager, mockItemManager);

    expect(drops).toHaveLength(0);
    expect(
      (room as unknown as { addItemInstance: jest.Mock }).addItemInstance
    ).not.toHaveBeenCalled();
  });
});
