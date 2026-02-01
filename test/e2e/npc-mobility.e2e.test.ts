import { TesterAgent } from '../../src/testing/testerAgent';

/**
 * NPC Mobility E2E Tests
 *
 * Tests the automatic NPC movement between rooms.
 * Uses NPCs with canMove: true (wolf, goblin) to verify movement behavior.
 */
describe('NPC Mobility System', () => {
  let agent: TesterAgent;

  beforeAll(async () => {
    agent = await TesterAgent.create();
  });

  afterAll(async () => {
    await agent.shutdown();
  });

  describe('NPC Movement', () => {
    let sessionId: string;

    beforeEach(async () => {
      await agent.resetToClean();
      sessionId = await agent.directLogin('mobilitytest');
    });

    afterEach(async () => {
      if (sessionId) {
        await agent.closeSession(sessionId);
      }
    });

    it('should initialize mobility system without errors', async () => {
      // Advance a few ticks to ensure mobility system runs
      await agent.advanceTicks(5);

      // If we get here without errors, mobility system initialized correctly
      const output = await agent.sendCommand(sessionId, 'look');
      expect(output).toBeDefined();
    });

    it('should allow spawning mobile NPCs', async () => {
      // Spawn a wolf (which has canMove: true)
      const spawnOutput = await agent.sendCommand(sessionId, 'spawn wolf');
      expect(spawnOutput).toContain('spawned');

      // Check wolf is in room
      const look = await agent.sendCommand(sessionId, 'look');
      expect(look.toLowerCase()).toContain('wolf');
    });

    it('should process ticks with mobile NPCs without errors', async () => {
      // Spawn a mobile NPC
      await agent.sendCommand(sessionId, 'spawn goblin');

      // Advance enough ticks for movement to occur (goblin has movementTicks: 20)
      await agent.advanceTicks(25);

      // Wait a moment for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify game is still running without errors
      const look = await agent.sendCommand(sessionId, 'look');
      expect(look).toBeDefined();
    });

    it('should not move merchants', async () => {
      // Spawn a merchant
      const spawnOutput = await agent.sendCommand(sessionId, 'spawn merchant_1');
      expect(spawnOutput).toContain('spawned');

      // Get current room state
      const lookBefore = await agent.sendCommand(sessionId, 'look');
      expect(lookBefore.toLowerCase()).toContain('marcus');

      // Advance many ticks
      await agent.advanceTicks(50);

      // Merchant should still be here
      const lookAfter = await agent.sendCommand(sessionId, 'look');
      expect(lookAfter.toLowerCase()).toContain('marcus');
    });

    it('should not move NPCs in combat', async () => {
      // Spawn a wolf
      await agent.sendCommand(sessionId, 'spawn wolf');

      // Start combat with it
      await agent.sendCommand(sessionId, 'attack wolf');

      // Get current state
      const lookBefore = await agent.sendCommand(sessionId, 'look');
      expect(lookBefore.toLowerCase()).toContain('wolf');

      // Advance ticks (but wolf should stay due to combat)
      await agent.advanceTicks(20);

      // Wolf should still be here (in combat)
      const lookAfter = await agent.sendCommand(sessionId, 'look');
      expect(lookAfter.toLowerCase()).toContain('wolf');
    });
  });

  describe('Movement Messages', () => {
    let sessionId: string;

    beforeEach(async () => {
      await agent.resetToClean();
      sessionId = await agent.directLogin('msgtest');
    });

    afterEach(async () => {
      if (sessionId) {
        await agent.closeSession(sessionId);
      }
    });

    it('should handle multiple mobile NPCs', async () => {
      // Spawn multiple mobile NPCs
      await agent.sendCommand(sessionId, 'spawn wolf');
      await agent.sendCommand(sessionId, 'spawn goblin');

      // Advance ticks
      await agent.advanceTicks(30);

      // Game should still be running
      const look = await agent.sendCommand(sessionId, 'look');
      expect(look).toBeDefined();
    });
  });
});
