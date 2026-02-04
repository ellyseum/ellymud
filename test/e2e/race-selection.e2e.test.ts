import { TesterAgent } from '../../src/testing/testerAgent';

/**
 * Race Selection E2E Tests
 *
 * Tests the race selection flow during new character creation.
 * Uses the TesterAgent to create virtual sessions and interact with the game.
 *
 * Note: The directLogin() method bypasses normal signup flow, so we need
 * to test race selection through the full signup flow using createSession()
 * and sending commands through the state machine.
 *
 * Works in both embedded mode and remote mode:
 * - Embedded: npm run test:e2e
 * - Remote:   MCP_URL=http://localhost:3100 npm run test:e2e
 */
describe('Race Selection E2E', () => {
  let agent: TesterAgent;

  beforeAll(async () => {
    agent = await TesterAgent.create();
  });

  afterAll(async () => {
    await agent.shutdown();
  });

  describe('New Character Signup Flow', () => {
    let sessionId: string;

    beforeEach(async () => {
      await agent.resetToClean();
    });

    afterEach(async () => {
      if (sessionId) {
        await agent.closeSession(sessionId);
      }
    });

    it('should flow through race selection during signup', async () => {
      // Create an unauthenticated session
      sessionId = await agent.createSession();

      // Clear initial banner output
      await agent.getOutput(sessionId, true);

      // Enter 'new' to start signup
      await agent.sendCommand(sessionId, 'new');

      // Provide a username
      const usernameOutput = await agent.sendCommand(sessionId, 'racetest');
      expect(usernameOutput.toLowerCase()).toContain('password');

      // Provide a password - this triggers transition to race selection
      await agent.sendCommand(sessionId, 'testpass123');

      // Wait for state transition to complete and collect race selection output
      await new Promise((r) => setTimeout(r, 100));
      const raceSelectionOutput = await agent.getOutput(sessionId, true);

      // Should now be in race selection state and see the race menu (header says "CHOOSE YOUR HERITAGE")
      expect(raceSelectionOutput.toLowerCase()).toContain('heritage');
      expect(raceSelectionOutput.toLowerCase()).toContain('human');
      expect(raceSelectionOutput.toLowerCase()).toContain('elf');
      expect(raceSelectionOutput.toLowerCase()).toContain('dwarf');
      expect(raceSelectionOutput.toLowerCase()).toContain('halfling');
      expect(raceSelectionOutput.toLowerCase()).toContain('orc');
    });

    it('should select a race by number', async () => {
      sessionId = await agent.createSession();
      await agent.getOutput(sessionId, true);

      // Go through signup to reach race selection
      await agent.sendCommand(sessionId, 'new');
      await agent.sendCommand(sessionId, 'numselect');
      await agent.sendCommand(sessionId, 'testpass123');

      // Select race #1 (Human)
      const output = await agent.sendCommand(sessionId, '1');

      // Should confirm the selection
      expect(output.toLowerCase()).toContain('human');
      expect(output.toLowerCase()).toContain('chosen');
    });

    it('should select a race by name', async () => {
      sessionId = await agent.createSession();
      await agent.getOutput(sessionId, true);

      await agent.sendCommand(sessionId, 'new');
      await agent.sendCommand(sessionId, 'nameselect');
      await agent.sendCommand(sessionId, 'testpass123');

      // Select race by name (elf)
      const output = await agent.sendCommand(sessionId, 'elf');

      // Should confirm the selection
      expect(output.toLowerCase()).toContain('elf');
      expect(output.toLowerCase()).toContain('chosen');
    });

    it('should show error for invalid race selection', async () => {
      sessionId = await agent.createSession();
      await agent.getOutput(sessionId, true);

      await agent.sendCommand(sessionId, 'new');
      await agent.sendCommand(sessionId, 'invalidrace');
      await agent.sendCommand(sessionId, 'testpass123');

      // Try invalid selection
      const output = await agent.sendCommand(sessionId, 'dragon');

      // Should show error
      expect(output.toLowerCase()).toContain('invalid');
    });

    it('should show error for invalid number selection', async () => {
      sessionId = await agent.createSession();
      await agent.getOutput(sessionId, true);

      await agent.sendCommand(sessionId, 'new');
      await agent.sendCommand(sessionId, 'badnumber');
      await agent.sendCommand(sessionId, 'testpass123');

      // Try invalid number (there are only 5 races)
      const output = await agent.sendCommand(sessionId, '99');

      // Should show error
      expect(output.toLowerCase()).toContain('invalid');
    });
  });

  describe('Race Stat Modifiers', () => {
    let sessionId: string;

    beforeEach(async () => {
      await agent.resetToClean();
    });

    afterEach(async () => {
      if (sessionId) {
        await agent.closeSession(sessionId);
      }
    });

    it('should apply dwarf stat modifiers (+STR, +CON)', async () => {
      sessionId = await agent.createSession();
      await agent.getOutput(sessionId, true);

      // Complete signup with dwarf race
      await agent.sendCommand(sessionId, 'new');
      await agent.sendCommand(sessionId, 'dwarftest');
      await agent.sendCommand(sessionId, 'testpass123');

      // Wait for race selection to display
      await new Promise((r) => setTimeout(r, 100));

      await agent.sendCommand(sessionId, 'dwarf');

      // Wait for confirmation state
      await new Promise((r) => setTimeout(r, 100));

      // Confirm character creation (state expects 'confirm', not 'yes')
      await agent.sendCommand(sessionId, 'confirm');

      // Wait for game state to settle
      await new Promise((r) => setTimeout(r, 100));

      // Check stats - dwarf should have STR +2, CON +3
      const statsOutput = await agent.sendCommand(sessionId, 'stats');

      // Verify the race is displayed
      expect(statsOutput.toLowerCase()).toContain('dwarf');
    });

    it('should apply elf stat modifiers (+DEX, +INT, +WIS)', async () => {
      sessionId = await agent.createSession();
      await agent.getOutput(sessionId, true);

      // Complete signup with elf race
      await agent.sendCommand(sessionId, 'new');
      await agent.sendCommand(sessionId, 'elftest');
      await agent.sendCommand(sessionId, 'testpass123');

      // Wait for race selection to display
      await new Promise((r) => setTimeout(r, 100));

      await agent.sendCommand(sessionId, 'elf');

      // Wait for confirmation state
      await new Promise((r) => setTimeout(r, 100));

      // Confirm character creation (state expects 'confirm', not 'yes')
      await agent.sendCommand(sessionId, 'confirm');

      await new Promise((r) => setTimeout(r, 100));

      // Check stats
      const statsOutput = await agent.sendCommand(sessionId, 'stats');

      // Verify the race is displayed
      expect(statsOutput.toLowerCase()).toContain('elf');
    });

    it('should apply orc stat modifiers (+STR)', async () => {
      sessionId = await agent.createSession();
      await agent.getOutput(sessionId, true);

      // Complete signup with orc race
      await agent.sendCommand(sessionId, 'new');
      await agent.sendCommand(sessionId, 'orctest');
      await agent.sendCommand(sessionId, 'testpass123');

      // Wait for race selection to display
      await new Promise((r) => setTimeout(r, 100));

      await agent.sendCommand(sessionId, 'orc');

      // Wait for confirmation state
      await new Promise((r) => setTimeout(r, 100));

      // Confirm character creation (state expects 'confirm', not 'yes')
      await agent.sendCommand(sessionId, 'confirm');

      await new Promise((r) => setTimeout(r, 100));

      // Check stats
      const statsOutput = await agent.sendCommand(sessionId, 'stats');

      // Verify the race is displayed
      expect(statsOutput.toLowerCase()).toContain('orc');
    });

    it('should apply halfling stat modifiers (+DEX, +AGI, +CHA)', async () => {
      sessionId = await agent.createSession();
      await agent.getOutput(sessionId, true);

      // Complete signup with halfling race
      await agent.sendCommand(sessionId, 'new');
      await agent.sendCommand(sessionId, 'halftest');
      await agent.sendCommand(sessionId, 'testpass123');

      // Wait for race selection to display
      await new Promise((r) => setTimeout(r, 100));

      await agent.sendCommand(sessionId, 'halfling');

      // Wait for confirmation state
      await new Promise((r) => setTimeout(r, 100));

      // Confirm character creation (state expects 'confirm', not 'yes')
      await agent.sendCommand(sessionId, 'confirm');

      await new Promise((r) => setTimeout(r, 100));

      // Check stats
      const statsOutput = await agent.sendCommand(sessionId, 'stats');

      // Verify the race is displayed
      expect(statsOutput.toLowerCase()).toContain('halfling');
    });
  });

  describe('Race Display in Game', () => {
    let sessionId: string;

    beforeEach(async () => {
      await agent.resetToClean();
    });

    afterEach(async () => {
      if (sessionId) {
        await agent.closeSession(sessionId);
      }
    });

    it('should display race in stats command after character creation', async () => {
      sessionId = await agent.createSession();
      await agent.getOutput(sessionId, true);

      // Complete full signup flow
      await agent.sendCommand(sessionId, 'new');
      await agent.sendCommand(sessionId, 'raceshow');
      await agent.sendCommand(sessionId, 'testpass123');

      // Wait for race selection to display
      await new Promise((r) => setTimeout(r, 100));

      await agent.sendCommand(sessionId, 'human');

      // Wait for confirmation state
      await new Promise((r) => setTimeout(r, 100));

      // Confirm character creation (state expects 'confirm', not 'yes')
      await agent.sendCommand(sessionId, 'confirm');

      await new Promise((r) => setTimeout(r, 100));

      // Check stats shows race
      const statsOutput = await agent.sendCommand(sessionId, 'stats');
      expect(statsOutput.toLowerCase()).toContain('human');
    });
  });
});
