# Issue Templates - LLM Context

> **For LLMs**: Comprehensive context for working with GitHub issue templates.
> **For humans**: See [README.md](README.md) for a brief overview.

## Overview

The `ISSUE_TEMPLATE/` directory contains GitHub issue templates that standardize how contributors report bugs, request features, report documentation issues, and ask questions. Each template uses YAML frontmatter for GitHub's template picker.

## File Reference

### `bug_report.md`

**Purpose**: Structured bug report template

**Frontmatter**:

```yaml
---
name: Bug Report
about: Report a bug to help us improve EllyMUD
title: '[BUG] '
labels: bug
assignees: ''
---
```

**Key Sections**:

- Bug description
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, connection method)
- Screenshots/logs section

### `feature_request.md`

**Purpose**: Feature proposal template

**Frontmatter**:

```yaml
---
name: Feature Request
about: Suggest a new feature or enhancement for EllyMUD
title: '[FEATURE] '
labels: enhancement
assignees: ''
---
```

**Key Sections**:

- Feature description
- Problem statement
- Proposed and alternative solutions
- Use cases and benefits
- Implementation ideas

### `documentation.md`

**Purpose**: Documentation issue reporting

**Frontmatter**:

```yaml
---
name: Documentation Issue
about: Report an issue with documentation
title: '[DOCS] '
labels: documentation
assignees: ''
---
```

**Key Sections**:

- Documentation issue description
- Location (file, section, line)
- Issue type checklist (incorrect, outdated, missing, unclear, typo, broken link)
- Current documentation quote
- Suggested improvement

### `question.md`

**Purpose**: General questions about using or developing EllyMUD

**Frontmatter**:

```yaml
---
name: Question
about: Ask a question about using or developing EllyMUD
title: '[QUESTION] '
labels: question
assignees: ''
---
```

**Key Sections**:

- Clear question statement
- Context
- What has been tried (docs checked, issues searched)
- Environment (if relevant)

## Conventions

### Template Structure

All templates follow this pattern:

```markdown
---
name: Template Name
about: Brief description for picker
title: '[PREFIX] '
labels: label1, label2
assignees: ''
---

## Main Section

Instructions for what to fill in...

## Supporting Section

Additional context requests...
```

### Label Conventions

| Template        | Auto-Label      |
| --------------- | --------------- |
| Bug Report      | `bug`           |
| Feature Request | `enhancement`   |
| Documentation   | `documentation` |
| Question        | `question`      |

## Common Tasks

### Adding a New Template

1. Create new `.md` file in this directory
2. Add YAML frontmatter with required fields:
   - `name`: Display name in template picker
   - `about`: Description shown in picker
   - `title`: Prefix for issue titles
   - `labels`: Comma-separated labels to auto-apply
3. Structure the body with clear sections

```markdown
---
name: New Template
about: Description for this template type
title: '[PREFIX] '
labels: new-label
assignees: ''
---

## Section Title

What to provide here...
```

### Modifying Existing Templates

Edit the template file directly. Changes apply to new issues immediately.

## Gotchas & Warnings

- ⚠️ **Frontmatter Required**: Without YAML frontmatter, template won't appear in GitHub's picker
- ⚠️ **Title Prefix**: Include trailing space in `title: '[PREFIX] '` for clean formatting
- ⚠️ **Label Case**: Labels are case-sensitive; ensure they match existing repository labels
- ⚠️ **Markdown in Templates**: Use fenced code blocks carefully - GitHub renders them in the template

## Related Context

- [`../`](../) - Parent `.github/` directory with PR template
- [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md) - Guidelines for contributors
- [`../../CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md) - Community standards
