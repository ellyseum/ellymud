/*
 * EllyMUD
 * Copyright (C) 2025 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * During the engine refactor, the User type carries both flat per-stat fields
 * (`user.strength`, ...) and a `stats: Record<string, number>` record. These
 * helpers keep the two representations in sync so getStat() always sees the
 * latest value and the persistence layer continues to round-trip both shapes.
 *
 * The flat fields will be removed in a follow-up phase. Once that lands, this
 * module can be deleted.
 *
 * @module user/syncStats
 */

import { User } from '../types';
import { RulesetRegistry } from '../ruleset/rulesetRegistry';

const LEGACY_FANTASY_IDS = [
  'strength',
  'dexterity',
  'agility',
  'constitution',
  'wisdom',
  'intelligence',
  'charisma',
] as const;

/**
 * Build the stats record from the User's current flat fields. Used at user
 * creation and on read paths that don't populate stats themselves.
 */
export function buildStatsFromFlat(user: User): Record<string, number> {
  return {
    strength: user.strength,
    dexterity: user.dexterity,
    agility: user.agility,
    constitution: user.constitution,
    wisdom: user.wisdom,
    intelligence: user.intelligence,
    charisma: user.charisma,
  };
}

/**
 * Ensure `user.stats` is populated. Idempotent. If already present, prefer
 * its values and propagate to flat fields (so a mapper-loaded user with stats
 * record but stale flat fields gets updated).
 */
export function ensureStatsRecord(user: User): void {
  if (!user.stats) {
    user.stats = buildStatsFromFlat(user);
    return;
  }
  // Backfill any legacy stat ids that weren't in the record (defensive).
  for (const id of LEGACY_FANTASY_IDS) {
    if (typeof user.stats[id] !== 'number' || !Number.isFinite(user.stats[id])) {
      user.stats[id] = (user as unknown as Record<string, number>)[id];
    }
  }
  // Push record values back onto the flat fields so getStat fallback agrees
  // with direct property reads.
  for (const id of LEGACY_FANTASY_IDS) {
    (user as unknown as Record<string, number>)[id] = user.stats[id];
  }
}

/**
 * Set a single stat. Updates both the record and the legacy flat field.
 * Use this in place of `user.strength = value` going forward.
 */
export function setStat(user: User, id: string, value: number): void {
  if (!user.stats) user.stats = buildStatsFromFlat(user);
  user.stats[id] = value;
  if ((LEGACY_FANTASY_IDS as readonly string[]).includes(id)) {
    (user as unknown as Record<string, number>)[id] = value;
  }
}

/**
 * Add a delta to a single stat. Updates both the record and the legacy flat field.
 */
export function addToStat(user: User, id: string, delta: number): void {
  const reg = RulesetRegistry.getInstance();
  const def = reg.getStat(id);
  const current =
    user.stats?.[id] ?? (user as unknown as Record<string, number>)[id] ?? def?.baseValue ?? 0;
  setStat(user, id, current + delta);
}
