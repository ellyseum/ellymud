/**
 * Combat Formula Tests
 *
 * Tests for combat calculations including hit chance, dodge, crit, AC, DR, and damage.
 */

import {
  calculateHitChance,
  calculateDodgeChance,
  calculateCritChance,
  calculateArmorClass,
  calculateDamageReduction,
  calculatePhysicalDamage,
  calculateUnarmedDamage,
  calculateSpellDamage,
  rollToHit,
  rollToDodge,
  rollToCrit,
  checkAcHit,
  getRacialDodgeBonus,
  calculateUserDodgeChance,
  calculateUserCritChance,
  CRIT_DAMAGE_MULTIPLIER,
} from './combatFormulas';
import { ArmorType, GameItem, Race, User, CharacterClass } from '../types';

describe('Combat Formulas', () => {
  describe('calculateHitChance', () => {
    it('should return base 75% with no modifiers', () => {
      const hitChance = calculateHitChance(0, 1, 0, 1);
      expect(hitChance).toBe(75);
    });

    it('should add DEX bonus (+1 per 5 DEX)', () => {
      const hitChance = calculateHitChance(50, 1, 0, 1);
      expect(hitChance).toBe(75 + 10); // 50/5 = 10 bonus
    });

    it('should add level difference bonus (+2 per level)', () => {
      const hitChance = calculateHitChance(0, 10, 0, 5);
      expect(hitChance).toBe(75 + 10); // (10-5)*2 = 10 bonus
    });

    it('should subtract target dodge', () => {
      const hitChance = calculateHitChance(0, 1, 20, 1);
      expect(hitChance).toBe(55); // 75 - 20 = 55
    });

    it('should cap at minimum 25%', () => {
      const hitChance = calculateHitChance(0, 1, 100, 1);
      expect(hitChance).toBe(25);
    });

    it('should cap at maximum 95%', () => {
      const hitChance = calculateHitChance(100, 20, 0, 1);
      expect(hitChance).toBe(95);
    });
  });

  describe('calculateDodgeChance', () => {
    it('should return base 5% with no modifiers', () => {
      const dodgeChance = calculateDodgeChance(0);
      expect(dodgeChance).toBe(5);
    });

    it('should add AGI bonus (+1 per 5 AGI)', () => {
      const dodgeChance = calculateDodgeChance(50);
      expect(dodgeChance).toBe(5 + 10); // 50/5 = 10 bonus
    });

    it('should add racial dodge bonus', () => {
      const dodgeChance = calculateDodgeChance(0, 15); // Halfling +15
      expect(dodgeChance).toBe(5 + 15);
    });

    it('should add class dodge bonus', () => {
      const dodgeChance = calculateDodgeChance(0, 0, 5); // Thief +5
      expect(dodgeChance).toBe(5 + 5);
    });

    it('should cap at minimum 0%', () => {
      const dodgeChance = calculateDodgeChance(0, -20);
      expect(dodgeChance).toBe(0);
    });

    it('should cap at maximum 50%', () => {
      const dodgeChance = calculateDodgeChance(100, 15, 10);
      expect(dodgeChance).toBe(50);
    });
  });

  describe('getRacialDodgeBonus', () => {
    it('should return correct bonuses for known races', () => {
      expect(getRacialDodgeBonus('human')).toBe(0);
      expect(getRacialDodgeBonus('elf')).toBe(5);
      expect(getRacialDodgeBonus('dwarf')).toBe(-5);
      expect(getRacialDodgeBonus('halfling')).toBe(15);
      expect(getRacialDodgeBonus('orc')).toBe(-10);
    });

    it('should return 0 for unknown races', () => {
      expect(getRacialDodgeBonus('unknown')).toBe(0);
    });

    it('should prefer race data if provided', () => {
      const raceData = {
        id: 'custom',
        name: 'Custom',
        description: 'Custom race',
        statModifiers: {
          strength: 0,
          dexterity: 0,
          agility: 0,
          constitution: 0,
          intelligence: 0,
          wisdom: 0,
          charisma: 0,
        },
        dodgeBonus: 25,
      } as Race;
      expect(getRacialDodgeBonus('custom', raceData)).toBe(25);
    });
  });

  describe('calculateCritChance', () => {
    it('should return base 5% with no modifiers', () => {
      const critChance = calculateCritChance(0);
      expect(critChance).toBe(5);
    });

    it('should add DEX bonus (+1 per 10 DEX)', () => {
      const critChance = calculateCritChance(50);
      expect(critChance).toBe(5 + 5); // 50/10 = 5 bonus
    });

    it('should add INT bonus for spells (+1 per 20 INT)', () => {
      const critChance = calculateCritChance(0, 40, true);
      expect(critChance).toBe(5 + 2); // 40/20 = 2 bonus
    });

    it('should not add INT bonus for physical attacks', () => {
      const critChance = calculateCritChance(0, 40, false);
      expect(critChance).toBe(5);
    });

    it('should add racial crit bonus', () => {
      const critChance = calculateCritChance(0, 0, false, 5); // +5%
      expect(critChance).toBe(10);
    });

    it('should cap at minimum 5%', () => {
      const critChance = calculateCritChance(0, 0, false, -10);
      expect(critChance).toBe(5);
    });

    it('should cap at maximum 40%', () => {
      const critChance = calculateCritChance(100, 100, true, 20);
      expect(critChance).toBe(40);
    });
  });

  describe('calculateArmorClass', () => {
    it('should return base 10 with no equipment', () => {
      const ac = calculateArmorClass(0, []);
      expect(ac).toBe(10);
    });

    it('should add DEX bonus (+1 per 10 DEX)', () => {
      const ac = calculateArmorClass(30, []);
      expect(ac).toBe(10 + 3);
    });

    it('should add armor AC bonuses', () => {
      const armor: GameItem[] = [
        { id: 'plate', name: 'Plate', type: 'armor', acBonus: 25 } as GameItem,
        { id: 'shield', name: 'Shield', type: 'armor', acBonus: 10 } as GameItem,
      ];
      const ac = calculateArmorClass(0, armor);
      expect(ac).toBe(10 + 25 + 10);
    });

    it('should use default AC for armor types when not specified', () => {
      const armor: GameItem[] = [
        { id: 'leather', name: 'Leather', type: 'armor', armorType: ArmorType.LEATHER } as GameItem,
      ];
      const ac = calculateArmorClass(0, armor);
      expect(ac).toBe(10 + 5); // Leather default AC is 5
    });

    it('should add spell AC bonus', () => {
      const ac = calculateArmorClass(0, [], 10);
      expect(ac).toBe(20);
    });
  });

  describe('calculateDamageReduction', () => {
    it('should return 0 with no equipment', () => {
      const dr = calculateDamageReduction([]);
      expect(dr).toBe(0);
    });

    it('should add armor DR bonuses', () => {
      const armor: GameItem[] = [
        { id: 'plate', name: 'Plate', type: 'armor', drBonus: 12 } as GameItem,
      ];
      const dr = calculateDamageReduction(armor);
      expect(dr).toBe(12);
    });

    it('should use default DR for armor types when not specified', () => {
      const armor: GameItem[] = [
        { id: 'chain', name: 'Chain', type: 'armor', armorType: ArmorType.CHAIN } as GameItem,
      ];
      const dr = calculateDamageReduction(armor);
      expect(dr).toBe(6); // Chain default DR is 6
    });

    it('should add spell and class DR bonuses', () => {
      const dr = calculateDamageReduction([], 5, 3);
      expect(dr).toBe(8);
    });
  });

  describe('calculatePhysicalDamage', () => {
    // Note: These tests use fixed damage ranges to avoid randomness issues
    it('should calculate base damage with STR bonus', () => {
      // Use same min/max to get deterministic result
      const damage = calculatePhysicalDamage(50, 10, 10, 0, false, false);
      expect(damage).toBe(10 + 10); // 10 damage + (50/5) STR bonus
    });

    it('should apply damage reduction', () => {
      const damage = calculatePhysicalDamage(0, 10, 10, 5, false, false);
      expect(damage).toBe(5); // 10 - 5 DR = 5
    });

    it('should enforce minimum 1 damage', () => {
      const damage = calculatePhysicalDamage(0, 1, 1, 100, false, false);
      expect(damage).toBe(1);
    });

    it('should apply crit multiplier (1.5x)', () => {
      const damage = calculatePhysicalDamage(0, 10, 10, 0, true, false);
      expect(damage).toBe(15); // 10 * 1.5 = 15
    });

    it('should apply bash multiplier (2x)', () => {
      const damage = calculatePhysicalDamage(0, 10, 10, 0, false, true);
      expect(damage).toBe(20); // 10 * 2 = 20
    });
  });

  describe('calculateUnarmedDamage', () => {
    it('should use fixed 1-3 damage range', () => {
      // Run multiple times to ensure it stays in range
      for (let i = 0; i < 20; i++) {
        const damage = calculateUnarmedDamage(0, 0, false);
        expect(damage).toBeGreaterThanOrEqual(1);
        expect(damage).toBeLessThanOrEqual(3);
      }
    });

    it('should add STR bonus', () => {
      // With STR 50 = +10 bonus, unarmed min damage is 11
      const damage = calculateUnarmedDamage(50, 0, false);
      expect(damage).toBeGreaterThanOrEqual(11);
    });
  });

  describe('calculateSpellDamage', () => {
    it('should calculate base damage with INT and WIS bonuses', () => {
      // Fixed damage range to test bonuses
      const damage = calculateSpellDamage(10, 10, 40, 40, false);
      // 10 base + (40/4) INT bonus + (40/8) WIS bonus = 10 + 10 + 5 = 25
      expect(damage).toBe(25);
    });

    it('should apply crit multiplier', () => {
      const damage = calculateSpellDamage(10, 10, 0, 0, true);
      expect(damage).toBe(15); // 10 * 1.5 = 15
    });

    it('should enforce minimum 1 damage', () => {
      const damage = calculateSpellDamage(0, 0, 0, 0, false);
      expect(damage).toBeGreaterThanOrEqual(1);
    });
  });

  describe('rollToHit', () => {
    it('should always hit with 100% chance', () => {
      for (let i = 0; i < 20; i++) {
        expect(rollToHit(100)).toBe(true);
      }
    });

    it('should never hit with 0% chance', () => {
      for (let i = 0; i < 20; i++) {
        expect(rollToHit(0)).toBe(false);
      }
    });
  });

  describe('rollToDodge', () => {
    it('should always dodge with 100% chance', () => {
      for (let i = 0; i < 20; i++) {
        expect(rollToDodge(100)).toBe(true);
      }
    });

    it('should never dodge with 0% chance', () => {
      for (let i = 0; i < 20; i++) {
        expect(rollToDodge(0)).toBe(false);
      }
    });
  });

  describe('rollToCrit', () => {
    it('should never crit on bash attacks', () => {
      // Even with 100% crit chance, bash prevents crit
      for (let i = 0; i < 20; i++) {
        expect(rollToCrit(100, true)).toBe(false);
      }
    });

    it('should always crit with 100% chance (non-bash)', () => {
      for (let i = 0; i < 20; i++) {
        expect(rollToCrit(100, false)).toBe(true);
      }
    });

    it('should never crit with 0% chance', () => {
      for (let i = 0; i < 20; i++) {
        expect(rollToCrit(0, false)).toBe(false);
      }
    });
  });

  describe('checkAcHit', () => {
    it('should produce roughly 50% hits when accuracy equals AC', () => {
      // With acc=0, AC=0: required = 50, 50% chance
      let hits = 0;
      for (let i = 0; i < 100; i++) {
        if (checkAcHit(0, 0)) hits++;
      }
      // Should be roughly 50%, allow for variance
      expect(hits).toBeGreaterThan(30);
      expect(hits).toBeLessThan(70);
    });
  });

  describe('calculateUserDodgeChance', () => {
    it('should calculate dodge for a basic user', () => {
      const user = {
        raceId: 'human',
        agility: 25,
      } as User;
      const dodge = calculateUserDodgeChance(user);
      expect(dodge).toBe(5 + 5); // Base 5 + (25/5) AGI
    });

    it('should include racial and class bonuses', () => {
      const user = {
        raceId: 'halfling',
        agility: 0,
      } as User;
      const raceData = {
        id: 'halfling',
        name: 'Halfling',
        description: '',
        statModifiers: {
          strength: 0,
          dexterity: 0,
          agility: 0,
          constitution: 0,
          intelligence: 0,
          wisdom: 0,
          charisma: 0,
        },
        dodgeBonus: 15,
      } as Race;
      const classData = {
        id: 'thief',
        name: 'Thief',
        tier: 1,
        dodgeBonus: 5,
      } as CharacterClass;
      const dodge = calculateUserDodgeChance(user, raceData, classData);
      expect(dodge).toBe(5 + 15 + 5); // Base + racial + class
    });
  });

  describe('calculateUserCritChance', () => {
    it('should calculate crit for a basic user', () => {
      const user = {
        dexterity: 30,
        intelligence: 0,
      } as User;
      const crit = calculateUserCritChance(user, undefined, false);
      expect(crit).toBe(5 + 3); // Base 5 + (30/10) DEX
    });

    it('should include racial crit bonus', () => {
      const user = {
        dexterity: 0,
        intelligence: 0,
      } as User;
      const raceData = {
        id: 'halfling',
        name: 'Halfling',
        description: '',
        statModifiers: {
          strength: 0,
          dexterity: 0,
          agility: 0,
          constitution: 0,
          intelligence: 0,
          wisdom: 0,
          charisma: 0,
        },
        bonuses: { critChance: 0.05 }, // 5% as decimal
      } as Race;
      const crit = calculateUserCritChance(user, raceData, false);
      expect(crit).toBe(10); // Base 5 + 5% racial
    });
  });

  describe('CRIT_DAMAGE_MULTIPLIER', () => {
    it('should be 1.5x', () => {
      expect(CRIT_DAMAGE_MULTIPLIER).toBe(1.5);
    });
  });
});
