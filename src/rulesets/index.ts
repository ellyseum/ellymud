/*
 * EllyMUD
 * Copyright (C) 2026 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Built-in ruleset plugin registry. The first entry is treated as the
 * default; new built-in plugins go at the end so the default selection
 * stays stable across releases.
 *
 * @module rulesets
 */

import { RulesetPlugin } from '../ruleset/plugin';
import fantasyPlugin from './fantasy';
import grimdarkPlugin from './grimdark';

export const builtInRulesets: readonly RulesetPlugin[] = [fantasyPlugin, grimdarkPlugin];
