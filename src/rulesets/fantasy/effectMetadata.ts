/*
 * EllyMUD
 * Copyright (C) 2026 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Default fantasy effect metadata. Registers every entry in the
 * historical EffectType enum with the same default stacking behavior
 * the engine had hardcoded in `effectStackingRules`. The engine reads
 * stacking through the registry; with this bundle loaded, behavior is
 * identical to before. A non-fantasy ruleset can replace this bundle
 * entirely or extend it with its own effect ids.
 *
 * @module rulesets/fantasy/effectMetadata
 */

import {
  EffectMetadataHooks,
  createEffectMetadataHooks,
  EffectMetadata,
} from '../../ruleset/effectMetadata';
import { EffectType, StackingBehavior } from '../../types/effects';

const fantasyEffectMetadata: Record<string, EffectMetadata> = {
  [EffectType.POISON]: { id: EffectType.POISON, defaultStacking: StackingBehavior.REFRESH },
  [EffectType.REGEN]: { id: EffectType.REGEN, defaultStacking: StackingBehavior.REFRESH },
  [EffectType.STUN]: { id: EffectType.STUN, defaultStacking: StackingBehavior.REFRESH },
  [EffectType.STRENGTH_BUFF]: {
    id: EffectType.STRENGTH_BUFF,
    defaultStacking: StackingBehavior.REFRESH,
  },
  [EffectType.AGILITY_BUFF]: {
    id: EffectType.AGILITY_BUFF,
    defaultStacking: StackingBehavior.REFRESH,
  },
  [EffectType.DEFENSE_BUFF]: {
    id: EffectType.DEFENSE_BUFF,
    defaultStacking: StackingBehavior.REFRESH,
  },
  [EffectType.ATTACK_BUFF]: {
    id: EffectType.ATTACK_BUFF,
    defaultStacking: StackingBehavior.REFRESH,
  },
  [EffectType.DAMAGE_OVER_TIME]: {
    id: EffectType.DAMAGE_OVER_TIME,
    defaultStacking: StackingBehavior.STACK_INTENSITY,
  },
  [EffectType.HEAL_OVER_TIME]: {
    id: EffectType.HEAL_OVER_TIME,
    defaultStacking: StackingBehavior.STACK_INTENSITY,
  },
  [EffectType.MOVEMENT_BLOCK]: {
    id: EffectType.MOVEMENT_BLOCK,
    defaultStacking: StackingBehavior.REFRESH,
  },
  [EffectType.INSTANT_DAMAGE]: {
    id: EffectType.INSTANT_DAMAGE,
    defaultStacking: StackingBehavior.STACK_INTENSITY,
  },
  [EffectType.INSTANT_HEAL]: {
    id: EffectType.INSTANT_HEAL,
    defaultStacking: StackingBehavior.STACK_INTENSITY,
  },
  [EffectType.HASTE]: {
    id: EffectType.HASTE,
    defaultStacking: StackingBehavior.STRONGEST_WINS,
  },
  [EffectType.DAMAGE_REDUCTION]: {
    id: EffectType.DAMAGE_REDUCTION,
    defaultStacking: StackingBehavior.STRONGEST_WINS,
  },
  [EffectType.ABSORB]: {
    id: EffectType.ABSORB,
    defaultStacking: StackingBehavior.STACK_INTENSITY,
  },
  [EffectType.TAUNT]: { id: EffectType.TAUNT, defaultStacking: StackingBehavior.REPLACE },
  [EffectType.STEALTH]: { id: EffectType.STEALTH, defaultStacking: StackingBehavior.IGNORE },
  [EffectType.SLOW]: {
    id: EffectType.SLOW,
    defaultStacking: StackingBehavior.STRONGEST_WINS,
  },
  [EffectType.FEAR]: { id: EffectType.FEAR, defaultStacking: StackingBehavior.REFRESH },
  [EffectType.SILENCE]: { id: EffectType.SILENCE, defaultStacking: StackingBehavior.REFRESH },
  [EffectType.BLEED]: {
    id: EffectType.BLEED,
    defaultStacking: StackingBehavior.STACK_INTENSITY,
  },
};

export const defaultFantasyEffectMetadataHooks: EffectMetadataHooks =
  createEffectMetadataHooks(fantasyEffectMetadata);
