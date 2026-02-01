/**
 * Universal data loader with multi-format support (TOML, YAML, JSON)
 *
 * This module provides a unified interface for loading data files
 * in various formats. Format is determined by file extension.
 *
 * @module data/dataLoader
 */

import * as fs from 'fs';
import * as path from 'path';
import YAML from 'js-yaml';
import TOML from 'toml';
import { createContextLogger } from '../utils/logger';

const logger = createContextLogger('dataLoader');

/**
 * Supported file extensions for data loading
 */
export type DataFileExtension = '.toml' | '.yaml' | '.yml' | '.json';

/**
 * Load a data file from the filesystem
 * Format is determined by file extension
 *
 * @param filePath - Absolute or relative path to the data file
 * @returns Parsed data from the file
 * @throws Error if file doesn't exist, format is unsupported, or parsing fails
 */
export async function loadDataFile<T>(filePath: string): Promise<T> {
  const ext = path.extname(filePath).toLowerCase() as DataFileExtension;
  const content = await fs.promises.readFile(filePath, 'utf-8');

  switch (ext) {
    case '.toml':
      return parseToml<T>(content, filePath);
    case '.yaml':
    case '.yml':
      return parseYaml<T>(content, filePath);
    case '.json':
      return parseJson<T>(content, filePath);
    default:
      throw new Error(`Unsupported file format: ${ext} (file: ${filePath})`);
  }
}

/**
 * Synchronous version of loadDataFile
 * Use when async is not possible (e.g., in constructors)
 */
export function loadDataFileSync<T>(filePath: string): T {
  const ext = path.extname(filePath).toLowerCase() as DataFileExtension;
  const content = fs.readFileSync(filePath, 'utf-8');

  switch (ext) {
    case '.toml':
      return parseToml<T>(content, filePath);
    case '.yaml':
    case '.yml':
      return parseYaml<T>(content, filePath);
    case '.json':
      return parseJson<T>(content, filePath);
    default:
      throw new Error(`Unsupported file format: ${ext} (file: ${filePath})`);
  }
}

/**
 * Find a data file with any supported extension
 * Searches for files in order: .toml, .yaml, .yml, .json
 *
 * @param basePath - Path without extension (e.g., 'data/quests/tutorial')
 * @returns Full path to the found file, or null if none exists
 */
export async function findDataFile(basePath: string): Promise<string | null> {
  const extensions: DataFileExtension[] = ['.toml', '.yaml', '.yml', '.json'];

  for (const ext of extensions) {
    const fullPath = basePath + ext;
    try {
      await fs.promises.access(fullPath, fs.constants.F_OK);
      return fullPath;
    } catch {
      // File doesn't exist, try next extension
    }
  }

  return null;
}

/**
 * Synchronous version of findDataFile
 */
export function findDataFileSync(basePath: string): string | null {
  const extensions: DataFileExtension[] = ['.toml', '.yaml', '.yml', '.json'];

  for (const ext of extensions) {
    const fullPath = basePath + ext;
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

/**
 * Load all data files from a directory
 * Supports mixed formats - each file can be TOML, YAML, or JSON
 *
 * @param dirPath - Path to directory containing data files
 * @param pattern - Optional glob pattern for filtering (default: all supported formats)
 * @returns Array of parsed data objects with their source file paths
 */
export async function loadDataDirectory<T>(
  dirPath: string
): Promise<Array<{ data: T; filePath: string }>> {
  const results: Array<{ data: T; filePath: string }> = [];
  const extensions = new Set(['.toml', '.yaml', '.yml', '.json']);

  if (!fs.existsSync(dirPath)) {
    logger.warn(`Data directory not found: ${dirPath}`);
    return results;
  }

  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (!extensions.has(ext)) continue;

    const filePath = path.join(dirPath, entry.name);
    try {
      const data = await loadDataFile<T>(filePath);
      results.push({ data, filePath });
    } catch (error) {
      logger.error(`Failed to load data file: ${filePath}`, error);
      // Continue loading other files
    }
  }

  return results;
}

/**
 * Write data to a file in the specified format
 * Format is determined by file extension
 *
 * @param filePath - Path to write to
 * @param data - Data to serialize
 */
export async function writeDataFile<T>(filePath: string, data: T): Promise<void> {
  const ext = path.extname(filePath).toLowerCase() as DataFileExtension;
  let content: string;

  switch (ext) {
    case '.toml':
      // Note: toml package doesn't support serialization
      // For write operations, recommend using JSON or YAML
      throw new Error('TOML write is not supported. Use JSON or YAML for write operations.');
    case '.yaml':
    case '.yml':
      content = YAML.dump(data, { indent: 2, lineWidth: 120 });
      break;
    case '.json':
      content = JSON.stringify(data, null, 2);
      break;
    default:
      throw new Error(`Unsupported file format for writing: ${ext}`);
  }

  // Ensure directory exists
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });

  await fs.promises.writeFile(filePath, content, 'utf-8');
}

/**
 * Synchronous version of writeDataFile
 */
export function writeDataFileSync<T>(filePath: string, data: T): void {
  const ext = path.extname(filePath).toLowerCase() as DataFileExtension;
  let content: string;

  switch (ext) {
    case '.toml':
      throw new Error('TOML write is not supported. Use JSON or YAML for write operations.');
    case '.yaml':
    case '.yml':
      content = YAML.dump(data, { indent: 2, lineWidth: 120 });
      break;
    case '.json':
      content = JSON.stringify(data, null, 2);
      break;
    default:
      throw new Error(`Unsupported file format for writing: ${ext}`);
  }

  // Ensure directory exists
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(filePath, content, 'utf-8');
}

// Private helper functions

function parseToml<T>(content: string, filePath: string): T {
  try {
    return TOML.parse(content) as T;
  } catch (error) {
    const parseError = error as Error & { line?: number; column?: number };
    const location = parseError.line ? ` at line ${parseError.line}` : '';
    throw new Error(`Failed to parse TOML file${location}: ${filePath}\n${parseError.message}`);
  }
}

function parseYaml<T>(content: string, filePath: string): T {
  try {
    return YAML.load(content) as T;
  } catch (error) {
    const yamlError = error as Error & { mark?: { line?: number } };
    const location = yamlError.mark?.line ? ` at line ${yamlError.mark.line}` : '';
    throw new Error(`Failed to parse YAML file${location}: ${filePath}\n${yamlError.message}`);
  }
}

function parseJson<T>(content: string, filePath: string): T {
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    const jsonError = error as Error;
    throw new Error(`Failed to parse JSON file: ${filePath}\n${jsonError.message}`);
  }
}
