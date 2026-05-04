#!/usr/bin/env node
/*
 * EllyMUD
 * Copyright (C) 2026 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * `ellymud` CLI binary. Thin wrapper over the engine entry point: sets
 * env vars when needed, then `require()`s the compiled server. Other
 * subcommands operate without booting the engine (listing plugins,
 * scaffolding a new ruleset folder).
 *
 * @module bin/ellymud
 */

import path from 'path';
import { parseArgv, CliArgError } from '../cli/argv';
import { scaffoldRuleset } from '../cli/scaffoldRuleset';

function printHelp(): void {
  process.stdout.write(`ellymud — Multi-User Dungeon engine

Usage:
  ellymud start [--ruleset <id>]    Start the server with the given ruleset.
                                     Defaults to the first registered plugin (fantasy).
  ellymud list-rulesets              List installed ruleset plugins.
  ellymud init <id>                  Scaffold a new ruleset folder under
                                     src/rulesets/<id>/ from the grimdark template.
  ellymud help                       Show this message.

Environment:
  RULESET_ID    Selects the active ruleset (overridden by --ruleset).
`);
}

async function main(): Promise<void> {
  let parsed;
  try {
    parsed = parseArgv(process.argv.slice(2));
  } catch (err) {
    if (err instanceof CliArgError) {
      process.stderr.write(`error: ${err.message}\n\n`);
      printHelp();
      process.exit(2);
    }
    throw err;
  }

  if (parsed.command === 'help') {
    printHelp();
    return;
  }

  if (parsed.command === 'list-rulesets') {
    const { listRulesetPlugins } = await import('../ruleset/pluginLoader');
    const plugins = listRulesetPlugins();
    for (const p of plugins) {
      process.stdout.write(`${p.id.padEnd(16)} ${p.name}\n`);
      if (p.description) process.stdout.write(`${' '.repeat(16)} ${p.description}\n`);
    }
    return;
  }

  if (parsed.command === 'init') {
    const repoRoot = process.cwd();
    try {
      const result = scaffoldRuleset(repoRoot, parsed.newRulesetId);
      process.stdout.write(`Created ${parsed.newRulesetId} ruleset at ${result.folder}\n`);
      for (const f of result.filesCreated) {
        process.stdout.write(`  ${path.relative(repoRoot, f)}\n`);
      }
      if (result.barrelUpdated) {
        process.stdout.write(`Registered in src/rulesets/index.ts\n`);
      }
      process.stdout.write(
        `\nNext steps:\n` +
          `  1. Edit src/rulesets/${parsed.newRulesetId}/config.ts to change stat names, pool tuning, etc.\n` +
          `  2. Run \`RULESET_ID=${parsed.newRulesetId} npm test\` to validate against the engine.\n`
      );
    } catch (err) {
      process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exit(1);
    }
    return;
  }

  // command === 'start'
  if (parsed.rulesetId) {
    process.env.RULESET_ID = parsed.rulesetId;
  }
  // Boot the engine. The compiled output lives at dist/server.js when the
  // package is installed; in the source tree, ts-node-dev or `npm run dev`
  // is the conventional entry, so this branch primarily serves the
  // post-build / installed-binary use case.
  await import('../server');
}

main().catch((err) => {
  process.stderr.write(
    `fatal: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`
  );
  process.exit(1);
});
