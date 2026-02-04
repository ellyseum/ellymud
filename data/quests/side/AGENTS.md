# Side Quests - LLM Context

## Overview

Optional side quests that provide extra content, gold, and XP. Many are repeatable for farming.

## Quest List

| Quest ID | Level | Repeatable | Zone | Summary |
|----------|-------|------------|------|---------|
| `spider_infestation` | 2-5 | Yes (2hr) | Outskirts | Clear spider caves |
| `wolf_hunt` | 5-8 | Yes (1hr) | Forest | Bounty for wolf pelts |
| `lost_hunter` | 5-8 | No | Forest | Find missing NPC |
| `bear_problem` | 7-10 | No | Forest | Kill dangerous bear |
| `goblin_bounty` | 6-12 | Yes (30min) | Caves | Collect goblin ears |
| `marsh_herbs` | 10-15 | Yes (2hr) | Marsh | Gather rare herbs |
| `undead_menace` | 10-15 | Yes (1hr) | Marsh | Destroy undead |

## Repeatable Quest Design

For repeatable quests:
```yaml
repeatable: true
repeatCooldown: 3600  # Seconds until can repeat
```

Rewards should be:
- Lower XP than one-time quests
- Good gold income
- Consumable rewards (potions, etc.)

## Quest Categories

1. **Bounty quests**: Kill X creatures, turn in proof
2. **Gathering quests**: Collect items from mobs/areas
3. **Investigation quests**: Story-driven, find clues
4. **Extermination quests**: Clear an area of threats

## Related Files

- `../AGENTS.md` - Quest system overview
- `../main/AGENTS.md` - Main story quests
