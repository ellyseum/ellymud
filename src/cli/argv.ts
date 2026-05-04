/*
 * EllyMUD
 * Copyright (C) 2026 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Tiny argv parser for the `ellymud` CLI. The CLI surface is small
 * enough — three subcommands and a handful of flags — that bringing in
 * yargs/commander would add more dependency risk than the parser saves
 * in code.
 *
 * @module cli/argv
 */

export type ParsedArgs =
  | { command: 'start'; rulesetId?: string }
  | { command: 'list-rulesets' }
  | { command: 'init'; newRulesetId: string }
  | { command: 'help' };

export class CliArgError extends Error {}

const KNOWN_COMMANDS = new Set(['start', 'list-rulesets', 'init', 'help']);

export function parseArgv(args: readonly string[]): ParsedArgs {
  if (args.length === 0) return { command: 'help' };
  const command = args[0];
  if (!KNOWN_COMMANDS.has(command)) {
    throw new CliArgError(`Unknown command: ${command}`);
  }
  const rest = args.slice(1);

  if (command === 'help') return { command: 'help' };
  if (command === 'list-rulesets') return { command: 'list-rulesets' };

  if (command === 'start') {
    const rulesetId = readFlag(rest, '--ruleset');
    return { command: 'start', rulesetId };
  }

  // command === 'init'
  const positional = rest.find((a) => !a.startsWith('--'));
  if (!positional) {
    throw new CliArgError('init requires a ruleset id (e.g. `ellymud init cyberpunk`)');
  }
  return { command: 'init', newRulesetId: positional };
}

/**
 * Read a flag value supporting both `--flag value` and `--flag=value`
 * forms. Returns undefined when the flag is absent.
 */
function readFlag(args: readonly string[], flag: string): string | undefined {
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === flag) return args[i + 1];
    if (a.startsWith(`${flag}=`)) return a.slice(flag.length + 1);
  }
  return undefined;
}
