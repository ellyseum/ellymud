/**
 * Experience curve helpers
 *
 * Single source of truth for the XP-per-level formula. The curve is
 * exponential — each level needs 1.5× the previous one's XP, starting
 * at 1000 for level 1→2.
 *
 * Curve: L1→L2 1000, L2→L3 1500, L3→L4 2250, L4→L5 3375, …
 *
 * @module utils/expCurve
 */

/** XP needed to advance from `level` to `level + 1`. */
export function getExpRequiredForLevel(level: number): number {
  return Math.floor(1000 * Math.pow(1.5, level - 1));
}

/** Cumulative XP needed to reach `level` from level 1. */
export function getTotalExpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += getExpRequiredForLevel(i);
  }
  return total;
}
