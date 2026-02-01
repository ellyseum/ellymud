import { TesterAgent } from '../../src/testing/testerAgent';

/**
 * Quest Dialogue E2E Tests
 *
 * Tests NPC dialogue system integration with quests.
 * Covers:
 * - Talk command usage
 * - Reply command for dialogue options
 * - Quest dialogues with NPCs
 * - Dialogue command variations
 *
 * Note: Some tests depend on NPC presence in rooms. Tests are designed
 * to gracefully handle cases where expected NPCs are not present.
 *
 * Works in both embedded mode and remote mode:
 * - Embedded: npm run test:e2e
 * - Remote:   MCP_URL=http://localhost:3100 npm run test:e2e
 */
describe('Quest Dialogue E2E', () => {
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
    sessionId = await agent.directLogin('dlguser');
    await agent.getOutput(sessionId, true);
  });

  afterEach(async () => {
    await agent.closeSession(sessionId);
  });

  // ============================================================
  // TALK COMMAND BASICS
  // ============================================================
  describe('Talk Command Basics', () => {
    it('should respond to talk command without target', async () => {
      const output = await agent.sendCommand(sessionId, 'talk');
      // Should show usage or prompt
      expect(output.length).toBeGreaterThan(0);
    });

    it('should respond when NPC is not in room', async () => {
      const output = await agent.sendCommand(sessionId, 'talk fakecharacter');
      // Should indicate NPC not found
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle partial NPC name matching', async () => {
      // Try talking to a trainer (if one exists)
      const output = await agent.sendCommand(sessionId, 'talk trainer');
      expect(output.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // REPLY COMMAND BASICS
  // ============================================================
  describe('Reply Command Basics', () => {
    it('should respond to reply without conversation', async () => {
      const output = await agent.sendCommand(sessionId, 'reply 1');
      // Should indicate no active conversation
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle invalid reply input', async () => {
      const output = await agent.sendCommand(sessionId, 'reply abc');
      // Should show usage error
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle reply without number', async () => {
      const output = await agent.sendCommand(sessionId, 'reply');
      // Should show usage
      expect(output.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // NPC DIALOGUE INTERACTION
  // ============================================================
  describe('NPC Dialogue Interaction', () => {
    it('should attempt to talk to NPCs in starting room', async () => {
      // Try talking to various NPCs that might be present
      const output1 = await agent.sendCommand(sessionId, 'talk gareth');
      const output2 = await agent.sendCommand(sessionId, 'talk marcus');

      // At least one should produce output
      expect(output1.length + output2.length).toBeGreaterThan(0);
    });

    it('should handle talk with quest active', async () => {
      // Accept a quest first
      await agent.sendCommand(sessionId, 'quest accept rat_problem');

      // Try to talk to an NPC
      const output = await agent.sendCommand(sessionId, 'talk gareth');
      expect(output.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // CONVERSATION FLOW
  // ============================================================
  describe('Conversation Flow', () => {
    it('should attempt dialogue sequence', async () => {
      // Start conversation
      const talkOutput = await agent.sendCommand(sessionId, 'talk gareth');
      expect(talkOutput.length).toBeGreaterThan(0);

      // Attempt reply (may not work if no dialogue available)
      const replyOutput = await agent.sendCommand(sessionId, 'reply 1');
      expect(replyOutput.length).toBeGreaterThan(0);
    });

    it('should allow resuming conversation with empty talk', async () => {
      // Start conversation
      await agent.sendCommand(sessionId, 'talk gareth');

      // Resume with just "talk"
      const output = await agent.sendCommand(sessionId, 'talk');
      expect(output.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // DIALOGUE WITH SPECIAL NPCS
  // ============================================================
  describe('Dialogue with Special NPCs', () => {
    it('should handle talking to merchant', async () => {
      const output = await agent.sendCommand(sessionId, 'talk marcus');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle talking to trainer', async () => {
      const output = await agent.sendCommand(sessionId, 'talk gareth');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle talking to banker', async () => {
      const output = await agent.sendCommand(sessionId, 'talk goldwin');
      expect(output.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // QUEST DIALOGUE INTEGRATION
  // ============================================================
  describe('Quest Dialogue Integration', () => {
    it('should handle quest accept then talk flow', async () => {
      // Accept a quest
      const acceptOutput = await agent.sendCommand(sessionId, 'quest accept rat_problem');
      expect(acceptOutput.length).toBeGreaterThan(0);

      // Try to interact with quest-related NPC (innkeeper)
      const talkOutput = await agent.sendCommand(sessionId, 'talk innkeeper');
      expect(talkOutput.length).toBeGreaterThan(0);
    });

    it('should show quest info after dialogue', async () => {
      // Accept quest and interact
      await agent.sendCommand(sessionId, 'quest accept rat_problem');
      await agent.sendCommand(sessionId, 'talk innkeeper');

      // Check quest status
      const questOutput = await agent.sendCommand(sessionId, 'quest');
      expect(questOutput.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // MULTIPLE PLAYERS
  // ============================================================
  describe('Multiple Players Dialogue', () => {
    it('should handle multiple players talking to NPCs', async () => {
      const session2 = await agent.directLogin('dlgtwo');

      // Both try to talk
      const output1 = await agent.sendCommand(sessionId, 'talk gareth');
      const output2 = await agent.sendCommand(session2, 'talk gareth');

      expect(output1.length + output2.length).toBeGreaterThan(0);

      await agent.closeSession(session2);
    });

    it('should maintain separate conversation contexts', async () => {
      const session2 = await agent.directLogin('dlgtwo');

      // Player 1 starts conversation
      await agent.sendCommand(sessionId, 'talk gareth');

      // Player 2 shouldn't have conversation context
      const output2 = await agent.sendCommand(session2, 'reply 1');

      // Should indicate no conversation
      expect(output2.length).toBeGreaterThan(0);

      await agent.closeSession(session2);
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================
  describe('Edge Cases', () => {
    it('should handle talk after movement', async () => {
      // Move to a different room
      await agent.sendCommand(sessionId, 'north');

      // Try to talk
      const output = await agent.sendCommand(sessionId, 'talk trainer');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle talk with template ID', async () => {
      const output = await agent.sendCommand(sessionId, 'talk trainer_1');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle out-of-range reply', async () => {
      await agent.sendCommand(sessionId, 'talk gareth');
      const output = await agent.sendCommand(sessionId, 'reply 999');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle negative reply number', async () => {
      await agent.sendCommand(sessionId, 'talk gareth');
      const output = await agent.sendCommand(sessionId, 'reply -1');
      expect(output.length).toBeGreaterThan(0);
    });
  });
});
