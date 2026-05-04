/*
 * EllyMUD
 * Copyright (C) 2026 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Versioned schema migrations.
 *
 * Distinct from `autoMigrate.ts` (which handles JSON↔DB import/export on
 * backend changes), this module advances the SQL schema across versions.
 * Each migration runs at most once per database, in order, in a transaction.
 *
 * Tracking table: `_schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT)`.
 *
 * @module data/schemaMigrations
 */

import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database as DatabaseSchema } from './schema';
import { STORAGE_BACKEND } from '../config';
import { systemLogger } from '../utils/logger';

export interface SchemaMigration {
  version: number;
  name: string;
  up(db: Kysely<DatabaseSchema>): Promise<void>;
}

/**
 * Migration v1 — add `stats` and `allocated_stats` JSON columns to users,
 * relax NOT NULL on the seven legacy stat columns, and backfill the new
 * columns from existing per-stat values.
 *
 * The legacy stat columns (strength, dexterity, agility, constitution,
 * wisdom, intelligence, charisma) are intentionally NOT dropped here —
 * SQLite portability and rollback safety. A follow-up migration drops
 * them once the JSON path has been live for a release.
 */
const v1: SchemaMigration = {
  version: 1,
  name: 'stats-to-json',
  async up(db) {
    // 1. Add the new JSON columns (nullable). Idempotent via "IF NOT EXISTS"-ish
    //    check in catch — both SQLite and Postgres will throw on re-add.
    await addColumnIfMissing(db, 'users', 'stats', 'text');
    await addColumnIfMissing(db, 'users', 'allocated_stats', 'text');

    // 2. Backfill: for every row, write a stats JSON object built from the
    //    seven legacy columns. allocated_stats stays NULL (current code has
    //    no allocatedStats persistence; populated when users save going forward).
    type LegacyStatRow = {
      username: string;
      strength: number | null;
      dexterity: number | null;
      agility: number | null;
      constitution: number | null;
      wisdom: number | null;
      intelligence: number | null;
      charisma: number | null;
    };

    const rows: LegacyStatRow[] = await db
      .selectFrom('users')
      .select([
        'username',
        'strength',
        'dexterity',
        'agility',
        'constitution',
        'wisdom',
        'intelligence',
        'charisma',
      ])
      .where('stats', 'is', null)
      .execute();

    for (const row of rows) {
      const stats: Record<string, number> = {};
      if (typeof row.strength === 'number') stats.strength = row.strength;
      if (typeof row.dexterity === 'number') stats.dexterity = row.dexterity;
      if (typeof row.agility === 'number') stats.agility = row.agility;
      if (typeof row.constitution === 'number') stats.constitution = row.constitution;
      if (typeof row.wisdom === 'number') stats.wisdom = row.wisdom;
      if (typeof row.intelligence === 'number') stats.intelligence = row.intelligence;
      if (typeof row.charisma === 'number') stats.charisma = row.charisma;
      await db
        .updateTable('users')
        .set({ stats: JSON.stringify(stats) })
        .where('username', '=', row.username)
        .execute();
    }

    // 3. Relax NOT NULL on the seven stat columns so future inserts may omit them.
    //    Postgres supports ALTER COLUMN DROP NOT NULL natively. SQLite does not
    //    support altering nullability — but its NOT NULL is enforced at insert
    //    time only, and our writers will provide values until the cutover commit.
    //    For SQLite, the limit is acceptable: the columns retain NOT NULL but
    //    the new mapper continues writing them with the legacy values until the
    //    follow-up migration drops the columns entirely.
    if (STORAGE_BACKEND === 'postgres') {
      for (const col of [
        'strength',
        'dexterity',
        'agility',
        'constitution',
        'wisdom',
        'intelligence',
        'charisma',
      ]) {
        await sql`ALTER TABLE users ALTER COLUMN ${sql.ref(col)} DROP NOT NULL`.execute(db);
      }
    }
  },
};

/**
 * Ordered migration list. Append new versions to the end; never edit or
 * reorder past entries.
 */
export const SCHEMA_MIGRATIONS: readonly SchemaMigration[] = [v1];

const TRACKING_TABLE = '_schema_migrations';

async function ensureTrackingTable(db: Kysely<DatabaseSchema>): Promise<void> {
  // Use raw SQL — the tracking table isn't part of the typed schema.
  await sql`
    CREATE TABLE IF NOT EXISTS ${sql.ref(TRACKING_TABLE)} (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `.execute(db);
}

async function getAppliedVersions(db: Kysely<DatabaseSchema>): Promise<Set<number>> {
  const rows = await sql<{
    version: number;
  }>`SELECT version FROM ${sql.ref(TRACKING_TABLE)}`.execute(db);
  return new Set(rows.rows.map((r) => Number(r.version)));
}

async function recordVersion(db: Kysely<DatabaseSchema>, version: number): Promise<void> {
  const appliedAt = new Date().toISOString();
  await sql`
    INSERT INTO ${sql.ref(TRACKING_TABLE)} (version, applied_at)
    VALUES (${version}, ${appliedAt})
  `.execute(db);
}

/**
 * Apply all pending migrations in version order. Idempotent: already-applied
 * versions are skipped. Each migration runs in a transaction so a failure
 * mid-migration leaves the schema unchanged.
 */
export async function ensureSchemaUpToDate(db: Kysely<DatabaseSchema>): Promise<void> {
  await ensureTrackingTable(db);
  const applied = await getAppliedVersions(db);

  const pending = SCHEMA_MIGRATIONS.filter((m) => !applied.has(m.version)).sort(
    (a, b) => a.version - b.version
  );

  if (pending.length === 0) {
    return;
  }

  systemLogger.info(
    `[SchemaMigrations] ${pending.length} pending: ${pending.map((m) => `v${m.version} ${m.name}`).join(', ')}`
  );

  for (const m of pending) {
    try {
      await db.transaction().execute(async (trx) => {
        await m.up(trx);
        await recordVersion(trx, m.version);
      });
      systemLogger.info(`[SchemaMigrations] applied v${m.version} ${m.name}`);
    } catch (err) {
      systemLogger.error(`[SchemaMigrations] v${m.version} ${m.name} failed`, { error: err });
      throw err;
    }
  }
}

/**
 * Helper: add a column if it doesn't already exist on the table. Handles
 * the cross-dialect introspection (SQLite uses pragma; Postgres uses
 * information_schema).
 */
async function addColumnIfMissing(
  db: Kysely<DatabaseSchema>,
  table: string,
  column: string,
  type: string
): Promise<void> {
  const exists = await columnExists(db, table, column);
  if (exists) return;
  await sql`ALTER TABLE ${sql.ref(table)} ADD COLUMN ${sql.ref(column)} ${sql.raw(type)}`.execute(
    db
  );
}

async function columnExists(
  db: Kysely<DatabaseSchema>,
  table: string,
  column: string
): Promise<boolean> {
  if (STORAGE_BACKEND === 'postgres') {
    const result = await sql<{
      column_name: string;
    }>`SELECT column_name FROM information_schema.columns WHERE table_name = ${table} AND column_name = ${column}`.execute(
      db
    );
    return result.rows.length > 0;
  }
  // SQLite
  const result = await sql<{
    name: string;
  }>`SELECT name FROM pragma_table_info(${table})`.execute(db);
  return result.rows.some((r) => r.name === column);
}
