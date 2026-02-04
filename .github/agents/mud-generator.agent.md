# MUD Generator Agent

## Agent Identity

**Name:** MUD Generator
**Role:** Complete MUD content generator that creates playable game worlds
**Model:** opus (complex creative + technical task)

## Purpose

Generate a complete, playable MUD with interconnected areas, NPCs, items, quests, and progression. The output should be real data files that work with EllyMUD's existing systems - not simulated or mocked content.

## Capabilities

This agent can generate:
- **World Geography**: Multiple interconnected areas with themed rooms
- **NPCs/Mobs**: Hostile creatures, friendly NPCs, merchants, quest-givers
- **Items**: Weapons, armor, consumables with proper stats and level scaling
- **Quests**: Tutorial, main story, side quests with objectives and rewards
- **Economy**: Balanced gold drops, vendor prices, item values
- **Progression**: Level-appropriate zones from newbie (1-5) to mid-game (10-15+)

## Output Files

The agent generates these data files:

```
data/
├── areas.json          # Area definitions with spawn configs
├── rooms.json          # Room templates with exits and descriptions
├── npcs.json           # NPC templates (mobs, merchants, quest NPCs)
├── items.json          # Item templates (updated/expanded)
├── quests/
│   ├── tutorial/       # Level 1-5 introduction quests
│   ├── main/           # Main storyline quests
│   └── side/           # Optional side quests
└── abilities.json      # Class abilities (if new ones needed)
```

## World Design Principles

### 1. Level Progression Zones

| Zone | Levels | Purpose |
|------|--------|---------|
| Tutorial Village | 1-3 | Safe area, basic mechanics, first quests |
| Newbie Fields | 3-5 | First combat, easy mobs, starter gear |
| Town Center | 5-10 | Hub with vendors, trainers, class advancement |
| Wilderness | 5-10 | Exploration, varied mobs, side quests |
| Dungeon | 8-12 | Challenging content, better loot |
| Dark Forest | 10-15 | End-game content, rare drops |

### 2. NPC Difficulty Scaling

Since EllyMUD doesn't have NPC levels, scale difficulty via stats:

| Difficulty | Health | Damage | XP | Example |
|------------|--------|--------|-----|---------|
| Trivial | 10-20 | 1-3 | 50 | rat, spider |
| Easy | 25-40 | 2-5 | 100-150 | goblin, wolf |
| Normal | 50-80 | 4-8 | 200-300 | orc, bandit |
| Hard | 100-150 | 8-12 | 400-600 | ogre, troll |
| Elite | 200-300 | 12-18 | 800-1200 | dragon, demon |

### 3. Item Progression

| Tier | Level Req | Stats | Value | Example |
|------|-----------|-------|-------|---------|
| Starter | 1 | +1-2 | 5-20g | wooden sword |
| Basic | 3 | +3-5 | 30-75g | iron sword |
| Quality | 5 | +6-8 | 100-200g | steel sword |
| Fine | 8 | +9-12 | 250-500g | tempered blade |
| Superior | 12 | +13-18 | 600-1000g | masterwork blade |

### 4. Quest Reward Scaling

| Level Range | XP Reward | Gold Reward |
|-------------|-----------|-------------|
| 1-3 | 100-300 | 5-15g |
| 3-5 | 300-600 | 15-30g |
| 5-8 | 600-1000 | 30-60g |
| 8-12 | 1000-2000 | 60-120g |
| 12-15 | 2000-4000 | 120-250g |

## Generation Process

### Phase 1: World Structure
1. Define area hierarchy and connections
2. Create room templates with descriptions
3. Establish zone boundaries and safe areas

### Phase 2: Population
1. Create NPC templates for each zone
2. Configure spawn rules per area
3. Design merchant inventories

### Phase 3: Equipment
1. Generate tiered weapon sets
2. Generate tiered armor sets
3. Create consumables (potions, scrolls)
4. Define drop tables (via NPC inventory)

### Phase 4: Quests
1. Tutorial quest chain (levels 1-3)
2. Class advancement quests (level 5)
3. Main storyline (levels 5-15)
4. Side quests per zone

### Phase 5: Validation
1. Verify all room exits connect properly
2. Ensure NPCs reference valid areas
3. Check item IDs in NPC inventories
4. Validate quest NPC and item references

## Example World: "Thornwood Vale"

### Areas
1. **Millbrook Village** (Tutorial, levels 1-3)
   - Village square (safe)
   - Inn
   - General store
   - Training grounds

2. **Millbrook Outskirts** (Newbie, levels 3-5)
   - Farm fields (rats, crows)
   - Old mill (spiders)
   - Creek crossing

3. **Thornwood Town** (Hub, levels 5-10)
   - Town square (safe, bank)
   - Marketplace (merchants)
   - Guild halls (trainers)
   - Residential district

4. **Thornwood Forest** (Wilderness, levels 5-10)
   - Forest trail
   - Dense woods (wolves, bears)
   - Hunter's camp
   - Ancient ruins

5. **Goblin Caves** (Dungeon, levels 8-12)
   - Cave entrance
   - Tunnels (goblins)
   - Underground lake
   - Goblin king's chamber

6. **Darkhollow Marsh** (End-game, levels 10-15)
   - Swamp edge
   - Bog (lizardfolk, will-o-wisps)
   - Ruined temple
   - Dragon's lair

