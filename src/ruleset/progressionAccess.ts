/*
 * EllyMUD
 * Copyright (C) 2025 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Engine-side helpers that resolve the active ruleset's progression
 * curve. Falls back to the bundled `expCurve.ts` defaults when the
 * registry has no progression hooks loaded so callers don't need to
 * special-case the unloaded state (e.g., test paths that construct
 * commands without a full ruleset).
 *
 * @module ruleset/progressionAccess
 */

import {
  getExpRequiredForLevel as defaultExpRequiredForLevel,
  getTotalExpForLevel as defaultTotalExpForLevel,
} from '../utils/expCurve';
import { RulesetRegistry } from './rulesetRegistry';

export function expRequiredForLevel(level: number): number {
  const hooks = RulesetRegistry.getInstance().getProgressionHooks();
  return hooks ? hooks.expRequiredForLevel(level) : defaultExpRequiredForLevel(level);
}

export function totalExpForLevel(level: number): number {
  const hooks = RulesetRegistry.getInstance().getProgressionHooks();
  if (!hooks) return defaultTotalExpForLevel(level);
  if (hooks.totalExpForLevel) return hooks.totalExpForLevel(level);
  // Derived form: sum the per-level requirements so a ruleset that supplied
  // only `expRequiredForLevel` can't drift its total out of sync.
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += hooks.expRequiredForLevel(i);
  }
  return total;
}
