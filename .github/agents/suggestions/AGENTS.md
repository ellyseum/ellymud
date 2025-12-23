# Suggestions Directory - LLM Context

> **Purpose**: Storage for Post-Mortem Agent improvement suggestions
> **Owner Agent**: Agent Post-Mortem Agent
> **Consumer Agents**: Human reviewers, Orchestrator (for future runs)

## Directory Role in Pipeline

This directory stores improvement suggestions produced by the Post-Mortem Agent during Phase 11 of the pipeline. These suggestions capture lessons learned and propose enhancements to the agent ecosystem.

## File Naming Convention

| Pattern                  | Description             | Example                        |
| ------------------------ | ----------------------- | ------------------------------ |
| `suggestions_{topic}.md` | Post-mortem suggestions | `suggestions_npc_hostility.md` |
| `improvements_{date}.md` | Batch improvements      | `improvements_2025-01-11.md`   |

## Expected Document Structure

Suggestion documents should contain:

1. **Pipeline Summary** - Which pipeline run this analyzes
2. **What Worked Well** - Successes to replicate
3. **What Didn't Work** - Issues to address
4. **Lessons Learned** - Key takeaways
5. **Improvement Proposals** - Specific changes to:
   - Agent instructions
   - Pipeline workflow
   - Quality gates
   - Documentation
6. **Priority Ranking** - Which improvements matter most
7. **Implementation Effort** - Estimate for each proposal

## Quality Criteria

Suggestion documents must:

- ✅ Reference specific pipeline outputs
- ✅ Provide evidence for each finding
- ✅ Include actionable improvements
- ✅ Prioritize by impact
- ✅ Estimate implementation effort

Suggestion documents must NOT:

- ❌ Make vague recommendations
- ❌ Propose changes without evidence
- ❌ Skip analysis of any pipeline stage
- ❌ Ignore failed or struggling stages

## Integration Notes

- **Input**: All pipeline outputs (research → validation)
- **Output**: `suggestions_{topic}.md` → Human review
- **Action**: Humans decide which suggestions to implement
- **Feedback Loop**: Accepted suggestions update agent instructions

## Improvement Categories

| Category           | Examples                                            |
| ------------------ | --------------------------------------------------- |
| Agent Instructions | Add new checklist items, clarify ambiguous sections |
| Pipeline Workflow  | Add/remove stages, change gate criteria             |
| Quality Gates      | Adjust grade thresholds, add new checks             |
| Documentation      | Update README files, add examples                   |
| Tooling            | New test cases, metrics improvements                |

## Acting on Suggestions

1. **Review** - Human reviews suggestions
2. **Prioritize** - Select high-impact, low-effort items
3. **Implement** - Update agent files directly
4. **Test** - Run pipeline again to verify
5. **Archive** - Move implemented suggestions to archive

---

_Last updated: 2025-01-11_
