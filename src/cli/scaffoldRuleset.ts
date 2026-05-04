/*
 * EllyMUD
 * Copyright (C) 2026 ellyseum
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Commercial licensing available via https://github.com/ellyseum
 */

/**
 * Scaffold a new ruleset folder under `src/rulesets/<id>/`. Copies
 * grimdark as the template (it composes from fantasy hooks rather than
 * reimplementing them, so the diff is small) and substitutes the
 * caller-supplied id everywhere it appears in display strings.
 *
 * Refuses to overwrite an existing folder. Adds the new plugin to the
 * `builtInRulesets` barrel as the only modification outside the new
 * folder.
 *
 * @module cli/scaffoldRuleset
 */

import fs from 'fs';
import path from 'path';

const TEMPLATE_ID = 'grimdark';

export interface ScaffoldResult {
  folder: string;
  filesCreated: string[];
  barrelUpdated: boolean;
}

/**
 * Substitute all occurrences of the template id with the new id, in
 * both lowercase (file content references) and capitalized (display
 * strings) forms. Comparisons are word-boundary-aware via simple
 * string matching since the template uses the id consistently.
 */
function substituteId(content: string, newId: string): string {
  const newCap = newId.charAt(0).toUpperCase() + newId.slice(1);
  return content.replace(/grimdark/g, newId).replace(/Grimdark/g, newCap);
}

/**
 * Scaffold a new ruleset folder. `repoRoot` is the project root; the
 * function paths everything relative to that so it's testable without
 * a real repo layout.
 */
export function scaffoldRuleset(repoRoot: string, newId: string): ScaffoldResult {
  if (!/^[a-z][a-z0-9_]*$/.test(newId)) {
    throw new Error(`Invalid ruleset id "${newId}" — must match /^[a-z][a-z0-9_]*$/.`);
  }

  const targetFolder = path.join(repoRoot, 'src', 'rulesets', newId);
  if (fs.existsSync(targetFolder)) {
    throw new Error(
      `Ruleset folder already exists: ${targetFolder}. Pick a different id or remove the folder first.`
    );
  }

  const templateFolder = path.join(repoRoot, 'src', 'rulesets', TEMPLATE_ID);
  if (!fs.existsSync(templateFolder)) {
    throw new Error(
      `Template folder missing: ${templateFolder}. Has the grimdark plugin been removed?`
    );
  }

  fs.mkdirSync(targetFolder, { recursive: true });
  const templateFiles = fs
    .readdirSync(templateFolder)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));

  const filesCreated: string[] = [];
  for (const file of templateFiles) {
    const src = path.join(templateFolder, file);
    const dst = path.join(targetFolder, file);
    const content = fs.readFileSync(src, 'utf8');
    fs.writeFileSync(dst, substituteId(content, newId));
    filesCreated.push(dst);
  }

  // Wire the new plugin into the built-in barrel so `loadActiveRuleset(newId)`
  // works without a manual edit.
  const barrelPath = path.join(repoRoot, 'src', 'rulesets', 'index.ts');
  const barrelUpdated = appendToBarrel(barrelPath, newId);

  return { folder: targetFolder, filesCreated, barrelUpdated };
}

function appendToBarrel(barrelPath: string, newId: string): boolean {
  if (!fs.existsSync(barrelPath)) return false;
  const content = fs.readFileSync(barrelPath, 'utf8');
  if (content.includes(`from './${newId}'`)) return false;

  const newCap = newId.charAt(0).toUpperCase() + newId.slice(1);
  const importLine = `import ${newId}Plugin from './${newId}';`;

  // Insert the new import after the last existing `import ... from './<id>';`
  // line and append the plugin to the array literal.
  const importMatch = content.match(/(import\s+\w+Plugin\s+from\s+'\.\/[^']+';\s*\n)+/);
  if (!importMatch) return false;
  const lastImportEnd = importMatch.index! + importMatch[0].length;

  const arrayMatch = content.match(
    /builtInRulesets:\s*readonly\s+RulesetPlugin\[\]\s*=\s*\[([^\]]*)\]/
  );
  if (!arrayMatch) return false;

  const updated =
    content.slice(0, lastImportEnd) +
    importLine +
    '\n' +
    content
      .slice(lastImportEnd)
      .replace(
        /builtInRulesets:\s*readonly\s+RulesetPlugin\[\]\s*=\s*\[([^\]]*)\]/,
        (full, body) => {
          const trimmed = body.trim();
          const newBody = trimmed ? `${trimmed}, ${newId}Plugin` : `${newId}Plugin`;
          return `builtInRulesets: readonly RulesetPlugin[] = [${newBody}]`;
        }
      );

  fs.writeFileSync(barrelPath, updated);
  // newCap is unused but kept as a future hook for richer scaffolding
  // (e.g., generating a README per plugin); silence the lint without
  // a code change in another file.
  void newCap;
  return true;
}
