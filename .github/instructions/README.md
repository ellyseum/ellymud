# Instructions Directory

This directory contains instruction files that are automatically loaded by Copilot for specific file patterns.

## Files

| File | Applies To | Purpose |
|------|------------|---------|
| `frontend-style-guide.instructions.md` | `**/*.{tsx,jsx,css,scss,html}` | Frontend styling guidelines |

## How It Works

Files matching the `applyTo` glob pattern in the frontmatter will automatically have the corresponding instruction file loaded as context.

See `.github/copilot-instructions.md` for global instructions.
