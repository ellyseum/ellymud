# Class Trial Quests - LLM Context

## Overview

Class advancement quests that unlock abilities and progression for each base class. All require level 5 and the appropriate class.

## Quest List

| Quest ID | Class | Challenge | Zone |
|----------|-------|-----------|------|
| `fighter_trial` | Fighter | Kill cave troll | Goblin Caves |
| `mage_trial` | Magic User | Defeat goblin shaman | Goblin Caves |
| `healer_trial` | Healer | Free undead spirits | Marsh |
| `thief_trial` | Thief | Retrieve bandit key/treasure | Forest |

## Prerequisites Pattern

All class trials use:
```yaml
prerequisites:
  level: 5
  classId: <class-id>
```

## Quest Flags

Each trial sets a completion flag:
- `fighter_trial_complete`
- `mage_trial_complete`
- `healer_trial_complete`
- `thief_trial_complete`

These flags can gate:
- Advanced class abilities
- Tier-2 class advancement quests
- Special equipment

## Design Principles

- **Thematic challenges**: Match class fantasy
- **Skill tests**: Require class-appropriate gameplay
- **Lore integration**: Connect to world story
- **Meaningful rewards**: Abilities or class-specific gear

## Adding New Class Trials

For tier-2 classes, use:
```yaml
prerequisites:
  level: 10
  classId: <tier-1-class>
  questFlags:
    - <tier-1>_trial_complete
```

## Related Files

- `../AGENTS.md` - Quest system overview
- `../../../src/user/AGENTS.md` - Class system details
