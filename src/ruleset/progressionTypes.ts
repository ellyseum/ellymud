/*
 * EllyMUD
 * Copyright (C) 2026 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Progression hook surface. The active ruleset declares the XP curve;
 * the engine reads it through `progressionAccess` helpers (not directly)
 * so a non-fantasy ruleset can swap the curve without engine changes.
 *
 * @module ruleset/progressionTypes
 */

export interface ProgressionHooks {
  /** XP needed to advance from `level` to `level + 1`. */
  expRequiredForLevel(level: number): number;
  /**
   * Cumulative XP needed to reach `level` from level 1. Optional —
   * when omitted, the engine derives it by summing `expRequiredForLevel`
   * across `[1, level)` so the two functions can't drift out of sync.
   */
  totalExpForLevel?(level: number): number;
}
