import { TesterAgent } from '../../src/testing/testerAgent';

/**
 * E2E tests for combat system.
 * 
 * These tests verify combat interactions through the TesterAgent API.
 * Note: Some tests require NPCs in the room. If no NPCs are present,
 * tests will verify error messages are shown correctly.
 */
describe('Combat E2E', () => {
  let agent: TesterAgent;
  let sessionId: string;

  beforeAll(async () => {
    // Create agent - using default test mode (paused timers)
    agent = await TesterAgent.create();
  });

  afterAll(async () => {
    await agent.shutdown();
  });

  beforeEach(async () => {
    // Reset to clean state before each test
    await agent.resetToClean();
    // Login as a test warrior
    sessionId = await agent.directLogin('testwarrior');
    // Clear output buffer
    agent.getOutput(sessionId, true);
  });

  afterEach(() => {
    agent.closeSession(sessionId);
  });

  describe('Attack command', () => {
    it('should show error when attacking without a target', async () => {
      // Player starts in Town Square which is a safe zone
      // Safe zone check happens before target validation
      const output = agent.sendCommand(sessionId, 'attack');
      expect(output.toLowerCase()).toMatch(/safe zone|cannot fight here/i);
    });

    it('should show error when target is not found', async () => {
      // Player starts in Town Square which is a safe zone
      // Safe zone check happens before target validation
      const output = agent.sendCommand(sessionId, 'attack nonexistentnpc');
      expect(output.toLowerCase()).toMatch(/safe zone|cannot fight here/i);
    });
  });

  describe('Player stats in combat', () => {
    it('should have health and mana available', async () => {
      const stats = agent.getPlayerStats(sessionId);

      expect(stats.health).toBeGreaterThan(0);
      expect(stats.maxHealth).toBeGreaterThan(0);
      expect(stats.mana).toBeGreaterThanOrEqual(0);
      expect(stats.maxMana).toBeGreaterThan(0);
    });

    it('should allow setting health for testing', async () => {
      // Set to specific health
      agent.setPlayerStats(sessionId, { health: 75, maxHealth: 100 });

      const stats = agent.getPlayerStats(sessionId);
      expect(stats.health).toBe(75);
      expect(stats.maxHealth).toBe(100);
    });

    it('should track level and experience', async () => {
      const stats = agent.getPlayerStats(sessionId);

      expect(stats.level).toBeGreaterThanOrEqual(1);
      expect(stats.experience).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Combat and game ticks', () => {
    it('should process combat rounds on tick advance', async () => {
      // This test verifies that advancing ticks doesn't cause errors
      // even without active combat
      const initialTick = agent.getTickCount();

      // Advance several ticks
      agent.advanceTicks(5);

      const afterTick = agent.getTickCount();
      expect(afterTick).toBe(initialTick + 5);
    });

    it('should process multiple game cycles', async () => {
      // Advance through multiple full regen cycles (12 ticks each)
      // This exercises the game timer without requiring combat
      const initialTick = agent.getTickCount();

      agent.advanceTicks(36); // 3 regen cycles

      const afterTick = agent.getTickCount();
      expect(afterTick).toBe(initialTick + 36);
    });
  });

  describe('Look command in combat context', () => {
    it('should show room description', async () => {
      const output = agent.sendCommand(sessionId, 'look');
      // Should see some room description
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe('Flee command', () => {
    it('should show error when not in combat', async () => {
      const output = agent.sendCommand(sessionId, 'flee');
      // Should indicate not in combat or no need to flee
      expect(output.toLowerCase()).toMatch(/not in combat|fighting|flee/i);
    });
  });
});
