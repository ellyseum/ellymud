import { TesterAgent } from '../../src/testing/testerAgent';
import { NPC } from '../../src/combat/npc';

/**
 * E2E tests for NPC repository and data loading.
 *
 * These tests verify:
 * - NPCs load correctly from JSON storage
 * - NPC data is accessible via TesterAgent
 * - NPC properties are preserved correctly
 * - Merchants and hostile NPCs are properly categorized
 */
describe('NPC Data E2E', () => {
  let agent: TesterAgent;

  beforeAll(async () => {
    agent = await TesterAgent.create();
  });

  afterAll(async () => {
    await agent.shutdown();
  });

  beforeEach(async () => {
    // Reset to clean state before each test
    await agent.resetToClean();
  });

  describe('NPC Template Loading', () => {
    it('should load NPC templates from data', () => {
      const templates = agent.getAllNpcTemplates();

      expect(templates.length).toBeGreaterThan(0);
      console.log(`Loaded ${templates.length} NPC templates`);
    });

    it('should have valid NPC template structure', () => {
      const templates = agent.getAllNpcTemplates();

      for (const npc of templates) {
        expect(npc.id).toBeDefined();
        expect(npc.name).toBeDefined();
        expect(npc.description).toBeDefined();
        expect(npc.health).toBeGreaterThan(0);
        expect(npc.maxHealth).toBeGreaterThan(0);
        expect(Array.isArray(npc.damage)).toBe(true);
        expect(npc.damage).toHaveLength(2);
        expect(npc.damage[0]).toBeLessThanOrEqual(npc.damage[1]);
        expect(typeof npc.isHostile).toBe('boolean');
        expect(typeof npc.isPassive).toBe('boolean');
        expect(npc.experienceValue).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(npc.attackTexts)).toBe(true);
        expect(Array.isArray(npc.deathMessages)).toBe(true);
      }
    });

    it('should find NPC by ID', () => {
      const templates = agent.getAllNpcTemplates();
      if (templates.length === 0) {
        console.log('Skipping: No NPC templates available');
        return;
      }

      const firstNpc = templates[0];
      const found = agent.getNpcTemplateById(firstNpc.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(firstNpc.id);
      expect(found?.name).toBe(firstNpc.name);
    });

    it('should return undefined for non-existent NPC', () => {
      const found = agent.getNpcTemplateById('non_existent_npc_12345');
      expect(found).toBeUndefined();
    });
  });

  describe('NPC Categories', () => {
    it('should identify hostile NPCs', () => {
      const hostileNpcs = agent.getHostileNpcTemplates();

      for (const npc of hostileNpcs) {
        expect(npc.isHostile).toBe(true);
      }

      if (hostileNpcs.length > 0) {
        console.log(`Found ${hostileNpcs.length} hostile NPCs`);
      }
    });

    it('should identify merchant NPCs', () => {
      const merchants = agent.getMerchantNpcTemplates();

      for (const npc of merchants) {
        expect(npc.merchant).toBe(true);
      }

      if (merchants.length > 0) {
        console.log(`Found ${merchants.length} merchant NPCs`);
      }
    });

    it('should identify passive NPCs', () => {
      const templates = agent.getAllNpcTemplates();
      const passiveNpcs = templates.filter((npc) => npc.isPassive);

      for (const npc of passiveNpcs) {
        expect(npc.isPassive).toBe(true);
      }

      if (passiveNpcs.length > 0) {
        console.log(`Found ${passiveNpcs.length} passive NPCs`);
      }
    });
  });

  describe('NPC Damage Tuples', () => {
    it('should preserve damage range correctly', () => {
      const templates = agent.getAllNpcTemplates();

      for (const npc of templates) {
        const [minDamage, maxDamage] = npc.damage;
        expect(typeof minDamage).toBe('number');
        expect(typeof maxDamage).toBe('number');
        expect(minDamage).toBeGreaterThan(0);
        expect(maxDamage).toBeGreaterThanOrEqual(minDamage);
      }
    });
  });

  describe('NPC Instance Creation', () => {
    it('should be able to create NPC instances from templates', () => {
      const templates = agent.getAllNpcTemplates();
      if (templates.length === 0) {
        console.log('Skipping: No NPC templates available');
        return;
      }

      const template = templates[0];
      const npcInstance = NPC.fromNPCData(template);

      expect(npcInstance).toBeInstanceOf(NPC);
      expect(npcInstance.name).toBe(template.name);
      expect(npcInstance.health).toBe(template.health);
      expect(npcInstance.maxHealth).toBe(template.maxHealth);
      expect(npcInstance.isHostile).toBe(template.isHostile);
      expect(npcInstance.templateId).toBe(template.id);
      expect(npcInstance.instanceId).toBeDefined();
    });

    it('should generate unique instance IDs', () => {
      const templates = agent.getAllNpcTemplates();
      if (templates.length === 0) {
        console.log('Skipping: No NPC templates available');
        return;
      }

      const template = templates[0];
      const instance1 = NPC.fromNPCData(template);
      const instance2 = NPC.fromNPCData(template);

      expect(instance1.instanceId).not.toBe(instance2.instanceId);
      expect(instance1.templateId).toBe(instance2.templateId);
    });
  });

  describe('Merchant NPC Data', () => {
    it('should have valid inventory configuration for merchants', () => {
      const merchants = agent.getMerchantNpcTemplates();

      for (const merchant of merchants) {
        expect(merchant.merchant).toBe(true);
        // Merchants should have stockConfig or inventory
        if (merchant.stockConfig) {
          expect(Array.isArray(merchant.stockConfig)).toBe(true);
        }
        if (merchant.inventory) {
          expect(Array.isArray(merchant.inventory)).toBe(true);
        }
      }
    });
  });
});
