# Validation Directory - LLM Context

> **Purpose**: Storage for Validation Agent outputs
> **Owner Agent**: Validation Agent
> **Consumer Agents**: Orchestrator, Rollback Agent (on failure)

## Directory Role in Pipeline

This directory stores validation reports produced by the Validation Agent during Phase 8 of the pipeline. These reports determine whether implementations are ready for merge or require remediation.

## File Naming Convention

| Pattern                          | Description           | Example                                |
| -------------------------------- | --------------------- | -------------------------------------- |
| `validation_{topic}.md`          | Raw validation report | `validation_npc_hostility.md`          |
| `validation_{topic}-reviewed.md` | After Output Review   | `validation_npc_hostility-reviewed.md` |

## Expected Document Structure

Validation reports should contain:

1. **Verdict** - APPROVED or REJECTED (prominently displayed)
2. **Summary** - High-level assessment
3. **Checklist Results** - Each success criterion checked:
   - ✅ Passed / ❌ Failed / ⚠️ Warning
   - Evidence for each check
4. **Test Results** - Output of test commands
5. **Code Quality** - Linting, type checking, style
6. **Issues Found** - Detailed list of any problems
7. **Remediation Required** - What needs fixing (if REJECTED)

## Quality Criteria

Validation reports must:

- ✅ Check every success criterion from plan
- ✅ Include actual test output
- ✅ Provide clear APPROVED/REJECTED verdict
- ✅ List all issues with severity
- ✅ Include remediation steps for failures

Validation reports must NOT:

- ❌ Fix issues (only report them)
- ❌ Approve without evidence
- ❌ Skip any success criteria
- ❌ Leave verdict ambiguous

## Integration Notes

- **Input**: Implementation report + plan + research
- **Output**: `validation_{topic}.md` → Orchestrator
- **On APPROVED**: Pipeline proceeds to PR creation
- **On REJECTED**: Rollback Agent activated, then back to Implementation

## Verdict Criteria

**APPROVED** requires:

- All success criteria pass
- No critical/high severity issues
- Build passes
- Tests pass

**REJECTED** triggers:

- Any success criterion fails
- Critical issue found
- Build fails
- Tests fail

## Rollback Integration

When verdict is REJECTED:

1. Orchestrator receives REJECTED status
2. Rollback Agent offers options:
   - ROLLBACK to pre-implementation checkpoint
   - PARTIAL rollback of specific files
   - CONTINUE with fixes (no rollback)
3. Implementation Agent receives remediation tasks
4. Validation runs again after fixes

---

_Last updated: 2025-01-11_
