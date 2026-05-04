/*
 * EllyMUD
 * Copyright (C) 2026 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Grimdark combat hooks. Composes from the fantasy hook bundle: only
 * `hitChance` is overridden, returning ~85% of the fantasy value — every
 * swing is meaningfully less likely to land. Other hooks delegate to the
 * fantasy implementations, so DR / AC / dodge / crit / damage math stays
 * stable while the tone of combat shifts toward grindier.
 *
 * @module rulesets/grimdark/combatHooks
 */

import { CombatHooks } from '../../ruleset/combatTypes';
import { defaultFantasyCombatHooks } from '../fantasy/combatHooks';

const GRIMDARK_HIT_SCALE = 0.85;

export const grimdarkCombatHooks: CombatHooks = {
  ...defaultFantasyCombatHooks,
  hitChance(ctx) {
    return Math.floor(defaultFantasyCombatHooks.hitChance(ctx) * GRIMDARK_HIT_SCALE);
  },
};
