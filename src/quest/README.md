# Quest System

Declarative quest system for EllyMUD. Quests are defined in YAML, TOML, or JSON files in `data/quests/`. The engine handles loading, validation, progress tracking, and event integration.

## Quick Start

```yaml
# data/quests/my_quest.yaml
id: my_quest
name: "My Quest"
description: "A simple quest."
category: side

steps:
  - id: kill_goblins
    name: "Kill Goblins"
    objectives:
      - type: kill_mob
        npcTemplateId: goblin
        count: 5
    onComplete:
      - action: completeQuest

rewards:
  experience: 500
  message: "Quest complete!"
```

## Features

- **Multi-format support**: YAML, TOML, JSON
- **Declarative**: Define entire quest in one file
- **Event-driven**: Automatic objective tracking via game events
- **NPC dialogues**: Quest-aware dialogue trees
- **Prerequisites**: Level, class, race, flags, completed quests
- **Rewards**: XP, items, currency, flags

## Commands

- `quest` - View active quests
- `quest available` - See available quests
- `quest accept <id>` - Start a quest
- `quest abandon <id>` - Abandon a quest
- `talk <npc>` - Talk to NPC
- `reply <n>` - Select dialogue option

## Documentation

See `AGENTS.md` for detailed API reference and implementation guide.
