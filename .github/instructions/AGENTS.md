# Instructions Directory - LLM Context

This directory contains instruction files that are automatically loaded by Copilot for specific file patterns.

## File Reference

### `frontend-style-guide.instructions.md`

**Purpose**: Enforces frontend styling guidelines for dark theme consistency
**Applies To**: `**/*.{tsx,jsx,css,scss,html}`
**Key Content**:
- Critical anti-patterns to avoid (invisible breadcrumbs, warning badges, etc.)
- CSS variable requirements
- Component patterns for Bootstrap/React

## How Instructions Work

1. Files in this directory have YAML frontmatter with `applyTo` glob patterns
2. When editing files matching the pattern, the instruction content is loaded
3. This provides automatic context for maintaining conventions

## Adding New Instructions

1. Create `<name>.instructions.md` with frontmatter:
   ```yaml
   ---
   applyTo: "**/*.ext"
   ---
   ```
2. Add your instruction content after the frontmatter
3. Update this AGENTS.md and README.md with the new file

## Related

- `.github/copilot-instructions.md` - Global Copilot instructions
- `src/frontend/admin/STYLE_GUIDE.md` - Full style guide reference
