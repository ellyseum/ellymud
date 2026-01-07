---
applyTo: "**/*.{tsx,jsx,css,scss,html}"
---

# Frontend Style Guide Instructions

**STOP!** Before making any frontend/UI/styling changes, you MUST consult the style guide.

📄 **Read first**: `src/frontend/admin/STYLE_GUIDE.md`

## Critical Anti-Patterns to Avoid

These are common mistakes that break the dark theme:

| Issue | Problem | Fix |
|-------|---------|-----|
| Breadcrumbs | Dark text on dark bg (invisible) | Add inline style overrides |
| Warning badges | Yellow on yellow | Add `text-dark` class |
| Modal close button | Black X on dark header | Use `btn-close-white` |
| Form controls | CSS cascade breaks in modals | Add explicit `bg-dark text-white` |

## Quick Rules

- ✅ Always use CSS variables: `var(--accent-color)` not `#74b9ff`
- ✅ Test all text is readable on dark backgrounds
- ✅ Warning badges ALWAYS need `text-dark`
- ✅ Breadcrumbs ALWAYS need style overrides
- ✅ Modal close buttons need `btn-close-white`
- ✅ Use Bootstrap Icons (`bi-*` classes)

## Key CSS Variables

| Variable | Hex | Usage |
|----------|-----|-------|
| `--bg-primary` | `#2d3436` | Page background |
| `--bg-card` | `#3d4345` | Card container |
| `--text-primary` | `#f5f6fa` | Main text |
| `--text-secondary` | `#b2bec3` | Muted text |
| `--accent-color` | `#74b9ff` | Links, highlights |
| `--success-color` | `#00b894` | Success states |
| `--warning-color` | `#fdcb6e` | Warning (use text-dark!) |
| `--danger-color` | `#e17055` | Error states |

## Status Badges

```tsx
// ✅ CORRECT
<span className="badge bg-success">Online</span>
<span className="badge bg-warning text-dark">Inactive</span>  // text-dark required!
<span className="badge bg-danger">Error</span>

// ❌ WRONG - text may be invisible
<span className="badge bg-warning">Inactive</span>
```

## Breadcrumb Pattern

Always include style overrides:

```tsx
<nav aria-label="breadcrumb" className="mb-3">
  <ol className="breadcrumb">
    <li className="breadcrumb-item"><a href="#">Parent</a></li>
    <li className="breadcrumb-item active">Current</li>
  </ol>
</nav>

<style>{`
  .breadcrumb { background: #21262d; padding: 12px 16px; border-radius: 6px; }
  .breadcrumb-item a { color: #58a6ff; }
  .breadcrumb-item.active { color: #c9d1d9; }
  .breadcrumb-item + .breadcrumb-item::before { color: #8b949e; }
`}</style>
```

## Modal Pattern

```tsx
<button className="btn-close btn-close-white" onClick={closeModal} />
```

## For Full Reference

See `src/frontend/admin/STYLE_GUIDE.md` for:
- Complete color palette
- All component patterns
- Chart.js styling
- Bootstrap overrides
