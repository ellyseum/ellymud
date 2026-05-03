/*
 * EllyMUD
 * Copyright (C) 2025 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Ruleset plugin loader. Resolves the active ruleset plugin from
 * (in priority order) an explicit id argument, the `RULESET_ID`
 * environment variable, or the first registered built-in (currently
 * the default fantasy plugin). Loads the plugin's config into the
 * RulesetRegistry as a side effect.
 *
 * @module ruleset/pluginLoader
 */

import { builtInRulesets } from '../rulesets';
import { RulesetPlugin } from './plugin';
import { RulesetRegistry } from './rulesetRegistry';

export function listRulesetPlugins(): readonly RulesetPlugin[] {
  return builtInRulesets;
}

export function getRulesetPlugin(id: string): RulesetPlugin | undefined {
  return builtInRulesets.find((p) => p.id === id);
}

/**
 * Load and activate a ruleset plugin. Throws when an explicit id is
 * provided that doesn't match any registered plugin. Returns the
 * resolved plugin so callers can log the active id at boot.
 */
export function loadActiveRuleset(idOverride?: string): RulesetPlugin {
  const id = idOverride ?? process.env.RULESET_ID ?? builtInRulesets[0]?.id;
  if (!id) {
    throw new Error('No ruleset plugins registered');
  }
  const plugin = getRulesetPlugin(id);
  if (!plugin) {
    const available = builtInRulesets.map((p) => p.id).join(', ');
    throw new Error(`Unknown ruleset id "${id}". Registered plugins: ${available || '(none)'}.`);
  }
  RulesetRegistry.getInstance().loadConfig(plugin.config);
  return plugin;
}
