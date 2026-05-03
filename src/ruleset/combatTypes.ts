/*
 * EllyMUD
 * Copyright (C) 2025 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Combat hook surface. A ruleset implements `CombatHooks` to supply
 * the per-attack math the engine consumes; the engine still owns the
 * roll, dodge resolution sequence, damage application, and event
 * broadcasting. Phase C lifts the math out of `combatFormulas.ts`
 * by delegating each formula to the active ruleset.
 *
 * @module ruleset/combatTypes
 */

import { User, GameItem } from '../types';
import { NPC } from '../combat/npc';

/**
 * Combat participants are either logged-in players or NPCs. Hooks read
 * stats, level, and equipment off whichever side is the attacker or
 * defender.
 */
export type CombatParticipant = User | NPC;

export interface CombatContext {
  attacker: CombatParticipant;
  defender: CombatParticipant;
  attackerLevel: number;
  defenderLevel: number;
  weapon?: GameItem;
  /**
   * Weapon damage range for this swing. Provided in the context so all
   * hooks share a uniform `(ctx)` signature; unarmed and ability-driven
   * attacks supply a synthetic range here.
   */
  weaponDamageRange: { min: number; max: number };
  /**
   * Defender's equipped armor items (resolved by the engine before the
   * hook fires). Lets the AC/DR hooks read armor data without the
   * ruleset having to know how the engine stores equipment.
   */
  defenderArmor?: GameItem[];
  isSpell?: boolean;
  /**
   * Optional discriminator for paths that today use distinct hit models
   * for NPC attackers (e.g., the room-aggression path uses a flat 50%).
   * The default fantasy hook can dispatch on this; rulesets that don't
   * care can ignore it.
   */
  attackKind?:
    | 'player-melee'
    | 'player-spell'
    | 'player-combat-ability'
    | 'npc-aggro'
    | 'npc-counter';
}

export interface DamageBreakdown {
  /** Damage rolled before crit / DR / clamp. Useful for logging. */
  base: number;
  /**
   * Damage the engine should attempt to apply (after crit, DR, clamps).
   * Distinct from the *actual* damage delivered — engine's apply call
   * may cap to remaining HP, return less on overkill, etc.
   */
  computed: number;
  /** True when this swing's crit roll succeeded. */
  isCrit: boolean;
}

export interface CombatHooks {
  /** Returns 0-100 chance the attacker hits before dodge is rolled. */
  hitChance(ctx: CombatContext): number;

  /** Returns 0-100 chance the defender dodges a hit attempt. */
  dodgeChance(ctx: CombatContext): number;

  /** Returns 0-100 chance the attack crits. */
  critChance(ctx: CombatContext): number;

  /** Returns the defender's effective armor class. */
  armorClass(ctx: CombatContext): number;

  /** Returns the defender's flat damage reduction. */
  damageReduction(ctx: CombatContext): number;

  /**
   * End-to-end damage: roll weapon damage, decide crit (using
   * `critChance`), apply crit multiplier, subtract `damageReduction`,
   * clamp to a minimum. Returns a `DamageBreakdown` so callers can log
   * raw vs. final amounts and surface crit text without re-running.
   */
  computeDamage(ctx: CombatContext): DamageBreakdown;
}
