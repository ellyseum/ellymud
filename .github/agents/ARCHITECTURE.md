# Agent Pipeline Architecture

> **Version**: 1.0.0 | **Last Updated**: 2025-01-11

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER REQUEST                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PROBLEM SOLVER (ORCHESTRATOR)                             │
│  ┌─────────────┐                                                            │
│  │ Complexity  │──▶ TRIVIAL/LOW ──▶ Fast-Track Mode (skip to implementation)│
│  │ Assessment  │──▶ MEDIUM/HIGH ──▶ Full Pipeline                           │
│  └─────────────┘                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│   RESEARCH    │          │   PLANNING    │          │IMPLEMENTATION │
│    AGENT      │          │    AGENT      │          │    AGENT      │
│               │          │               │          │               │
│ • Codebase    │          │ • Task        │          │ • Code        │
│   exploration │          │   breakdown   │          │   changes     │
│ • Pattern     │          │ • Solution    │          │ • Verification│
│   analysis    │          │   design      │          │ • Deviation   │
│ • Constraints │          │ • Risk        │          │   tracking    │
│   mapping     │          │   mitigation  │          │               │
└───────┬───────┘          └───────┬───────┘          └───────┬───────┘
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│ .github/      │          │ .github/      │          │ .github/      │
│ research/     │          │ planning/     │          │ implementation│
└───────┬───────┘          └───────┬───────┘          └───────┬───────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OUTPUT REVIEW AGENT                                  │
│                                                                             │
│  Grades each document (0-100). Must score ≥80 to proceed.                   │
│  Rewrites low-quality outputs. Produces *-reviewed.md files.                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          VALIDATION AGENT                                    │
│                                                                             │
│  Verifies implementation against plan. Runs tests. Issues verdict:          │
│  ✅ APPROVED → Proceed to merge    ❌ REJECTED → Trigger rollback           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
            ┌───────────────┐              ┌───────────────┐
            │   APPROVED    │              │   REJECTED    │
            └───────┬───────┘              └───────┬───────┘
                    │                               │
                    │                               ▼
                    │                      ┌───────────────┐
                    │                      │   ROLLBACK    │
                    │                      │    AGENT      │
                    │                      │               │
                    │                      │ • Restore     │
                    │                      │   checkpoint  │
                    │                      │ • Partial     │
                    │                      │   rollback    │
                    │                      └───────┬───────┘
                    │                               │
                    │                               ▼
                    │                      ┌───────────────┐
                    │                      │  Back to      │
                    │                      │  Implementation│
                    │                      └───────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         POST-MORTEM AGENT                                    │
│                                                                             │
│  Analyzes complete pipeline. Extracts lessons. Proposes improvements.       │
│  Outputs to .github/agents/suggestions/                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DOCUMENTATION UPDATER AGENT                             │
│                                                                             │
│  Updates README.md (humans) and AGENTS.md (LLMs) across affected dirs.      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Pipeline Phases

| Phase | Agent | Input | Output | Quality Gate |
|-------|-------|-------|--------|--------------|
| 0 | Orchestrator | User request | Problem statement | User confirmation |
| 1 | Research | Problem statement | Research document | - |
| 2 | Output Review | Research doc | Reviewed research | Grade ≥ 80 |
| 3 | Planning | Reviewed research | Implementation plan | - |
| 4 | Output Review | Plan | Reviewed plan | Grade ≥ 80 |
| 4.5 | Rollback | - | Git checkpoint | Checkpoint created |
| 5 | Implementation | Reviewed plan | Code changes + report | - |
| 6 | Output Review | Impl report | Reviewed report | Grade ≥ 80 |
| 7 | Validation | All artifacts | Validation report | - |
| 8 | Output Review | Validation report | Reviewed validation | Grade ≥ 80 |
| 9 | Orchestrator | Verdict | Decision | APPROVED/REJECTED |
| 10 | Post-Mortem | All outputs | Suggestions | - |
| 11 | Doc Updater | Changes | Updated docs | - |

---

## Agent Roster

