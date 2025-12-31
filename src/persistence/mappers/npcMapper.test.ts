/**
 * Unit tests for NPC mapper functions
 * Tests bidirectional conversion between NPCData and database rows
 */

import { dbRowToNPCData, npcDataToDbRow } from './npcMapper';
import { NPCData } from '../../combat/npc';
import { NpcTemplatesTable } from '../../data/schema';

describe('npcMapper', () => {
  describe('dbRowToNPCData', () => {
    it('should convert a complete database row to NPCData', () => {
      const dbRow: NpcTemplatesTable = {
        id: 'goblin',
        name: 'Goblin',
        description: 'A nasty goblin',
        health: 50,
        max_health: 50,
        damage_min: 3,
        damage_max: 8,
        is_hostile: 1,
        is_passive: 0,
        experience_value: 100,
        attack_texts: JSON.stringify(['attacks', 'slashes']),
        death_messages: JSON.stringify(['dies horribly']),
        merchant: null,
        inventory: null,
        stock_config: null,
      };

      const result = dbRowToNPCData(dbRow);

      expect(result.id).toBe('goblin');
      expect(result.name).toBe('Goblin');
      expect(result.description).toBe('A nasty goblin');
      expect(result.health).toBe(50);
      expect(result.maxHealth).toBe(50);
      expect(result.damage).toEqual([3, 8]);
      expect(result.isHostile).toBe(true);
      expect(result.isPassive).toBe(false);
      expect(result.experienceValue).toBe(100);
      expect(result.attackTexts).toEqual(['attacks', 'slashes']);
      expect(result.deathMessages).toEqual(['dies horribly']);
      expect(result.merchant).toBeUndefined();
      expect(result.inventory).toBeUndefined();
      expect(result.stockConfig).toBeUndefined();
    });

    it('should convert merchant NPC with inventory', () => {
      const dbRow: NpcTemplatesTable = {
        id: 'shopkeeper',
        name: 'Shopkeeper',
        description: 'A friendly shopkeeper',
        health: 100,
        max_health: 100,
        damage_min: 1,
        damage_max: 3,
        is_hostile: 0,
        is_passive: 1,
        experience_value: 0,
        attack_texts: JSON.stringify(['swats at']),
        death_messages: JSON.stringify(['falls down']),
        merchant: 1,
        inventory: JSON.stringify([{ itemId: 'sword', itemCount: 1, spawnRate: 1.0 }]),
        stock_config: JSON.stringify([
          {
            templateId: 'potion',
            maxStock: 5,
            restockAmount: 1,
            restockPeriod: 1,
            restockUnit: 'hours',
          },
        ]),
      };

      const result = dbRowToNPCData(dbRow);

      expect(result.merchant).toBe(true);
      expect(result.inventory).toEqual([{ itemId: 'sword', itemCount: 1, spawnRate: 1.0 }]);
      expect(result.stockConfig).toEqual([
        {
          templateId: 'potion',
          maxStock: 5,
          restockAmount: 1,
          restockPeriod: 1,
          restockUnit: 'hours',
        },
      ]);
    });

    it('should handle boolean conversion correctly', () => {
      const hostileRow: NpcTemplatesTable = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        health: 10,
        max_health: 10,
        damage_min: 1,
        damage_max: 2,
        is_hostile: 1,
        is_passive: 0,
        experience_value: 10,
        attack_texts: '[]',
        death_messages: '[]',
        merchant: null,
        inventory: null,
        stock_config: null,
      };

      const passiveRow: NpcTemplatesTable = {
        ...hostileRow,
        is_hostile: 0,
        is_passive: 1,
      };

      expect(dbRowToNPCData(hostileRow).isHostile).toBe(true);
      expect(dbRowToNPCData(hostileRow).isPassive).toBe(false);
      expect(dbRowToNPCData(passiveRow).isHostile).toBe(false);
      expect(dbRowToNPCData(passiveRow).isPassive).toBe(true);
    });
  });

  describe('npcDataToDbRow', () => {
    it('should convert NPCData to database row', () => {
      const npcData: NPCData = {
        id: 'wolf',
        name: 'Wolf',
        description: 'A hungry wolf',
        health: 40,
        maxHealth: 40,
        damage: [5, 10],
        isHostile: true,
        isPassive: false,
        experienceValue: 75,
        attackTexts: ['bites', 'claws'],
        deathMessages: ['whimpers and dies'],
      };

      const result = npcDataToDbRow(npcData);

      expect(result.id).toBe('wolf');
      expect(result.name).toBe('Wolf');
      expect(result.description).toBe('A hungry wolf');
      expect(result.health).toBe(40);
      expect(result.max_health).toBe(40);
      expect(result.damage_min).toBe(5);
      expect(result.damage_max).toBe(10);
      expect(result.is_hostile).toBe(1);
      expect(result.is_passive).toBe(0);
      expect(result.experience_value).toBe(75);
      expect(result.attack_texts).toBe(JSON.stringify(['bites', 'claws']));
      expect(result.death_messages).toBe(JSON.stringify(['whimpers and dies']));
      expect(result.merchant).toBeNull();
      expect(result.inventory).toBeNull();
      expect(result.stock_config).toBeNull();
    });

    it('should convert merchant NPC with full data', () => {
      const merchantData: NPCData = {
        id: 'vendor',
        name: 'Vendor',
        description: 'A vendor',
        health: 100,
        maxHealth: 100,
        damage: [1, 2],
        isHostile: false,
        isPassive: true,
        experienceValue: 0,
        attackTexts: [],
        deathMessages: [],
        merchant: true,
        inventory: [{ itemId: 'gem', itemCount: 1, spawnRate: 0.5 }],
        stockConfig: [
          {
            templateId: 'ring',
            maxStock: 3,
            restockAmount: 1,
            restockPeriod: 1,
            restockUnit: 'days',
          },
        ],
      };

      const result = npcDataToDbRow(merchantData);

      expect(result.merchant).toBe(1);
      expect(result.inventory).toBe(
        JSON.stringify([{ itemId: 'gem', itemCount: 1, spawnRate: 0.5 }])
      );
      expect(result.stock_config).toBe(
        JSON.stringify([
          {
            templateId: 'ring',
            maxStock: 3,
            restockAmount: 1,
            restockPeriod: 1,
            restockUnit: 'days',
          },
        ])
      );
    });

    it('should handle damage tuple correctly', () => {
      const npcData: NPCData = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        health: 10,
        maxHealth: 10,
        damage: [15, 25],
        isHostile: false,
        isPassive: false,
        experienceValue: 10,
        attackTexts: [],
        deathMessages: [],
      };

      const result = npcDataToDbRow(npcData);

      expect(result.damage_min).toBe(15);
      expect(result.damage_max).toBe(25);
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve data through round-trip conversion', () => {
      const original: NPCData = {
        id: 'dragon',
        name: 'Dragon',
        description: 'A fearsome dragon',
        health: 500,
        maxHealth: 500,
        damage: [50, 100],
        isHostile: true,
        isPassive: false,
        experienceValue: 5000,
        attackTexts: ['breathes fire at', 'swipes with massive claws', 'tail whips'],
        deathMessages: ['collapses with a thunderous crash', 'lets out a final roar'],
        merchant: false,
        inventory: [
          { itemId: 'dragon_scale', itemCount: 1, spawnRate: 0.75 },
          { itemId: 'dragon_tooth', itemCount: 1, spawnRate: 0.25 },
        ],
      };

      const dbRow = npcDataToDbRow(original);
      const converted = dbRowToNPCData(dbRow);

      expect(converted.id).toBe(original.id);
      expect(converted.name).toBe(original.name);
      expect(converted.description).toBe(original.description);
      expect(converted.health).toBe(original.health);
      expect(converted.maxHealth).toBe(original.maxHealth);
      expect(converted.damage).toEqual(original.damage);
      expect(converted.isHostile).toBe(original.isHostile);
      expect(converted.isPassive).toBe(original.isPassive);
      expect(converted.experienceValue).toBe(original.experienceValue);
      expect(converted.attackTexts).toEqual(original.attackTexts);
      expect(converted.deathMessages).toEqual(original.deathMessages);
      expect(converted.inventory).toEqual(original.inventory);
    });
  });
});
