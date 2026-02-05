# Quest Definitions - LLM Context

## Overview

Declarative quest files defining complete quest flows. The quest engine (`src/quest/`) loads these at startup and handles all game integration automatically.

**One file = one quest. No code changes needed.**

## Supported Formats

- `.yaml` / `.yml` - YAML (recommended)
- `.toml` - TOML
- `.json` - JSON

Format auto-detected by file extension via `src/data/dataLoader.ts`.

## Quest File Structure

```yaml
id: unique_quest_id
name: "Display Name"
description: "Short description"
category: main|side|class_trial|tutorial
repeatable: false

prerequisites:
  level: 5
  classId: fighter        # Optional
  questsCompleted: [...]  # Optional

steps:
  - id: step_id
    name: "Step Name"
    objectives:
      - type: kill_mob|talk_to_npc|pickup_item|enter_room|use_item
        npcTemplateId: target_npc
        count: 3
    npcDialogues:         # Inline NPC dialogue for this step
      npc_id:
        greeting: "..."
        options:
          - text: "Player says"
            response: "NPC reply"
            actions:
              - action: setFlag
                flag: my_flag
    onComplete:
      - action: message
        text: "Step complete!"

rewards:
  experience: 100
  currency: { gold: 10 }
  questFlags: [unlocked_something]
```

## Objective Types

| Type | Trigger | Key Fields |
|------|---------|------------|
| `kill_mob` | `npc:death` event | `npcTemplateId`, `count` |
| `talk_to_npc` | `npc:talked` event | `npcTemplateId` |
| `pickup_item` | `item:pickup` event | `itemId`, `count` |
| `use_item` | `item:used` event | `itemId` |
| `enter_room` | `room:enter` event | `roomId` |
| `deliver_item` | `item:delivered` event | `itemId`, `npcTemplateId` |

## Action Types

- `setFlag` / `removeFlag` - Manage user.flags
- `setQuestFlag` - Add to user.questFlags (persists across quests)
- `message` - Display text with optional color
- `giveItem` / `giveXP` / `giveCurrency` - Grant rewards
- `teleport` - Move player to room
- `spawnNPC` - Create NPC instance
- `completeQuest` - Finish quest and grant rewards

## Conventions

1. **IDs**: Use snake_case (`rat_problem`, not `ratProblem`)
2. **NPC references**: Use template IDs from `data/npcs.json`
3. **Item references**: Use template IDs from `data/items.json`
4. **Room references**: Use room IDs from `data/rooms.json`
5. **Flags**: Descriptive names (`accepted_rat_quest`, `cleared_cellar`)

## Adding a New Quest

1. Create `data/quests/your_quest.yaml`
2. Define prerequisites, steps, objectives, dialogues, rewards
3. Restart server - quest loads automatically
4. Test with `quest available`, `quest accept <id>`, game actions

## Validation

Quests are validated against `src/schemas/quest.schema.json` at load time. Invalid quests are logged and skipped.

## Directory Structure

```
data/quests/
├── AGENTS.md           # This file
├── tutorial/           # Tutorial quests (levels 1-3)
│   ├── AGENTS.md
│   ├── welcome_to_thornwood.yaml
│   └── first_blood.yaml
├── main/               # Main story quests (levels 2-15)
│   ├── AGENTS.md
│   ├── road_to_thornwood.yaml
│   ├── forest_menace.yaml
│   ├── goblin_threat.yaml
│   └── darkness_rising.yaml
├── side/               # Side quests (various levels)
│   ├── AGENTS.md
│   ├── spider_infestation.yaml
│   ├── wolf_hunt.yaml
│   ├── lost_hunter.yaml
│   ├── bear_problem.yaml
│   ├── goblin_bounty.yaml
│   ├── marsh_herbs.yaml
│   └── undead_menace.yaml
├── class/              # Class advancement trials
│   ├── AGENTS.md
│   ├── fighter_trial.yaml
│   ├── mage_trial.yaml
│   ├── healer_trial.yaml
│   └── thief_trial.yaml
├── tutorial_welcome.yaml   # Legacy location
├── rat_problem.yaml        # Legacy location
└── paladin_trial.yaml      # Legacy location
```

## Quest Summary

### Tutorial Quests (2)
| ID | Name | Purpose |
|----|------|---------|
| `welcome_to_thornwood` | Welcome to Thornwood Vale | Basic mechanics |
| `first_blood` | First Blood | Combat tutorial |

### Main Story Quests (4)
| ID | Level | Name |
|----|-------|------|
| `road_to_thornwood` | 2-5 | The Road to Thornwood |
| `forest_menace` | 5-8 | The Forest Menace |
| `goblin_threat` | 8-12 | The Goblin Threat |
| `darkness_rising` | 12-15 | Darkness Rising |

### Side Quests (7+)
| ID | Level | Repeatable |
|----|-------|------------|
| `spider_infestation` | 2-5 | Yes |
| `wolf_hunt` | 5-8 | Yes |
| `lost_hunter` | 5-8 | No |
| `bear_problem` | 7-10 | No |
| `goblin_bounty` | 6-12 | Yes |
| `marsh_herbs` | 10-15 | Yes |
| `undead_menace` | 10-15 | Yes |

### Class Trials (4)
| ID | Class | Level |
|----|-------|-------|
| `fighter_trial` | Fighter | 5+ |
| `mage_trial` | Magic User | 5+ |
| `healer_trial` | Healer | 5+ |
| `thief_trial` | Thief | 5+ |

## Related Files

- `src/quest/questLoader.ts` - Loads and validates quests
- `src/quest/questManager.ts` - Quest lifecycle management
- `src/quest/questEventHandler.ts` - Game event → objective progress
- `src/quest/questActions.ts` - Action execution
- `src/quest/questDialogue.ts` - NPC dialogue integration
