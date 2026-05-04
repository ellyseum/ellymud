/*
 * EllyMUD
 * Copyright (C) 2026 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Effect type metadata registry. Each effect kind a ruleset declares
 * registers a metadata bundle here. The engine consults this bundle when
 * adding an effect (default stacking behavior) and when applying tick
 * payloads (custom message templates) so a ruleset can introduce new
 * effect ids without engine code changes.
 *
 * @module ruleset/effectMetadata
 */

import { ActiveEffect, StackingBehavior } from '../types/effects';

export interface EffectMetadata {
  /** Stable id matching the legacy `EffectType` enum value (e.g., 'poison'). */
  id: string;
  /** Default stacking behavior when ability data doesn't override it. */
  defaultStacking: StackingBehavior;
  /**
   * Optional builder for the "you take X damage from <name>" line shown
   * on a tick. Receives the effect instance and the amount applied this
   * tick. Engine falls back to its inline template when undefined.
   */
  tickMessage?: (ctx: { effect: ActiveEffect; amount: number }) => string;
}

export interface EffectMetadataHooks {
  /** Returns metadata for an effect id, or undefined if unregistered. */
  getMetadata(effectTypeId: string): EffectMetadata | undefined;
  /** All registered effect type ids. */
  listEffectTypes(): readonly string[];
}

/** Convenience constructor from a flat map. */
export function createEffectMetadataHooks(
  metadata: Record<string, EffectMetadata>
): EffectMetadataHooks {
  return {
    getMetadata: (id) => metadata[id],
    listEffectTypes: () => Object.keys(metadata),
  };
}
