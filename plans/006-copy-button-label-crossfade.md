# 006 — Crossfade copy-button labels

- **Status**: DONE (depends on 001)
- **Commit**: 6b6e0f0
- **Severity**: LOW
- **Category**: Missed opportunity (feedback)
- **Estimated scope**: 2 files, small markup changes

## Problem

Two copy affordances hard-swap their label text between idle and confirmed states with no transition — the text pops.

1. Hero install button (`apps/web/src/components/sections/hero.tsx:118-120`):

```tsx
<span className="text-[11px] text-text-muted">
  {copied ? 'copied ✓' : 'copy ⧉'}
</span>
```

2. How-it-works step rows (`apps/web/src/components/sections/how-it-works.tsx:73`):

```tsx
{copied === step.cmd ? 'copied ✓' : 'copy ⧉'}
```

Both use a `copied` state that resets after 1600ms (`hero.tsx:92`, `how-it-works.tsx:33`). Purpose of animating: **feedback** — confirm the press landed. Occasional frequency, so a short crossfade is appropriate.

## Target

Crossfade between the two labels by stacking them and toggling opacity with `ease-snappy` (plan 001) at 150ms. Keep the layout stable (fixed-width relative container) so nothing shifts.

```tsx
/* target — reusable inline pattern for the hero span */
<span className="relative inline-grid text-[11px] text-text-muted">
  <span
    className={cn(
      'col-start-1 row-start-1 transition-opacity duration-150 ease-snappy motion-reduce:transition-none',
      copied ? 'opacity-0' : 'opacity-100'
    )}
  >
    copy ⧉
  </span>
  <span
    className={cn(
      'col-start-1 row-start-1 transition-opacity duration-150 ease-snappy motion-reduce:transition-none',
      copied ? 'opacity-100' : 'opacity-0'
    )}
    aria-hidden={!copied}
  >
    copied ✓
  </span>
</span>
```

For how-it-works, apply the identical stacked pattern with the per-row condition `copied === step.cmd` in place of `copied`.

Stacking both labels in the same grid cell (`col-start-1 row-start-1`) makes the container size to the wider label and keeps both centered, so the crossfade has no layout shift.

## Repo conventions to follow

- Requires plan 001 (`ease-snappy`).
- Import `cn` from `@envy/ui/lib/utils` if not already present in each file (match sibling imports).
- Do not touch the copy logic (`navigator.clipboard`, `setTimeout` reset) — only the label rendering.

## Steps

1. **hero.tsx** — confirm/add `cn` import. Replace the `{copied ? 'copied ✓' : 'copy ⧉'}` span (line ~118) with the stacked Target markup.
2. **how-it-works.tsx** — confirm/add `cn` import. Replace the `{copied === step.cmd ? 'copied ✓' : 'copy ⧉'}` label (line ~73) with the stacked pattern using `copied === step.cmd`.
3. Save both.

## Boundaries

- Do NOT change clipboard logic, timeouts, or button behavior.
- Do NOT animate the whole button (no scale here) — only the label crossfade.
- Do NOT add dependencies.
- Keep the emoji/glyphs (`⧉`, `✓`) exactly as-is.
- If plan 001 is unmerged, STOP.

## Verification

- **Mechanical**: `bun run check-types` passes; `bunx biome check apps/web/src/components/sections/hero.tsx apps/web/src/components/sections/how-it-works.tsx` clean; `bun run build` succeeds.
- **Feel check**: `bun run dev:web`:
  - Click the hero install button — "copy ⧉" fades to "copied ✓" without the row width jumping, then fades back after ~1.6s.
  - Click a how-it-works step — same crossfade, and only that row's label changes.
  - Enable `prefers-reduced-motion`: label still switches (instant), no layout shift.
- **Done when**: Both copy labels crossfade with no layout shift.
