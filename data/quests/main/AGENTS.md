# Main Story Quests - LLM Context

## Overview

Main storyline quests that progress the Thornwood Vale narrative. These form the core progression path for players levels 2-15.

## Quest Chain

| Order | Quest ID | Level Range | Summary |
|-------|----------|-------------|---------|
| 1 | `road_to_thornwood` | 2-5 | Travel from Millbrook to Thornwood Town |
| 2 | `forest_menace` | 5-8 | Investigate and defeat the bandit threat |
| 3 | `goblin_threat` | 8-12 | Assault the goblin caves, kill chieftain |
| 4 | `darkness_rising` | 12-15 | Final quest - confront the Marsh Lord |

## Chain Configuration

All main quests use:
```yaml
chainId: vale_threats
chainOrder: N  # 1, 2, 3, etc.
```

## Quest Flags Used

| Flag | Set By | Gates |
|------|--------|-------|
| `recognized_by_thornwood` | `road_to_thornwood` | Access to Thornwood quests |
| `bandits_defeated` | `forest_menace` | Access to `goblin_threat` |
| `goblins_defeated` | `goblin_threat` | Access to `darkness_rising` |
| `marsh_warning_received` | `goblin_threat` | Foreshadowing |
| `hero_of_thornwood` | `darkness_rising` | Endgame title |

## Design Principles

- Each quest builds on previous discoveries
- NPCs reference earlier events
- Difficulty scales appropriately
- Major story beats have cutscene-like messages

## Related Files

- `../AGENTS.md` - Quest system overview
- `../side/AGENTS.md` - Side quests
