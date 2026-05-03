/*
 * EllyMUD
 * Copyright (C) 2025 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Singleton registry holding the active ruleset's stat schema.
 *
 * Loaded once at server boot (in `server.ts`, before `new GameServer()`).
 * Subsequent code reads stats through the registry instead of hardcoding
 * the fantasy seven.
 *
 * @module ruleset/rulesetRegistry
 */

import { RulesetConfig, StatDefinition } from './types';
import { RESERVED_STAT_IDS } from './reservedStatIds';
import { NO_RESOURCE, ResourcePoolDefinition } from './resourceTypes';

const STAT_ID_PATTERN = /^[a-z][a-z0-9_]*$/;
const VALID_COST_CURVES = new Set(['linear', 'tier-10']);
const DEFAULT_STARTING_ATTRIBUTE_POINTS = 100;

export class RulesetValidationError extends Error {
  constructor(
    message: string,
    public readonly violations: string[]
  ) {
    super(message);
    this.name = 'RulesetValidationError';
  }
}

export class RulesetRegistry {
  private static instance: RulesetRegistry | null = null;
  private stats: StatDefinition[] = [];
  private statById = new Map<string, StatDefinition>();
  private startingAttributePoints = DEFAULT_STARTING_ATTRIBUTE_POINTS;
  private resourcePools: ResourcePoolDefinition[] = [];
  private resourcePoolById = new Map<string, ResourcePoolDefinition>();
  private loaded = false;

  private constructor() {}

  static getInstance(): RulesetRegistry {
    if (!this.instance) {
      this.instance = new RulesetRegistry();
    }
    return this.instance;
  }

  /** Test helper. Not intended for production use. */
  static resetForTesting(): void {
    this.instance = null;
  }

  loadConfig(config: RulesetConfig): void {
    const violations = this.validate(config);
    if (violations.length > 0) {
      throw new RulesetValidationError(
        `Ruleset validation failed:\n  - ${violations.join('\n  - ')}`,
        violations
      );
    }
    this.stats = [...config.stats];
    this.statById = new Map(this.stats.map((s) => [s.id, s]));
    this.startingAttributePoints =
      config.startingAttributePoints ?? DEFAULT_STARTING_ATTRIBUTE_POINTS;
    this.resourcePools = [...(config.resourcePools ?? [])];
    this.resourcePoolById = new Map(this.resourcePools.map((p) => [p.id, p]));
    this.loaded = true;
  }

  getResourcePools(): readonly ResourcePoolDefinition[] {
    return this.resourcePools;
  }

  getResourcePool(id: string): ResourcePoolDefinition | undefined {
    return this.resourcePoolById.get(id);
  }

