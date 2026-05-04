/*
 * EllyMUD
 * Copyright (C) 2026 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Grimdark progression hooks. Same exponential shape as fantasy but with a
 * harsher 1.7 multiplier per level so XP requirements scale faster — the
 * same level-5 character takes ~65% more XP to reach than under fantasy.
 *
 * @module rulesets/grimdark/progressionHooks
 */

import { ProgressionHooks } from '../../ruleset/progressionTypes';

const GRIMDARK_GROWTH = 1.7;

export const grimdarkProgressionHooks: ProgressionHooks = {
  expRequiredForLevel(level) {
    return Math.floor(1000 * Math.pow(GRIMDARK_GROWTH, level - 1));
  },
};
