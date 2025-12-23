# Implementation Directory - LLM Context

> **Purpose**: Storage for Implementation Agent outputs
> **Owner Agent**: Implementation Agent
> **Consumer Agents**: Validation Agent, Output Review Agent

## Directory Role in Pipeline

This directory stores implementation reports produced by the Implementation Agent during Phase 6 of the pipeline. These reports document all code changes, verification results, and any deviations from the plan.

## File Naming Convention

| Pattern                    | Description               | Example                          |
| -------------------------- | ------------------------- | -------------------------------- |
| `impl_{topic}.md`          | Raw implementation report | `impl_npc_hostility.md`          |
| `impl_{topic}-reviewed.md` | After Output Review       | `impl_npc_hostility-reviewed.md` |

## Expected Document Structure

Implementation reports should contain:

1. **Summary** - What was implemented, what changed
2. **Plan Reference** - Link to the plan being executed
3. **Task Execution Log** - For each task:
   - Task number and description
   - Files modified (with before/after)
   - Verification results
   - Deviations (if any) with justification
4. **Deviations Summary** - All plan deviations in one place
5. **Build/Test Results** - Output of verification commands
6. **Known Issues** - Any problems discovered during implementation

## Quality Criteria

Implementation reports must:

- ✅ Document every task outcome
- ✅ Include verification command outputs
- ✅ Explain all deviations from plan
- ✅ Note any new issues discovered
- ✅ Reference specific commits/changes

Implementation reports must NOT:

- ❌ Skip verification steps
- ❌ Make undocumented changes
- ❌ Deviate without justification
- ❌ Leave tasks partially complete

## Integration Notes

- **Input**: Reviewed plan from `.github/agents/planning/`
- **Output**: `impl_{topic}.md` → Output Review Agent
- **Triggers Validation**: After review, regardless of grade
- **Checkpoints**: Rollback Agent MUST create checkpoint before implementation starts

## Deviation Protocol

When deviating from plan:

1. **STOP** - Don't proceed until documented
2. **Document** - Record why deviation is necessary
3. **Assess** - Is this a minor fix or major change?
4. **Proceed** - If minor, continue; if major, consult user

Minor deviations: Typos in plan, obvious corrections
Major deviations: Different approach, skipped tasks, new dependencies

---

_Last updated: 2025-01-11_
