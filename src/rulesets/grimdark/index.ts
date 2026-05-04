/*
 * EllyMUD
 * Copyright (C) 2026 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Grimdark ruleset plugin. Tonal and numeric variant of fantasy: same
 * stat ids and pool ids (so all existing class/npc/item content data
 * still loads) but with darker naming, fewer starting attribute points,
 * harsher mana regen, harsher XP curve, and stricter combat math.
 *
 * @module rulesets/grimdark
 */

import { RulesetPlugin } from '../../ruleset/plugin';
import { grimdarkRulesetConfig } from './config';

const grimdarkPlugin: RulesetPlugin = {
  id: 'grimdark',
  name: 'Grimdark',
  description: 'Darker tone variant of fantasy: same stat schema, harsher numbers and naming.',
  config: grimdarkRulesetConfig,
};

export default grimdarkPlugin;
export { grimdarkRulesetConfig } from './config';