  hasResourcePool(id: string): boolean {
    return id === NO_RESOURCE || this.resourcePoolById.has(id);
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  getStats(): readonly StatDefinition[] {
    return this.stats;
  }

  getStatIds(): string[] {
    return this.stats.map((s) => s.id);
  }

  getStat(id: string): StatDefinition | undefined {
    return this.statById.get(id);
  }

  getStartingAttributePoints(): number {
    return this.startingAttributePoints;
  }

  private validate(config: RulesetConfig): string[] {
    const violations: string[] = [];

    if (!Array.isArray(config.stats) || config.stats.length === 0) {
      violations.push('config.stats must be a non-empty array');
      return violations;
    }

    const seen = new Set<string>();
    for (const def of config.stats) {
      const idLabel = typeof def.id === 'string' ? def.id : String(def.id);
      const idValid = typeof def.id === 'string' && STAT_ID_PATTERN.test(def.id);
      if (!idValid) {
        violations.push(`stat id "${idLabel}" must match /^[a-z][a-z0-9_]*$/`);
      }
      if (idValid && RESERVED_STAT_IDS.has(def.id)) {
        violations.push(`stat id "${def.id}" is reserved (collides with a User field)`);
      }
      if (idValid) {
        if (seen.has(def.id)) {
          violations.push(`duplicate stat id "${def.id}"`);
        }
        seen.add(def.id);
      }
      if (typeof def.baseValue !== 'number' || !Number.isFinite(def.baseValue)) {
        violations.push(`stat "${idLabel}" baseValue must be a finite number`);
      }
      if (typeof def.displayName !== 'string' || def.displayName.length === 0) {
        violations.push(`stat "${idLabel}" displayName must be a non-empty string`);
      }
      if (typeof def.abbreviation !== 'string' || def.abbreviation.length === 0) {
        violations.push(`stat "${idLabel}" abbreviation must be a non-empty string`);
      }
      if (def.costCurve !== undefined && !VALID_COST_CURVES.has(def.costCurve)) {
        violations.push(
          `stat "${idLabel}" costCurve must be 'linear' or 'tier-10' (got "${def.costCurve}")`
        );
      }
    }

    if (config.startingAttributePoints !== undefined) {
      if (
        typeof config.startingAttributePoints !== 'number' ||
        !Number.isFinite(config.startingAttributePoints) ||
        config.startingAttributePoints < 0
      ) {
        violations.push('startingAttributePoints must be a non-negative finite number');
      }
    }

    if (config.resourcePools) {
      const poolIds = new Set<string>();
      for (const pool of config.resourcePools) {
        if (typeof pool.id !== 'string' || !STAT_ID_PATTERN.test(pool.id)) {
          violations.push(`resource pool id "${String(pool.id)}" must match /^[a-z][a-z0-9_]*$/`);
          continue;
        }
        if (pool.id === NO_RESOURCE) {
          violations.push(
            `resource pool id "${NO_RESOURCE}" is reserved as the no-resource sentinel`
          );
        }
        if (poolIds.has(pool.id)) {
          violations.push(`duplicate resource pool id "${pool.id}"`);
        }
        poolIds.add(pool.id);
        if (typeof pool.displayName !== 'string' || pool.displayName.length === 0) {
          violations.push(`resource pool "${pool.id}" displayName must be a non-empty string`);
        }
        if (typeof pool.abbreviation !== 'string' || pool.abbreviation.length === 0) {
          violations.push(`resource pool "${pool.id}" abbreviation must be a non-empty string`);
        }
        validatePoolSizing(pool, violations);
        validatePoolRegen(pool, violations);
      }
    }

    return violations;
  }
}

function validatePoolSizing(pool: ResourcePoolDefinition, violations: string[]): void {
  const s = pool.sizing as { kind?: unknown };
  if (!s || (s.kind !== 'fixed' && s.kind !== 'derived')) {
    violations.push(`resource pool "${pool.id}" sizing.kind must be 'fixed' or 'derived'`);
    return;
  }
  if (s.kind === 'fixed') {
    if (typeof (s as { value?: unknown }).value !== 'number') {
      violations.push(`resource pool "${pool.id}" fixed sizing requires a numeric value`);
    }
  } else {
    const ds = s as { base?: unknown; terms?: unknown };
    if (typeof ds.base !== 'number') {
      violations.push(`resource pool "${pool.id}" derived sizing requires a numeric base`);
    }
    if (!Array.isArray(ds.terms) || ds.terms.length === 0) {
      violations.push(`resource pool "${pool.id}" derived sizing requires a non-empty terms array`);
    }
  }
}

function validatePoolRegen(pool: ResourcePoolDefinition, violations: string[]): void {
  const ALLOWED_KINDS = new Set(['percent', 'flat', 'every_n_ticks', 'none']);
  for (const cadence of ['tickRegen', 'subRegen', 'fullRegen'] as const) {
    const rule = pool.regen[cadence] as { kind?: string } | undefined;
    if (!rule) continue;
    if (typeof rule.kind !== 'string' || !ALLOWED_KINDS.has(rule.kind)) {
      violations.push(
        `resource pool "${pool.id}" ${cadence}.kind must be one of ${[...ALLOWED_KINDS].join(', ')}`
      );
    }
  }
}
