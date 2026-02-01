#!/usr/bin/env ts-node
/**
 * EllyMUD Data Format Conversion Tool
 *
 * Convert data files between JSON, YAML, and TOML formats.
 *
 * Usage:
 *   npx ts-node scripts/convert-data.ts <file-or-directory> [options]
 *
 * Options:
 *   --from <format>   Source format (json|yaml|toml) - auto-detected if not specified
 *   --to <format>     Target format (json|yaml|toml) - required
 *   --dry-run         Preview changes without writing files
 *   --output <path>   Output file/directory path (default: replaces extension)
 *   --recursive       Process subdirectories (for directory input)
 *   --help            Show this help message
 *
 * Examples:
 *   npx ts-node scripts/convert-data.ts data/rooms.json --to yaml
 *   npx ts-node scripts/convert-data.ts data/ --from json --to yaml --recursive
 *   npx ts-node scripts/convert-data.ts data/npcs.json --to toml --dry-run
 *   npx ts-node scripts/convert-data.ts config.yaml --to json --output config.json
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import toml from 'toml';

// ============================================================================
// Types
// ============================================================================

type Format = 'json' | 'yaml' | 'toml';

interface Options {
  from?: Format;
  to: Format;
  dryRun: boolean;
  output?: string;
  recursive: boolean;
}

interface ConversionResult {
  sourcePath: string;
  targetPath: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// TOML Stringification
// ============================================================================

/**
 * Convert a JavaScript object to TOML string format.
 * TOML doesn't have a built-in stringify in the 'toml' package,
 * so we implement a basic serializer.
 */
function toTomlString(obj: unknown, indent: string = ''): string {
  if (obj === null || obj === undefined) {
    return '';
  }

  if (typeof obj !== 'object') {
    return formatTomlValue(obj);
  }

  if (Array.isArray(obj)) {
    // Arrays of primitives can be inline
    if (obj.every((item) => typeof item !== 'object' || item === null)) {
      return '[' + obj.map((item) => formatTomlValue(item)).join(', ') + ']';
    }
    // Arrays of objects need [[table.array]] syntax - for simplicity, use inline
    return '[' + obj.map((item) => formatTomlValue(item)).join(', ') + ']';
  }

  const record = obj as Record<string, unknown>;
  const lines: string[] = [];
  const tables: Array<{ key: string; value: Record<string, unknown> }> = [];
  const arrayTables: Array<{ key: string; values: Array<Record<string, unknown>> }> = [];

  // First pass: separate simple values from nested objects
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
      // Array of tables
      arrayTables.push({ key, values: value as Array<Record<string, unknown>> });
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // Nested table
      tables.push({ key, value: value as Record<string, unknown> });
    } else {
      // Simple key-value
      lines.push(`${formatTomlKey(key)} = ${formatTomlValue(value)}`);
    }
  }

  // Add nested tables
  for (const { key, value } of tables) {
    lines.push('');
    lines.push(`[${indent}${formatTomlKey(key)}]`);
    const nested = toTomlString(value, `${indent}${key}.`);
    if (nested) {
      lines.push(nested);
    }
  }

  // Add array tables
  for (const { key, values } of arrayTables) {
    for (const item of values) {
      lines.push('');
      lines.push(`[[${indent}${formatTomlKey(key)}]]`);
      const nested = toTomlString(item, `${indent}${key}.`);
      if (nested) {
        lines.push(nested);
      }
    }
  }

  return lines.join('\n');
}

function formatTomlKey(key: string): string {
  // Keys with special characters need quoting
  if (/^[a-zA-Z0-9_-]+$/.test(key)) {
    return key;
  }
  return `"${key.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function formatTomlValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  if (typeof value === 'string') {
    // Use basic strings for simple text, literal for multiline
    if (value.includes('\n')) {
      return '"""\n' + value + '"""';
    }
    return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return value.toString();
    }
    return value.toString();
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => formatTomlValue(item));
    return '[' + items.join(', ') + ']';
  }

  if (typeof value === 'object') {
    // Inline table
    const record = value as Record<string, unknown>;
    const pairs = Object.entries(record)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${formatTomlKey(k)} = ${formatTomlValue(v)}`);
    return '{ ' + pairs.join(', ') + ' }';
  }

  return String(value);
}

