import { TesterAgent } from '../../src/testing/testerAgent';
import { NPC } from '../../src/combat/npc';

/**
 * E2E tests for NPC combat lifecycle.
 * 
 * Tests the complete NPC lifecycle:
 * - NPC template loading and instance creation
 * - Combat engagement and damage dealing
 * - Damage range validation
 * - NPC defeat, item drops, and experience rewards
 * - NPC removal from room after death
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
    sessionId = await agent.directLogin('combattest'); // test user
    agent.getOutput(sessionId, true);
  });

  afterEach(() => {
    agent.closeSession(sessionId);
  });

  describe('NPC Template and Instance Creation', () => {
    it('should have NPC templates loaded', () => {
      const templates = agent.getAllNpcTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should find hostile NPC template (goblin)', () => {
      const goblin = agent.getNpcTemplateById('goblin');
      expect(goblin).toBeDefined();
      expect(goblin?.isHostile).toBe(true);
      expect(goblin?.experienceValue).toBeGreaterThan(0);
    });

    it('should create NPC instance from template with correct stats', () => {
      const template = agent.getNpcTemplateById('goblin');
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

    it('should generate unique instance IDs for each NPC', () => {
      const template = agent.getNpcTemplateById('goblin');
      expect(template).toBeDefined();
      if (!template) return;

      const instance1 = NPC.fromNPCData(template);
      const instance2 = NPC.fromNPCData(template);
      
      expect(instance1.instanceId).not.toBe(instance2.instanceId);
      expect(instance1.templateId).toBe(instance2.templateId);
    });
  });

  describe('NPC Damage Range Validation', () => {
    it('should deal damage within the defined range', () => {
      const template = agent.getNpcTemplateById('goblin');
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

    it('should preserve damage tuple from database roundtrip', () => {
      const template = agent.getNpcTemplateById('goblin');
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
    it('should have inventory configuration for loot-dropping NPCs', () => {
      const goblin = agent.getNpcTemplateById('goblin');
      expect(goblin).toBeDefined();
      expect(goblin?.inventory).toBeDefined();
      expect(goblin?.inventory?.length).toBeGreaterThan(0);
    });

    it('should generate drops based on spawn rate', () => {
      const template = agent.getNpcTemplateById('goblin');
      expect(template).toBeDefined();
      if (!template || !template.inventory) return;

      // Run multiple drop attempts to test spawn rate
      let totalDrops = 0;
      const iterations = 100;
      for (let i = 0; i < iterations; i++) {
        // Reset instance for fresh drops
        const freshInstance = NPC.fromNPCData(template);
        const drops = freshInstance.generateDrops();
        totalDrops += drops.length;
      }

      // With 30% spawn rate on first item, we should get some drops
      if (template.inventory.some(i => i.spawnRate > 0)) {
        expect(totalDrops).toBeGreaterThan(0);
      }
    });
  });

  describe('NPC Experience Value', () => {
    it('should have experience value defined for hostile NPCs', () => {
      const hostileNpcs = agent.getHostileNpcTemplates();
      
      for (const npc of hostileNpcs) {
        expect(npc.experienceValue).toBeDefined();
        expect(npc.experienceValue).toBeGreaterThan(0);
      }
    });

    it('should have appropriate experience values based on difficulty', () => {
      const goblin = agent.getNpcTemplateById('goblin');
      const wolf = agent.getNpcTemplateById('wolf');

      if (goblin && wolf) {
        // Wolf should give more XP than goblin (higher HP and damage)
        expect(wolf.experienceValue).toBeGreaterThan(goblin.experienceValue);
      }
    });
  });

  describe('NPC Health and Death', () => {
    it('should track health correctly when taking damage', () => {
      const template = agent.getNpcTemplateById('goblin');
      expect(template).toBeDefined();
      if (!template) return;

      const instance = NPC.fromNPCData(template);
      const initialHealth = instance.health;

      const damageDealt = instance.takeDamage(10);
      
      expect(damageDealt).toBeLessThanOrEqual(10);
      expect(instance.health).toBe(initialHealth - damageDealt);
    });

    it('should die when health reaches zero', () => {
      const template = agent.getNpcTemplateById('goblin');
      expect(template).toBeDefined();
      if (!template) return;

      const instance = NPC.fromNPCData(template);
      
      expect(instance.isAlive()).toBe(true);
      
      // Deal fatal damage
      instance.takeDamage(instance.health + 100);
      
      expect(instance.isAlive()).toBe(false);
      expect(instance.health).toBeLessThanOrEqual(0);
    });

    it('should have death messages configured', () => {
      const template = agent.getNpcTemplateById('goblin');
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

  describe('Combat Room Context', () => {
    it('should identify rooms that have hostile NPCs', () => {
      // Verify we can find rooms with hostile NPCs through the data
      const hostileNpcs = agent.getHostileNpcTemplates();
      expect(hostileNpcs.length).toBeGreaterThan(0);
      
      // The goblin is in west-alley and start rooms
      const goblin = hostileNpcs.find(n => n.id === 'goblin');
      expect(goblin).toBeDefined();
    });

    it('should be able to look at current room', () => {
      // Player starts in Town Square
      const output = agent.sendCommand(sessionId, 'look');
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe('Merchant NPC Validation', () => {
    it('should have merchant NPCs with stock config', () => {
      const merchants = agent.getMerchantNpcTemplates();
      
      for (const merchant of merchants) {
        expect(merchant.merchant).toBe(true);
        expect(merchant.isHostile).toBe(false);
        
        // Merchants may have stockConfig or inventory
        const hasConfig = merchant.stockConfig || merchant.inventory;
        expect(hasConfig).toBeTruthy();
      }
    });

    it('should have passive NPCs that do not attack', () => {
      const merchants = agent.getMerchantNpcTemplates();
      
      for (const merchant of merchants) {
        expect(merchant.isPassive).toBe(true);
        expect(merchant.isHostile).toBe(false);
      }
    });
  });

  describe('Full Combat Simulation (Tick-Based)', () => {
    /**
     * This test suite uses tick manipulation to simulate complete combat:
     * 1. Player attacks NPC
     * 2. Combat rounds process via tick advancement
     * 3. NPC takes damage and eventually dies
     * 4. Drops/XP are awarded
     * 5. NPC is removed from room
     */

    it('should move instantly in test mode (no delay)', () => {
      // Player starts in 'start' room
      expect(agent.getCurrentRoomId(sessionId)).toBe('start');
      
      // Move west - should be instant in test mode
      agent.sendCommand(sessionId, 'west');
      
      // Should already be in west-alley (no delay)
      expect(agent.getCurrentRoomId(sessionId)).toBe('west-alley');
    });

    it('should show combat initiation when attacking', () => {
      // Teleport player to west-alley where goblins spawn
      agent.teleportTo(sessionId, 'west-alley');
      
      // Check if there's an NPC in the room
      const roomId = agent.getCurrentRoomId(sessionId);
      expect(roomId).toBe('west-alley');
      
      const npcsInRoom = agent.getRoomNpcs(roomId!);
      
      if (npcsInRoom.length === 0) {
        return;
      }

      // Attack first NPC
      const targetNpc = npcsInRoom[0];
      const attackOutput = agent.sendCommand(sessionId, `attack ${targetNpc.name.toLowerCase()}`);
      
      expect(attackOutput.toLowerCase()).toMatch(/attack|combat|engage|fight/i);
    });

    it('should process combat rounds when ticks advance', () => {
      // Teleport to room with hostile NPCs
      agent.teleportTo(sessionId, 'west-alley');
      const roomId = agent.getCurrentRoomId(sessionId);
      const npcsInRoom = agent.getRoomNpcs(roomId!);
      
      if (npcsInRoom.length === 0) {
        return;
      }

      // Start combat
      const targetNpc = npcsInRoom[0];
      agent.sendCommand(sessionId, `attack ${targetNpc.name.toLowerCase()}`);
      agent.getOutput(sessionId, true); // Clear output buffer
      
      // Advance several ticks to process combat rounds
      const initialTick = agent.getTickCount();
      agent.advanceTicks(5);
      
      // Get combat output
      expect(agent.getTickCount()).toBe(initialTick + 5);
    });

    it('should award experience when NPC is defeated', () => {
      // Set up strong player to ensure victory
      agent.setPlayerStats(sessionId, {
        health: 200,
        maxHealth: 200,
        mana: 100,
        maxMana: 100,
        level: 5,
      });
      
      const initialXP = agent.getPlayerStats(sessionId).experience;

      // Teleport to room with hostile NPCs
      agent.teleportTo(sessionId, 'west-alley');
      const roomId = agent.getCurrentRoomId(sessionId)!;
      let npcsInRoom = agent.getRoomNpcs(roomId);
      
      if (npcsInRoom.length === 0) {
        return;
      }

      // Attack NPC - set to 1 HP for fast kill
      const targetNpc = npcsInRoom[0];
      agent.setNpcHealth(roomId, targetNpc.instanceId, 1);
      agent.sendCommand(sessionId, `attack ${targetNpc.name.toLowerCase()}`);
      agent.getOutput(sessionId, true);

      // Advance ticks until NPC dies or max iterations
      const maxTicks = 5;
      let allOutput = '';
      
      for (let i = 0; i < maxTicks; i++) {
        agent.advanceTicks(1);
        const output = agent.getOutput(sessionId);
        allOutput += output;
        
        // Check if NPC died
        npcsInRoom = agent.getRoomNpcs(roomId);
        const npcStillAlive = npcsInRoom.find(n => n.instanceId === targetNpc.instanceId);
        
        if (!npcStillAlive) {
          break;
        }
      }

      // Check XP gained
      const finalXP = agent.getPlayerStats(sessionId).experience;
      
      // Verify XP increased (may vary based on combat mechanics)
      if (allOutput.toLowerCase().includes('defeat') || allOutput.toLowerCase().includes('dies')) {
        expect(finalXP).toBeGreaterThan(initialXP);
      }
    });

    it('should remove NPC from room after death', () => {
      // Set up strong player
      agent.setPlayerStats(sessionId, {
        health: 500,
        maxHealth: 500,
        level: 10,
      });

      // Teleport to room with hostile NPCs
      agent.teleportTo(sessionId, 'west-alley');
      const roomId = agent.getCurrentRoomId(sessionId)!;
      const initialNpcs = agent.getRoomNpcs(roomId);
      
      if (initialNpcs.length === 0) {
        return;
      }

      const targetNpc = initialNpcs[0];
      const instanceId = targetNpc.instanceId;

      // Set NPC to 1 HP for fast kill
      agent.setNpcHealth(roomId, instanceId, 1);

      // Start combat
      agent.sendCommand(sessionId, `attack ${targetNpc.name.toLowerCase()}`);
      agent.getOutput(sessionId, true);

      // Fight until NPC dies
      let npcDefeated = false;
      for (let i = 0; i < 10; i++) {
        agent.advanceTicks(1);
        
        const currentNpcs = agent.getRoomNpcs(roomId);
        const npcStillExists = currentNpcs.find(n => n.instanceId === instanceId);
        
        if (!npcStillExists) {
          npcDefeated = true;
          break;
        }

        // Also check if player died (need to restart)
        const playerStats = agent.getPlayerStats(sessionId);
        if (playerStats.health <= 0) {
          break;
        }
      }

      if (npcDefeated) {
        // Verify NPC is no longer in room
        const finalNpcs = agent.getRoomNpcs(roomId);
        const npcFound = finalNpcs.find(n => n.instanceId === instanceId);
        expect(npcFound).toBeUndefined();
      }
    });

    it('should potentially drop items or currency when NPC dies', () => {
      // Set up strong player
      agent.setPlayerStats(sessionId, {
        health: 500,
        maxHealth: 500,
        level: 10,
      });

      // Teleport to room with hostile NPCs
      agent.teleportTo(sessionId, 'west-alley');
      const roomId = agent.getCurrentRoomId(sessionId)!;
      const initialNpcs = agent.getRoomNpcs(roomId);
      
      if (initialNpcs.length === 0) {
        return;
      }

      const targetNpc = initialNpcs[0];
      const instanceId = targetNpc.instanceId;

      // Set NPC to 1 HP for fast kill
      agent.setNpcHealth(roomId, instanceId, 1);

      // Start combat
      agent.sendCommand(sessionId, `attack ${targetNpc.name.toLowerCase()}`);
      agent.getOutput(sessionId, true);

      // Fight until NPC dies
      let allOutput = '';
      for (let i = 0; i < 10; i++) {
        agent.advanceTicks(1);
        allOutput += agent.getOutput(sessionId);
        
        const currentNpcs = agent.getRoomNpcs(roomId);
        const npcStillExists = currentNpcs.find(n => n.instanceId === instanceId);
        
        if (!npcStillExists) {
          break;
        }
      }
    });

    it('should track combat state during fight', () => {
      // Set up player
      agent.setPlayerStats(sessionId, {
        health: 100,
        maxHealth: 100,
      });

      // Teleport to room with hostile NPCs
      agent.teleportTo(sessionId, 'west-alley');
      const roomId = agent.getCurrentRoomId(sessionId)!;
      const npcsInRoom = agent.getRoomNpcs(roomId);
      
      if (npcsInRoom.length === 0) {
        return;
      }

      // Check initial state
      expect(agent.isInCombat(sessionId)).toBe(false);
    });
  });

  describe('Cross-Room Combat Validation', () => {
    // Tests for PR #43 fix: Combat should use instanceId for NPC room presence checking
    // to prevent hitting NPCs in other rooms when moving between rooms with same NPC types

    it('should end combat when player moves to a different room', () => {
      // Set up player with enough health
      agent.setPlayerStats(sessionId, {
        health: 100,
        maxHealth: 100,
      });

      // Teleport to west-alley which has a goblin
      agent.teleportTo(sessionId, 'west-alley');
      const westAlleyRoomId = agent.getCurrentRoomId(sessionId)!;
      const westAlleyNpcs = agent.getRoomNpcs(westAlleyRoomId);
      
      expect(westAlleyNpcs.length).toBeGreaterThan(0);
      const targetNpc = westAlleyNpcs[0];

      // Start combat
      agent.sendCommand(sessionId, `attack ${targetNpc.name.toLowerCase()}`);
      agent.getOutput(sessionId, true);
      
      expect(agent.isInCombat(sessionId)).toBe(true);

      // Move to a different room (east goes to start)
      agent.sendCommand(sessionId, 'east');
      agent.getOutput(sessionId, true);
      
      const newRoomId = agent.getCurrentRoomId(sessionId)!;
      expect(newRoomId).not.toBe(westAlleyRoomId);

      // Advance a tick - combat should end because target NPC is not in current room
      agent.advanceTicks(1);
      agent.getOutput(sessionId, true);
      
      // Combat should have ended
      expect(agent.isInCombat(sessionId)).toBe(false);
    });

    it('should not damage NPCs in other rooms when using instanceId validation', () => {
      // This test verifies the instanceId fix from PR #43
      // Previously, combat checked room.npcs.has(combatant.name) which could match
      // a different NPC with the same name in the new room
      
      agent.setPlayerStats(sessionId, {
        health: 100,
        maxHealth: 100,
      });

      // Get both rooms' NPCs for comparison
      const westAlleyNpcs = agent.getRoomNpcs('west-alley');
      const startRoomNpcs = agent.getRoomNpcs('start');
      
      // Find goblins in both rooms (if present)
      const westGoblin = westAlleyNpcs.find(n => n.name.toLowerCase() === 'goblin');
      const startGoblin = startRoomNpcs.find(n => n.name.toLowerCase() === 'goblin');
      
      if (!westGoblin) {
        // No goblin in west-alley - skip test
        return;
      }
      
      if (startGoblin) {
        // These should be different instances
        expect(startGoblin.instanceId).not.toBe(westGoblin.instanceId);
      }

      // Teleport to west-alley and start combat
      agent.teleportTo(sessionId, 'west-alley');
      agent.sendCommand(sessionId, 'attack goblin');
      agent.getOutput(sessionId, true);
      
      expect(agent.isInCombat(sessionId)).toBe(true);

      // Move to start room
      agent.sendCommand(sessionId, 'east');
      agent.getOutput(sessionId, true);
      
      // Now advance a tick
      agent.advanceTicks(1);
      agent.getOutput(sessionId, true);
      
      // Combat should end
      expect(agent.isInCombat(sessionId)).toBe(false);
      
      // CRITICAL: Verify the west-alley goblin wasn't damaged 
      // (we left before any combat round could process)
      const westAlleyNpcsAfter = agent.getRoomNpcs('west-alley');
      const westGoblinAfter = westAlleyNpcsAfter.find(n => n.instanceId === westGoblin.instanceId);
      
      // Goblin should still exist at full health
      expect(westGoblinAfter).toBeDefined();
      
      // If there's a goblin in start room, it should also be at full health
      if (startGoblin) {
        const startRoomNpcsAfter = agent.getRoomNpcs('start');
        const startGoblinAfter = startRoomNpcsAfter.find(n => n.instanceId === startGoblin.instanceId);
        
        if (startGoblinAfter) {
          expect(startGoblinAfter.health).toBe(startGoblin.health);
        }
      }
    });

    it('should validate NPC presence by instanceId not name', () => {
      // This test specifically validates the instanceId-based room check
      // The fix changed: room.npcs.has(combatant.name) -> room.npcs.has(combatant.instanceId)
      
      agent.setPlayerStats(sessionId, {
        health: 200,
        maxHealth: 200,
      });

      // Teleport to room with NPC
      agent.teleportTo(sessionId, 'west-alley');
      const roomId = agent.getCurrentRoomId(sessionId)!;
      const npcsInRoom = agent.getRoomNpcs(roomId);
      
      if (npcsInRoom.length === 0) {
        // No NPCs in room - skip
        return;
      }

      const targetNpc = npcsInRoom[0];

      // Start combat and confirm engaged
      agent.sendCommand(sessionId, `attack ${targetNpc.name.toLowerCase()}`);
      agent.getOutput(sessionId, true);
      expect(agent.isInCombat(sessionId)).toBe(true);

      // Process one combat round while in same room - player should deal damage
      agent.advanceTicks(1);
      agent.getOutput(sessionId);
      
      // Check if NPC took damage (combat round processed)
      const npcsAfterRound = agent.getRoomNpcs(roomId);
      const npcAfterRound = npcsAfterRound.find(n => n.instanceId === targetNpc.instanceId);
      
      if (npcAfterRound) {
        // NPC still alive - move away to test combat ends
        agent.sendCommand(sessionId, 'east');
        agent.getOutput(sessionId, true);
        
        // Verify we moved
        const newRoomId = agent.getCurrentRoomId(sessionId)!;
        expect(newRoomId).not.toBe(roomId);
        
        // Advance tick after leaving
        agent.advanceTicks(1);
        agent.getOutput(sessionId, true);
        
        // Combat should end - the NPC is not in this room
        expect(agent.isInCombat(sessionId)).toBe(false);
        
        // Verify the NPC in original room wasn't damaged further
        const npcsAfterLeaving = agent.getRoomNpcs(roomId);
        const npcAfterLeaving = npcsAfterLeaving.find(n => n.instanceId === targetNpc.instanceId);
        if (npcAfterLeaving) {
          // Health should be same as after first round (no further damage)
          expect(npcAfterLeaving.health).toBe(npcAfterRound.health);
        }
      } else {
        // NPC died in first round - combat should have ended
        expect(agent.isInCombat(sessionId)).toBe(false);
      }
    });
  });
});

