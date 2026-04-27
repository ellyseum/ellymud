#!/usr/bin/env -S npx ts-node --transpile-only
/**
 * Regenerate the local MCP API key.
 *
 * Generates a new random key, writes it to `.env` (replacing any existing
 * `ELLYMUD_MCP_API_KEY` line), and prints the new value so the user can
 * source the env file into their shell.
 *
 * Usage:
 *   npm run mcp:regen-key
 *   # then in your shell:
 *   set -a; source .env; set +a
 *   # or if using direnv / claudio / similar, restart so it picks up the change
 */

import { randomBytes } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ENV_PATH = join(process.cwd(), '.env');
const KEY_NAME = 'ELLYMUD_MCP_API_KEY';

function generateKey(): string {
  return randomBytes(32).toString('hex');
}

function writeKeyToEnv(key: string): void {
  let content = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf-8') : '';
  const lineRegex = new RegExp(`^${KEY_NAME}=.*$`, 'm');

  if (lineRegex.test(content)) {
    content = content.replace(lineRegex, `${KEY_NAME}=${key}`);
  } else {
    const trailer = content.endsWith('\n') || content === '' ? '' : '\n';
    content += `${trailer}${KEY_NAME}=${key}\n`;
  }

  writeFileSync(ENV_PATH, content, { encoding: 'utf-8', mode: 0o600 });
}

function main(): void {
  const newKey = generateKey();
  writeKeyToEnv(newKey);

  process.stdout.write('\n');
  process.stdout.write(`✅ New ${KEY_NAME} written to .env\n\n`);
  process.stdout.write(`   ${newKey}\n\n`);
  process.stdout.write('Next steps:\n');
  process.stdout.write('  1. Reload the env in your shell:\n');
  process.stdout.write('       set -a; source .env; set +a\n');
  process.stdout.write('  2. Restart the MCP server (so it picks up the new key)\n');
  process.stdout.write(
    '  3. Restart Claude Code (so .claude/mcp.json substitutes the new value)\n\n'
  );
}

main();
