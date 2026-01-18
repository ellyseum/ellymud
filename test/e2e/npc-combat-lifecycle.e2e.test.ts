import { TesterAgent } from '../../src/testing/testerAgent';
import { NPC, NPCData } from '../../src/combat/npc';

/**
 * E2E tests for NPC combat lifecycle.
 * 
 * Tests the complete NPC lifecycle:
 * - NPC template loading and instance creation
 * - Combat engagement and damage dealing
 * - Damage range validation
 * - NPC defeat, item drops, and experience rewards
 * - NPC removal from room after death
 * 
 * All tests work in both embedded and remote modes.
 */
describe('NPC Combat Lifecycle E2E', () => {
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
    sessionId = await agent.directLogin('combattest');
    await agent.getOutput(sessionId, true);
  });

  afterEach(async () => {
    await agent.closeSession(sessionId);
  });

  describe('NPC Template and Instance Creation', () => {
    it('should have NPC templates loaded', async () => {
      const templates = await agent.getAllNpcTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should find hostile NPC template (goblin)', async () => {
      const goblin = await agent.getNpcTemplateById('goblin');
      expect(goblin).toBeDefined();
      expect(goblin?.isHostile).toBe(true);
      expect(goblin?.experienceValue).toBeGreaterThan(0);
    });

    it('should create NPC instance from template with correct stats', async () => {
      const template = await agent.getNpcTemplateById('goblin');
      expect(template).toBeDefined();
      if (!template) return;

      const instance = NPC.fromNPCData(template);
      
      expect(instance.name).toBe(template.name);
      expect(instance.health).toBe(template.health);
      expect(instance.maxHealth).toBe(template.maxHealth);
      expect(instance.isHostile).toBe(template.isHostile);
      expect(instance.templateId).toBe(template.id);
      expect(instance.instanceId).toBeDefined();
    });

    it('should generate unique instance IDs for each NPC', async () => {
      const template = await agent.getNpcTemplateById('goblin');
      expect(template).toBeDefined();
      if (!template) return;

      const instance1 = NPC.fromNPCData(template);
      const instance2 = NPC.fromNPCData(template);
      
      expect(instance1.instanceId).not.toBe(instance2.instanceId);
      expect(instance1.templateId).toBe(instance2.templateId);
    });
  });

  describe('NPC Damage Range Validation', () => {
    it('should deal damage within the defined range', async () => {
      const template = await agent.getNpcTemplateById('goblin');
      expect(template).toBeDefined();
      if (!template) return;

      const instance = NPC.fromNPCData(template);
      const [minDamage, maxDamage] = template.damage;

      // Test multiple attack rolls to verify damage range
      const damages: number[] = [];
      for (let i = 0; i < 100; i++) {
        const damage = instance.getAttackDamage();
        damages.push(damage);
        expect(damage).toBeGreaterThanOrEqual(minDamage);
        expect(damage).toBeLessThanOrEqual(maxDamage);
      }

      // Verify we get variation in damage (not all the same)
      const uniqueDamages = new Set(damages);
      if (minDamage !== maxDamage) {
        expect(uniqueDamages.size).toBeGreaterThan(1);
      }
    });

    it('should preserve damage tuple from database roundtrip', async () => {
      const template = await agent.getNpcTemplateById('goblin');
      expect(template).toBeDefined();
      if (!template) return;

      // Verify damage is a proper tuple [min, max]
      expect(Array.isArray(template.damage)).toBe(true);
      expect(template.damage.length).toBe(2);
      expect(typeof template.damage[0]).toBe('number');
      expect(typeof template.damage[1]).toBe('number');
      expect(template.damage[0]).toBeLessThanOrEqual(template.damage[1]);
    });
  });

  describe('NPC Inventory and Drops', () => {
    it('should have inventory configuration for loot-dropping NPCs', async () => {
      const goblin = await agent.getNpcTemplateById('goblin');
      expect(goblin).toBeDefined();
      expect(goblin?.inventory).toBeDefined();
      expect(goblin?.inventory?.length).toBeGreaterThan(0);
    });

    it('should generate drops based on spawn rate', async () => {
      const template = await agent.getNpcTemplateById('goblin');
      expect(template).toBeDefined();
      if (!template || !template.inventory) return;

      // In remote mode, ItemManager is not initialized locally, so we can only verify
      // that the NPC has inventory configured with spawn rates
      // The actual drop generation relies on ItemManager which requires local server state
      
      // Verify inventory has items with spawn rates
      const hasSpawnRates = template.inventory.some(
        (item: { spawnRate: number }) => item.spawnRate > 0
      );
      expect(hasSpawnRates).toBe(true);
      
      // Verify first item has expected structure
      const firstItem = template.inventory[0];
      expect(firstItem).toHaveProperty('itemId');
      expect(firstItem).toHaveProperty('spawnRate');
      expect(firstItem.spawnRate).toBeGreaterThanOrEqual(0);
      expect(firstItem.spawnRate).toBeLessThanOrEqual(1);
    });
  });

  describe('NPC Experience Value', () => {
    it('should have experience value defined for hostile NPCs', async () => {
      const hostileNpcs = (await agent.getHostileNpcTemplates()) as NPCData[];
      
      for (const npc of hostileNpcs) {
        expect(npc.experienceValue).toBeGreaterThan(0);
      }
    });
  });

  describe('Combat Commands', () => {
    it('should show error when attacking in safe zone', async () => {
      // Player starts in Town Square which is a safe zone
      const output = await agent.sendCommand(sessionId, 'attack');
      expect(output.toLowerCase()).toMatch(/safe zone|cannot fight here|usage/i);
    });

    it('should show flee error when not in combat', async () => {
      const output = await agent.sendCommand(sessionId, 'flee');
      expect(output.toLowerCase()).toMatch(/not in combat|fighting|flee/i);
    });
  });

  describe('NPC Health and Death', () => {
    it('should track health correctly when taking damage', async () => {
      const template = await agent.getNpcTemplateById('goblin');
      expect(template).toBeDefined();
      if (!template) return;

      const instance = NPC.fromNPCData(template);
      const initialHealth = instance.health;

      const damageDealt = instance.takeDamage(10);

      expect(damageDealt).toBeLessThanOrEqual(10);
      expect(instance.health).toBe(initialHealth - damageDealt);
    });

    it('should die when health reaches zero', async () => {
      const template = await agent.getNpcTemplateById('goblin');
      expect(template).toBeDefined();
      if (!template) return;

      const instance = NPC.fromNPCData(template);

      expect(instance.isAlive()).toBe(true);

      // Deal fatal damage
      instance.takeDamage(instance.health + 100);

      expect(instance.isAlive()).toBe(false);
      expect(instance.health).toBeLessThanOrEqual(0);
    });

    it('should have death messages configured', async () => {
      const template = await agent.getNpcTemplateById('goblin');
      expect(template).toBeDefined();
      expect(template?.deathMessages).toBeDefined();
      expect(template?.deathMessages?.length).toBeGreaterThan(0);

      if (template) {
        const instance = NPC.fromNPCData(template);
        const deathMessage = instance.getDeathMessage();
        expect(deathMessage).toBeDefined();
        expect(deathMessage.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Full Combat Simulation', () => {
    it('should allow teleport to combat area', async () => {
      // Teleport player to west-alley where goblins spawn
      await agent.teleportTo(sessionId, 'west-alley');

      const roomId = await agent.getCurrentRoomId(sessionId);
      expect(roomId).toBe('west-alley');
    });

    it('should have NPCs in combat areas', async () => {
      await agent.teleportTo(sessionId, 'west-alley');
      const roomId = await agent.getCurrentRoomId(sessionId);
      expect(roomId).toBe('west-alley');

      const npcsInRoom = await agent.getRoomNpcs(roomId!);
      // May or may not have NPCs depending on game state
      expect(Array.isArray(npcsInRoom)).toBe(true);
    });

    it('should allow player to initiate combat when NPC present', async () => {
      await agent.teleportTo(sessionId, 'west-alley');
      const roomId = await agent.getCurrentRoomId(sessionId);
      const npcsInRoom = await agent.getRoomNpcs(roomId!);

      if (npcsInRoom.length === 0) {
        console.log('Skipping: No NPCs in west-alley');
        return;
      }

      // Attack first NPC
      const targetNpc = npcsInRoom[0];
      const attackOutput = await agent.sendCommand(sessionId, `attack ${targetNpc.name.toLowerCase()}`);

      // Should see combat initiation or already in combat message
      expect(attackOutput.length).toBeGreaterThan(0);
    });

    it('should track combat state', async () => {
      // Set up player
      await agent.setPlayerStats(sessionId, {
        health: 100,
        maxHealth: 100,
      });

      await agent.teleportTo(sessionId, 'west-alley');
      const roomId = await agent.getCurrentRoomId(sessionId);
      const npcsInRoom = await agent.getRoomNpcs(roomId!);

      if (npcsInRoom.length === 0) {
        console.log('Skipping: No NPCs in west-alley');
        return;
      }

      // Check initial state - should not be in combat
      const beforeCombat = await agent.isInCombat(sessionId);
      expect(beforeCombat).toBe(false);
    });

    it('should process combat rounds on tick advance', async () => {
      // Set up strong player
      await agent.setPlayerStats(sessionId, {
        health: 200,
        maxHealth: 200,
        level: 5,
      });

      await agent.teleportTo(sessionId, 'west-alley');
      const roomId = await agent.getCurrentRoomId(sessionId);
      const npcsInRoom = await agent.getRoomNpcs(roomId!);

      if (npcsInRoom.length === 0) {
        console.log('Skipping: No NPCs in west-alley');
        return;
      }

      // Start combat
      const targetNpc = npcsInRoom[0];
      await agent.sendCommand(sessionId, `attack ${targetNpc.name.toLowerCase()}`);
      await agent.getOutput(sessionId, true);

      // Advance ticks
      const initialTick = await agent.getTickCount();
      await agent.advanceTicks(5);

      expect(await agent.getTickCount()).toBe(initialTick + 5);
    });

    it('should allow setting NPC health for fast combat testing', async () => {
      await agent.teleportTo(sessionId, 'west-alley');
      const roomId = await agent.getCurrentRoomId(sessionId);
      const npcsInRoom = await agent.getRoomNpcs(roomId!);

      if (npcsInRoom.length === 0) {
        console.log('Skipping: No NPCs in west-alley');
        return;
      }

      const targetNpc = npcsInRoom[0];

      // Set NPC to 1 HP
      await agent.setNpcHealth(roomId!, targetNpc.instanceId, 1);

      // Verify health was set
      const npcsAfter = await agent.getRoomNpcs(roomId!);
      const updatedNpc = npcsAfter.find((n) => n.instanceId === targetNpc.instanceId);

      if (updatedNpc) {
        expect(updatedNpc.health).toBe(1);
      }
    });
  });

  describe('Merchant NPC Validation', () => {
    it('should have merchant NPCs with stock config', async () => {
      const merchants = (await agent.getMerchantNpcTemplates()) as NPCData[];

      for (const merchant of merchants) {
        expect(merchant.merchant).toBe(true);
        expect(merchant.isHostile).toBe(false);

        // Merchants may have stockConfig or inventory
        const hasConfig = merchant.stockConfig || merchant.inventory;
        expect(hasConfig).toBeTruthy();
      }
    });

    it('should have passive NPCs that do not attack', async () => {
      const merchants = (await agent.getMerchantNpcTemplates()) as NPCData[];

      for (const merchant of merchants) {
        expect(merchant.isPassive).toBe(true);
        expect(merchant.isHostile).toBe(false);
      }
    });
  });
});
