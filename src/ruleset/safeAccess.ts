/*
 * EllyMUD
 * Copyright (C) 2025 ellyseum
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
 * Until commit 5 introduces `User.stats`, callers reach the field through this
 * helper which tolerates both shapes:
 *   - new shape: `user.stats[id]` (Record<string, number>)
 *   - legacy shape: `user[id]` (flat field)
 * After commit 5, only the new shape exists. The dual lookup is a transitional
 * safety net so commit 1 can land independently.
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
