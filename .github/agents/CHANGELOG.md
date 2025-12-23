# Agent Ecosystem Changelog

All notable changes to the EllyMUD agent ecosystem are documented here.

## [1.0.0] - 2025-12-22

Initial release of the multi-agent development pipeline.

### Core Agents

- **Problem Solver Orchestrator** (`problem-solver-orchestrator-manager.agent.md`)
  - Master orchestration agent for 12-phase pipeline
  - Complexity assessment and routing (Trivial → Critical)
  - Fast-Track Mode for simple tasks
  - Instant Mode for immediate execution
  - Timeout configuration per agent
  - Emergency stop protocol
  - runSubagent delegation guidance

- **Research Agent** (`research-agent.agent.md`)
  - Exhaustive codebase exploration
  - Pattern analysis and constraint mapping
  - Produces research documents in `.github/agents/research/`

- **Planning Agent** (`planning-agent.agent.md`)
  - Task decomposition and solution design
  - Risk mitigation strategies
  - Produces implementation plans in `.github/agents/planning/`

- **Implementation Agent** (`implementation-agent.agent.md`)
  - Code execution with verification steps
  - Deviation tracking
  - Produces implementation reports in `.github/agents/implementation/`

- **Validation Agent** (`validation-agent.agent.md`)
  - Quality verification and test execution
  - APPROVED/REJECTED verdicts
  - Produces validation reports in `.github/agents/validation/`

- **Output Review Agent** (`output-review.agent.md`)
  - Document grading (0-100 scale)
  - Quality gate enforcement (≥80 to proceed)
  - Automatic rewriting of low-quality outputs

- **Rollback Agent** (`rollback.agent.md`)
  - Git stash-based checkpoint system
  - 6 operations: CREATE, LIST, PREVIEW_DIFF, ROLLBACK, DISCARD, EMERGENCY_ROLLBACK
  - Integrated at Phase 4.5 (checkpoint) and Phase 9 (recovery)

- **Post-Mortem Agent** (`agent-post-mortem.agent.md`)
  - Pipeline analysis after every run
  - Lessons learned extraction
  - Resource usage analysis and token estimation
  - Produces suggestions in `.github/agents/suggestions/`

- **Documentation Updater Agent** (`documentation-updater.agent.md`)
  - Dual documentation (README.md for humans, AGENTS.md for LLMs)
  - Automated doc maintenance across directories

### YAML Frontmatter Configuration

Each agent includes YAML frontmatter with VS Code 1.107+ properties:

#### Model Assignments

| Agent                 | Model           | Reasoning                                            |
| --------------------- | --------------- | ---------------------------------------------------- |
| Problem Solver        | Claude 4.5 Opus | Best reasoning for orchestration decisions           |
| Research              | Gemini 2.5 Pro  | 1M token context for exhaustive codebase exploration |
| Planning              | Claude 4.5 Opus | Best reasoning for task decomposition                |
| Implementation        | Claude 4.5 Opus | Precise code generation                              |
| Validation            | Gemini 2.5 Pro  | Large context to analyze all changes + original code |
| Output Review         | Claude 4.5 Opus | Excellent writing and editing                        |
| Rollback              | Claude 4.5 Opus | Precision critical for destructive operations        |
| Documentation Updater | Claude 4.5 Opus | Technical writing excellence                         |
| Post-Mortem           | Gemini 2.5 Pro  | Must analyze ALL pipeline artifacts                  |

#### Inference Settings

| Agent                 | `infer` | Reason                                                 |
| --------------------- | ------- | ------------------------------------------------------ |
| Problem Solver        | `false` | Master orchestrator - should NOT be called as subagent |
| Research              | `true`  | Can be delegated to for codebase research              |
| Planning              | `true`  | Can be delegated to for task planning                  |
| Implementation        | `true`  | Can be delegated to for code execution                 |
| Validation            | `true`  | Can be delegated to for verification                   |
| Output Review         | `true`  | Can be delegated to for document grading               |
| Rollback              | `true`  | Can be delegated to for checkpoint/recovery            |
| Documentation Updater | `true`  | Can be delegated to for doc maintenance                |
| Post-Mortem           | `true`  | Can be delegated to for pipeline analysis              |

#### Tool Restrictions

Agents have explicit tool allowlists to prevent accidental actions:

| Agent                 | Tools                     | Restriction               |
| --------------------- | ------------------------- | ------------------------- |
| Research              | read-only + fetch         | Cannot modify files       |
| Planning              | read-only + create_file   | Can only create plan docs |
| Implementation        | full editing              | Full access               |
| Validation            | read + terminal + MCP     | Can run tests, not edit   |
| Output Review         | read + write docs         | Limited to documents      |
| Rollback              | terminal only             | Git commands only         |
| Documentation Updater | read + write docs         | Limited to docs           |
| Post-Mortem           | read + create suggestions | Cannot modify code        |

