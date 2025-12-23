# Planning Directory - LLM Context

> **Purpose**: Storage for Planning Agent outputs
> **Owner Agent**: Planning Agent
> **Consumer Agents**: Implementation Agent, Output Review Agent

## Directory Role in Pipeline

This directory stores implementation plans produced by the Planning Agent during Phase 3 of the pipeline. These plans transform research findings into detailed, executable task sequences.

## File Naming Convention

| Pattern                    | Description         | Example                          |
| -------------------------- | ------------------- | -------------------------------- |
| `plan_{topic}.md`          | Raw planning output | `plan_npc_hostility.md`          |
| `plan_{topic}-reviewed.md` | After Output Review | `plan_npc_hostility-reviewed.md` |

## Expected Document Structure

Planning documents should contain:

1. **Overview** - What we're implementing and why
2. **Prerequisites** - Dependencies, environment requirements
3. **Task Breakdown** - Numbered, atomic tasks with:
   - Clear description
   - Specific files to modify
   - Code snippets or patterns to use
   - Verification steps
4. **Risk Mitigation** - How to handle potential issues
5. **Rollback Strategy** - How to undo if things go wrong
6. **Success Criteria** - How to know when we're done

## Quality Criteria

Planning documents must:

- ✅ Reference research document findings
- ✅ Include specific file paths and line numbers
- ✅ Provide verifiable success criteria per task
- ✅ Order tasks by dependency
- ✅ Include rollback considerations

Planning documents must NOT:

- ❌ Conduct new research
- ❌ Skip dependency analysis
- ❌ Leave ambiguous task descriptions
- ❌ Omit verification steps

## Integration Notes

- **Input**: Reviewed research from `.github/agents/research/`
- **Output**: `plan_{topic}.md` → Output Review Agent
- **Triggers Implementation**: Only after review grade ≥ 80/100
- **Checkpoints**: Rollback Agent checkpoint recommended before complex plans

## Task Granularity Guide

Good task: "Add `lastAttacker` field to `CombatEntity` interface in `src/combat/combatEntity.interface.ts` line 15"

Bad task: "Update the combat system to track attackers"

---

_Last updated: 2025-01-11_
