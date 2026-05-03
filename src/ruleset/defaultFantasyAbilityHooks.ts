/*
 * EllyMUD
 * Copyright (C) 2025 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Default fantasy ability hooks. Empty in this iteration — engine still
 * dispatches ability effects through EffectManager directly. Provided so
 * the ruleset config can wire a non-null `abilityHooks` slot, and so a
 * non-fantasy ruleset has a clear pattern to copy when filling in real
 * handlers.
 *
 * @module ruleset/defaultFantasyAbilityHooks
 */

import { AbilityHooks, createAbilityHooks } from './abilityHandlerTypes';

export const defaultFantasyAbilityHooks: AbilityHooks = createAbilityHooks({});