| Agent | File | Role | Version |
|-------|------|------|---------|
| Problem Solver | `problem-solver-orchestrator-manager.agent.md` | Master orchestration | 1.2.0 |
| Research | `research-agent.agent.md` | Codebase investigation | 1.0.0 |
| Planning | `planning-agent.agent.md` | Solution design | 1.0.0 |
| Implementation | `implementation-agent.agent.md` | Code execution | 1.0.0 |
| Validation | `validation-agent.agent.md` | Quality verification | 1.0.0 |
| Output Review | `output-review.agent.md` | Document quality | 1.0.0 |
| Rollback | `rollback.agent.md` | Safety checkpoints | 1.0.0 |
| Post-Mortem | `agent-post-mortem.agent.md` | Continuous improvement | 1.1.0 |
| Documentation Updater | `documentation-updater.agent.md` | Doc maintenance | 1.0.0 |

---

## Output Directories

| Directory | Purpose | Owner Agent |
|-----------|---------|-------------|
| `.github/agents/research/` | Research documents | Research Agent |
| `.github/agents/planning/` | Implementation plans | Planning Agent |
| `.github/agents/implementation/` | Implementation reports | Implementation Agent |
| `.github/agents/validation/` | Validation reports | Validation Agent |
| `.github/agents/suggestions/` | Improvement proposals | Post-Mortem Agent |
| `.github/agents/summaries/` | Work session summaries | Work Summarizer |
| `.github/agents/metrics/` | Pipeline metrics | Orchestrator |
| `.github/agents/agent-tests/` | Agent test cases | QA |

---

## Safety Mechanisms

### Checkpoints (Rollback Agent)
- Created before implementation begins (Phase 4.5)
- Git stash-based snapshots
- Enable instant rollback on validation failure

### Quality Gates (Output Review Agent)
- Grade threshold: 80/100 minimum
- Documents below threshold are rewritten
- Prevents low-quality outputs from cascading

### Emergency Stop
- Trigger phrases: "STOP", "ABORT", "HALT", "EMERGENCY"
- Saves current state immediately
- Offers recovery options

### Timeouts
| Agent | Default Timeout |
|-------|-----------------|
| Research | 10 minutes |
| Planning | 8 minutes |
| Implementation | 15 minutes |
| Validation | 10 minutes |
| Output Review | 5 minutes |

---

## Fast-Track Mode

For TRIVIAL/LOW complexity tasks:

```
User Request → Orchestrator → Implementation → Validation → Done
```

Skips: Research, Planning, full review cycles

Criteria:
- Single file changes
- Well-understood patterns
- No architectural impact
- Clear success criteria

---

## Delegation Mechanism

The orchestrator uses `runSubagent` to invoke specialized agents:

```
Orchestrator
    │
    ├──▶ runSubagent(Research Agent, prompt)
    │         └──▶ Returns: research summary
    │
    ├──▶ runSubagent(Output Review, prompt)
    │         └──▶ Returns: grade + reviewed doc
    │
    ├──▶ runSubagent(Planning Agent, prompt)
    │         └──▶ Returns: plan summary
    │
    └──▶ ... continues through pipeline
```

Each sub-agent:
- Receives explicit instructions (no inherited context)
- Writes output to specified location
- Returns summary to orchestrator
- Has no knowledge of other agents

---

## VS Code 1.107+ Integration

As of VS Code 1.107.1, agents have native support for:

### Native Subagent Delegation

VS Code now recognizes custom agents as subagents. The `infer` metadata controls visibility:

| Agent | infer | Description |
|-------|-------|-------------|
| Problem Solver | false | Master orchestrator (never delegated to) |
| Research | true | Codebase investigation |
| Plan | true | Task planning |
| Implementation | true | Code execution |
| Validation | true | Quality verification |
| Output Review | true | Document grading |
| Rollback | true | Checkpoint/recovery |
| Documentation Updater | true | Doc maintenance |
| Post-Mortem | true | Pipeline analysis |

### Background Agent Mode

Agents can now run autonomously in the background:
- Long-running pipelines continue when VS Code chat is closed
- Multiple agents can run in parallel via Git worktrees
- Sessions persist and can be resumed

### Git Worktree Isolation

Alternative to our stash-based rollback:
- Each background agent gets its own worktree
- Changes isolated per session
- Merge back to main when complete

---

*This document is auto-generated. See individual agent files for detailed specifications.*
