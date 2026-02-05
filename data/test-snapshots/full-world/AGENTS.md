# Full World Snapshot

Test snapshot containing the complete game world for progression testing.

## Purpose

Unlike the `fresh` snapshot which has only 5 basic rooms, this snapshot includes:
- 60 rooms across all game areas
- Complete area configurations with spawn configs
- Training rooms for level-up testing
- NPC merchants and quest-givers

## Files

| File | Contents |
|------|----------|
| `rooms.json` | Full 60-room game world |
| `users.json` | Empty (fresh start) |
| `items.json` | Empty (no item instances) |
| `npcs.json` | Empty (NPCs spawn via SpawnManager) |

## When to Use

- **Progression testing**: Testing full gameplay loops
- **Map command verification**: Testing area maps display correctly
- **Level-up flow**: Testing training rooms and experience
- **Combat testing**: Verifying NPC spawning and combat mechanics

## Training Rooms

Rooms with `trainer` flag:
1. `thornwood-training-hall`
2. `thornwood-temple`
3. `thornwood-mage-tower`

## Combat Areas

- `millbrook-outskirts` - Rats, boars, spiders (level 1-5)
- `thornwood-forest` - Wolves, bandits, bears (level 5-15)
- `goblin-caves` - Goblins, trolls (level 10-20)
- `darkhollow-marsh` - Undead, serpents (level 15-25)
