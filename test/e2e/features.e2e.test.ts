import { TesterAgent } from '../../src/testing/testerAgent';

/**
 * Feature Showcase E2E Tests
 * 
 * This test suite demonstrates all TesterAgent capabilities:
 * - Session control (login, commands, output)
 * - Time manipulation (tick advancement)
 * - State management (snapshots, reset)
 * - Player stat manipulation
 * 
 * Works in both embedded mode and remote mode:
 * - Embedded: npm run test:e2e
 * - Remote:   MCP_URL=http://localhost:3100 npm run test:e2e
 */
describe('TesterAgent Feature Showcase', () => {
  let agent: TesterAgent;

  // Boot server once for all tests in this file
  beforeAll(async () => {
    agent = await TesterAgent.create();
  });

  // Shutdown server after all tests complete
  afterAll(async () => {
    await agent.shutdown();
  });

  // ============================================================
  // SESSION CONTROL
  // ============================================================
  describe('Session Control', () => {
    let sessionId: string;

    afterEach(async () => {
      if (sessionId) {
        await agent.closeSession(sessionId);
      }
    });

    it('should create a logged-in session with directLogin()', async () => {
      sessionId = await agent.directLogin('sessiontest');
      
      // Session should be created and user logged in
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
    });

    it('should execute commands with sendCommand()', async () => {
      sessionId = await agent.directLogin('commandtest');
      
      // Send the 'look' command
      const output = await agent.sendCommand(sessionId, 'look');
      
      // Should receive room description
      expect(output.length).toBeGreaterThan(0);
    });

    it('should retrieve accumulated output with getOutput()', async () => {
      sessionId = await agent.directLogin('outputtest');
      
      // Clear initial output
      await agent.getOutput(sessionId, true);
      
      // sendCommand returns the command output and clears the buffer
      const output = await agent.sendCommand(sessionId, 'stats');
      
      // Verify the output contains expected stats info
      expect(output).toContain('Health');
    });

    it('should handle multiple sessions simultaneously', async () => {
      const session1 = await agent.directLogin('playerone');
      const session2 = await agent.directLogin('playertwo');
      
      // Both sessions should work independently
      // sendCommand returns the output directly
      const output1 = await agent.sendCommand(session1, 'look');
      const output2 = await agent.sendCommand(session2, 'look');
      
      expect(output1.length).toBeGreaterThan(0);
      expect(output2.length).toBeGreaterThan(0);
      
      await agent.closeSession(session1);
      await agent.closeSession(session2);
      
      // Clear sessionId so afterEach doesn't try to close a non-existent session
      sessionId = '';
    });
  });

  // ============================================================
  // TIME MANIPULATION
  // ============================================================
  describe('Time Manipulation', () => {
    let sessionId: string;

    beforeEach(async () => {
      await agent.resetToClean();
      sessionId = await agent.directLogin('timetest');
    });

    afterEach(async () => {
      await agent.closeSession(sessionId);
    });

    it('should get current tick count with getTickCount()', async () => {
      const tick = await agent.getTickCount();
      
      expect(typeof tick).toBe('number');
      expect(tick).toBeGreaterThanOrEqual(0);
    });

    it('should advance ticks with advanceTicks()', async () => {
      const before = await agent.getTickCount();
      
      await agent.advanceTicks(5);
      
      const after = await agent.getTickCount();
      expect(after).toBe(before + 5);
    });

    it('should advance to next regen cycle with advanceToRegen()', async () => {
      // Regen happens every 12 ticks
      await agent.advanceToRegen();
      
      const tick = await agent.getTickCount();
      expect(tick % 12).toBe(0);
    });

    it('should process regeneration after 12 ticks', async () => {
      // Set player to damaged state
      await agent.setPlayerStats(sessionId, { health: 50, maxHealth: 100 });
      
      const before = await agent.getPlayerStats(sessionId);
      expect(before.health).toBe(50);
      
      // Advance through one regen cycle
      await agent.advanceTicks(12);
      
      const after = await agent.getPlayerStats(sessionId);
      // Should have regenerated some HP
      expect(after.health).toBeGreaterThan(50);
    });
  });

  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  describe('State Management', () => {
    it('should reset to clean state with resetToClean()', async () => {
      // Make some changes
      const sessionId = await agent.directLogin('statetest');
      await agent.setPlayerStats(sessionId, { gold: 9999 });
      await agent.closeSession(sessionId);
      
      // Reset to clean
      await agent.resetToClean();
      
      // New login should have default stats
      const newSession = await agent.directLogin('freshuser');
      const stats = await agent.getPlayerStats(newSession);
      
      // Default gold is 0 for new users
      expect(stats.gold).toBe(0);
      
      await agent.closeSession(newSession);
    });

    it('should load specific snapshot with loadSnapshot()', async () => {
      // Load the fresh snapshot
      await agent.loadSnapshot('fresh');
      
      // Should not throw error
      expect(true).toBe(true);
    });

    it('should maintain isolation between tests', async () => {
      await agent.resetToClean();
      
      // Create user with specific stats
      const session1 = await agent.directLogin('isolatedone');
      await agent.setPlayerStats(session1, { level: 10 });
      await agent.closeSession(session1);
      
      // Reset and create new user
      await agent.resetToClean();
      const session2 = await agent.directLogin('isolatedtwo');
      const stats = await agent.getPlayerStats(session2);
      
      // New user should start at level 1
      expect(stats.level).toBe(1);
      
      await agent.closeSession(session2);
    });
  });

  // ============================================================
  // PLAYER STATS
  // ============================================================
  describe('Player Stats', () => {
    let sessionId: string;

    beforeEach(async () => {
      await agent.resetToClean();
      sessionId = await agent.directLogin('statsuser');
    });

    afterEach(async () => {
      await agent.closeSession(sessionId);
    });

    it('should get all player stats with getPlayerStats()', async () => {
      const stats = await agent.getPlayerStats(sessionId);
      
      // Should have all expected properties
      expect(stats).toHaveProperty('health');
      expect(stats).toHaveProperty('maxHealth');
      expect(stats).toHaveProperty('mana');
      expect(stats).toHaveProperty('maxMana');
      expect(stats).toHaveProperty('gold');
      expect(stats).toHaveProperty('experience');
      expect(stats).toHaveProperty('level');
    });

    it('should set health with setPlayerStats()', async () => {
      await agent.setPlayerStats(sessionId, { health: 25, maxHealth: 100 });
      
      const stats = await agent.getPlayerStats(sessionId);
      expect(stats.health).toBe(25);
      expect(stats.maxHealth).toBe(100);
    });

    it('should set mana with setPlayerStats()', async () => {
      await agent.setPlayerStats(sessionId, { mana: 30, maxMana: 75 });
      
      const stats = await agent.getPlayerStats(sessionId);
      expect(stats.mana).toBe(30);
      expect(stats.maxMana).toBe(75);
    });

    it('should set gold with setPlayerStats()', async () => {
      await agent.setPlayerStats(sessionId, { gold: 500 });
      
      const stats = await agent.getPlayerStats(sessionId);
      expect(stats.gold).toBe(500);
    });

    it('should set experience with setPlayerStats()', async () => {
      await agent.setPlayerStats(sessionId, { experience: 1000 });
      
      const stats = await agent.getPlayerStats(sessionId);
      expect(stats.experience).toBe(1000);
    });

    it('should set level with setPlayerStats()', async () => {
      await agent.setPlayerStats(sessionId, { level: 5 });
      
      const stats = await agent.getPlayerStats(sessionId);
      expect(stats.level).toBe(5);
    });

    it('should set multiple stats at once', async () => {
      await agent.setPlayerStats(sessionId, {
        health: 80,
        maxHealth: 150,
        mana: 40,
        maxMana: 100,
        gold: 250,
        experience: 500,
        level: 3,
      });
      
      const stats = await agent.getPlayerStats(sessionId);
      expect(stats.health).toBe(80);
      expect(stats.maxHealth).toBe(150);
      expect(stats.mana).toBe(40);
      expect(stats.maxMana).toBe(100);
      expect(stats.gold).toBe(250);
      expect(stats.experience).toBe(500);
      expect(stats.level).toBe(3);
    });
  });

  // ============================================================
  // COMMON TESTING PATTERNS
  // ============================================================
  describe('Common Testing Patterns', () => {
    let sessionId: string;

    beforeEach(async () => {
      await agent.resetToClean();
      sessionId = await agent.directLogin('patterntest');
    });

    afterEach(async () => {
      await agent.closeSession(sessionId);
    });

    it('Pattern: Test HP regeneration over time', async () => {
      // Setup: Damage the player
      await agent.setPlayerStats(sessionId, { health: 10, maxHealth: 100 });
      
      // Act: Advance through 3 regen cycles (36 ticks)
      for (let cycle = 0; cycle < 3; cycle++) {
        await agent.advanceTicks(12);
      }
      
      // Assert: Health should have increased significantly
      const stats = await agent.getPlayerStats(sessionId);
      expect(stats.health).toBeGreaterThan(20);
    });

    it('Pattern: Test command output contains expected text', async () => {
      // Clear any existing output
      await agent.getOutput(sessionId, true);
      
      // Execute command - sendCommand returns the output
      const output = await agent.sendCommand(sessionId, 'help');
      
      // Check output - help command should contain 'commands' or similar text
      expect(output.toLowerCase()).toMatch(/command|help|available/i);
    });

    it('Pattern: Test movement between rooms', async () => {
      // Get initial room - sendCommand returns the output
      const initialOutput = await agent.sendCommand(sessionId, 'look');
      expect(initialOutput.length).toBeGreaterThan(0);
      
      // Try to move (direction depends on available exits)
      const moveOutput = await agent.sendCommand(sessionId, 'north');
      
      // Should see some response (either moved or can't go that way)
      expect(moveOutput.length).toBeGreaterThan(0);
    });

    it('Pattern: Test stat changes after game actions', async () => {
      // Perform some action that might change stats
      // (Example: Using rest command and advancing time)
      await agent.setPlayerStats(sessionId, { health: 50, maxHealth: 100 });
      await agent.sendCommand(sessionId, 'rest');
      await agent.advanceTicks(20); // Past resting threshold + regen

      const after = await agent.getPlayerStats(sessionId);

      // Verify expected changes (health should have regenerated above the initial 50)
      expect(after.health).toBeGreaterThan(50);
    });
  });

  // ============================================================
  // STEALTH MOVEMENT TESTS
  // ============================================================
  describe('Stealth Movement', () => {
    let sneaker: string;
    let observer: string;

    beforeEach(async () => {
      await agent.resetToClean();
      // Create two players in the same room
      sneaker = await agent.directLogin('sneaker');
      observer = await agent.directLogin('observer');
    });

    afterEach(async () => {
      await agent.closeSession(sneaker);
      await agent.closeSession(observer);
    });

    it('should not show departure message when sneaking', async () => {
      // Clear observer's buffer
      await agent.getOutput(observer, true);

      // Sneaker enables sneak mode
      const sneakOutput = await agent.sendCommand(sneaker, 'sneak');
      expect(sneakOutput.toLowerCase()).toContain('stealthily');

      // Small delay to ensure observer sees sneak message
      await new Promise((r) => setTimeout(r, 100));

      // Clear observer buffer (contains "slips into shadows" message)
      await agent.getOutput(observer, true);

      // Sneaker moves north
      await agent.sendCommand(sneaker, 'north');

      // Wait for any messages to propagate
      await new Promise((r) => setTimeout(r, 200));

      // Observer should NOT see departure message
      const observerOutput = await agent.getOutput(observer, false);
      expect(observerOutput.toLowerCase()).not.toContain('leaves');
      expect(observerOutput.toLowerCase()).not.toContain('sneaker');
    });

    it('should break hide on movement', async () => {
      // Sneaker hides
      const hideOutput = await agent.sendCommand(sneaker, 'hide');
      expect(hideOutput.toLowerCase()).toContain('hide');

      // Sneaker moves - should break hide
      const moveOutput = await agent.sendCommand(sneaker, 'north');

      // Should see "break cover" message
      expect(moveOutput.toLowerCase()).toContain('break');
    });

    it('should maintain sneak after movement', async () => {
      // Enable sneak
      await agent.sendCommand(sneaker, 'sneak');

      // Move north
      await agent.sendCommand(sneaker, 'north');

      // Toggling sneak off should show "stop sneaking" (meaning it was still on)
      const stopOutput = await agent.sendCommand(sneaker, 'sneak');
      expect(stopOutput.toLowerCase()).toContain('stop sneaking');
    });

    it('should hide player from room description when hidden', async () => {
      // Clear observer buffer
      await agent.getOutput(observer, true);

      // Sneaker hides
      await agent.sendCommand(sneaker, 'hide');

      // Observer looks - should not see sneaker
      const lookOutput = await agent.sendCommand(observer, 'look');

      // Sneaker should NOT be visible in room description
      expect(lookOutput.toLowerCase()).not.toContain('sneaker');
    });

    it('should allow sneak and hide to be used together', async () => {
      // Enable both sneak and hide
      const sneakOutput = await agent.sendCommand(sneaker, 'sneak');
      expect(sneakOutput.toLowerCase()).toContain('stealthily');

      const hideOutput = await agent.sendCommand(sneaker, 'hide');
      expect(hideOutput.toLowerCase()).toContain('hide');

      // Move - should break hide but keep sneak
      const moveOutput = await agent.sendCommand(sneaker, 'north');
      expect(moveOutput.toLowerCase()).toContain('break');

      // Toggle sneak off - should work (proving sneak was still active)
      const sneakOffOutput = await agent.sendCommand(sneaker, 'sneak');
      expect(sneakOffOutput.toLowerCase()).toContain('stop sneaking');
    });
  });
});
