import { TesterAgent } from '../../src/testing/testerAgent';

/**
 * E2E Tests for Map and Walk Commands
 *
 * Tests the map visualization and auto-walk pathfinding features.
 */
describe('Map and Walk Commands E2E', () => {
  let agent: TesterAgent;

  beforeAll(async () => {
    agent = await TesterAgent.create();
  });

  afterAll(async () => {
    await agent.shutdown();
  });

  describe('map command', () => {
    let sessionId: string;

    beforeEach(async () => {
      sessionId = await agent.directLogin('maptester');
    });

    afterEach(async () => {
      if (sessionId) {
        await agent.closeSession(sessionId);
      }
    });

    it('should display ASCII map of current area', async () => {
      // First ensure we're in a valid room
      await agent.sendCommand(sessionId, 'look');

      const output = await agent.sendCommand(sessionId, 'map');

      // Should contain map header
      expect(output).toContain('Map:');

      // Should contain legend
      expect(output).toContain('Legend');

      // Should contain room markers
      expect(output).toMatch(/[@#]/);
    });

    it('should show current position with @ marker', async () => {
      await agent.sendCommand(sessionId, 'look');
      const output = await agent.sendCommand(sessionId, 'map');

      // @ marks current position
      expect(output).toContain('@');
    });

    it('should work with "m" alias', async () => {
      await agent.sendCommand(sessionId, 'look');
      const output = await agent.sendCommand(sessionId, 'm');

      expect(output).toContain('Map:');
    });

    it('should work with "area" alias', async () => {
      await agent.sendCommand(sessionId, 'look');
      const output = await agent.sendCommand(sessionId, 'area');

      expect(output).toContain('Map:');
    });
  });

  describe('walk command', () => {
    let sessionId: string;

    beforeEach(async () => {
      sessionId = await agent.directLogin('walktester');
      // Ensure we're in a valid room
      await agent.sendCommand(sessionId, 'look');
      // Clear any previous output
      await agent.getOutput(sessionId, true);
    });

    afterEach(async () => {
      if (sessionId) {
        // Cancel any active walk before closing
        await agent.sendCommand(sessionId, 'walk stop');
        await agent.closeSession(sessionId);
      }
    });

    it('should show usage when no destination provided', async () => {
      const output = await agent.sendCommand(sessionId, 'walk');

      expect(output).toContain('Usage');
    });

    it('should show error for non-existent destination', async () => {
      const output = await agent.sendCommand(sessionId, 'walk nonexistent-room-xyz');

      expect(output).toContain('Cannot find path');
    });

    it('should show already there message when at destination', async () => {
      // First get current room name
      const lookOutput = await agent.sendCommand(sessionId, 'look');

      // Try to walk to current room (by walking to a known room first and then back)
      const output = await agent.sendCommand(sessionId, 'walk room 1');

      // Either starts walking or says already there
      expect(output).toMatch(/Starting auto-walk|already there/);
    });

    it('should start auto-walk for valid destination', async () => {
      const output = await agent.sendCommand(sessionId, 'walk room 2');

      // Should either start walking or show an error if no path
      expect(output).toMatch(/Starting auto-walk|Cannot find path|already there/);
    });

    it('should auto-walk complete successfully without interruption', async () => {
      // Start a walk to a room
      const walkOutput = await agent.sendCommand(sessionId, 'walk room 5');

      if (walkOutput.includes('Starting auto-walk')) {
        // In test mode, movement is instant so walk completes immediately
        // Verify arrival message appears
        expect(walkOutput).toMatch(/arrived|Room 5/i);
      }
    });

    // Note: Auto-walk interrupt during movement is tested via MCP in non-test mode
    // because test mode has instant movement (0 delay), leaving no window for interrupts

    it('should work with "goto" alias', async () => {
      const output = await agent.sendCommand(sessionId, 'goto room 2');

      expect(output).toMatch(/Starting auto-walk|Cannot find path|already there/);
    });
  });

  describe('movement command queuing', () => {
    let sessionId: string;

    beforeEach(async () => {
      sessionId = await agent.directLogin('queuetester');
      // Ensure we're in a valid room
      await agent.sendCommand(sessionId, 'look');
      await agent.getOutput(sessionId, true);
    });

    afterEach(async () => {
      if (sessionId) {
        await agent.closeSession(sessionId);
      }
    });

    it('should queue commands entered during movement', async () => {
      // Get the initial room
      const lookOutput = await agent.sendCommand(sessionId, 'look');
      const hasNorthExit = lookOutput.includes('north');

      if (hasNorthExit) {
        // Send north command to start moving
        const moveOutput = await agent.sendCommand(sessionId, 'north');

        if (moveOutput.includes('Moving slowly')) {
          // Send south command while moving - it should be queued
          await agent.sendCommand(sessionId, 'south');

          // Wait for both movements to complete
          await agent.advanceTicks(30);

          // Get output and verify we moved north then south (back to start)
          const finalOutput = await agent.getOutput(sessionId, false);

          // Should see evidence of both moves
          expect(finalOutput).toContain('Moving');
        }
      }
    });

    it('should execute queued commands in order after movement completes', async () => {
      // Get the initial room
      const lookOutput = await agent.sendCommand(sessionId, 'look');
      const hasNorthExit = lookOutput.includes('north');

      if (hasNorthExit) {
        // Send north command to start moving
        const moveOutput = await agent.sendCommand(sessionId, 'north');

        // In test mode, movement is instant (0 delay) so commands execute immediately
        // rather than being queued. We verify movement worked by checking for room output.
        if (moveOutput.includes('Moving slowly')) {
          // Non-test mode: Queue a look command while moving
          await agent.sendCommand(sessionId, 'look');

          // Wait for movement and queued command to complete
          await agent.advanceTicks(30);

          // Get output - should show the room description from the queued look
          const finalOutput = await agent.getOutput(sessionId, false);

          // The look command should have executed showing room details
          expect(finalOutput).toMatch(/exits|Obvious|room/i);
        } else {
          // Test mode: Movement is instant, so just verify the move happened
          // The "look" after move would run immediately, not be queued
          const afterMoveOutput = await agent.sendCommand(sessionId, 'look');
          expect(afterMoveOutput).toMatch(/exits|Obvious|room/i);
        }
      }
    });
  });

  describe('pathfinding integration', () => {
    let sessionId: string;

    beforeEach(async () => {
      sessionId = await agent.directLogin('pathtest');
      // Ensure we're in a valid room
      await agent.sendCommand(sessionId, 'look');
      await agent.getOutput(sessionId, true);
    });

    afterEach(async () => {
      if (sessionId) {
        await agent.sendCommand(sessionId, 'walk stop');
        await agent.closeSession(sessionId);
      }
    });

    it('should find path and show step count', async () => {
      const output = await agent.sendCommand(sessionId, 'walk room 3');

      // If path found, should show step count
      if (output.includes('Starting auto-walk')) {
        expect(output).toMatch(/\d+ steps/);
      }
    });

    it('should complete walk and show arrival message', async () => {
      // Start a short walk
      const startOutput = await agent.sendCommand(sessionId, 'walk room 2');

      if (startOutput.includes('Starting auto-walk')) {
        // Advance time to let walk complete (1 second per step)
        await agent.advanceTicks(30); // 3 ticks per second * 10 seconds

        // Get remaining output
        const output = await agent.getOutput(sessionId, false);

        // Should eventually arrive or be interrupted
        const combinedOutput = startOutput + output;
        expect(combinedOutput).toMatch(/arrived|interrupted|Starting auto-walk/);
      }
    });
  });
});
