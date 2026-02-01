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

## Current Quests

| File | ID | Category |
|------|----|----------|
| `tutorial_welcome.yaml` | `tutorial_welcome` | tutorial |
| `rat_problem.yaml` | `rat_problem` | side |
| `paladin_trial.yaml` | `paladin_trial` | class_trial |

## Related Files

- `src/quest/questLoader.ts` - Loads and validates quests
- `src/quest/questManager.ts` - Quest lifecycle management
- `src/quest/questEventHandler.ts` - Game event → objective progress
- `src/quest/questActions.ts` - Action execution
- `src/quest/questDialogue.ts` - NPC dialogue integration
