# EllyMUD Admin Panel Style Guide

> **Version**: 1.0.0 | **Last Updated**: 2026-01-07 | **Theme**: Gunmetal Grey Neumorphic

This document defines the styling conventions, color palette, and component patterns for the EllyMUD admin panel. All frontend changes MUST follow these guidelines to maintain visual consistency.

---

## ⚠️ CRITICAL: Anti-Patterns to Avoid

These are common mistakes that break the dark theme. **Check these first** when debugging UI issues.

### 1. Breadcrumb Text Invisible

**❌ PROBLEM**: Bootstrap's default `.breadcrumb-item.active` uses dark/gray text, invisible on dark backgrounds.

**✅ FIX**: Always include breadcrumb style overrides:
```css
.breadcrumb { background: #21262d; padding: 12px 16px; border-radius: 6px; }
.breadcrumb-item a { color: #58a6ff; text-decoration: none; }
.breadcrumb-item a:hover { color: #79c0ff; text-decoration: underline; }
.breadcrumb-item.active { color: #c9d1d9; }
.breadcrumb-item + .breadcrumb-item::before { color: #8b949e; }
```

### 2. Warning Badge Text

**❌ PROBLEM**: `bg-warning` (yellow) can have invisible text if Bootstrap's automatic contrast fails.

**✅ FIX**: Always add `text-dark` explicitly:
```tsx
<span className="badge bg-warning text-dark">Inactive</span>
```

### 3. Modal Close Button Invisible

**❌ PROBLEM**: `.btn-close` is black by default, invisible on dark modal headers.

**✅ FIX**: Use `.btn-close-white` class:
```tsx
<button className="btn-close btn-close-white" onClick={closeModal} />
```

### 4. Form Controls in Dynamic Containers

**❌ PROBLEM**: CSS variable cascade can break inside modals or dynamically rendered content.

**✅ FIX**: Use explicit inline overrides when needed:
```tsx
<input className="form-control bg-dark text-white border-secondary" />
```

### 5. Hardcoded Colors

**❌ AVOID**:
```css
.my-element { color: #74b9ff; }
```

**✅ PREFER**: Use CSS variables:
```css
.my-element { color: var(--accent-color); }
```

---

## Color Palette

All colors are defined as CSS custom properties in `App.tsx`. **Always use these variables**.

### Core Theme Colors

| Variable | Hex | Usage |
|----------|-----|-------|
| `--bg-primary` | `#2d3436` | Page background |
| `--bg-secondary` | `#353b3d` | Navbar, sidebar background |
| `--bg-card` | `#3d4345` | Card container background |
| `--bg-card-body` | `#3a3f41` | Card body background |
| `--bg-input` | `#2a2e30` | Form input background |
| `--text-primary` | `#f5f6fa` | Headings, main text |
| `--text-secondary` | `#b2bec3` | Muted text, placeholders |
| `--text-label` | `#dfe6e9` | Form labels |
| `--border-color` | `#4a5052` | All borders |
| `--accent-color` | `#74b9ff` | Primary accent (links, highlights) |
| `--accent-secondary` | `#00cec9` | Secondary accent |
| `--success-color` | `#00b894` | Success states |
| `--warning-color` | `#fdcb6e` | Warning states |
| `--danger-color` | `#e17055` | Error/danger states |

### Shadow Variables (Neumorphic)

| Variable | Value | Usage |
|----------|-------|-------|
| `--shadow-dark` | `rgba(0, 0, 0, 0.4)` | Dark shadow component |
| `--shadow-light` | `rgba(255, 255, 255, 0.05)` | Light shadow component |
| `--neumorphic-shadow` | `6px 6px 12px var(--shadow-dark), -3px -3px 8px var(--shadow-light)` | Raised elements |
| `--neumorphic-inset` | `inset 4px 4px 8px var(--shadow-dark), inset -2px -2px 6px var(--shadow-light)` | Pressed/inset elements |

### Chart.js Colors

Used in `PipelinePanel.tsx` for consistent chart styling:

| Name | Value | Usage |
|------|-------|-------|
| Blue | `rgba(88, 166, 255, 0.8)` | Primary chart color |
| Green | `rgba(63, 185, 80, 0.8)` | Success/completed |
| Yellow | `rgba(210, 153, 34, 0.8)` | Warning/duration |
| Purple | `rgba(163, 113, 247, 0.8)` | Tool usage |
| Red | `rgba(248, 81, 73, 0.8)` | Errors/failures |
| Cyan | `rgba(56, 189, 248, 0.8)` | Info |

---

## Status Color Guidelines

| Status | Background Class | Text Class | Example |
|--------|-----------------|------------|---------|
| Success | `bg-success` | (white auto) | `<span className="badge bg-success">Online</span>` |
| Warning | `bg-warning` | **`text-dark`** (required!) | `<span className="badge bg-warning text-dark">Inactive</span>` |
| Danger | `bg-danger` | (white auto) | `<span className="badge bg-danger">Error</span>` |
| Info | `bg-info` | (white auto) | `<span className="badge bg-info">Active</span>` |
| Neutral | `bg-secondary` | (white auto) | `<span className="badge bg-secondary">Unknown</span>` |
| Banned | `bg-dark` | (white auto) | `<span className="badge bg-dark">Banned</span>` |

---

## Component Patterns

### Card Pattern

Standard card with icon in header:

