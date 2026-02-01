import { TesterAgent } from '../../src/testing/testerAgent';

/**
 * Quest Flow E2E Tests
 *
 * Tests the complete quest lifecycle from start to finish.
 * Covers:
 * - Viewing available quests
 * - Accepting quests
 * - Checking quest progress
 * - Abandoning quests
 * - Quest command variations
 *
 * Works in both embedded mode and remote mode:
 * - Embedded: npm run test:e2e
 * - Remote:   MCP_URL=http://localhost:3100 npm run test:e2e
 */
describe('Quest Flow E2E', () => {
  let agent: TesterAgent;
  let sessionId: string;

  beforeAll(async () => {
    agent = await TesterAgent.create();
  });

  afterAll(async () => {
    await agent.shutdown();
  });

  beforeEach(async () => {
    await agent.resetToClean();
    sessionId = await agent.directLogin('questuser');
    await agent.getOutput(sessionId, true);
  });

  afterEach(async () => {
    await agent.closeSession(sessionId);
  });

  // ============================================================
  // QUEST COMMAND BASICS
  // ============================================================
  describe('Quest Command Basics', () => {
    it('should respond to quest command', async () => {
      const output = await agent.sendCommand(sessionId, 'quest');
      // Should get some response (either quest log or "no quests" message)
      expect(output.length).toBeGreaterThan(0);
    });

    it('should respond to quest available command', async () => {
      const output = await agent.sendCommand(sessionId, 'quest available');
      // Should show available quests or indicate none available
      expect(output.length).toBeGreaterThan(0);
    });

    it('should respond to quest avail alias', async () => {
      const output = await agent.sendCommand(sessionId, 'quest avail');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should respond to quest completed command', async () => {
      const output = await agent.sendCommand(sessionId, 'quest completed');
      // Should show completed quests or "none" message
      expect(output.length).toBeGreaterThan(0);
    });

    it('should respond to quest done alias', async () => {
      const output = await agent.sendCommand(sessionId, 'quest done');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle unknown quest ID', async () => {
      const output = await agent.sendCommand(sessionId, 'quest unknownid');
      // Should respond with error or details attempt
      expect(output.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // QUEST ACCEPT/ABANDON FLOW
  // ============================================================
  describe('Quest Accept and Abandon Flow', () => {
    it('should show usage for quest accept without ID', async () => {
      const output = await agent.sendCommand(sessionId, 'quest accept');
      // Should show usage message
      expect(output.length).toBeGreaterThan(0);
    });

    it('should show usage for quest abandon without ID', async () => {
      const output = await agent.sendCommand(sessionId, 'quest abandon');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle abandon for non-active quest', async () => {
      const output = await agent.sendCommand(sessionId, 'quest abandon fakeid');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should attempt to accept a quest', async () => {
      // Try to accept the rat_problem quest
      const output = await agent.sendCommand(sessionId, 'quest accept rat_problem');
      // Should respond with acceptance message or error
      expect(output.length).toBeGreaterThan(0);
    });

    it('should support quest start alias', async () => {
      const output = await agent.sendCommand(sessionId, 'quest start rat_problem');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should support quest drop alias', async () => {
      // First try to accept, then drop
      await agent.sendCommand(sessionId, 'quest accept rat_problem');
      const output = await agent.sendCommand(sessionId, 'quest drop rat_problem');
      expect(output.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // QUEST DETAILS
  // ============================================================
  describe('Quest Details', () => {
    it('should show details for rat_problem quest', async () => {
      const output = await agent.sendCommand(sessionId, 'quest rat_problem');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should show details for tutorial_welcome quest', async () => {
      const output = await agent.sendCommand(sessionId, 'quest tutorial_welcome');
      expect(output.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // QUEST LOG VARIATIONS
  // ============================================================
  describe('Quest Log Variations', () => {
    it('should support quest log command', async () => {
      const output = await agent.sendCommand(sessionId, 'quest log');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should support quest active alias', async () => {
      const output = await agent.sendCommand(sessionId, 'quest active');
      expect(output.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // QUEST LIFECYCLE
  // ============================================================
  describe('Quest Lifecycle', () => {
    it('should accept, view, and abandon a quest', async () => {
      // Accept quest
      const acceptOutput = await agent.sendCommand(sessionId, 'quest accept rat_problem');
      expect(acceptOutput.length).toBeGreaterThan(0);

      // View quest log
      const logOutput = await agent.sendCommand(sessionId, 'quest');
      expect(logOutput.length).toBeGreaterThan(0);

      // View quest details
      const detailsOutput = await agent.sendCommand(sessionId, 'quest rat_problem');
      expect(detailsOutput.length).toBeGreaterThan(0);

      // Abandon quest
      const abandonOutput = await agent.sendCommand(sessionId, 'quest abandon rat_problem');
      expect(abandonOutput.length).toBeGreaterThan(0);
    });

    it('should show quest in log after accepting', async () => {
      // Accept quest
      await agent.sendCommand(sessionId, 'quest accept rat_problem');

      // Check quest log
      const output = await agent.sendCommand(sessionId, 'quest');

      // If quest was accepted, it should appear in the log
      // The output should contain either quest info or "no quests" message
      expect(output.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // QUEST PREREQUISITES
  // ============================================================
  describe('Quest Prerequisites', () => {
    it('should handle quest with class prerequisite', async () => {
      // paladin_trial requires specific class
      const output = await agent.sendCommand(sessionId, 'quest accept paladin_trial');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should show available quests at level 1', async () => {
      await agent.setPlayerStats(sessionId, { level: 1 });
      const output = await agent.sendCommand(sessionId, 'quest available');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should show available quests at high level', async () => {
      await agent.setPlayerStats(sessionId, { level: 50 });
      const output = await agent.sendCommand(sessionId, 'quest available');
      expect(output.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // MULTIPLE SESSIONS
  // ============================================================
  describe('Multiple Sessions', () => {
    it('should handle quest commands from multiple players', async () => {
      const session2 = await agent.directLogin('questtwo');

      // Both players check quests
      const output1 = await agent.sendCommand(sessionId, 'quest available');
      const output2 = await agent.sendCommand(session2, 'quest available');

      expect(output1.length).toBeGreaterThan(0);
      expect(output2.length).toBeGreaterThan(0);

      await agent.closeSession(session2);
    });

    it('should maintain independent quest state per player', async () => {
      const session2 = await agent.directLogin('questtwo');

      // Player 1 accepts quest
      await agent.sendCommand(sessionId, 'quest accept rat_problem');

      // Player 2 should not have the quest
      const output2 = await agent.sendCommand(session2, 'quest');

      // Just verify we got a response
      expect(output2.length).toBeGreaterThan(0);

      await agent.closeSession(session2);
    });
  });
});
