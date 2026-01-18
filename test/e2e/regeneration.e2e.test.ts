import { TesterAgent } from '../../src/testing/testerAgent';

/**
 * E2E tests for player HP/MP regeneration mechanics.
 * 
 * Regeneration occurs every 12 game ticks (72 seconds real-time).
 * Base regen: 4 HP + constitution/10, 4 MP + (wisdom+intelligence)/20
 * Resting bonus: 2x HP regen after 4 ticks of resting
 * Meditating bonus: 2x MP regen after 4 ticks of meditating
 * 
 * These tests work in both embedded mode and remote mode:
 * - Embedded: npm run test:e2e
 * - Remote:   MCP_URL=http://localhost:3100 npm run test:e2e
 */
describe('Regeneration E2E', () => {
  let agent: TesterAgent;
  let sessionId: string;

  beforeAll(async () => {
    agent = await TesterAgent.create();
  });

  afterAll(async () => {
    await agent.shutdown();
  });

  beforeEach(async () => {
    // Reset to clean state before each test
    await agent.resetToClean();
    // Login as a test user
    sessionId = await agent.directLogin('testregen');
  });

  afterEach(async () => {
    await agent.closeSession(sessionId);
  });

  it('should regenerate HP after 12 game ticks', async () => {
    // Set player to 50% health
    await agent.setPlayerStats(sessionId, { health: 50, maxHealth: 100 });

    const before = await agent.getPlayerStats(sessionId);
    expect(before.health).toBe(50);

    // Advance 12 ticks (one regen cycle)
    await agent.advanceTicks(12);

    const after = await agent.getPlayerStats(sessionId);
    // Base regen is 4 + constitution/10, so minimum 4 HP gained
    expect(after.health).toBeGreaterThan(50);
  });

  it('should regenerate MP after 12 game ticks', async () => {
    // Set player to 50% mana
    await agent.setPlayerStats(sessionId, { mana: 25, maxMana: 50 });

    const before = await agent.getPlayerStats(sessionId);
    expect(before.mana).toBe(25);

    // Advance 12 ticks (one regen cycle)
    await agent.advanceTicks(12);

    const after = await agent.getPlayerStats(sessionId);
    // Base regen is 4 + (wisdom+intelligence)/20, so minimum 4 MP gained
    expect(after.mana).toBeGreaterThan(25);
  });

  it('should not regenerate beyond max health', async () => {
    // Set player to 98 health out of 100
    await agent.setPlayerStats(sessionId, { health: 98, maxHealth: 100 });

    // Advance 12 ticks (one regen cycle)
    await agent.advanceTicks(12);

    const after = await agent.getPlayerStats(sessionId);
    // Should cap at maxHealth
    expect(after.health).toBe(100);
  });

  it('should not regenerate beyond max mana', async () => {
    // Set player to 48 mana out of 50
    await agent.setPlayerStats(sessionId, { mana: 48, maxMana: 50 });

    // Advance 12 ticks (one regen cycle)
    await agent.advanceTicks(12);

    const after = await agent.getPlayerStats(sessionId);
    // Should cap at maxMana
    expect(after.mana).toBe(50);
  });

  it('should regenerate faster when resting (after 4 ticks)', async () => {
    // Set player to low health
    await agent.setPlayerStats(sessionId, { health: 30, maxHealth: 100 });

    // Start resting
    await agent.sendCommand(sessionId, 'rest');

    // Advance 4 ticks to reach "full resting" state + 12 ticks for regen cycle = 16 ticks
    await agent.advanceTicks(16);

    const stats = await agent.getPlayerStats(sessionId);
    // Resting gives 2x HP regen bonus, so should gain more than base
    // Base is ~5 HP, 2x = ~10 HP, so health should be at least 40
    expect(stats.health).toBeGreaterThan(35);
  });

  it('should track tick count correctly', async () => {
    const initialTick = await agent.getTickCount();

    await agent.advanceTicks(5);

    expect(await agent.getTickCount()).toBe(initialTick + 5);
  });

  it('should advance to next regen cycle with advanceToRegen', async () => {
    // Get current tick
    const before = await agent.getTickCount();

    // Advance to next regen (should land on a multiple of 12)
    await agent.advanceToRegen();

    const after = await agent.getTickCount();
    expect(after % 12).toBe(0);
    expect(after).toBeGreaterThanOrEqual(before);
  });
});
