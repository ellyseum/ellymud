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

import { RulesetConfig } from './types';

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
};
