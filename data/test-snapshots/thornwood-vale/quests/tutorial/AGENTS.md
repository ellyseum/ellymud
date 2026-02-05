# Tutorial Quests - LLM Context

## Overview

Tutorial quests that introduce new players to game mechanics. These quests are designed to be completed in order during levels 1-3.

## Quest Chain

| Order | Quest ID | Purpose |
|-------|----------|---------|
| 1 | `welcome_to_thornwood` | Basic movement, NPCs, look command |
| 2 | `first_blood` | Combat basics, killing mobs, looting |

## Design Principles

- **Simple objectives**: One mechanic per step
- **Clear hints**: Every step has a hint message
- **Low danger**: NPCs are weak, safe areas available
- **Good rewards**: Enough to buy basic gear

## Adding New Tutorial Quests

Tutorial quests should:
1. Use `category: tutorial`
2. Set `prerequisites.maxLevel: 5` to limit to new players
3. Have `autoStart: false` (player must accept)
4. Chain from previous tutorials using `questsCompleted`

## Related Files

- `../AGENTS.md` - Quest system overview
- `../../AGENTS.md` - Data directory overview
