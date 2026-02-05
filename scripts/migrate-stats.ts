#!/usr/bin/env ts-node
/**
 * EllyMUD Stat System Migration Tool
 *
 * Migrates existing characters to the new stat and resource system:
 * - Recalculates maxHealth using new formula: 20 + (CON * 2) + (Level * 5) + ClassBonus + RacialBonus
 * - Sets health to maxHealth (full heal on migration)
 * - Initializes resource based on class resourceType
 * - Optionally applies racial stat modifiers
 *
 * Usage:
 *   npx ts-node scripts/migrate-stats.ts [options]
 *
 * Options:
 *   --dry-run       Show what would be changed without saving
 *   --apply-racial  Apply racial stat modifiers (only if not already applied)
 *   --force         Overwrite without confirmation
 *   --verbose       Show detailed output for each character
 *
 * Examples:
 *   npx ts-node scripts/migrate-stats.ts --dry-run
 *   npx ts-node scripts/migrate-stats.ts --apply-racial
 *   npx ts-node scripts/migrate-stats.ts --verbose
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Path setup
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RACES_FILE = path.join(DATA_DIR, 'races.json');
const CLASSES_FILE = path.join(DATA_DIR, 'classes.json');

// Import types (we can't use TypeScript imports directly with ts-node for type-only imports)
interface StatModifiers {
  strength?: number;
  dexterity?: number;
  agility?: number;
  constitution?: number;
  wisdom?: number;
  intelligence?: number;
  charisma?: number;
}

interface Race {
  id: string;
  name: string;
  statModifiers: StatModifiers;
  hpBonus?: number;
  dodgeBonus?: number;
}

interface CharacterClass {
  id: string;
  name: string;
  tier: number;
  resourceType?: string;
  hpBonus?: number;
  classStatBonuses?: StatModifiers;
}

interface User {
  username: string;
  raceId?: string;
  classId?: string;
  level: number;
  health: number;
  maxHealth: number;
  mana?: number;
  maxMana?: number;
  resource?: number;
  maxResource?: number;
  strength: number;
  dexterity: number;
  agility: number;
  constitution: number;
  wisdom: number;
  intelligence: number;
  charisma: number;
  racialModifiersApplied?: boolean;
}

// Users data can be either an array or an object with users property
type UsersData = User[] | { users: User[] };

interface RacesData {
  races: Race[];
}

interface ClassesData {
  classes: CharacterClass[];
}

// ============================================================================
// Configuration
// ============================================================================

const BASE_HP = 20;
const HP_PER_CON = 2;
const HP_PER_LEVEL = 5;

const RESOURCE_CONFIGS: Record<string, { maxFixed?: number; formula?: 'mana' | 'ki' | 'nature' }> = {
  none: { maxFixed: 0 },
  mana: { formula: 'mana' },
  rage: { maxFixed: 100 },
  energy: { maxFixed: 100 },
  ki: { formula: 'ki' },
  holy: { maxFixed: 5 },
  nature: { formula: 'nature' },
};

// ============================================================================
// Formula Calculations
// ============================================================================

function calculateMaxHP(user: User, classData: CharacterClass | undefined, raceData: Race | undefined): number {
  const con = user.constitution;
  const level = user.level;
  const classBonus = classData?.hpBonus ?? 0;
  const racialBonus = raceData?.hpBonus ?? 0;

  return BASE_HP + (con * HP_PER_CON) + (level * HP_PER_LEVEL) + classBonus + racialBonus;
}

function calculateMaxMana(int: number, wis: number): number {
  return 20 + (int * 3) + (wis * 2);
}

function calculateMaxKi(wis: number): number {
  return 50 + (wis * 2);
}

function calculateMaxNature(wis: number): number {
  return 30 + (wis * 2);
}

function calculateMaxResource(user: User, classData: CharacterClass | undefined): number {
  const resourceType = classData?.resourceType ?? 'none';
  const config = RESOURCE_CONFIGS[resourceType];

  if (!config) return 0;
  if (config.maxFixed !== undefined) return config.maxFixed;

  switch (config.formula) {
    case 'mana':
      return calculateMaxMana(user.intelligence, user.wisdom);
    case 'ki':
      return calculateMaxKi(user.wisdom);
    case 'nature':
      return calculateMaxNature(user.wisdom);
    default:
      return 0;
  }
}

function applyRacialModifiers(user: User, raceData: Race): void {
  const mods = raceData.statModifiers;
  user.strength += mods.strength ?? 0;
  user.dexterity += mods.dexterity ?? 0;
  user.agility += mods.agility ?? 0;
  user.constitution += mods.constitution ?? 0;
  user.wisdom += mods.wisdom ?? 0;
  user.intelligence += mods.intelligence ?? 0;
  user.charisma += mods.charisma ?? 0;
  user.racialModifiersApplied = true;
}

// ============================================================================
// Data Loading
// ============================================================================

function loadJson<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function saveJson<T>(filePath: string, data: T): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

// ============================================================================
// Migration Logic
// ============================================================================

interface MigrationResult {
  username: string;
  changes: string[];
  oldValues: Record<string, number | boolean | undefined>;
  newValues: Record<string, number | boolean | undefined>;
}

function migrateUser(
  user: User,
  races: Map<string, Race>,
  classes: Map<string, CharacterClass>,
  options: { applyRacial: boolean; verbose: boolean }
): MigrationResult {
  const result: MigrationResult = {
    username: user.username,
    changes: [],
    oldValues: {},
    newValues: {},
  };

  const raceData = races.get(user.raceId ?? 'human');
  const classData = classes.get(user.classId ?? 'adventurer');

  // Apply racial modifiers if requested and not already applied
  if (options.applyRacial && raceData && !user.racialModifiersApplied) {
    result.oldValues.strength = user.strength;
    result.oldValues.dexterity = user.dexterity;
    result.oldValues.agility = user.agility;
    result.oldValues.constitution = user.constitution;
    result.oldValues.wisdom = user.wisdom;
    result.oldValues.intelligence = user.intelligence;
    result.oldValues.charisma = user.charisma;

    applyRacialModifiers(user, raceData);

    result.newValues.strength = user.strength;
    result.newValues.dexterity = user.dexterity;
    result.newValues.agility = user.agility;
    result.newValues.constitution = user.constitution;
    result.newValues.wisdom = user.wisdom;
    result.newValues.intelligence = user.intelligence;
    result.newValues.charisma = user.charisma;
    result.changes.push('Applied racial stat modifiers');
  }

  // Recalculate max HP
  const oldMaxHealth = user.maxHealth;
  const newMaxHealth = calculateMaxHP(user, classData, raceData);

  if (oldMaxHealth !== newMaxHealth) {
    result.oldValues.maxHealth = oldMaxHealth;
    result.newValues.maxHealth = newMaxHealth;
    result.changes.push(`maxHealth: ${oldMaxHealth} → ${newMaxHealth}`);
    user.maxHealth = newMaxHealth;
  }

  // Set health to max (full heal on migration)
  const oldHealth = user.health;
  if (user.health !== user.maxHealth) {
    result.oldValues.health = oldHealth;
    result.newValues.health = user.maxHealth;
    result.changes.push(`health: ${oldHealth} → ${user.maxHealth} (full heal)`);
    user.health = user.maxHealth;
  }

  // Calculate and set resource
  const resourceType = classData?.resourceType ?? 'none';
  const maxResource = calculateMaxResource(user, classData);

  if (resourceType === 'mana') {
    const oldMaxMana = user.maxMana ?? 0;
    const oldMana = user.mana ?? 0;
    if (oldMaxMana !== maxResource || oldMana !== maxResource) {
      result.oldValues.maxMana = oldMaxMana;
      result.oldValues.mana = oldMana;
      result.newValues.maxMana = maxResource;
      result.newValues.mana = maxResource;
      result.changes.push(`mana: ${oldMana}/${oldMaxMana} → ${maxResource}/${maxResource}`);
      user.maxMana = maxResource;
      user.mana = maxResource;
    }
  } else if (resourceType !== 'none') {
    const oldMaxResource = user.maxResource ?? 0;
    const oldResource = user.resource ?? 0;
    if (oldMaxResource !== maxResource || oldResource !== maxResource) {
      result.oldValues.maxResource = oldMaxResource;
      result.oldValues.resource = oldResource;
      result.newValues.maxResource = maxResource;
      result.newValues.resource = maxResource;
      result.changes.push(`${resourceType}: ${oldResource}/${oldMaxResource} → ${maxResource}/${maxResource}`);
      user.maxResource = maxResource;
      user.resource = maxResource;
    }
  }

  return result;
}

// ============================================================================
// CLI Interface
// ============================================================================

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const options = {
    dryRun: args.includes('--dry-run'),
    applyRacial: args.includes('--apply-racial'),
    force: args.includes('--force'),
    verbose: args.includes('--verbose'),
  };

  console.log('EllyMUD Stat System Migration');
  console.log('=============================');
  console.log(`Dry run: ${options.dryRun}`);
  console.log(`Apply racial modifiers: ${options.applyRacial}`);
  console.log('');

  // Load data
  console.log('Loading data...');

  let users: User[];
  let racesData: RacesData;
  let classesData: ClassesData;

  try {
    const usersRaw = loadJson<UsersData>(USERS_FILE);
    // Handle both array format and object with users property
    users = Array.isArray(usersRaw) ? usersRaw : usersRaw.users;
    racesData = loadJson<RacesData>(RACES_FILE);
    classesData = loadJson<ClassesData>(CLASSES_FILE);
  } catch (error) {
    console.error('Error loading data files:', error);
    process.exit(1);
  }

  const races = new Map<string, Race>();
  for (const race of racesData.races) {
    races.set(race.id, race);
  }

  const classes = new Map<string, CharacterClass>();
  for (const cls of classesData.classes) {
    classes.set(cls.id, cls);
  }

  console.log(`Found ${users.length} users to process`);
  console.log(`Found ${races.size} races`);
  console.log(`Found ${classes.size} classes`);
  console.log('');

  // Process users
  const results: MigrationResult[] = [];
  let changedCount = 0;

  for (const user of users) {
    const result = migrateUser(user, races, classes, options);
    results.push(result);

    if (result.changes.length > 0) {
      changedCount++;
      if (options.verbose) {
        console.log(`\n${result.username}:`);
        for (const change of result.changes) {
          console.log(`  - ${change}`);
        }
      }
    }
  }

  console.log('');
  console.log(`Migration summary:`);
  console.log(`  Total users: ${users.length}`);
  console.log(`  Users with changes: ${changedCount}`);
  console.log(`  Users unchanged: ${users.length - changedCount}`);
  console.log('');

  if (changedCount === 0) {
    console.log('No changes needed!');
    return;
  }

  // Show summary of changes
  if (!options.verbose) {
    console.log('Changed users:');
    for (const result of results) {
      if (result.changes.length > 0) {
        console.log(`  - ${result.username}: ${result.changes.length} change(s)`);
      }
    }
    console.log('');
  }

  if (options.dryRun) {
    console.log('Dry run complete. No changes were saved.');
    console.log('Run without --dry-run to apply changes.');
    return;
  }

  // Confirm before saving
  if (!options.force) {
    const confirmed = await confirm(`Save changes to ${changedCount} user(s)?`);
    if (!confirmed) {
      console.log('Migration cancelled.');
      return;
    }
  }

  // Create backup
  const backupPath = USERS_FILE.replace('.json', `.backup-${Date.now()}.json`);
  console.log(`Creating backup at ${backupPath}...`);
  fs.copyFileSync(USERS_FILE, backupPath);

  // Save changes
  console.log('Saving changes...');
  saveJson(USERS_FILE, users);
  console.log('Migration complete!');
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
