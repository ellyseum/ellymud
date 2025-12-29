# Agent Ecosystem Changelog

All notable changes to the EllyMUD agent ecosystem are documented here.

## [1.1.0] - 2025-12-29

Major update to the agent ecosystem with new testing agents, comprehensive improvements based on 24 grade reports, and significant infrastructure enhancements.

### New Agents

- **Unit Test Creator Agent** (`unit-test-creator.agent.md`)
  - Creates individual test files with comprehensive coverage
  - Follows project conventions and ESLint compliance
  - Produces high-quality, idiomatic unit tests

- **Unit Test Orchestrator Agent** (`unit-test-orchestrator.agent.md`)
  - Coordinates test generation across the codebase
  - Analyzes coverage and delegates to Unit Test Creator
  - Tracks progress and manages test generation campaigns

- **E2E Tester Agent** (`e2e-tester.agent.md`)
  - Programmatic end-to-end testing using MCP tools
  - Verifies features work correctly from a player's perspective
  - Integrated with TesterAgent class for Jest E2E tests
  - Full time/state control with snapshot-based state management

### Agent Improvements (Update Plan UP-20251225-001)

Based on analysis of 24 grade reports across 5 pipelines:

#### Research Agent (6 changes)
- Add citation verification step (P0)
- Add scope boundaries to Core Principles
- Standardize assumption format
- Require test scenarios as tables
- Add code snippet guidelines
- Add document integrity checks

#### Planning Agent (6 changes)
- Add verify all references to Core Principles (P0)
- Add line number precision requirement
- Add edge case identification checklist
- Add multi-part plan coordination guidance
- Add stateful class requirements
- Add TypeScript best practices

#### Implementation Agent (6 changes)
- Add deferral policy to Core Principles
- Add documenting unplanned changes requirement (P1)
- Add metric verification using tools
- Add report conciseness guidelines
- Add deviation documentation format
- Add handoff section requirements
- Add EllyMUD coding pitfalls section

#### Validation Agent (7 changes)
- Add mandatory regression checks section (P0)
- Add safe server cleanup compliance
- Add verbatim test output requirement
- Add file metric verification
- Add build evidence requirements
- Add appendix guidelines
- Add stats file requirement

#### Post-Mortem Agent (6 changes)
- Add mandatory agent diffs requirement (P0)
- Add action item ownership requirements
- Add token estimation methodology
- Add appendix completeness requirement
- Add review agent analysis section
- Add action item specificity requirements

#### Documentation Updater Agent (4 changes)
- Add when to update each file type guidance (P1)
- Add ASCII diagram clarification for README.md
- Add verification evidence requirements
- Add document length management for AGENTS.md

### Pipeline Enhancements

- **Mandatory Output Review Steps**: All main agent outputs now require Output Review Agent approval before proceeding (Phases 11.4 and 12.5)
- **Mandatory Delegation**: Added explicit runSubagent delegation instructions to Problem Solver phases 2, 4, 6, 8, 11.4, 12.5
- **Pipeline Metrics Finalization**: Added mandatory 'FINALIZE PIPELINE METRICS' step (todo item #18) with explicit metrics checklist
- **17-Step Pipeline**: Updated todo list template to show all 17 pipeline steps including reviews

### New Infrastructure

- **Agent Updater System** (`agent-updater.agent.md`)
  - Analyzes grade reports across all agents
  - Aggregates improvement suggestions
  - Creates update plans for the agent ecosystem
  - Tracks processed grades in update-matrix.md

- **Pipeline Metrics Dashboard**
  - Professional Node.js dashboard for viewing pipeline executions
  - Auto-generates pipeline report on startup
  - Interactive charts with Chart.js (stage performance, token usage, complexity, tool usage, duration)
  - API endpoints: `/api/stats`, `/api/executions`, `/api/summary`, `/api/report`
  - Stage report browsing: `/research`, `/planning`, `/implementation`, `/validation`
  - Usage: `node .github/agents/metrics/server.js [port]` (default: 3200)

- **Updates Directory** (`.github/agents/updates/`)
  - AGENTS.md: LLM context for the updates system
  - README.md: Human-readable documentation
  - update-matrix.md: Grade tracking matrix for processed grades

- **Documentation Directory** (`.github/agents/documentation/`)
  - Added README.md and AGENTS.md for documentation agent outputs

### Testing Infrastructure

- **TesterAgent Class**: Programmatic E2E testing with full time/state control
- **StateLoader**: Snapshot-based state management for tests
- **Test Mode Options**: Random high ports to avoid conflicts
- **MCP Tools**: `advance_game_ticks`, `get_game_tick`, `set_test_mode` for time control
- **Fresh Snapshot**: Added `data/test-snapshots/fresh/` for baseline state

### Pipeline Metrics Schema Enhancements

- Add `statsFiles` object to reference individual agent stats files
- Add `outputs` object with original/reviewed/gradeReport/summary/changeSuggestions
- Add `aggregatedFromStats` for totals from stats files (toolCalls, tokens, quality)
- Add `score`, `verdict`, `skipped`, `tokensUsed`, `statsFile` to stageMetrics
- Add `stageOutputFiles` definition for consistent output tracking
- Add `endDate` and `filesReverted` fields

### Documentation Updates

- Add `.github/` README prohibition rule (NEVER create `.github/README.md`)
- Add TypeScript types convention (#8): no `any`/`Function` types
- Add Jest deprecated flags warning (`--testPathPattern` → `--testPathPatterns`)
- Add critical line ending bug warning for command output

### Agents Updated

All 13 agents updated to version 1.1.0:

- `agent-post-mortem.agent.md`
- `agent-updater.agent.md`
- `documentation-updater.agent.md`
- `e2e-tester.agent.md`
- `implementation-agent.agent.md`
- `output-review.agent.md`
- `planning-agent.agent.md`
- `problem-solver-orchestrator-manager.agent.md`
- `research-agent.agent.md`
- `rollback.agent.md`
- `unit-test-creator.agent.md`
- `unit-test-orchestrator.agent.md`
- `validation-agent.agent.md`

---

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