// ============================================================================
// Format Detection and Conversion
// ============================================================================

const EXTENSION_MAP: Record<string, Format> = {
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
};

const FORMAT_EXTENSIONS: Record<Format, string> = {
  json: '.json',
  yaml: '.yaml',
  toml: '.toml',
};

function detectFormat(filePath: string): Format | undefined {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_MAP[ext];
}

function parseFile(filePath: string, format: Format): unknown {
  const content = fs.readFileSync(filePath, 'utf8');

  switch (format) {
    case 'json':
      return JSON.parse(content);
    case 'yaml':
      return yaml.load(content);
    case 'toml':
      return toml.parse(content);
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

function serializeData(data: unknown, format: Format): string {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2);
    case 'yaml':
      return yaml.dump(data, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false,
      });
    case 'toml':
      return toTomlString(data);
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

function getTargetPath(sourcePath: string, targetFormat: Format, outputPath?: string): string {
  if (outputPath) {
    return outputPath;
  }

  const dir = path.dirname(sourcePath);
  const baseName = path.basename(sourcePath, path.extname(sourcePath));
  return path.join(dir, baseName + FORMAT_EXTENSIONS[targetFormat]);
}

// ============================================================================
// File Conversion
// ============================================================================

function convertFile(sourcePath: string, options: Options): ConversionResult {
  const sourceFormat = options.from || detectFormat(sourcePath);

  if (!sourceFormat) {
    return {
      sourcePath,
      targetPath: '',
      success: false,
      error: `Cannot detect format from extension. Use --from to specify.`,
    };
  }

  if (sourceFormat === options.to) {
    return {
      sourcePath,
      targetPath: sourcePath,
      success: false,
      error: `Source and target formats are the same (${sourceFormat}). Nothing to do.`,
    };
  }

  const targetPath = getTargetPath(sourcePath, options.to, options.output);

  try {
    // Parse source file
    const data = parseFile(sourcePath, sourceFormat);

    // Serialize to target format
    const output = serializeData(data, options.to);

    if (options.dryRun) {
      return {
        sourcePath,
        targetPath,
        success: true,
      };
    }

    // Write output file
    fs.writeFileSync(targetPath, output, 'utf8');

    return {
      sourcePath,
      targetPath,
      success: true,
    };
  } catch (err) {
    return {
      sourcePath,
      targetPath,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function convertDirectory(dirPath: string, options: Options): ConversionResult[] {
  const results: ConversionResult[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (options.recursive) {
        results.push(...convertDirectory(fullPath, options));
      }
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    // Only process files matching source format based on extension
    const fileFormat = detectFormat(fullPath);

    // Skip files without a recognized format extension
    if (!fileFormat) {
      continue;
    }

    // If --from is specified, only process files with that format's extension
    if (options.from && fileFormat !== options.from) {
      continue;
    }

    // Skip if source and target formats are the same
    if (fileFormat === options.to) {
      continue;
    }

    // For directory conversion, don't use the global output path
    const result = convertFile(fullPath, { ...options, output: undefined });
    results.push(result);
  }

  return results;
}

// ============================================================================
// CLI
// ============================================================================

function showHelp(): void {
  console.log(`EllyMUD Data Format Conversion Tool

Usage:
  npx ts-node scripts/convert-data.ts <file-or-directory> [options]

Options:
  --from <format>   Source format (json|yaml|toml)
                    Auto-detected from file extension if not specified
  --to <format>     Target format (json|yaml|toml) - REQUIRED
  --dry-run         Preview changes without writing files
  --output <path>   Output file/directory path
                    Default: replaces source extension with target format
  --recursive       Process subdirectories (for directory input)
  --help            Show this help message

Supported Formats:
  json    JavaScript Object Notation (.json)
  yaml    YAML Ain't Markup Language (.yaml, .yml)
  toml    Tom's Obvious Minimal Language (.toml)

Examples:
  # Convert a single JSON file to YAML
  npx ts-node scripts/convert-data.ts data/rooms.json --to yaml

  # Convert all JSON files in a directory to YAML
  npx ts-node scripts/convert-data.ts data/ --from json --to yaml

  # Convert recursively with dry-run preview
  npx ts-node scripts/convert-data.ts data/ --from json --to yaml --recursive --dry-run

  # Convert YAML to TOML with custom output path
  npx ts-node scripts/convert-data.ts config.yaml --to toml --output settings.toml

  # Convert JSON to YAML using npm script
  npm run convert -- data/items.json --to yaml

  # Preview conversion without making changes
  npm run convert:dry-run -- data/npcs.json --to yaml
`);
}

function parseArgs(args: string[]): { inputPath: string; options: Options } | null {
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    showHelp();
    return null;
  }

  let inputPath = '';
  let from: Format | undefined;
  let to: Format | undefined;
  let dryRun = false;
  let output: string | undefined;
  let recursive = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--from' && args[i + 1]) {
      from = args[++i] as Format;
      if (!['json', 'yaml', 'toml'].includes(from)) {
        console.error(`Error: Invalid --from format: ${from}`);
        console.error('Valid formats: json, yaml, toml');
        process.exit(1);
      }
    } else if (arg === '--to' && args[i + 1]) {
      to = args[++i] as Format;
      if (!['json', 'yaml', 'toml'].includes(to)) {
        console.error(`Error: Invalid --to format: ${to}`);
        console.error('Valid formats: json, yaml, toml');
        process.exit(1);
      }
    } else if (arg === '--output' && args[i + 1]) {
      output = args[++i];
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--recursive' || arg === '-r') {
      recursive = true;
    } else if (!arg.startsWith('-')) {
      inputPath = arg;
    }
  }

  if (!inputPath) {
    console.error('Error: No input file or directory specified.');
    showHelp();
    return null;
  }

  if (!to) {
    console.error('Error: --to <format> is required.');
    console.error('Example: npx ts-node scripts/convert-data.ts data.json --to yaml');
    process.exit(1);
  }

  return {
    inputPath,
    options: {
      from,
      to,
      dryRun,
      output,
      recursive,
    },
  };
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));

  if (!parsed) {
    return;
  }

  const { inputPath, options } = parsed;
  const resolvedPath = path.resolve(inputPath);

  console.log('=== EllyMUD Data Format Converter ===\n');

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: Path does not exist: ${resolvedPath}`);
    process.exit(1);
  }

  const stats = fs.statSync(resolvedPath);
  let results: ConversionResult[];

  if (stats.isDirectory()) {
    console.log(`Directory: ${resolvedPath}`);
    console.log(`From: ${options.from || '(auto-detect)'}`);
    console.log(`To: ${options.to}`);
    console.log(`Recursive: ${options.recursive}`);
    if (options.dryRun) {
      console.log('Mode: DRY RUN (no files will be written)\n');
    } else {
      console.log('');
    }

    results = convertDirectory(resolvedPath, options);
  } else {
    console.log(`File: ${resolvedPath}`);
    console.log(`From: ${options.from || detectFormat(resolvedPath) || '(unknown)'}`);
    console.log(`To: ${options.to}`);
    if (options.dryRun) {
      console.log('Mode: DRY RUN (no files will be written)\n');
    } else {
      console.log('');
    }

    results = [convertFile(resolvedPath, options)];
  }

  // Display results
  if (results.length === 0) {
    console.log('No files found to convert.');
    return;
  }

  console.log('Results:\n');

  let successCount = 0;
  let errorCount = 0;

  for (const result of results) {
    if (result.success) {
      successCount++;
      if (options.dryRun) {
        console.log(`  [DRY RUN] ${result.sourcePath}`);
        console.log(`         -> ${result.targetPath}`);
      } else {
        console.log(`  [OK] ${result.sourcePath}`);
        console.log(`    -> ${result.targetPath}`);
      }
    } else {
      errorCount++;
      console.log(`  [ERROR] ${result.sourcePath}`);
      console.log(`          ${result.error}`);
    }
    console.log('');
  }

  // Summary
  console.log('---');
  if (options.dryRun) {
    console.log(`Would convert: ${successCount} file(s)`);
  } else {
    console.log(`Converted: ${successCount} file(s)`);
  }
  if (errorCount > 0) {
    console.log(`Errors: ${errorCount} file(s)`);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