#### Pipeline Handoffs

Handoff buttons enable guided workflow transitions:

```
Problem Solver ──┬──▶ [Start Research] ──▶ Research Agent
                 └──▶ [Quick Implementation] ──▶ Implementation Agent

Research ──▶ [Review Research] ──▶ Output Review

Planning ──┬──▶ [Review Plan] ──▶ Output Review
           └──▶ [Create Checkpoint] ──▶ Rollback

Implementation ──┬──▶ [Review Implementation] ──▶ Output Review
                 └──▶ [Validate Changes] ──▶ Validation

Validation ──┬──▶ [Approve & Post-Mortem] ──▶ Post-Mortem
             └──▶ [Reject & Rollback] ──▶ Rollback

Post-Mortem ──▶ [Update Docs] ──▶ Documentation Updater

Rollback ──▶ [Resume Planning] ──▶ Planning
```

#### Argument Hints

| Agent                 | Hint                                                                |
| --------------------- | ------------------------------------------------------------------- |
| Problem Solver        | "Describe the problem, bug, or feature you want to implement"       |
| Research              | "Describe what aspect of the codebase to research"                  |
| Planning              | "Provide the research document path or describe the task to plan"   |
| Implementation        | "Provide the implementation plan path to execute"                   |
| Validation            | "Provide the implementation report path to validate"                |
| Output Review         | "Provide the document path to review and grade"                     |
| Rollback              | "Operation: CREATE, LIST, ROLLBACK, or EMERGENCY_ROLLBACK"          |
| Documentation Updater | "Specify directories to audit or 'full' for complete scan"          |
| Post-Mortem           | "Provide the task name or 'latest' to analyze most recent pipeline" |

### Todo List Management

All agents include a **Todo List Management** section instructing them to:

- Use the `manage_todo_list` tool to track progress through tasks
- Create todos at the START of every session
- Mark ONE todo as `in-progress` before starting work
- Mark todos as `completed` IMMEDIATELY when done
- Update todo status in real-time—never batch updates

### Tool Reference Documentation

Each agent includes a **Tool Reference** section documenting:

- Each tool available in the YAML frontmatter
- **Purpose**: What the tool does
- **When to Use**: Specific scenarios for using the tool
- **Example**: Concrete usage example
- **Tips**: Best practices and gotchas

| Agent                 | Tools Documented                                                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Research              | search, read_file, grep_search, semantic_search, file_search, list_dir, fetch_webpage, githubRepo, create_file, replace_string_in_file         |
| Planning              | search, read_file, grep_search, semantic_search, file_search, list_dir, create_file, replace_string_in_file                                    |
| Implementation        | search, read_file, grep_search, file_search, list_dir, create_file, replace_string_in_file, run_in_terminal, get_errors                        |
| Validation            | search, read_file, grep_search, file_search, list_dir, run_in_terminal, get_errors, ellymud-mcp-server/\*, create_file, replace_string_in_file |
| Output Review         | read_file, create_file, replace_string_in_file                                                                                                 |
| Rollback              | run_in_terminal, get_changed_files, create_file, replace_string_in_file                                                                        |
| Post-Mortem           | search, read_file, list_dir, file_search, create_file, replace_string_in_file                                                                  |
| Documentation Updater | search, read_file, list_dir, file_search, create_file, replace_string_in_file                                                                  |
| Problem Solver        | Handoff documentation (Research Agent, Implementation Agent)                                                                                   |

### Infrastructure

- **Pipeline Directories**
  - `.github/agents/research/` - Research document storage
  - `.github/agents/planning/` - Implementation plan storage
  - `.github/agents/implementation/` - Implementation report storage
  - `.github/agents/validation/` - Validation report storage
  - `.github/agents/suggestions/` - Post-mortem suggestions storage

- **Architecture Documentation**
  - `ARCHITECTURE.md` - Visual pipeline flow and agent roster
  - `CHANGELOG.md` - This file

### Pipeline Features

- 12-phase pipeline with quality gates
- Grade threshold: B (80/100) minimum between stages
- Safety checkpoints before implementation
- Automatic rollback on validation failure
- Post-mortem analysis on every run

---

## Version Format

Semantic versioning:

- **MAJOR**: Breaking changes to agent interface or project
- **MINOR**: New capabilities, backward compatible
- **PATCH**: Bug fixes, documentation updates

---

_Maintained by: Agent Post-Mortem Agent_
