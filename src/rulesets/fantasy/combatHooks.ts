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
} from '../../combat/combatFormulas';
import { getStat } from '../../ruleset/safeAccess';
import { CombatHooks } from '../../ruleset/combatTypes';
import { User } from '../../types';
import { NPC } from '../../combat/npc';

const NPC_AGGRO_HIT_CHANCE = 50;
const COMBAT_ABILITY_HIT_CHANCE = 65;

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
    if (ctx.attackKind === 'player-combat-ability') {
      // Preserve the historical 65% hit chance for combat-ability attacks
      // routed through AbilityManager.executeCombatAbilityAttack. Stat-based
      // hit chance gets reintroduced when ability execution itself migrates
      // to ruleset handlers.
      return COMBAT_ABILITY_HIT_CHANCE;
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

  armorClass(_ctx) {
    // Engine still owns AC calculation via itemManager + calculateArmorClass
    // because the formula consumes the player's equipped armor list, which
    // isn't on the CombatContext today. Default fantasy returns the formula
    // base (BASE_AC) so a ruleset that wires this hook into combat.ts gets
    // a consistent floor; the engine bypasses it for player attacks.
    return 10;
  },

  damageReduction(_ctx) {
    // Same shape: equipment-derived DR is computed by the engine; this hook
    // returns the formula floor (0). Wiring DR fully through the hook
    // requires putting equipped armor on the context, scheduled with the
    // ability handler work in Phase D.
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
