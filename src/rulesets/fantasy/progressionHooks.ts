/*
 * EllyMUD
 * Copyright (C) 2026 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Default fantasy progression hooks. Wraps the bundled `expCurve.ts`
 * helpers so the canonical curve definition stays in one place; a
 * non-fantasy ruleset replaces this bundle entirely.
 *
 * @module ruleset/defaultFantasyProgressionHooks
 */

import { getExpRequiredForLevel, getTotalExpForLevel } from '../../utils/expCurve';
import { ProgressionHooks } from '../../ruleset/progressionTypes';

export const defaultFantasyProgressionHooks: ProgressionHooks = {
  expRequiredForLevel: getExpRequiredForLevel,
  totalExpForLevel: getTotalExpForLevel,
};
