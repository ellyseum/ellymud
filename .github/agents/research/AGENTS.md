# Research Directory - LLM Context

> **Purpose**: Storage for Research Agent outputs
> **Owner Agent**: Research Agent
> **Consumer Agents**: Planning Agent, Output Review Agent

## Directory Role in Pipeline

This directory stores comprehensive research documents produced by the Research Agent during Phase 1 of the pipeline. These documents provide the evidentiary foundation for all downstream planning and implementation decisions.

## File Naming Convention

| Pattern                        | Description         | Example                              |
| ------------------------------ | ------------------- | ------------------------------------ |
| `research_{topic}.md`          | Raw research output | `research_npc_hostility.md`          |
| `research_{topic}-reviewed.md` | After Output Review | `research_npc_hostility-reviewed.md` |

## Expected Document Structure

Research documents should contain:

1. **Executive Summary** - Key findings in 2-3 sentences
2. **Problem Statement** - What we're investigating and why
3. **Current State Analysis** - Existing code, patterns, dependencies
4. **Technical Findings** - Deep dive into relevant areas
5. **Constraints & Risks** - Limitations, edge cases, concerns
6. **Recommendations** - Suggestions for Planning Agent
7. **References** - Files examined, line numbers, external sources

## Quality Criteria

Research documents must:

- ✅ Cite specific files and line numbers
- ✅ Include code snippets for key patterns
- ✅ List all dependencies and constraints
- ✅ Identify risks and edge cases
- ✅ Provide actionable recommendations

Research documents must NOT:

- ❌ Make implementation decisions
- ❌ Include speculative solutions
- ❌ Skip examination of related code
- ❌ Omit error handling considerations

## Integration Notes

- **Input**: User problem description, codebase access
- **Output**: `research_{topic}.md` → Output Review Agent
- **Triggers Planning**: Only after review grade ≥ 80/100
- **Checkpoints**: Rollback Agent creates checkpoint before research begins

## Current Contents

| File                        | Status   | Topic                            |
| --------------------------- | -------- | -------------------------------- |
| `research_npc_hostility.md` | Complete | NPC hostility persistence system |

---

_Last updated: 2025-01-11_
