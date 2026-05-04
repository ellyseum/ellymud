/*
 * EllyMUD
 * Copyright (C) 2026 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Default fantasy ruleset plugin. Bundles the ruleset's stats schema,
 * resource pools, combat hooks, ability hook surface, and progression
 * curve into a single plugin manifest the engine can load by id.
 *
 * @module rulesets/fantasy
 */

import { RulesetPlugin } from '../../ruleset/plugin';
import { defaultFantasyRulesetConfig } from './config';

const fantasyPlugin: RulesetPlugin = {
  id: 'fantasy',
  name: 'Default Fantasy',
  description:
    'The historical fantasy ruleset: seven attributes, six resource pools, exponential XP curve.',
  config: defaultFantasyRulesetConfig,
};

export default fantasyPlugin;

// Re-export the underlying config for tests and migration code that still
// reference `defaultFantasyRulesetConfig` directly.
export { defaultFantasyRulesetConfig } from './config';
