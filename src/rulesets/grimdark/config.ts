/*
 * EllyMUD
 * Copyright (C) 2026 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Grimdark ruleset config. Same stat ids and resource pool ids as fantasy
 * (so existing class/npc/item content data validates) but with darker
 * naming, fewer starting attribute points, harsher mana regen, harsher
 * XP curve, and stricter combat math. Demonstrates that the plugin slots
 * — display names, starting points, regen formulas, progression curve,
 * and combat hooks — all flow through to runtime behavior.
 *
 * @module rulesets/grimdark/config
 */

import { RulesetConfig } from '../../ruleset/types';
import { ResourcePoolDefinition } from '../../ruleset/resourceTypes';
import { defaultFantasyAbilityHooks } from '../fantasy/abilityHooks';
import { defaultFantasyEffectMetadataHooks } from '../fantasy/effectMetadata';
import { grimdarkCombatHooks } from './combatHooks';
import { grimdarkProgressionHooks } from './progressionHooks';

const grimdarkResourcePools: ResourcePoolDefinition[] = [
  // "Will" pool — what fantasy calls mana, but harsher: half the
  // tick-regen base, no meditation multiplier. The same id keeps existing
  // class data ("resourceType: mana") loading without changes.
  {
    id: 'mana',
    displayName: 'Will',
    abbreviation: 'WL',
    sizing: {
      kind: 'derived',
      base: 15,
      terms: [
        { statId: 'intelligence', perPoint: 2 },
        { statId: 'wisdom', perPoint: 2 },
      ],
    },
    regen: {
      tickRegen: {
        kind: 'flat',
        perTick: 2,
        statBonuses: [{ statIds: ['intelligence'], divisor: 10, bonus: 1 }],
      },
      subRegen: {
        kind: 'flat',
        perTick: 2,
        statBonuses: [{ statIds: ['wisdom', 'intelligence'], divisor: 20, bonus: 1 }],
      },
      fullRegen: {
        kind: 'flat',
        perTick: 2,
        statBonuses: [{ statIds: ['wisdom', 'intelligence'], divisor: 20, bonus: 1 }],
      },
    },
    description: 'Caster pool. Slower to recover than fantasy mana.',
  },
  {
    id: 'rage',
    displayName: 'Wrath',
    abbreviation: 'WR',
    sizing: { kind: 'fixed', value: 100 },
    regen: { tickRegen: { kind: 'none' } },
    decayPerTickOutOfCombat: 5,
    description: 'Builds on damage, decays out of combat.',
  },
  {
    id: 'energy',
    displayName: 'Vigor',
    abbreviation: 'VG',
    sizing: { kind: 'fixed', value: 100 },
    regen: { tickRegen: { kind: 'flat', perTick: 25 } },
    description: 'Quick-recovery pool used by skirmisher classes.',
  },
  {
    id: 'ki',
    displayName: 'Discipline',
    abbreviation: 'DI',
    sizing: {
      kind: 'derived',
      base: 50,
      terms: [{ statId: 'wisdom', perPoint: 2 }],
    },
    regen: {
      tickRegen: {
        kind: 'flat',
        perTick: 3,
        statBonuses: [{ statIds: ['wisdom'], divisor: 10, bonus: 1 }],
      },
    },
    description: 'Martial-arts pool tied to focused mind and body.',
  },
  {
    id: 'holy',
    displayName: 'Faith',
    abbreviation: 'FA',
    sizing: { kind: 'fixed', value: 5 },
    regen: {
      tickRegen: {
        kind: 'every_n_ticks',
        ticksPerCharge: 12,
        chargesPerInterval: 1,
      },
    },
    description: 'Charge-based pool for divine intervention.',
  },
  {
    id: 'nature',
    displayName: 'Wilderness',
    abbreviation: 'WI',
    sizing: {
      kind: 'derived',
      base: 30,
      terms: [{ statId: 'wisdom', perPoint: 2 }],
    },
    regen: {
      tickRegen: {
        kind: 'flat',
        perTick: 3,
        statBonuses: [{ statIds: ['wisdom'], divisor: 10, bonus: 1 }],
      },
    },
    description: 'Communion with the natural world.',
  },
];

export const grimdarkRulesetConfig: RulesetConfig = {
  stats: [
    {
      id: 'strength',
      displayName: 'Power',
      abbreviation: 'PWR',
      baseValue: 10,
      description: 'Raw destructive force; melee damage and carrying capacity.',
    },
    {
      id: 'dexterity',
      displayName: 'Precision',
      abbreviation: 'PRC',
      baseValue: 10,
      description: 'Accuracy and ranged damage.',
    },
    {
      id: 'agility',
      displayName: 'Speed',
      abbreviation: 'SPD',
      baseValue: 10,
      description: 'Reflexes; affects dodge, attack speed, movement.',
    },
    {
      id: 'constitution',
      displayName: 'Endurance',
      abbreviation: 'END',
      baseValue: 10,
      description: 'Physical toughness; affects max HP.',
    },
    {
      id: 'intelligence',
      displayName: 'Cunning',
      abbreviation: 'CUN',
      baseValue: 10,
      description: 'Calculation and ruthlessness; affects spell damage and Will pool.',
    },
    {
      id: 'wisdom',
      displayName: 'Insight',
      abbreviation: 'INS',
      baseValue: 10,
      description: 'Perception and intuition; affects Will, Discipline, Wilderness pools.',
    },
    {
      id: 'charisma',
      displayName: 'Presence',
      abbreviation: 'PRS',
      baseValue: 10,
      description: 'Force of personality; affects merchant prices and dialogue.',
    },
  ],
  startingAttributePoints: 75,
  resourcePools: grimdarkResourcePools,
  combatHooks: grimdarkCombatHooks,
  abilityHooks: defaultFantasyAbilityHooks,
  progressionHooks: grimdarkProgressionHooks,
  effectMetadataHooks: defaultFantasyEffectMetadataHooks,
};
