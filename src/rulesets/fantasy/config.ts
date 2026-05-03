/*
 * EllyMUD
 * Copyright (C) 2025 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Default fantasy ruleset stat schema.
 *
 * Reproduces the seven attributes the engine has hardcoded historically.
 * This is the bundled default; alternative rulesets can replace it.
 *
 * @module ruleset/defaultFantasyRulesetConfig
 */

import { RulesetConfig } from '../../ruleset/types';
import { ResourcePoolDefinition } from '../../ruleset/resourceTypes';
import { defaultFantasyCombatHooks } from './combatHooks';
import { defaultFantasyAbilityHooks } from './abilityHooks';
import { defaultFantasyProgressionHooks } from './progressionHooks';

// Constants reproducing the historical numeric tuning. Pool definitions read
// these through the constants below so the magic numbers live in one place.
const RAGE_MAX = 100;
const ENERGY_MAX = 100;
const HOLY_MAX_CHARGES = 5;
const ENERGY_REGEN_PER_TICK = 25;
const RAGE_DECAY_PER_TICK = 5;
const MANA_BASE_REGEN = 4;
const MANA_INT_BONUS = 1;
const MANA_TIMER_BASE = 4;
const KI_BASE_REGEN = 3;
const KI_WIS_BONUS = 1;
const NATURE_BASE_REGEN = 3;
const NATURE_WIS_BONUS = 1;
const HOLY_TICKS_PER_CHARGE = 12;

const fantasyResourcePools: ResourcePoolDefinition[] = [
  {
    id: 'mana',
    displayName: 'Mana',
    abbreviation: 'MP',
    sizing: {
      kind: 'derived',
      base: 20,
      terms: [
        { statId: 'intelligence', perPoint: 3 },
        { statId: 'wisdom', perPoint: 2 },
      ],
    },
    regen: {
      // Every game tick: 4 + floor(INT/10) * MANA_INT_BONUS
      tickRegen: {
        kind: 'flat',
        perTick: MANA_BASE_REGEN,
        statBonuses: [{ statIds: ['intelligence'], divisor: 10, bonus: MANA_INT_BONUS }],
      },
      // Every 3 ticks while fully resting/meditating: 4 + floor((WIS+INT)/20)
      subRegen: {
        kind: 'flat',
        perTick: MANA_TIMER_BASE,
        statBonuses: [{ statIds: ['wisdom', 'intelligence'], divisor: 20, bonus: 1 }],
      },
      // Every 12 ticks baseline: same formula; resting multiplier handled
      // by the timer caller, not the pool definition.
      fullRegen: {
        kind: 'flat',
        perTick: MANA_TIMER_BASE,
        statBonuses: [{ statIds: ['wisdom', 'intelligence'], divisor: 20, bonus: 1 }],
      },
    },
    meditationMultiplier: 2,
    description: 'Caster pool used by mage and healer classes.',
  },
  {
    id: 'rage',
    displayName: 'Rage',
    abbreviation: 'RG',
    sizing: { kind: 'fixed', value: RAGE_MAX },
    regen: { tickRegen: { kind: 'none' } },
    decayPerTickOutOfCombat: RAGE_DECAY_PER_TICK,
    description: 'Builds on damage, decays out of combat.',
  },
  {
    id: 'energy',
    displayName: 'Energy',
    abbreviation: 'EN',
    sizing: { kind: 'fixed', value: ENERGY_MAX },
    regen: { tickRegen: { kind: 'flat', perTick: ENERGY_REGEN_PER_TICK } },
    description: 'Fast-regen pool used by thief/rogue classes.',
  },
  {
    id: 'ki',
    displayName: 'Ki',
    abbreviation: 'KI',
    sizing: {
      kind: 'derived',
      base: 50,
      terms: [{ statId: 'wisdom', perPoint: 2 }],
    },
    regen: {
      tickRegen: {
        kind: 'flat',
        perTick: KI_BASE_REGEN,
        statBonuses: [{ statIds: ['wisdom'], divisor: 10, bonus: KI_WIS_BONUS }],
      },
    },
    meditationMultiplier: 3,
    description: 'Balanced martial-arts pool used by monk classes.',
  },
  {
    id: 'holy',
    displayName: 'Holy',
    abbreviation: 'HO',
    sizing: { kind: 'fixed', value: HOLY_MAX_CHARGES },
    regen: {
      tickRegen: {
        kind: 'every_n_ticks',
        ticksPerCharge: HOLY_TICKS_PER_CHARGE,
        chargesPerInterval: 1,
      },
    },
    description: 'Charge-based pool used by paladin/cleric classes.',
  },
  {
    id: 'nature',
    displayName: 'Nature',
    abbreviation: 'NA',
    sizing: {
      kind: 'derived',
      base: 30,
      terms: [{ statId: 'wisdom', perPoint: 2 }],
    },
    regen: {
      tickRegen: {
        kind: 'flat',
        perTick: NATURE_BASE_REGEN,
        statBonuses: [{ statIds: ['wisdom'], divisor: 10, bonus: NATURE_WIS_BONUS }],
      },
    },
    description: 'Druid/ranger attunement pool.',
  },
];

export const defaultFantasyRulesetConfig: RulesetConfig = {
  stats: [
    {
      id: 'strength',
      displayName: 'Strength',
      abbreviation: 'STR',
      baseValue: 10,
      description: 'Physical power; affects melee damage and carrying capacity.',
    },
    {
      id: 'dexterity',
      displayName: 'Dexterity',
      abbreviation: 'DEX',
      baseValue: 10,
      description: 'Hand-eye coordination; affects hit chance and ranged damage.',
    },
    {
      id: 'agility',
      displayName: 'Agility',
      abbreviation: 'AGI',
      baseValue: 10,
      description: 'Speed and reflexes; affects dodge, attack speed, and movement.',
    },
    {
      id: 'constitution',
      displayName: 'Constitution',
      abbreviation: 'CON',
      baseValue: 10,
      description: 'Physical endurance; affects max HP.',
    },
    {
      id: 'intelligence',
      displayName: 'Intelligence',
      abbreviation: 'INT',
      baseValue: 10,
      description: 'Reasoning and learning; affects spell damage and mana pool.',
    },
    {
      id: 'wisdom',
      displayName: 'Wisdom',
      abbreviation: 'WIS',
      baseValue: 10,
      description: 'Perception and intuition; affects mana, ki, and nature pools.',
    },
    {
      id: 'charisma',
      displayName: 'Charisma',
      abbreviation: 'CHA',
      baseValue: 10,
      description: 'Social presence; affects merchant prices and dialogue.',
    },
  ],
  startingAttributePoints: 100,
  resourcePools: fantasyResourcePools,
  combatHooks: defaultFantasyCombatHooks,
  abilityHooks: defaultFantasyAbilityHooks,
  progressionHooks: defaultFantasyProgressionHooks,
};
