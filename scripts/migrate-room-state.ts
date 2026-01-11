#!/usr/bin/env npx ts-node
/**
 * Migration script to split existing room data into templates and state
 * 
 * This script:
 * 1. Reads existing rooms.json
 * 2. Extracts state data (items, NPCs, currency) into room_state.json
 * 3. Optionally cleans rooms.json to contain only template data
 * 
 * Usage:
 *   npx ts-node scripts/migrate-room-state.ts [--clean-templates]
 * 
 * Options:
 *   --clean-templates  Remove state fields from rooms.json (default: false)
 *   --dry-run          Show what would be done without writing files
 */

import fs from 'fs';
import path from 'path';

interface RoomDataLegacy {
  id: string;
  name: string;
  description: string;
  exits: Array<{ direction: string; roomId: string; description?: string }>;
  items?: string[];
  itemInstances?: Array<{ instanceId: string; templateId: string }>;
  npcs?: string[];
  currency: { gold: number; silver: number; copper: number };
  flags?: string[];
  areaId?: string;
  gridX?: number;
  gridY?: number;
}

interface RoomState {
  roomId: string;
  itemInstances: Array<{ instanceId: string; templateId: string }>;
  npcTemplateIds: string[];
  currency: { gold: number; silver: number; copper: number };
  items?: string[];
}

interface RoomTemplate {
  id: string;
  name: string;
  description: string;
  exits: Array<{ direction: string; roomId: string; description?: string }>;
  flags?: string[];
  areaId?: string;
  gridX?: number;
  gridY?: number;
  defaultNpcs?: string[];
}

const DATA_DIR = path.join(__dirname, '..', 'data');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');
const STATE_FILE = path.join(DATA_DIR, 'room_state.json');
const BACKUP_FILE = path.join(DATA_DIR, 'rooms.json.backup');

function parseArgs(): { cleanTemplates: boolean; dryRun: boolean } {
  const args = process.argv.slice(2);
  return {
    cleanTemplates: args.includes('--clean-templates'),
    dryRun: args.includes('--dry-run'),
  };
}

function loadRooms(): RoomDataLegacy[] {
  if (!fs.existsSync(ROOMS_FILE)) {
    console.error(`Error: rooms.json not found at ${ROOMS_FILE}`);
    process.exit(1);
  }

  const data = fs.readFileSync(ROOMS_FILE, 'utf8');
  return JSON.parse(data) as RoomDataLegacy[];
}

function extractState(rooms: RoomDataLegacy[]): RoomState[] {
  return rooms.map((room) => ({
    roomId: room.id,
    itemInstances: room.itemInstances ?? [],
    npcTemplateIds: room.npcs ?? [],
    currency: room.currency ?? { gold: 0, silver: 0, copper: 0 },
    items: room.items,
  }));
}

function extractTemplates(rooms: RoomDataLegacy[]): RoomTemplate[] {
  return rooms.map((room) => ({
    id: room.id,
    name: room.name,
    description: room.description,
    exits: room.exits,
    flags: room.flags,
    areaId: room.areaId,
    gridX: room.gridX,
    gridY: room.gridY,
  }));
}

function main(): void {
  const { cleanTemplates, dryRun } = parseArgs();

  console.log('=== Room State Migration Script ===\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Clean templates: ${cleanTemplates}\n`);

  // Load existing rooms
  const rooms = loadRooms();
  console.log(`Loaded ${rooms.length} rooms from ${ROOMS_FILE}`);

  // Extract state
  const states = extractState(rooms);
  const statesWithData = states.filter(
    (s) => 
      s.itemInstances.length > 0 || 
      s.npcTemplateIds.length > 0 || 
      s.currency.gold > 0 || 
      s.currency.silver > 0 || 
      s.currency.copper > 0 ||
      (s.items && s.items.length > 0)
  );

  console.log(`\nState summary:`);
  console.log(`  Total rooms: ${states.length}`);
  console.log(`  Rooms with state data: ${statesWithData.length}`);

  // Show sample of state data
  if (statesWithData.length > 0) {
    console.log(`\nSample state entries:`);
    statesWithData.slice(0, 3).forEach((s) => {
      console.log(`  - ${s.roomId}: ${s.itemInstances.length} items, ${s.npcTemplateIds.length} NPCs, ${s.currency.gold}g/${s.currency.silver}s/${s.currency.copper}c`);
    });
    if (statesWithData.length > 3) {
      console.log(`  ... and ${statesWithData.length - 3} more`);
    }
  }

  if (dryRun) {
    console.log('\n[DRY RUN] Would write files:');
    console.log(`  - ${STATE_FILE}`);
    if (cleanTemplates) {
      console.log(`  - ${BACKUP_FILE} (backup)`);
      console.log(`  - ${ROOMS_FILE} (cleaned)`);
    }
    return;
  }

  // Write state file
  fs.writeFileSync(STATE_FILE, JSON.stringify(states, null, 2));
  console.log(`\n✓ Created ${STATE_FILE}`);

  // Optionally clean templates
  if (cleanTemplates) {
    // Backup first
    fs.copyFileSync(ROOMS_FILE, BACKUP_FILE);
    console.log(`✓ Backup created at ${BACKUP_FILE}`);

    const templates = extractTemplates(rooms);
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(templates, null, 2));
    console.log(`✓ Cleaned ${ROOMS_FILE} (removed state fields)`);
  }

  console.log('\n=== Migration Complete ===');
}

main();
