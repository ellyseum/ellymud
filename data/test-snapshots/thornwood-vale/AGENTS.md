# Thornwood Vale Snapshot

Production-accurate test snapshot for realistic E2E testing.

## Purpose

This snapshot mirrors the actual Thornwood Vale game data, providing:
- Real room layouts and connections
- NPC templates with correct stats (health, damage, XP)
- Proper item definitions
- All quest definitions (tutorial, main, side, class trials)
- Fresh user/runtime state (empty)

## Files

### Static Game Data (copied from production)
| File | Description |
|------|-------------|
| `rooms.json` | 79 rooms with exits, NPC spawns, items |
| `npcs.json` | 54 NPC templates (enemies, trainers, merchants) |
| `items.json` | 105 item definitions |
| `abilities.json` | 60+ class abilities |
| `classes.json` | 18 character classes with ability bindings |
| `races.json` | Character races |
| `areas.json` | Area definitions |
| `quests/` | All quest YAML files (tutorial, main, side, class) |

### Config Files
| File | Description |
|------|-------------|
| `admin.json` | Admin user configuration |
| `mud-config.json` | MUD settings |
| `gametimer-config.json` | Game tick configuration |

### Runtime State (empty for fresh start)
| File | Description |
|------|-------------|
| `users.json` | Empty - no existing users |
| `itemInstances.json` | Empty - no spawned items |
| `quest-progress.json` | Empty - no quest progress |
| `room_state.json` | Empty - no room state changes |
| `merchant-state.json` | Empty - fresh merchant inventory |
| `bug-reports.json` | Empty - no bug reports |

## Usage in Tests

```typescript
await StateLoader.loadSnapshot('thornwood-vale');
// or via MCP
await mcp_ellymud.load_test_snapshot({ name: 'thornwood-vale' });
```

## NPC Health Values (Sample)

| NPC | Health | Damage | XP |
|-----|--------|--------|-----|
| field-rat | 15 | 1-3 | 25 |
| goblin | 25 | 2-5 | 150 |
| wolf | 30 | 3-6 | 200 |
| thornwood-spider | 40 | 4-8 | 250 |
| cave-bear | 80 | 8-15 | 500 |

## Quest Categories

| Category | Quests |
|----------|--------|
| Tutorial | welcome_to_thornwood, first_blood |
| Main | road_to_thornwood, goblin_threat, forest_menace, darkness_rising |
| Side | rat_problem, wolf_hunt, spider_infestation, goblin_bounty, etc. |
| Class | fighter_trial, mage_trial, thief_trial, healer_trial, paladin_trial |
