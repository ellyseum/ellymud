/*
 * EllyMUD
 * Copyright (C) 2025 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Default fantasy combat hook implementation. Wraps the historical
 * `combatFormulas.ts` functions so the math stays in one well-tested
 * place; a non-fantasy ruleset can replace this bundle entirely.
 *
 * @module ruleset/defaultFantasyCombatHooks
 */

import {
  calculateHitChance,
  calculateCritChance,
  calculatePhysicalDamage,
  calculateSpellDamage,
  calculateUserDodgeChance,
  CRIT_DAMAGE_MULTIPLIER,
} from '../combat/combatFormulas';
import { getStat } from './safeAccess';
import { CombatHooks } from './combatTypes';
import { User } from '../types';
import { NPC } from '../combat/npc';

const NPC_AGGRO_HIT_CHANCE = 50;

/**
 * The fantasy combat hooks operate on User<->User combat primarily; NPC
 * combatants flow through with the discriminator on `ctx.attackKind` so
 * the existing 50% NPC-aggro hit chance is preserved.
 */
export const defaultFantasyCombatHooks: CombatHooks = {
  hitChance(ctx) {
    if (ctx.attackKind === 'npc-aggro') {
      // Preserve current room-aggression behavior: flat 50% hit chance for
      // NPC-initiated attacks routed through CombatProcessor.processNpcAttack.
      // A future ruleset can replace this with stat math by overriding the
      // hook; the default keeps behavior intact for now.
      return NPC_AGGRO_HIT_CHANCE;
    }
    if (isUser(ctx.attacker)) {
      return calculateHitChance(
        getStat(ctx.attacker, 'dexterity'),
        ctx.attackerLevel,
        this.dodgeChance(ctx),
        ctx.defenderLevel
      );
    }
    // NPC attackers using counter-attack flow through the same stat math
    // when User stats are available; NPC->NPC counter is rare but defaults
    // sensibly here because NPC has no stat record.
    return NPC_AGGRO_HIT_CHANCE;
  },

  dodgeChance(ctx) {
    if (!isUser(ctx.defender)) return 0;
    return calculateUserDodgeChance(ctx.defender, undefined, undefined);
  },

  critChance(ctx) {
    if (!isUser(ctx.attacker)) return 0;
    return calculateCritChance(
      getStat(ctx.attacker, 'dexterity'),
      getStat(ctx.attacker, 'intelligence'),
      ctx.isSpell ?? false,
      0
    );
  },

  armorClass(ctx) {
    // Default fantasy AC is computed by the engine via itemManager + the
    // calculateArmorClass primitive at attack time; this hook's value is
    // currently consulted for parity by Phase D ability tooling. Returning
    // a base 10 here matches the formula's BASE_AC; rulesets that want
    // hook-driven AC can override.
    if (!isUser(ctx.defender)) return 10;
    return 10;
  },

  damageReduction(ctx) {
    // Same shape as armorClass — engine-side calculation in combat.ts is
    // unchanged; ruleset override hook lives here for future consumers.
    if (!isUser(ctx.defender)) return 0;
    return 0;
  },

  computeDamage(ctx) {
    const { weaponDamageRange } = ctx;
    const isCrit = !ctx.isSpell && Math.random() * 100 < this.critChance(ctx);
    const dr = this.damageReduction(ctx);

    if (ctx.isSpell && isUser(ctx.attacker)) {
      const base = calculateSpellDamage(
        getStat(ctx.attacker, 'intelligence'),
        weaponDamageRange.min,
        weaponDamageRange.max,
        dr,
        false
      );
      return { base, computed: base, isCrit: false };
    }

    const strength = isUser(ctx.attacker) ? getStat(ctx.attacker, 'strength') : 0;
    const computed = calculatePhysicalDamage(
      strength,
      weaponDamageRange.min,
      weaponDamageRange.max,
      dr,
      isCrit,
      false
    );
    const baseRoll =
      Math.floor((weaponDamageRange.min + weaponDamageRange.max) / 2) + Math.floor(strength / 5);
    return {
      base: baseRoll,
      computed,
      isCrit,
    };
  },
};

function isUser(p: User | NPC): p is User {
  return typeof (p as User).username === 'string' && !(p as NPC).templateId;
}

// Re-export for engine use elsewhere.
export { CRIT_DAMAGE_MULTIPLIER };