```tsx
<div className="card">
  <div className="card-header">
    <i className="bi bi-memory me-2"></i>
    Card Title
  </div>
  <div className="card-body">
    {/* content */}
  </div>
</div>
```

### Page Header Pattern

Consistent header with title and refresh button:

```tsx
<div className="d-flex justify-content-between align-items-center mb-4">
  <h2>
    <i className="bi bi-people me-2"></i>
    Page Title
  </h2>
  <button className="btn btn-outline-light btn-sm" onClick={handleRefresh}>
    <i className="bi bi-arrow-clockwise me-1"></i>
    Refresh
  </button>
</div>
```

### Table Pattern

Standard table with hover and selection:

```tsx
<div className="table-responsive">
  <table className="table table-hover mb-0">
    <thead>
      <tr>
        <th>Column 1</th>
        <th>Column 2</th>
      </tr>
    </thead>
    <tbody>
      {items.map((item) => (
        <tr
          key={item.id}
          className={isSelected ? 'row-selected' : ''}
          onClick={() => selectItem(item)}
          style={{ cursor: 'pointer' }}
        >
          <td>{item.name}</td>
          <td>{item.value}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Row States:**
- Default: Dark blue background `rgba(40, 60, 80, 0.9)`
- Active/Online: `.table-active` → `rgba(60, 90, 120, 0.9)`
- Selected: `.row-selected` → Glowing border with accent color

### Modal Pattern

Standard modal with dark theme:

```tsx
{showModal && (
  <div
    className="modal show d-block"
    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    tabIndex={-1}
    onKeyDown={(e) => {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'Enter') handleAction();
    }}
  >
    <div className="modal-dialog">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Modal Title</h5>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={closeModal}
          />
        </div>
        <div className="modal-body">
          {/* content */}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAction}>Confirm</button>
        </div>
      </div>
    </div>
  </div>
)}
```

### Form Pattern

Standard form with labels:

```tsx
<div className="mb-3">
  <label className="form-label">Field Name</label>
  <input
    type="text"
    className="form-control"
    value={value}
    onChange={(e) => setValue(e.target.value)}
  />
</div>

{/* Checkbox */}
<div className="form-check mb-3">
  <input
    className="form-check-input"
    type="checkbox"
    id="uniqueId"
    checked={checked}
    onChange={(e) => setChecked(e.target.checked)}
  />
  <label className="form-check-label" htmlFor="uniqueId">
    Label Text
  </label>
</div>
```

### Breadcrumb Pattern

**Always include the style overrides** (Bootstrap defaults are invisible on dark):

```tsx
<nav aria-label="breadcrumb" className="mb-3">
  <ol className="breadcrumb">
    <li className="breadcrumb-item">
      <a href="#" onClick={(e) => { e.preventDefault(); navigate(); }}>Parent</a>
    </li>
    <li className="breadcrumb-item active" aria-current="page">Current</li>
  </ol>
</nav>

<style>{`
  .breadcrumb { background: #21262d; padding: 12px 16px; border-radius: 6px; }
  .breadcrumb-item a { color: #58a6ff; text-decoration: none; }
  .breadcrumb-item a:hover { color: #79c0ff; text-decoration: underline; }
  .breadcrumb-item.active { color: #c9d1d9; }
  .breadcrumb-item + .breadcrumb-item::before { color: #8b949e; }
`}</style>
```

### Loading Spinner Pattern

```tsx
<LoadingSpinner message="Loading data..." />
```

Component centers content with 200px min-height.

### Stat Card Pattern

```tsx
<StatCard
  title="Connected Clients"
  value={stats?.connectedClients ?? '-'}
  icon="bi-people"
  color="info"
/>
```

---

## Chart.js Styling

### Bar Chart Options

```tsx
const barOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { 
      beginAtZero: true, 
      grid: { color: 'rgba(48, 54, 61, 0.5)' },  // Dark grid
      ticks: { color: '#8b949e' }  // Muted text
    },
    x: { 
      grid: { display: false }, 
      ticks: { color: '#8b949e' } 
    },
  },
};
```

### Pie/Doughnut Options

```tsx
const pieOptions: ChartOptions<'pie' | 'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { 
    legend: { 
      position: 'right', 
      labels: { color: '#c9d1d9' }  // Light text for dark theme
    } 
  },
};
```

---

## Bootstrap CDN Includes

From `index.html`:

```html
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" />
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet" />
```

---

## Scrollbar Styling

Custom scrollbar for dark theme (defined in `App.tsx`):

```css
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: var(--bg-primary); border-radius: 5px; }
::-webkit-scrollbar-thumb { background: #4a5568; border-radius: 5px; }
::-webkit-scrollbar-thumb:hover { background: #636e72; }
```

---

## Quick Reference

### When Adding New Components

1. ✅ Use CSS variables for all colors
2. ✅ Test on dark background - ensure text is readable
3. ✅ Warning badges need `text-dark`
4. ✅ Modal close buttons need `btn-close-white`
5. ✅ Breadcrumbs need inline style overrides
6. ✅ Use Bootstrap Icons (`bi-*` classes)
7. ✅ Follow existing patterns for cards, tables, forms

### File Reference

| File | Purpose |
|------|---------|
| `src/frontend/admin/src/App.tsx` | CSS variables, global styles |
| `src/frontend/admin/index.html` | CDN includes |
| `src/frontend/admin/src/components/panels/*.tsx` | Panel implementations |
| `src/frontend/admin/src/components/*.tsx` | Reusable components |
