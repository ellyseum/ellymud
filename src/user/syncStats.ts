/*
 * EllyMUD
 * Copyright (C) 2026 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Helpers for the canonical `User.stats` record.
 *
 * Older user data on disk may carry the seven historical attribute fields
 * (`strength`, `dexterity`, `agility`, `constitution`, `wisdom`,
 * `intelligence`, `charisma`) at the top level instead of under `stats`.
 * `ensureStatsRecord` hydrates the record from those legacy fields when it's
 * absent so consumers can rely on `user.stats` being populated after load.
 *
 * `setStat` and `addToStat` are the canonical write paths for individual stat
 * values; they only touch the record (the flat fields no longer exist on the
 * `User` type).
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
 * Build a stats record from any legacy top-level attribute fields a raw user
 * record might still carry. Returns an empty object if none are present.
 */
function buildStatsFromLegacy(raw: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of LEGACY_FANTASY_IDS) {
    const v = raw[id];
    if (typeof v === 'number' && Number.isFinite(v)) out[id] = v;
  }
  return out;
}

/**
 * Ensure `user.stats` is populated. If the record is missing, build it from
 * any legacy top-level fields the raw record carried into the User object.
 * Also merges in any historical fantasy ids that exist as legacy top-level
 * fields but are missing or non-numeric in an existing partial record so a
 * file with both shapes doesn't lose data on first load. Idempotent.
 */
export function ensureStatsRecord(user: User): void {
  const legacy = buildStatsFromLegacy(user as unknown as Record<string, unknown>);
  if (!user.stats) {
    user.stats = legacy;
    return;
  }
  for (const id of LEGACY_FANTASY_IDS) {
    const current = user.stats[id];
    if (typeof current !== 'number' || !Number.isFinite(current)) {
      const fromLegacy = legacy[id];
      if (typeof fromLegacy === 'number') user.stats[id] = fromLegacy;
    }
  }
}

/**
 * Set a single stat value. The canonical write path; callers should use this
 * instead of mutating `user.stats[id]` directly so behavior stays consistent
 * if the storage layout changes again.
 */
export function setStat(user: User, id: string, value: number): void {
  if (!user.stats) user.stats = {};
  user.stats[id] = value;
}

/**
 * Add a delta to a single stat. Reads the current value through the registry
 * fallback chain so an unknown id (e.g., a stat the active ruleset doesn't
 * declare) still resolves to a sane starting value.
 */
export function addToStat(user: User, id: string, delta: number): void {
  const reg = RulesetRegistry.getInstance();
  const def = reg.getStat(id);
  const current = user.stats?.[id] ?? def?.baseValue ?? 0;
  setStat(user, id, current + delta);
}
