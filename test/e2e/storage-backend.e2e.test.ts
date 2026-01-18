import { TesterAgent } from '../../src/testing/testerAgent';

/**
 * E2E tests for Storage Backend and Data Layer.
 *
 * These tests verify that data operations work correctly regardless of storage backend:
 * - JSON file storage (default)
 * - SQLite storage
 * - PostgreSQL storage (via Docker)
 *
 * All tests work in both embedded mode and remote mode:
 * - Embedded: npm run test:e2e
 * - Remote:   MCP_URL=http://localhost:3100 npm run test:e2e
 *
 * When running in remote mode against Docker, these tests verify:
 * - Database tables are created correctly
 * - Data persists across operations
 * - Redis session management works
 */
describe('Storage Backend E2E', () => {
  let agent: TesterAgent;

  beforeAll(async () => {
    agent = await TesterAgent.create();
    console.log(`Running in ${TesterAgent.getModeDescription()} mode`);
  });

  afterAll(async () => {
    await agent.shutdown();
  });

  beforeEach(async () => {
    await agent.resetToClean();
  });

  describe('Room Data Operations', () => {
    it('should load all rooms from storage', async () => {
      const rooms = await agent.getAllRooms();

      expect(rooms.length).toBeGreaterThan(0);
      console.log(`Loaded ${rooms.length} rooms from storage`);
    });

    it('should have valid room structure', async () => {
      const rooms = await agent.getAllRooms();

      for (const room of rooms) {
        expect(room.id).toBeDefined();
        expect(room.name).toBeDefined();
        expect(typeof room.name).toBe('string');
      }
    });

    it('should retrieve individual room data', async () => {
      const rooms = await agent.getAllRooms();
      if (rooms.length === 0) return;

      const roomId = rooms[0].id as string;
      const roomData = await agent.getRoomData(roomId);

      expect(roomData.id).toBe(roomId);
      expect(roomData.name).toBeDefined();
    });

    it('should track room exits correctly', async () => {
      const rooms = await agent.getAllRooms();
      const startRoom = rooms.find((r) => r.id === 'start');

      if (startRoom) {
        expect(startRoom.exits).toBeDefined();
      }
    });
  });

  describe('Item Template Operations', () => {
    it('should load all item templates from storage', async () => {
      const items = await agent.getAllItemTemplates();

      expect(items.length).toBeGreaterThan(0);
      console.log(`Loaded ${items.length} item templates from storage`);
    });

    it('should have valid item template structure', async () => {
      const items = await agent.getAllItemTemplates();

      for (const item of items) {
        expect(item.id).toBeDefined();
        expect(item.name).toBeDefined();
        expect(item.type).toBeDefined();
      }
    });
  });

  describe('NPC Template Operations', () => {
    it('should load all NPC templates from storage', async () => {
      const npcs = await agent.getAllNpcTemplates();

      expect(npcs.length).toBeGreaterThan(0);
      console.log(`Loaded ${npcs.length} NPC templates from storage`);
    });

    it('should have valid NPC template structure', async () => {
      const npcs = await agent.getAllNpcTemplates();

      for (const npc of npcs) {
        expect(npc.id).toBeDefined();
        expect(npc.name).toBeDefined();
        expect(npc.health).toBeGreaterThan(0);
        expect(npc.maxHealth).toBeGreaterThan(0);
      }
    });

    it('should preserve NPC damage tuple from storage', async () => {
      const npcs = await agent.getAllNpcTemplates();

      for (const npc of npcs) {
        expect(Array.isArray(npc.damage)).toBe(true);
        expect(npc.damage.length).toBe(2);
        expect(npc.damage[0]).toBeLessThanOrEqual(npc.damage[1]);
      }
    });
  });

  describe('User Data Operations', () => {
    let sessionId: string;

    beforeEach(async () => {
      sessionId = await agent.directLogin('storagetest');
    });

    afterEach(async () => {
      await agent.closeSession(sessionId);
    });

    it('should persist user stats changes', async () => {
      // Set specific stats
      await agent.setPlayerStats(sessionId, {
        health: 75,
        maxHealth: 100,
        gold: 500,
      });

      // Read back stats
      const stats = await agent.getPlayerStats(sessionId);

      expect(stats.health).toBe(75);
      expect(stats.maxHealth).toBe(100);
      expect(stats.gold).toBe(500);
    });

    it('should track user level and experience', async () => {
      await agent.setPlayerStats(sessionId, {
        level: 5,
        experience: 2500,
      });

      const stats = await agent.getPlayerStats(sessionId);

      expect(stats.level).toBe(5);
      expect(stats.experience).toBe(2500);
    });

    it('should show online users', async () => {
      const onlineUsers = await agent.getOnlineUsers();

      expect(onlineUsers.length).toBeGreaterThan(0);
      const testUser = onlineUsers.find((u) => u.username === 'storagetest');
      expect(testUser).toBeDefined();
    });
  });

  describe('Game Configuration', () => {
    it('should retrieve game configuration', async () => {
      const config = await agent.getGameConfig();

      expect(config).toBeDefined();
      // Config should have some data
      expect(Object.keys(config).length).toBeGreaterThan(0);
    });

    it('should track game tick count', async () => {
      const tick1 = await agent.getTickCount();
      await agent.advanceTicks(5);
      const tick2 = await agent.getTickCount();

      expect(tick2).toBe(tick1 + 5);
    });
  });

  describe('Combat State Operations', () => {
    it('should retrieve combat state information', async () => {
      const combatState = await agent.getCombatState();

      expect(combatState).toBeDefined();
    });
  });

  describe('Snapshot Operations', () => {
    it('should list available snapshots', async () => {
      const snapshots = await agent.listSnapshots();

      expect(Array.isArray(snapshots)).toBe(true);
      // Snapshots can be strings or objects with path property
      const snapshotNames = snapshots.map((s: string | { path?: string }) => 
        typeof s === 'string' ? s : s.path?.split('/').pop()
      );
      expect(snapshotNames).toContain('fresh');
    });

    it('should reset to clean state', async () => {
      // Create a session and modify state
      const sessionId = await agent.directLogin('snapshottest');
      await agent.setPlayerStats(sessionId, { gold: 9999 });
      await agent.closeSession(sessionId);

      // Reset to clean
      await agent.resetToClean();

      // New user should have default gold (0)
      const newSession = await agent.directLogin('freshuser');
      const stats = await agent.getPlayerStats(newSession);
      expect(stats.gold).toBe(0);
      await agent.closeSession(newSession);
    });
  });

  describe('Room NPCs and Items', () => {
    let sessionId: string;

    beforeEach(async () => {
      sessionId = await agent.directLogin('roomtest');
    });

    afterEach(async () => {
      await agent.closeSession(sessionId);
    });

    it('should get NPCs in a room', async () => {
      // Find a room with NPCs
      const npcs = await agent.getRoomNpcs('west-alley');

      // west-alley typically has goblins
      if (npcs.length > 0) {
        expect(npcs[0].name).toBeDefined();
        expect(npcs[0].instanceId).toBeDefined();
        expect(npcs[0].health).toBeGreaterThan(0);
      }
    });

    it('should get items in a room', async () => {
      // Check room items - may be empty but should not error
      const currentRoom = await agent.getCurrentRoomId(sessionId);
      expect(currentRoom).toBeDefined();

      const items = await agent.getRoomItems(currentRoom!);
      expect(Array.isArray(items)).toBe(true);
    });

    it('should get currency in a room', async () => {
      const currentRoom = await agent.getCurrentRoomId(sessionId);
      expect(currentRoom).toBeDefined();

      const currency = await agent.getRoomCurrency(currentRoom!);
      expect(currency).toHaveProperty('gold');
      expect(currency).toHaveProperty('silver');
      expect(currency).toHaveProperty('copper');
    });
  });

  describe('Multi-Session Data Isolation', () => {
    it('should maintain separate user data for concurrent sessions', async () => {
      const session1 = await agent.directLogin('useralpha');
      const session2 = await agent.directLogin('userbeta');

      // Set different stats for each user
      await agent.setPlayerStats(session1, { gold: 100 });
      await agent.setPlayerStats(session2, { gold: 200 });

      // Verify isolation
      const stats1 = await agent.getPlayerStats(session1);
      const stats2 = await agent.getPlayerStats(session2);

      expect(stats1.gold).toBe(100);
      expect(stats2.gold).toBe(200);

      await agent.closeSession(session1);
      await agent.closeSession(session2);
    });
  });
});
