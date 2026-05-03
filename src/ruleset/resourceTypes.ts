/*
 * EllyMUD
 * Copyright (C) 2025 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Resource pool definitions: types a ruleset uses to declare which resources
 * (mana, rage, energy, ki, holy, nature, or whatever else) exist in its world.
 *
 * Sentinel: a class with no resource uses the literal id `NO_RESOURCE` and
 * never appears in the registered pool list.
 *
 * @module ruleset/resourceTypes
 */

export const NO_RESOURCE = 'none';

/** A single derived-sizing term: `floor(getStat(statId) / 1) * perPoint`. */
export interface DerivedTerm {
  statId: string;
  perPoint: number;
}

/** How max value for the pool is computed. */
export type ResourceSizing =
  | { kind: 'fixed'; value: number }
  | { kind: 'derived'; base: number; terms: DerivedTerm[] };

/**
 * Stat-derived contribution to a regen formula. Each term sums the named
 * stats, floor-divides by `divisor`, then multiplies by `bonus`:
 *   contribution = floor(sum(getStat(user, id)) / divisor) * bonus
 * Multiple terms are themselves summed. The grouped-then-floored shape is
 * required to reproduce e.g. `floor((WIS + INT) / 20)` exactly — separate
 * per-stat floors give different rounding.
 */
export interface RegenStatBonus {
  statIds: string[];
  divisor: number;
  bonus: number;
}

export type ResourceRegen =
  | { kind: 'percent'; perTickPct: number }
  | { kind: 'flat'; perTick: number; statBonuses?: RegenStatBonus[] }
  | {
      kind: 'every_n_ticks';
      ticksPerCharge: number;
      chargesPerInterval: number;
    }
  | { kind: 'none' };

/**
 * Three regen cadences map to the three points in the engine where regen
 * fires today:
 *   - tickRegen — every game tick (ResourceManager.processResourceTick)
 *   - subRegen  — every 3 ticks while fully resting/meditating
 *   - fullRegen — every 12 ticks baseline
 *
 * The cadence and meditation/rest gating live in their respective tickers
 * (timer or resource manager); a pool definition supplies only the per-fire
 * amount math.
 */
export interface RegenSchedule {
  tickRegen?: ResourceRegen;
  subRegen?: ResourceRegen;
  fullRegen?: ResourceRegen;
}

export interface ResourcePoolDefinition {
  id: string;
  displayName: string;
  abbreviation: string;
  sizing: ResourceSizing;
  regen: RegenSchedule;
  decayPerTickOutOfCombat?: number;
  gainOnHitDealt?: number;
  gainOnHitTaken?: number;
  /** Multiplier applied to tickRegen while the player is meditating. */
  meditationMultiplier?: number;
  description?: string;
}
