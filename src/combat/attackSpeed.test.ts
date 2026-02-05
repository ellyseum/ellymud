/**
 * Attack Speed Tests
 *
 * Tests for the combat energy system and attack speed calculations.
 */

import {
  CombatEnergyTracker,
  calculateBaseEnergy,
  getWeaponEnergyCost,
  DEFAULT_WEAPON_ENERGY_COSTS,
  estimateAttacksPerRound,
  getAttackSpeedDescription,
} from './attackSpeed';
import { CombatLevel, GameItem } from '../types';

describe('Attack Speed', () => {
  describe('DEFAULT_WEAPON_ENERGY_COSTS', () => {
    it('should have correct weapon energy costs', () => {
      expect(DEFAULT_WEAPON_ENERGY_COSTS.FISTS).toBe(200);
      expect(DEFAULT_WEAPON_ENERGY_COSTS.DAGGER).toBe(250);
      expect(DEFAULT_WEAPON_ENERGY_COSTS.SHORT_SWORD).toBe(350);
      expect(DEFAULT_WEAPON_ENERGY_COSTS.LONG_SWORD).toBe(450);
      expect(DEFAULT_WEAPON_ENERGY_COSTS.MACE_AXE).toBe(500);
      expect(DEFAULT_WEAPON_ENERGY_COSTS.TWO_HANDED).toBe(650);
      expect(DEFAULT_WEAPON_ENERGY_COSTS.STAFF).toBe(400);
      expect(DEFAULT_WEAPON_ENERGY_COSTS.BOW).toBe(500);
    });
  });

  describe('calculateBaseEnergy', () => {
    it('should calculate energy with base values', () => {
      // Level 1, AGI 10, CASTER (1.0x), no haste
      // (300 + 20 + 80) * 1.0 = 400
      const energy = calculateBaseEnergy(1, 10, CombatLevel.CASTER, 0);
      expect(energy).toBe(400);
    });

    it('should scale with level', () => {
      // Level 10, AGI 10, CASTER (1.0x), no haste
      // (300 + 200 + 80) * 1.0 = 580
      const energy = calculateBaseEnergy(10, 10, CombatLevel.CASTER, 0);
      expect(energy).toBe(580);
    });

    it('should scale with agility', () => {
      // Level 1, AGI 50, CASTER (1.0x), no haste
      // (300 + 20 + 400) * 1.0 = 720
      const energy = calculateBaseEnergy(1, 50, CombatLevel.CASTER, 0);
      expect(energy).toBe(720);
    });

    it('should apply combat level multiplier', () => {
      // Level 1, AGI 10, ELITE (2.0x), no haste
      // (300 + 20 + 80) * 2.0 = 800
      const energy = calculateBaseEnergy(1, 10, CombatLevel.ELITE, 0);
      expect(energy).toBe(800);
    });

    it('should add haste bonus', () => {
      // Level 1, AGI 10, CASTER (1.0x), +200 haste
      // (300 + 20 + 80) * 1.0 + 200 = 600
      const energy = calculateBaseEnergy(1, 10, CombatLevel.CASTER, 200);
      expect(energy).toBe(600);
    });

    it('should calculate correctly for WARRIOR class', () => {
      // Level 5, AGI 15, WARRIOR (1.75x), no haste
      // (300 + 100 + 120) * 1.75 = 520 * 1.75 = 910
      const energy = calculateBaseEnergy(5, 15, CombatLevel.WARRIOR, 0);
      expect(energy).toBe(910);
    });
  });

  describe('getWeaponEnergyCost', () => {
    it('should return item energyCost if specified', () => {
      const item = { energyCost: 333 } as GameItem;
      expect(getWeaponEnergyCost(item)).toBe(333);
    });

    it('should return fists cost for undefined weapon', () => {
      expect(getWeaponEnergyCost(undefined)).toBe(DEFAULT_WEAPON_ENERGY_COSTS.FISTS);
    });

    it('should return default cost for weapon without energyCost', () => {
      const item = { name: 'Generic Sword' } as GameItem;
      // Should return default (long sword cost)
      expect(getWeaponEnergyCost(item)).toBe(DEFAULT_WEAPON_ENERGY_COSTS.LONG_SWORD);
    });
  });

  describe('CombatEnergyTracker', () => {
    let tracker: CombatEnergyTracker;

    beforeEach(() => {
      tracker = new CombatEnergyTracker('testPlayer');
    });

    it('should initialize with zero leftover', () => {
      expect(tracker.getLeftoverEnergy()).toBe(0);
    });

    it('should track username', () => {
      expect(tracker.getUsername()).toBe('testPlayer');
    });

    it('should calculate attacks for round', () => {
      // 600 energy, 250 cost = 2 attacks, 100 leftover
      const attacks = tracker.calculateAttacks(600, 250);
      expect(attacks).toBe(2);
      expect(tracker.getLeftoverEnergy()).toBe(100);
    });

    it('should carry leftover to next round', () => {
      // Round 1: 600 base, 250 cost = 2 attacks, 100 leftover
      tracker.calculateAttacks(600, 250);

      // Round 2: 600 base + 100 leftover = 700, / 250 = 2 attacks, 200 leftover
      const attacks = tracker.calculateAttacks(600, 250);
      expect(attacks).toBe(2);
      expect(tracker.getLeftoverEnergy()).toBe(200);
    });

    it('should double energy cost for bash', () => {
      tracker.setBashing(true);
      // 600 energy, 250 cost with bash (2x cost = 500)
      const attacks = tracker.calculateAttacks(600, 250);
      expect(attacks).toBe(1); // 600 / 500 = 1
      expect(tracker.getLeftoverEnergy()).toBe(100);
    });

    it('should reset on combat end', () => {
      tracker.calculateAttacks(500, 200); // Creates some leftover
      tracker.reset();
      expect(tracker.getLeftoverEnergy()).toBe(0);
    });

    it('should track bash state', () => {
      expect(tracker.getIsBashing()).toBe(false);
      tracker.setBashing(true);
      expect(tracker.getIsBashing()).toBe(true);
      tracker.setBashing(false);
      expect(tracker.getIsBashing()).toBe(false);
    });

    it('should ensure minimum 1 attack', () => {
      // Very low energy, high cost
      const attacks = tracker.calculateAttacks(100, 1000);
      expect(attacks).toBe(1);
    });

    it('should cap at maximum 10 attacks', () => {
      // Very high energy, low cost
      const attacks = tracker.calculateAttacks(5000, 100);
      expect(attacks).toBe(10);
    });

    it('should return correct state', () => {
      tracker.setBashing(true);
      tracker.calculateAttacks(500, 200); // Should leave 100
      const state = tracker.getState();
      expect(state.leftoverEnergy).toBe(100);
      expect(state.isBashing).toBe(true);
    });
  });

  describe('Multi-round energy accumulation', () => {
    it('should show attack accumulation pattern', () => {
      const tracker = new CombatEnergyTracker('player');
      const baseEnergy = 745; // Level 5, AGI 12-ish
      const daggerCost = 250;

      // Round 1: 745 / 250 = 2 attacks (500 used), 245 leftover
      const r1 = tracker.calculateAttacks(baseEnergy, daggerCost);
      expect(r1).toBe(2);
      expect(tracker.getLeftoverEnergy()).toBe(245);

      // Round 2: 745 + 245 = 990 / 250 = 3 attacks (750 used), 240 leftover
      const r2 = tracker.calculateAttacks(baseEnergy, daggerCost);
      expect(r2).toBe(3);
      expect(tracker.getLeftoverEnergy()).toBe(240);

      // Round 3: 745 + 240 = 985 / 250 = 3 attacks (750 used), 235 leftover
      const r3 = tracker.calculateAttacks(baseEnergy, daggerCost);
      expect(r3).toBe(3);
      expect(tracker.getLeftoverEnergy()).toBe(235);
    });
  });

  describe('estimateAttacksPerRound', () => {
    it('should estimate attacks without leftover carryover', () => {
      // 400 energy / 200 cost = 2 attacks
      const attacks = estimateAttacksPerRound(1, 10, CombatLevel.CASTER, 200);
      expect(attacks).toBe(2);
    });

    it('should ensure minimum 1 attack', () => {
      const attacks = estimateAttacksPerRound(1, 10, CombatLevel.CASTER, 10000);
      expect(attacks).toBe(1);
    });

    it('should cap at maximum 10 attacks', () => {
      const attacks = estimateAttacksPerRound(20, 100, CombatLevel.ELITE, 100);
      expect(attacks).toBe(10);
    });
  });

  describe('getAttackSpeedDescription', () => {
    it('should return slow for 1 attack', () => {
      expect(getAttackSpeedDescription(1)).toBe('slow');
    });

    it('should return normal for 2 attacks', () => {
      expect(getAttackSpeedDescription(2)).toBe('normal');
    });

    it('should return fast for 3 attacks', () => {
      expect(getAttackSpeedDescription(3)).toBe('fast');
    });

    it('should return very fast for 4-5 attacks', () => {
      expect(getAttackSpeedDescription(4)).toBe('very fast');
      expect(getAttackSpeedDescription(5)).toBe('very fast');
    });

    it('should return extremely fast for 6+ attacks', () => {
      expect(getAttackSpeedDescription(6)).toBe('extremely fast');
      expect(getAttackSpeedDescription(10)).toBe('extremely fast');
    });
  });
});