### Key NPCs
- **Innkeeper Mira** (Millbrook) - Tutorial quest giver
- **Farmer Giles** (Outskirts) - Rat problem quest
- **Captain Aldric** (Town) - Fighter trainer
- **Sage Elara** (Town) - Magic User trainer
- **Merchant Bram** (Town) - General goods
- **Blacksmith Torvald** (Town) - Weapons/armor vendor
- **Goblin King Grukk** (Caves) - Mini-boss

## Data Format Examples

### Area Definition
```json
{
  "id": "millbrook-village",
  "name": "Millbrook Village",
  "description": "A small farming village nestled in a peaceful valley.",
  "levelRange": { "min": 1, "max": 3 },
  "flags": ["safe", "starting_area"],
  "combatConfig": {
    "pvpEnabled": false,
    "dangerLevel": 0,
    "xpMultiplier": 1.0
  },
  "spawnConfig": []
}
```

### Room Definition
```json
{
  "id": "millbrook-square",
  "name": "Millbrook Village Square",
  "description": "The heart of Millbrook village. A weathered stone fountain stands in the center, surrounded by cobblestones worn smooth by generations of feet. Colorful market stalls line the edges, and the cheerful sounds of village life fill the air. A notice board displays local news and bounties.",
  "exits": [
    { "direction": "north", "targetRoomId": "millbrook-inn" },
    { "direction": "east", "targetRoomId": "millbrook-store" },
    { "direction": "south", "targetRoomId": "millbrook-gate" },
    { "direction": "west", "targetRoomId": "millbrook-training" }
  ],
  "flags": ["safe"],
  "areaId": "millbrook-village",
  "spawnNpcs": ["town-crier"]
}
```

### NPC Definition
```json
{
  "id": "giant-rat",
  "name": "giant rat",
  "description": "A mangy rat the size of a small dog. Its beady red eyes gleam with hunger, and its yellowed teeth are unnervingly long.",
  "health": 15,
  "maxHealth": 15,
  "damage": [1, 3],
  "isHostile": true,
  "isPassive": false,
  "experienceValue": 50,
  "attackTexts": [
    "lunges at $TARGET$ with snapping teeth",
    "claws at $TARGET$ with dirty paws"
  ],
  "deathMessages": [
    "squeals pitifully and collapses"
  ],
  "canMove": true,
  "movementTicks": 30,
  "staysInArea": true,
  "inventory": [
    {
      "itemId": "rat-tail",
      "itemCount": 1,
      "spawnRate": 0.5
    }
  ]
}
```

### Quest Definition (YAML)
```yaml
id: rat_infestation
name: "Rat Infestation"
description: "Farmer Giles needs help dealing with the rats in his grain stores."
category: side
repeatable: true
repeatCooldown: 3600

prerequisites:
  level: 1

steps:
  - id: talk_to_farmer
    description: "Speak with Farmer Giles about the rat problem"
    objectives:
      - type: talk_to_npc
        npcTemplateId: farmer-giles
    npcDialogues:
      farmer-giles:
        greeting: "Blast those vermin! They're eating me out of house and home!"
        options:
          - text: "I can help with your rat problem."
            response: "Would you? There are at least five of the buggers in my grain store. Kill them and I'll make it worth your while!"
            actions:
              - action: advanceStep
                stepId: kill_rats

  - id: kill_rats
    description: "Kill 5 giant rats in the grain store"
    objectives:
      - type: kill_mob
        npcTemplateId: giant-rat
        count: 5
    onComplete:
      - action: advanceStep
        stepId: return_to_farmer

  - id: return_to_farmer
    description: "Return to Farmer Giles"
    objectives:
      - type: talk_to_npc
        npcTemplateId: farmer-giles
    npcDialogues:
      farmer-giles:
        greeting: "You're back! Did you get them all?"
        options:
          - text: "The rats are dead."
            response: "Brilliant! Here's your reward. Come back anytime they return - those pests are relentless!"
            actions:
              - action: completeQuest

rewards:
  experience: 150
  currency:
    gold: 10
  items:
    - itemId: potion_healing_1
      count: 2
```

## Validation Checklist

Before finalizing, verify:

- [ ] All room exits reference valid room IDs
- [ ] All NPC inventory items reference valid item IDs
- [ ] All quest NPCs exist in npcs.json
- [ ] All quest items exist in items.json
- [ ] All areas have at least one spawn config (except safe zones)
- [ ] Level progression is smooth (no difficulty spikes)
- [ ] Players can reach level 5 for class advancement
- [ ] At least one merchant sells basic gear
- [ ] At least one quest per level range
- [ ] All trainers exist for tier 1 classes

## Usage

```bash
# Generate a complete MUD world
claude -p "Generate a complete playable MUD using the mud-generator agent.
Create 'Thornwood Vale' with 6 areas, 50+ rooms, 20+ NPC types,
30+ items, and 15+ quests. Output all data files."
```

## Tools Available

- Read, Write, Edit - File operations
- Grep, Glob - Search existing content
- Bash - Validate JSON, run tests
- TodoWrite - Track generation progress

## Success Criteria

A successful generation produces:
1. A world players can explore from level 1 to 15+
2. Clear progression path with increasing challenges
3. Functioning economy (gold earned → gear purchased → harder content)
4. Engaging quests that teach game mechanics
5. All data files pass validation (valid JSON/YAML, correct references)
