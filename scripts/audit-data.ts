#!/usr/bin/env npx ts-node
/**
 * Data Auditor - Checks for configuration mismatches and issues
 *
 * Validates:
 * - Room exits are bidirectional
 * - Room exits point to existing rooms
 * - NPC templates referenced in spawn configs exist
 * - Room IDs in spawn configs exist
 * - Room spawnNpcs field matches area spawnConfig (warns about unused fields)
 * - Grid coordinates are consistent with exit directions
 *
 * Usage:
 *   npx ts-node scripts/audit-data.ts
 *   npm run audit:data
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface Room {
  id: string;
  name: string;
  areaId: string;
  exits: Array<{ direction: string; roomId: string }>;
  gridX?: number;
  gridY?: number;
  spawnNpcs?: string[];
  spawnItems?: string[];
}

interface Area {
  id: string;
  name: string;
  spawnConfig: Array<{
    npcTemplateId: string;
    maxInstances: number;
    respawnTicks: number;
    spawnRooms?: string[];
  }>;
}

interface NPC {
  id: string;
  name: string;
}

interface AuditResult {
  errors: string[];
  warnings: string[];
  info: string[];
}

const OPPOSITE_DIRECTIONS: Record<string, string> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
  up: 'down',
  down: 'up',
  northeast: 'southwest',
  southwest: 'northeast',
  northwest: 'southeast',
  southeast: 'northwest',
};

// Grid direction expectations (for consistency check)
const GRID_DIRECTION_DELTA: Record<string, { dx: number; dy: number }> = {
  north: { dx: 0, dy: 1 },
  south: { dx: 0, dy: -1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
  // up/down don't affect grid coordinates
};

function loadJson<T>(filename: string): T {
  const path = join(process.cwd(), 'data', filename);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function auditRoomExits(rooms: Room[]): AuditResult {
  const result: AuditResult = { errors: [], warnings: [], info: [] };
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  for (const room of rooms) {
    for (const exit of room.exits) {
      const targetRoom = roomMap.get(exit.roomId);

      // Check if target room exists
      if (!targetRoom) {
        result.errors.push(
          `[EXIT] Room '${room.id}' has exit ${exit.direction} → '${exit.roomId}' (room does not exist)`
        );
        continue;
      }

      // Check for return exit
      const returnDirection = OPPOSITE_DIRECTIONS[exit.direction];
      if (returnDirection) {
        const returnExit = targetRoom.exits.find(
          (e) => e.direction === returnDirection && e.roomId === room.id
        );

        if (!returnExit) {
          // Check if there's ANY exit back to the source room
          const anyReturnExit = targetRoom.exits.find((e) => e.roomId === room.id);
          if (anyReturnExit) {
            result.warnings.push(
              `[EXIT] Direction mismatch: '${room.id}' (${exit.direction}) → '${targetRoom.id}' but return is (${anyReturnExit.direction}) not (${returnDirection})`
            );
          } else {
            result.warnings.push(
              `[EXIT] One-way exit: '${room.id}' (${exit.direction}) → '${targetRoom.id}' has no return path`
            );
          }
        }
      }

      // Check grid coordinate consistency (skip up/down)
      const expectedDelta = GRID_DIRECTION_DELTA[exit.direction];
      if (
        expectedDelta &&
        room.gridX !== undefined &&
        room.gridY !== undefined &&
        targetRoom.gridX !== undefined &&
        targetRoom.gridY !== undefined
      ) {
        const actualDx = targetRoom.gridX - room.gridX;
        const actualDy = targetRoom.gridY - room.gridY;

        if (actualDx !== expectedDelta.dx || actualDy !== expectedDelta.dy) {
          result.warnings.push(
            `[GRID] Room '${room.id}' (${room.gridX},${room.gridY}) exit ${exit.direction} → '${targetRoom.id}' (${targetRoom.gridX},${targetRoom.gridY}) ` +
              `- expected delta (${expectedDelta.dx},${expectedDelta.dy}) but got (${actualDx},${actualDy})`
          );
        }
      }
    }

    // Check for rooms with no exits
    if (room.exits.length === 0) {
      result.errors.push(`[EXIT] Room '${room.id}' has no exits (orphaned room)`);
    }
  }

  return result;
}

function auditSpawnConfigs(rooms: Room[], areas: Area[], npcs: Map<string, NPC>): AuditResult {
  const result: AuditResult = { errors: [], warnings: [], info: [] };
  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  const areaMap = new Map(areas.map((a) => [a.id, a]));

  // Track which NPCs are configured in area spawnConfigs
  const areaSpawnedNpcs = new Map<string, Set<string>>(); // areaId -> Set of npcTemplateIds

  // Check area spawn configs
  for (const area of areas) {
    const npcSet = new Set<string>();
    areaSpawnedNpcs.set(area.id, npcSet);

    for (const spawn of area.spawnConfig) {
      npcSet.add(spawn.npcTemplateId);

      // Check if NPC template exists
      if (!npcs.has(spawn.npcTemplateId)) {
        result.errors.push(
          `[SPAWN] Area '${area.id}' references NPC '${spawn.npcTemplateId}' which does not exist`
        );
      }

      // Check if spawn rooms exist and belong to this area
      if (spawn.spawnRooms) {
        for (const roomId of spawn.spawnRooms) {
          const room = roomMap.get(roomId);
          if (!room) {
            result.errors.push(
              `[SPAWN] Area '${area.id}' spawn config references room '${roomId}' which does not exist`
            );
          } else if (room.areaId !== area.id) {
            result.warnings.push(
              `[SPAWN] Area '${area.id}' spawn config references room '${roomId}' which belongs to area '${room.areaId}'`
            );
          }
        }
      }
    }
  }

  // Check room-level spawnNpcs fields (warn if not in area config)
  for (const room of rooms) {
    if (room.spawnNpcs && room.spawnNpcs.length > 0) {
      const area = areaMap.get(room.areaId);
      const areaSpawnSet = areaSpawnedNpcs.get(room.areaId);

      for (const npcId of room.spawnNpcs) {
        // Check if NPC exists
        if (!npcs.has(npcId)) {
          result.errors.push(
            `[SPAWN] Room '${room.id}' spawnNpcs references NPC '${npcId}' which does not exist`
          );
          continue;
        }

        // Warn if room spawnNpcs not reflected in area spawnConfig
        if (areaSpawnSet && !areaSpawnSet.has(npcId)) {
          result.warnings.push(
            `[SPAWN] Room '${room.id}' has spawnNpcs ['${npcId}'] but area '${room.areaId}' spawnConfig does not include this NPC (room-level field may be unused)`
          );
        }
      }
    }
  }

  // Check for areas with empty spawnConfig that have rooms with spawnNpcs
  for (const area of areas) {
    if (area.spawnConfig.length === 0) {
      const areaRooms = rooms.filter((r) => r.areaId === area.id);
      const roomsWithSpawnNpcs = areaRooms.filter((r) => r.spawnNpcs && r.spawnNpcs.length > 0);

      if (roomsWithSpawnNpcs.length > 0) {
        result.warnings.push(
          `[SPAWN] Area '${area.id}' has empty spawnConfig but ${roomsWithSpawnNpcs.length} rooms have spawnNpcs fields (NPCs won't spawn)`
        );
      }
    }
  }

  return result;
}

function auditOrphanedRooms(rooms: Room[]): AuditResult {
  const result: AuditResult = { errors: [], warnings: [], info: [] };
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  // Find starting room(s)
  const startingRooms = rooms.filter(
    (r) => r.id === 'millbrook-village-square' || (r as { flags?: string[] }).flags?.includes('starting-room')
  );

  if (startingRooms.length === 0) {
    result.errors.push('[WORLD] No starting room found (need room with "starting-room" flag)');
    return result;
  }

  // BFS to find all reachable rooms
  const visited = new Set<string>();
  const queue = startingRooms.map((r) => r.id);

  while (queue.length > 0) {
    const roomId = queue.shift()!;
    if (visited.has(roomId)) continue;
    visited.add(roomId);

    const room = roomMap.get(roomId);
    if (!room) continue;

    for (const exit of room.exits) {
      if (!visited.has(exit.roomId)) {
        queue.push(exit.roomId);
      }
    }
  }

  // Find unreachable rooms
  const unreachable = rooms.filter((r) => !visited.has(r.id));
  if (unreachable.length > 0) {
    for (const room of unreachable) {
      result.warnings.push(
        `[WORLD] Room '${room.id}' (${room.name}) in area '${room.areaId}' is not reachable from starting room`
      );
    }
  }

  result.info.push(`[WORLD] ${visited.size}/${rooms.length} rooms reachable from starting room`);

  return result;
}

function main() {
  console.log('='.repeat(60));
  console.log('EllyMUD Data Auditor');
  console.log('='.repeat(60));
  console.log('');

  // Load data
  let rooms: Room[];
  let areas: Area[];
  let npcData: Array<{ id: string; name: string }>;

  try {
    rooms = loadJson<Room[]>('rooms.json');
    console.log(`Loaded ${rooms.length} rooms`);
  } catch (e) {
    console.error('Failed to load rooms.json:', e);
    process.exit(1);
  }

  try {
    areas = loadJson<Area[]>('areas.json');
    console.log(`Loaded ${areas.length} areas`);
  } catch (e) {
    console.error('Failed to load areas.json:', e);
    process.exit(1);
  }

  try {
    npcData = loadJson<Array<{ id: string; name: string }>>('npcs.json');
    console.log(`Loaded ${npcData.length} NPCs`);
  } catch (e) {
    console.error('Failed to load npcs.json:', e);
    process.exit(1);
  }

  const npcs = new Map(npcData.map((n) => [n.id, n]));

  console.log('');
  console.log('-'.repeat(60));
  console.log('Audit Results');
  console.log('-'.repeat(60));
  console.log('');

  // Run audits
  const results: AuditResult[] = [
    auditRoomExits(rooms),
    auditSpawnConfigs(rooms, areas, npcs),
    auditOrphanedRooms(rooms),
  ];

  // Aggregate results
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  const allInfo: string[] = [];

  for (const r of results) {
    allErrors.push(...r.errors);
    allWarnings.push(...r.warnings);
    allInfo.push(...r.info);
  }

  // Print info
  if (allInfo.length > 0) {
    console.log('INFO:');
    for (const msg of allInfo) {
      console.log(`  ${msg}`);
    }
    console.log('');
  }

  // Print warnings
  if (allWarnings.length > 0) {
    console.log('\x1b[33mWARNINGS:\x1b[0m');
    for (const msg of allWarnings) {
      console.log(`  \x1b[33m⚠\x1b[0m ${msg}`);
    }
    console.log('');
  }

  // Print errors
  if (allErrors.length > 0) {
    console.log('\x1b[31mERRORS:\x1b[0m');
    for (const msg of allErrors) {
      console.log(`  \x1b[31m✗\x1b[0m ${msg}`);
    }
    console.log('');
  }

  // Summary
  console.log('-'.repeat(60));
  console.log('Summary');
  console.log('-'.repeat(60));
  console.log(`  Errors:   ${allErrors.length}`);
  console.log(`  Warnings: ${allWarnings.length}`);
  console.log(`  Info:     ${allInfo.length}`);
  console.log('');

  if (allErrors.length > 0) {
    console.log('\x1b[31m✗ Audit FAILED - fix errors before deploying\x1b[0m');
    process.exit(1);
  } else if (allWarnings.length > 0) {
    console.log('\x1b[33m⚠ Audit passed with warnings\x1b[0m');
    process.exit(0);
  } else {
    console.log('\x1b[32m✓ Audit PASSED\x1b[0m');
    process.exit(0);
  }
}

main();
