/*
 * EllyMUD
 * Copyright (C) 2026 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Ruleset plugin manifest. Each built-in ruleset under `src/rulesets/`
 * exports one of these as its default; the engine selects the active
 * plugin at boot via the loader and hands its config to RulesetRegistry.
 *
 * @module ruleset/plugin
 */

import { RulesetConfig } from './types';

export interface RulesetPlugin {
  /** Stable id used to select the ruleset (env / CLI). */
  id: string;
  /** Human-readable name shown in admin UI / CLI. */
  name: string;
  /** Optional one-line description. */
  description?: string;
  /** The ruleset's RulesetConfig (stats, pools, hooks, etc.). */
  config: RulesetConfig;
}
