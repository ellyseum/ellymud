/*
 * EllyMUD
 * Copyright (C) 2025 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Ability effect handler hook surface. A ruleset registers handlers
 * keyed by effect-type id; the engine looks up the handler when an
 * ability fires and invokes it. Phase D ships only the surface — the
 * ability execution paths still dispatch through the engine's internal
 * EffectManager. A follow-up phase will route those paths through this
 * registry once the EffectManager dispatch can be safely abstracted.
 *
 * @module ruleset/abilityHandlerTypes
 */

import { User } from '../types';
import { CombatParticipant } from './combatTypes';

export interface AbilityEffectContext {
  caster: User;
  target: CombatParticipant;
  /** The ability that triggered this effect (full template, not just id). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ability: any;
  /** The single effect entry from the ability that this handler resolves. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  effect: any;
  /**
   * Engine systems the handler may need. Typed as unknown for now to
   * avoid cyclic imports between the ruleset module and engine modules
   * that depend on the ruleset registry. Callers cast at usage sites.
   */
  effectManager: unknown;
  combatSystem: unknown;
}

export type AbilityEffectHandler = (ctx: AbilityEffectContext) => void;

export interface AbilityHooks {
  /** Returns the handler registered for this effect type, or undefined. */
  getEffectHandler(effectType: string): AbilityEffectHandler | undefined;
  /** Returns every effect-type id the active ruleset has registered. */
  getEffectTypes(): readonly string[];
}

/** Convenience constructor for an immutable bundle from a plain map. */
export function createAbilityHooks(handlers: Record<string, AbilityEffectHandler>): AbilityHooks {
  return {
    getEffectHandler(effectType) {
      return handlers[effectType];
    },
    getEffectTypes() {
      return Object.keys(handlers);
    },
  };
}
