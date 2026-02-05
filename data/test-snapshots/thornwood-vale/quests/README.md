# Quest Definitions

Declarative quest files in YAML, TOML, or JSON format. Each file defines a complete quest including steps, objectives, dialogues, and rewards.

## Format

Quests support three formats (auto-detected by extension):
- `.yaml` / `.yml` - YAML (recommended for readability)
- `.toml` - TOML
- `.json` - JSON

## Quest Structure

```yaml
id: quest_id              # Unique identifier
name: "Quest Name"        # Display name
description: "..."        # Short description
longDescription: |        # Multi-line detailed description
  Longer text here...
category: main|side|class_trial|tutorial
repeatable: false         # Can quest be done again?
repeatCooldown: 3600      # Seconds before repeat (if repeatable)

prerequisites:
  level: 1                # Minimum level required
  classId: fighter        # Required class (optional)
  raceId: human           # Required race (optional)
  questsCompleted:        # Quests that must be done first
    - tutorial_welcome

steps:
  - id: step_id
    name: "Step Name"
    description: "What to do"
    objectives:
      - type: kill_mob|talk_to_npc|pickup_item|enter_room|use_item|have_item|deliver_item
        npcTemplateId: target  # For kill/talk objectives
        itemId: item_id        # For item objectives
        roomId: room_id        # For enter_room objectives
        count: 1               # How many (for kill/pickup)
        description: "..."     # Objective description
    npcDialogues:              # Dialogue options for this step
      npc_template_id:
        greeting: "NPC says..."
        options:
          - text: "Player response"
            response: "NPC reply"
            requires:          # Conditional visibility
              flags: [flag_name]
            actions:           # Actions when selected
              - action: setFlag
                flag: flag_name
    onComplete:                # Actions when step completes
      - action: message
        text: "Step done!"
        color: green

rewards:
  experience: 100
  currency:
    gold: 10
    silver: 5
    copper: 0
  items:
    - sword_iron
  questFlags:
    - paladin_unlocked
  message: "Quest complete!"

questGiver: npc_template_id    # Who gives the quest
turnInNpc: npc_template_id     # Who to return to
recommendedLevel:
  min: 1
  max: 10
```

## Objective Types

| Type | Description | Required Fields |
|------|-------------|-----------------|
| `kill_mob` | Kill N of NPC type | `npcTemplateId`, `count` |
| `talk_to_npc` | Talk to specific NPC | `npcTemplateId` |
| `pickup_item` | Pick up item | `itemId`, `count` |
| `use_item` | Use an item | `itemId` |
| `have_item` | Have item in inventory | `itemId` |
| `enter_room` | Visit a room | `roomId` |
| `deliver_item` | Give item to NPC | `itemId`, `npcTemplateId` |

## Action Types

| Action | Description |
|--------|-------------|
| `setFlag` | Add to user.flags |
| `removeFlag` | Remove from flags |
| `setQuestFlag` | Add to user.questFlags |
| `message` | Show text to player |
| `giveItem` | Add item to inventory |
| `giveXP` | Award experience |
| `teleport` | Move player to room |
| `spawnNPC` | Create NPC in room |
| `advanceStep` | Jump to specific step |
| `completeQuest` | Finish the quest |

## Current Quests

| File | Category | Description |
|------|----------|-------------|
| `tutorial_welcome.yaml` | tutorial | New player introduction |
| `rat_problem.yaml` | side | Classic kill quest (repeatable) |
| `paladin_trial.yaml` | class_trial | Unlock Paladin class |

## Related

- [`../../src/quest/`](../../src/quest/) - Quest system implementation
- [`../../src/quest/types.ts`](../../src/quest/types.ts) - Type definitions
- [`../../src/schemas/quest.schema.json`](../../src/schemas/quest.schema.json) - Validation schema
