/*
 * EllyMUD
 * Copyright (C) 2025 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Stat schema and ruleset configuration types.
 *
 * A ruleset declares which character attributes exist. The fantasy default
 * (str/dex/agi/con/wis/int/cha) is one valid configuration; other rulesets
 * can declare different stat sets entirely.
 *
 * @module ruleset/types
 */

export interface StatDefinition {
  id: string;
  displayName: string;
  abbreviation: string;
  baseValue: number;
  description?: string;
  costCurve?: 'linear' | 'tier-10';
}

import { ResourcePoolDefinition } from './resourceTypes';

export interface RulesetConfig {
  stats: StatDefinition[];
  startingAttributePoints?: number;
  /**
   * Resource pools the ruleset declares. The reserved id `'none'` is a
   * sentinel for classes with no resource pool and must NOT appear here.
   */
  resourcePools?: ResourcePoolDefinition[];
}
