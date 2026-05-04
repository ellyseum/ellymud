/*
 * EllyMUD
 * Copyright (C) 2026 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Safe stat accessor. Reads `user.stats[id]` if present and finite, otherwise
 * falls back to the schema's `baseValue`, otherwise 0.
 *
 * Used in place of direct `user.strength`-style reads so combat/regen/display
 * formulas never see `NaN` or `undefined`.
 *
 * @module ruleset/safeAccess
 */

import { User } from '../types';
import { RulesetRegistry } from './rulesetRegistry';

/**
 * Tolerates two storage shapes for a stat value on User:
 *   - canonical: `user.stats[id]` (Record<string, number>)
 *   - legacy flat field: `user[id]` (e.g., `user.strength`)
 *
 * The dual lookup lets the engine convert call sites incrementally without
 * breaking existing readers; the legacy fallback can be deleted once no live
 * data still relies on the flat fields.
 */
export function getStat(user: User, id: string): number {
  const userRec = user as unknown as Record<string, unknown>;
  const fromRecord = (userRec.stats as Record<string, unknown> | undefined)?.[id];
  if (typeof fromRecord === 'number' && Number.isFinite(fromRecord)) return fromRecord;

  const fromFlat = userRec[id];
  if (typeof fromFlat === 'number' && Number.isFinite(fromFlat)) return fromFlat;

  const def = RulesetRegistry.getInstance().getStat(id);
  return def?.baseValue ?? 0;
}
