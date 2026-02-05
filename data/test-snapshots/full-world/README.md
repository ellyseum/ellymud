# Full World Snapshot

This snapshot contains the complete game world data, suitable for progression testing and gameplay verification.

## Contents

- **rooms.json**: Complete set of 60 rooms across all areas (Millbrook Village, Thornwood Town, forests, caves, etc.)
- **users.json**: Empty user list (fresh start)
- **items.json**: Empty item instances
- **npcs.json**: Empty NPC instances (spawned by SpawnManager based on area configs)

## Areas Available

1. **Millbrook Village** - Starting area with shops and NPCs
2. **Millbrook Outskirts** - Low-level combat area (rats, boars, spiders)
3. **Thornwood Town** - Main town with training rooms, merchants
4. **Thornwood Forest** - Mid-level combat (wolves, bandits, bears)
5. **Goblin Caves** - Dungeon area (goblins, trolls)
6. **Darkhollow Marsh** - High-level area (undead, serpents)

## Training Rooms

- `thornwood-training-hall` - Warrior's Training Hall
- `thornwood-temple` - Temple of the Divine Light
- `thornwood-mage-tower` - Tower of the Arcane

## Usage

```typescript
await stateLoader.loadSnapshot('full-world');
```

This is useful for:
- Testing full gameplay progression
- Verifying map command across areas
- Testing NPC spawning and combat
- Validating level-up and training systems
