# GitHub Configuration - LLM Context

> **For LLMs**: This file provides comprehensive context for working with GitHub configuration.
> **For humans**: See [README.md](README.md) for a brief overview.

## Overview

GitHub-specific configuration files that enhance the development workflow. Contains issue templates, PR templates, and the multi-agent AI development pipeline that powers automated development tasks.

## Directory Structure

```
.github/
├── README.md                    # Human-readable overview
├── AGENTS.md                    # This file (LLM context)
├── PULL_REQUEST_TEMPLATE.md     # PR template with checklist
├── ISSUE_TEMPLATE/              # Issue templates
│   ├── bug_report.md
│   ├── feature_request.md
│   ├── documentation.md
│   └── question.md
└── agents/                      # AI agent ecosystem
    ├── AGENTS.md                # Agent ecosystem context
    ├── *-agent.agent.md         # Individual agent definitions
    ├── research/                # Research outputs
    ├── planning/                # Planning outputs
    ├── implementation/          # Implementation reports
    ├── validation/              # Validation reports
    ├── suggestions/             # Improvement suggestions
    ├── metrics/                 # Pipeline metrics
    └── agent-tests/             # Agent testing framework
```

## File Reference

### `PULL_REQUEST_TEMPLATE.md`

**Purpose**: Standard PR template ensuring contributors provide complete information

**Sections**:
- Description and linked issue
- Type of change (bug fix, feature, breaking change, etc.)
- Testing methodology and configuration
- Code quality checklist
- Documentation checklist

**Usage**: Automatically populated when creating PRs on GitHub

### `ISSUE_TEMPLATE/`

**Purpose**: Structured templates for different issue types

| Template | Use Case | Required Fields |
|----------|----------|-----------------|
| `bug_report.md` | Reporting bugs | Steps to reproduce, expected behavior, actual behavior |
| `feature_request.md` | Proposing features | Problem statement, proposed solution, alternatives |
| `documentation.md` | Doc issues | Location, current content, suggested improvement |
| `question.md` | Questions | Context, what you've tried |

### `agents/`

**Purpose**: Multi-agent AI development pipeline for complex tasks

**Core Agents**:
| Agent | File | Role |
|-------|------|------|
| Problem Solver | `problem-solver-orchestrator-manager.agent.md` | Main coordinator |
| Research | `research-agent.agent.md` | Codebase investigation |
| Planning | `planning-agent.agent.md` | Implementation planning |
| Implementation | `implementation-agent.agent.md` | Code execution |
| Validation | `validation-agent.agent.md` | Quality verification |

**Support Agents**:
| Agent | File | Role |
|-------|------|------|
| Rollback | `rollback.agent.md` | Safety checkpoints |
| Post-Mortem | `agent-post-mortem.agent.md` | Pipeline analysis |
| Output Review | `output-review.agent.md` | Document quality |
| Docs Updater | `documentation-updater.agent.md` | README/AGENTS maintenance |

**Full documentation**: See [agents/AGENTS.md](agents/AGENTS.md)

## Working with Templates

### Creating Issues
Templates auto-populate when creating issues. Ensure:
- Use appropriate template for issue type
- Fill all required sections
- Include reproduction steps for bugs
- Add relevant labels if access permits

### Creating PRs
The PR template includes checklists:

```markdown
### Code Quality
- [ ] My code follows the style guidelines
- [ ] I have performed self-review
- [ ] My changes generate no new warnings
- [ ] I have checked my code builds successfully

### Testing
- [ ] I have tested manually
- [ ] I have tested Telnet and WebSocket (if applicable)
- [ ] I have tested as user and admin (if applicable)
```

## Working with Agents

### Invoking the Pipeline
```
"Using the agent pipeline, implement [feature]"
```

### Direct Agent Invocation
Each agent can be invoked directly via VS Code's agent system:
- `@Research` - Investigate codebase
- `@Plan` - Create implementation plan
- `@Implementation` - Execute plan
- `@Validation` - Verify changes
- `@Documentation Updater` - Update docs

### Pipeline Outputs
Agents produce structured outputs in their directories:
- `research/research_YYYY-MM-DD_slug.md`
- `planning/plan_YYYY-MM-DD_slug.md`
- `implementation/impl_YYYY-MM-DD_slug.md`
- `validation/validation_YYYY-MM-DD_slug.md`

## Conventions

### Template Maintenance
When modifying templates:
```yaml
# ✅ Correct - Include YAML frontmatter
---
name: Bug Report
about: Report a bug
labels: ['bug', 'triage']
---

# ❌ Incorrect - Missing frontmatter
## Bug Report
```

### Agent Modifications
When modifying agent definitions:
- Test with the agent test framework
- Update AGENTS.md if behavior changes
- Ensure prompts are unambiguous
- Validate output format matches expectations

## Gotchas & Warnings

- ⚠️ **Template Names**: Template filenames affect GitHub's auto-detection
- ⚠️ **Agent Outputs**: Don't manually edit agent output directories—they're auto-generated
- ⚠️ **Pipeline State**: Agent pipeline maintains state in output files—preserve these for debugging
- ⚠️ **YAML Frontmatter**: Issue templates require valid YAML frontmatter to work correctly

## Related Context

- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) - Contribution guidelines
- [`agents/AGENTS.md`](agents/AGENTS.md) - Full agent ecosystem documentation
- [`agents/agent-tests/`](agents/agent-tests/) - Agent testing framework
