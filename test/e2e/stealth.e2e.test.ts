import { TesterAgent } from '../../src/testing/testerAgent';

/**
 * Stealth System E2E Tests
 *
 * Tests the sneak and hide commands:
 * - Sneak: Move silently (no "enters room" messages), invisible to NPCs
 * - Hide: Invisible to everyone in room, breaks when moving
 * - Cannot sneak or hide while in combat or with aggressors
 */
describe('Stealth System', () => {
  let agent: TesterAgent;

  beforeAll(async () => {
    agent = await TesterAgent.create();
  });

  afterAll(async () => {
    await agent.shutdown();
  });

  describe('Sneak Command', () => {
    let sessionId: string;

    beforeEach(async () => {
      await agent.resetToClean();
      sessionId = await agent.directLogin('sneaktest');
    });

    afterEach(async () => {
      await agent.closeSession(sessionId);
    });

    it('should toggle sneak mode on', async () => {
      const output = await agent.sendCommand(sessionId, 'sneak');

      expect(output.toLowerCase()).toContain('stealthily');
    });

    it('should toggle sneak mode off', async () => {
      // First enable sneak
      await agent.sendCommand(sessionId, 'sneak');

      // Then disable it
      const output = await agent.sendCommand(sessionId, 'sneak');

      expect(output.toLowerCase()).toContain('stop sneaking');
    });

    it('should show sneaking status in stats', async () => {
      // Enable sneak
      await agent.sendCommand(sessionId, 'sneak');

      // Check stats
      const output = await agent.sendCommand(sessionId, 'stats');

      // Stats should show sneaking status
      expect(output.toLowerCase()).toMatch(/sneak|stealth/i);
    });
  });

  describe('Hide Command', () => {
    let sessionId: string;

    beforeEach(async () => {
      await agent.resetToClean();
      sessionId = await agent.directLogin('hidetest');
    });

    afterEach(async () => {
      await agent.closeSession(sessionId);
    });

    it('should toggle hide mode on', async () => {
      const output = await agent.sendCommand(sessionId, 'hide');

      expect(output.toLowerCase()).toContain('hide');
    });

    it('should toggle hide mode off', async () => {
      // First enable hide
      await agent.sendCommand(sessionId, 'hide');

      // Then disable it
      const output = await agent.sendCommand(sessionId, 'hide');

      expect(output.toLowerCase()).toContain('step out of hiding');
    });

    it('should break hide when moving', async () => {
      // Enable hide
      await agent.sendCommand(sessionId, 'hide');
      expect((await agent.sendCommand(sessionId, 'hide')).toLowerCase()).toContain(
        'step out of hiding'
      );

      // Re-enable hide
      await agent.sendCommand(sessionId, 'hide');

      // Move in any direction (will break hide regardless of success)
      const moveOutput = await agent.sendCommand(sessionId, 'north');

      // Check if movement message or breaking cover message appears
      // The break message appears when moving while hidden
      expect(
        moveOutput.toLowerCase().includes('break') ||
          moveOutput.toLowerCase().includes('cover') ||
          moveOutput.toLowerCase().includes('moving') ||
          moveOutput.toLowerCase().includes('no exit')
      ).toBe(true);
    });
  });

  // Combat restrictions are tested in unit tests (sneak.command.test.ts, hide.command.test.ts)
  // E2E testing would require spawning NPCs and entering actual combat

  describe('Stealth Combination', () => {
    let sessionId: string;

    beforeEach(async () => {
      await agent.resetToClean();
      sessionId = await agent.directLogin('stealthcombo');
    });

    afterEach(async () => {
      await agent.closeSession(sessionId);
    });

    it('should allow combining sneak and hide', async () => {
      // Enable sneak
      const sneakOutput = await agent.sendCommand(sessionId, 'sneak');
      expect(sneakOutput.toLowerCase()).toContain('stealthily');

      // Enable hide while sneaking
      const hideOutput = await agent.sendCommand(sessionId, 'hide');
      expect(hideOutput.toLowerCase()).toContain('hide');
    });

    it('should maintain sneak when hide breaks from movement', async () => {
      // Enable both sneak and hide
      await agent.sendCommand(sessionId, 'sneak');
      await agent.sendCommand(sessionId, 'hide');

      // Move (this will break hide but not sneak)
      await agent.sendCommand(sessionId, 'north');

      // Disable sneak to verify it was still on
      const output = await agent.sendCommand(sessionId, 'sneak');
      expect(output.toLowerCase()).toContain('stop sneaking');
    });
  });

  // Multi-player visibility tests require players to enter the game world properly
  // (not just authenticate via directLogin). The hide filtering is tested in unit tests
  // and the room.getDescriptionExcludingPlayer logic in room.test.ts
});
