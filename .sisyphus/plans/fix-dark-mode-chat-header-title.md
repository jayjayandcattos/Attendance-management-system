# Fix: Dark Mode Chat Header Title Unreadable

## TL;DR
> **Problem**: `.chat-header h3` has hardcoded `color: #0f172a` (slate-900) in `03-components.css`. In dark mode, `.chat-header` background is also `#0f172a` → same color text on same color background → **invisible title**. Subtitle `<p>` also uses hardcoded `#64748b` which may be low-contrast in dark mode.
>
> **Fix**: Replace 3 hardcoded color values with CSS variables so they auto-adapt to both light/dark mode.

## Files to Edit
- `frontend/src/styles/03-components.css` (lines 866-911)
- `frontend/src/styles/10-dark-mode.css` (already has `html.dark .chat-header { background: #0f172a }` — no change needed there)

## Edits (3 replacements in 1 file)

### Edit 1: `.chat-header` background + border
**Old:**
```css
border-bottom: 1px solid #e2e8f0;
background: #ffffff;
```
**New:**
```css
border-bottom: 1px solid var(--border-glass, #e2e8f0);
background: var(--bg-card, #ffffff);
```

### Edit 2: `.chat-header h3` color
**Old:**
```css
color: #0f172a;
```
**New:**
```css
color: var(--text-primary);
```

### Edit 3: `.chat-header p` color
**Old:**
```css
color: #64748b;
```
**New:**
```css
color: var(--text-secondary);
```

## Verification
- `npx tsc --noEmit` → no errors
- `npx vite build` → succeeds

## QA Scenarios

**Scenario: Verify title is readable in dark mode**
- Open app, switch to dark mode (theme toggle)
- Navigate to Messages page
- Select a group chat or DM conversation
- Assert: The chat header title text (`<h3>`) is visible and contrasts with the dark background
- Visual evidence: screenshot of chat header in dark mode

**Scenario: Verify light mode unchanged**
- Switch back to light mode
- Navigate to Messages page
- Assert: Chat header title color matches `--text-primary` (same visual as before)
