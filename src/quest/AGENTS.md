# Quest System - LLM Context

## Overview

Declarative quest system that loads quest definitions from YAML/TOML/JSON files. Each quest is defined in a single file containing the entire flow: steps, triggers, NPC dialogues, flags, and rewards. The quest engine handles all wiring.

**No more scattered flag checks. No more hacks. One file, one quest.**

## Architecture

```
questManager.ts          # Singleton manager (lifecycle, progress)
    ↓
questLoader.ts           # Load & validate quest files
    ↓
questEventHandler.ts     # Subscribe to game events
    ↓
questActions.ts          # Execute quest actions
    ↓
questDialogue.ts         # NPC dialogue integration
    ↓
types.ts                 # Type definitions
```

## File Reference

| File | Purpose |
|------|---------|
| `types.ts` | All TypeScript types for quests |
| `questLoader.ts` | Load quests from `data/quests/` |
| `questManager.ts` | Singleton manager for quest lifecycle |
| `questActions.ts` | Execute quest actions (setFlag, giveItem, etc.) |
| `questEventHandler.ts` | Game event subscriptions |
| `questDialogue.ts` | NPC dialogue integration |
| `index.ts` | Module exports |

## Quest Definition Format

Quest files live in `data/quests/` and can be YAML, TOML, or JSON.

### YAML Example

```yaml
id: rat_problem
name: "The Rat Problem"
description: "Help clear rats from the cellar."
category: side
repeatable: true

prerequisites:
  level: 1

steps:
  - id: talk_innkeeper
    name: "Speak with the Innkeeper"
    objectives:
      - type: talk_to_npc
        npcTemplateId: innkeeper
    npcDialogues:
      innkeeper:
        greeting: "Please help with my rat problem!"
        options:
          - text: "I'll help."
            response: "Thank you! Kill 3 rats in the cellar."
            actions:
              - action: setFlag
                flag: accepted_rat_quest

  - id: kill_rats
    name: "Clear the Cellar"
    objectives:
      - type: kill_mob
        npcTemplateId: rat
        count: 3
    onComplete:
      - action: completeQuest

rewards:
  experience: 250
  currency:
    gold: 5
  message: "Thanks for clearing the rats!"
```

## Objective Types

| Type | Description | Required Fields |
|------|-------------|-----------------|
| `use_item` | Use a specific item | `itemId` |
| `pickup_item` | Pick up item | `itemId`, `count?` |
| `have_item` | Have item in inventory | `itemId`, `count?` |
| `talk_to_npc` | Talk to NPC | `npcTemplateId` |
| `kill_mob` | Kill N of NPC type | `npcTemplateId`, `count?` |
| `enter_room` | Visit a room | `roomId` |
| `have_flag` | Check user flag | `flag` |
| `deliver_item` | Give item to NPC | `itemId`, `npcTemplateId` |
| `reach_level` | Reach level | `level` |
| `equip_item` | Equip item | `itemId?`, `slot?` |

## Action Types

| Action | Description | Fields |
|--------|-------------|--------|
| `setFlag` | Add user flag | `flag` |
| `removeFlag` | Remove flag | `flag` |
| `setQuestFlag` | Add quest flag | `flag` |
| `removeQuestFlag` | Remove quest flag | `flag` |
| `message` | Show message | `text`, `color?` |
| `giveItem` | Give item | `itemId`, `count?` |
| `removeItem` | Remove item | `itemId`, `count?` |
| `giveXP` | Award experience | `amount` |
| `giveCurrency` | Give money | `gold?`, `silver?`, `copper?` |
| `teleport` | Move player | `roomId` |
| `spawnNPC` | Create NPC | `npcTemplateId`, `roomId?` |
| `advanceStep` | Jump to step | `stepId` |
| `completeQuest` | Finish quest | - |
| `failQuest` | Fail quest | `reason?` |
| `startQuest` | Start another | `questId` |

## Usage

### Getting the Quest Manager

```typescript
import { getQuestManager } from '../quest';

const questManager = getQuestManager();
await questManager.ensureInitialized();
```

### Starting a Quest

```typescript
const result = await questManager.startQuest(user, 'rat_problem');
if (result.success) {
  // Quest started
}
```

### Checking Available Quests

```typescript
const available = await questManager.getAvailableQuests(user);
```

### Updating Objectives via Events

```typescript
import { questEventBus } from '../quest';

// Emit when NPC dies
questEventBus.emit('npc:death', {
  killer: client,
  npcTemplateId: 'rat'
});

// Emit when player enters room
questEventBus.emit('room:enter', {
  client,
  roomId: 'town-square'
});
```

### NPC Dialogue Integration

```typescript
import { getQuestDialoguesForNpc, displayQuestDialogue } from '../quest';

const result = await getQuestDialoguesForNpc(user, 'innkeeper');
if (result.hasQuestDialogue) {
  displayQuestDialogue(client, 'Innkeeper', result);
}
```

## Initialization

Quest event handlers must be initialized during server startup:

```typescript
import { initQuestEventHandlers } from '../quest';

// In app.ts or setup
initQuestEventHandlers();
```

## Quest Progress Storage

Progress is stored in `data/quest-progress.json`:

```json
{
  "progress": [
    {
      "username": "player1",
      "activeQuests": [...],
      "completedQuests": [...],
      "failedQuests": [...],
      "updatedAt": "2024-01-15T..."
    }
  ]
}
```

## Commands

| Command | Description |
|---------|-------------|
| `quest` | Show active quests |
| `quest available` | Show available quests |
| `quest <id>` | Show quest details |
| `quest accept <id>` | Start a quest |
| `quest abandon <id>` | Abandon quest |
| `talk <npc>` | Talk to NPC (triggers quest dialogue) |
| `reply <n>` | Select dialogue option |

## Integration Points

### Combat System
`src/combat/combat.ts` emits `npc:death` events.

### Movement System
`src/command/commands/move.command.ts` emits `room:enter` events.

### Other Events to Implement
- `item:pickup` - from pickup command
- `item:used` - from use command
- `item:equipped` - from equip command
- `player:levelup` - from level up logic

## Adding a New Quest

1. Create YAML file in `data/quests/`
2. Define `id`, `name`, `description`, `category`, `steps`
3. Add `objectives` to each step
4. Add `npcDialogues` if needed
5. Define `rewards`
6. Test with `quest accept <id>`

## Adding a New Objective Type

1. Add type to `QuestObjective` union in `types.ts`
2. Add case to `objectiveMatchesEvent()` in `questManager.ts`
3. Add validation in `questLoader.ts`
4. Emit appropriate event from game system

## Adding a New Action Type

1. Add type to `QuestAction` union in `types.ts`
2. Add case to `executeAction()` in `questActions.ts`
3. Add validation in schema (`src/schemas/index.ts`)

## Gotchas

- Quest IDs must be unique across all files
- Step IDs must be unique within a quest
- NPC dialogues are keyed by `npcTemplateId`, not NPC name
- The `completeQuest` action triggers reward granting
- Objectives are checked in order; use `requireAllObjectives: false` for "any of" behavior

## Related Context

- [`../persistence/AsyncFileQuestProgressRepository.ts`](../persistence/AsyncFileQuestProgressRepository.ts) - Progress storage
- [`../command/commands/quest.command.ts`](../command/commands/quest.command.ts) - Quest command
- [`../command/commands/talk.command.ts`](../command/commands/talk.command.ts) - Talk command
- [`../combat/combat.ts`](../combat/combat.ts) - NPC death events
- [`../data/dataLoader.ts`](../data/dataLoader.ts) - Multi-format file loading
